/**
 * Generate PWA icons as SVG-based PNGs
 * Uses built-in canvas via sharp or falls back to SVG files
 */
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

const ICONS_DIR = join(import.meta.dirname, "../public/icons");

function generateSVG(size, maskable = false) {
  const padding = maskable ? size * 0.1 : 0;
  const houseSize = size - padding * 2;
  const cx = size / 2;
  const cy = size / 2;
  const s = houseSize / 100; // scale factor

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${maskable ? 0 : size * 0.22}" fill="#0a0a0a"/>
  <g transform="translate(${cx}, ${cy}) scale(${s})">
    <!-- House body -->
    <rect x="-28" y="-8" width="56" height="40" rx="4" fill="#1a1a2e" stroke="#818cf8" stroke-width="2"/>
    <!-- Roof -->
    <path d="M-35 -8 L0 -35 L35 -8" fill="none" stroke="#818cf8" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    <!-- Door -->
    <rect x="-8" y="8" width="16" height="24" rx="2" fill="#818cf8" opacity="0.3"/>
    <!-- Door handle -->
    <circle cx="5" cy="20" r="1.5" fill="#818cf8"/>
    <!-- Window left -->
    <rect x="-24" y="2" width="10" height="10" rx="1.5" fill="#818cf8" opacity="0.2" stroke="#818cf8" stroke-width="1"/>
    <!-- Window right -->
    <rect x="14" y="2" width="10" height="10" rx="1.5" fill="#818cf8" opacity="0.2" stroke="#818cf8" stroke-width="1"/>
    <!-- Chimney -->
    <rect x="15" y="-30" width="8" height="15" rx="1" fill="#1a1a2e" stroke="#818cf8" stroke-width="1.5"/>
  </g>
  <!-- App name -->
  <text x="${cx}" y="${size - padding - s * 8}" text-anchor="middle" fill="#818cf8" font-family="system-ui, -apple-system, sans-serif" font-size="${s * 10}" font-weight="600" opacity="0.8">HC</text>
</svg>`;
}

async function main() {
  const sizes = [
    { size: 192, name: "icon-192.png" },
    { size: 512, name: "icon-512.png" },
    { size: 512, name: "icon-maskable-512.png", maskable: true },
    { size: 180, name: "apple-touch-icon.png" },
  ];

  for (const { size, name, maskable } of sizes) {
    const svg = generateSVG(size, maskable);
    const svgName = name.replace(".png", ".svg");
    await writeFile(join(ICONS_DIR, svgName), svg);
    console.log(`Created ${svgName} (${size}x${size})`);
  }

  // Try to convert SVG to PNG using sips (macOS built-in)
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const exec = promisify(execFile);

  for (const { size, name, maskable } of sizes) {
    const svgName = name.replace(".png", ".svg");
    const svgPath = join(ICONS_DIR, svgName);
    const pngPath = join(ICONS_DIR, name);

    try {
      // Use rsvg-convert if available, otherwise try other methods
      await exec("which", ["rsvg-convert"]);
      await exec("rsvg-convert", ["-w", String(size), "-h", String(size), svgPath, "-o", pngPath]);
      console.log(`Converted ${name}`);
    } catch {
      try {
        // Try qlmanage (macOS)
        await exec("qlmanage", ["-t", "-s", String(size), "-o", ICONS_DIR, svgPath]);
        console.log(`Converted ${name} via qlmanage`);
      } catch {
        console.log(`Could not convert ${svgName} to PNG. SVG will be used.`);
      }
    }
  }
}

main().catch(console.error);
