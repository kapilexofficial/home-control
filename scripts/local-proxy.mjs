import http from "node:http";
import { execFile, spawn } from "node:child_process";
import { readFile, unlink, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const PORT = 3002;
const KASA_CAMERA_MAC = (process.env.KASA_CAMERA_MAC || "3c:52:a1:d1:e4:fc").toLowerCase();
const KASA_CAMERA_IP_HINT = process.env.KASA_CAMERA_IP || "";
const KASA_EMAIL = process.env.KASA_EMAIL || "";
const KASA_PASSWORD = process.env.KASA_PASSWORD || "";

const auth = Buffer.from(`${KASA_EMAIL}:${KASA_PASSWORD}`).toString("base64");

// --- Camera IP Discovery ---
let resolvedIP = KASA_CAMERA_IP_HINT;
let ipLastChecked = 0;
const IP_CACHE_TTL = 300_000; // Re-discover every 5 min

async function findCameraIP() {
  const now = Date.now();
  // Use cached IP if recent and valid
  if (resolvedIP && now - ipLastChecked < IP_CACHE_TTL) {
    // Quick check if it's still reachable
    try {
      await execFileAsync("nc", ["-z", "-w2", resolvedIP, "19443"], { timeout: 3000 });
      return resolvedIP;
    } catch {
      console.log(`[Discovery] Cached IP ${resolvedIP} not reachable, scanning...`);
    }
  }

  console.log(`[Discovery] Scanning for camera MAC ${KASA_CAMERA_MAC}...`);

  // Ping broadcast to populate ARP table
  const subnets = ["192.168.4", "192.168.5", "192.168.6", "192.168.7"];
  await Promise.allSettled(
    subnets.map((s) => execFileAsync("ping", ["-c", "1", "-t", "1", `${s}.255`], { timeout: 3000 }))
  );

  // Wait a moment for ARP to populate
  await new Promise((r) => setTimeout(r, 1000));

  // Search ARP table
  try {
    const { stdout } = await execFileAsync("arp", ["-a"], { timeout: 5000 });
    const lines = stdout.split("\n");
    for (const line of lines) {
      const lower = line.toLowerCase();
      if (lower.includes(KASA_CAMERA_MAC)) {
        const match = line.match(/\((\d+\.\d+\.\d+\.\d+)\)/);
        if (match) {
          const ip = match[1];
          console.log(`[Discovery] Found camera at ${ip}`);
          resolvedIP = ip;
          ipLastChecked = now;
          return ip;
        }
      }
    }
  } catch {}

  // ARP didn't find it, try scanning port 19443 on known subnets
  console.log("[Discovery] ARP scan failed, trying port scan...");
  for (const subnet of subnets) {
    const checks = [];
    for (let i = 1; i <= 254; i++) {
      const ip = `${subnet}.${i}`;
      checks.push(
        execFileAsync("nc", ["-z", "-w1", ip, "19443"], { timeout: 2000 })
          .then(() => ip)
          .catch(() => null)
      );
    }
    // Run in batches of 50
    for (let i = 0; i < checks.length; i += 50) {
      const batch = checks.slice(i, i + 50);
      const results = await Promise.allSettled(batch);
      for (const r of results) {
        if (r.status === "fulfilled" && r.value) {
          const ip = r.value;
          console.log(`[Discovery] Found camera at ${ip} via port scan`);
          resolvedIP = ip;
          ipLastChecked = now;
          return ip;
        }
      }
    }
  }

  console.error("[Discovery] Camera not found on network");
  return null;
}

function getStreamUrl(ip) {
  return `https://${ip}:19443/https/stream/mixed?video=h264&audio=g711&resolution=hd`;
}

// --- Snapshot ---
let cachedSnapshot = null;
let cacheTime = 0;
const CACHE_TTL = 10_000;

async function captureSnapshot() {
  const now = Date.now();
  if (cachedSnapshot && now - cacheTime < CACHE_TTL) {
    return cachedSnapshot;
  }

  const ip = await findCameraIP();
  if (!ip) throw new Error("Camera not found on network");

  const tmpFile = join(tmpdir(), `kasa-snap-${now}.jpg`);

  try {
    await execFileAsync("ffmpeg", [
      "-y",
      "-headers", `Authorization: Basic ${auth}`,
      "-i", getStreamUrl(ip),
      "-frames:v", "1",
      "-update", "1",
      tmpFile,
    ], { timeout: 15000 });

    const data = await readFile(tmpFile);
    await unlink(tmpFile).catch(() => {});
    cachedSnapshot = data;
    cacheTime = now;
    return data;
  } catch (err) {
    await unlink(tmpFile).catch(() => {});
    throw err;
  }
}

// --- HLS Live Stream ---
const HLS_DIR = join(tmpdir(), "kasa-hls");
let hlsProcess = null;
let hlsLastAccess = 0;
const HLS_IDLE_TIMEOUT = 60_000;

async function ensureHlsDir() {
  await mkdir(HLS_DIR, { recursive: true });
}

async function startHls() {
  if (hlsProcess) return;

  const ip = await findCameraIP();
  if (!ip) return;

  console.log("[HLS] Starting live stream...");
  hlsProcess = spawn("ffmpeg", [
    "-y",
    "-headers", `Authorization: Basic ${auth}`,
    "-i", getStreamUrl(ip),
    "-c:v", "copy",
    "-c:a", "aac",
    "-f", "hls",
    "-hls_time", "2",
    "-hls_list_size", "4",
    "-hls_flags", "delete_segments+append_list",
    "-hls_segment_filename", join(HLS_DIR, "seg%03d.ts"),
    join(HLS_DIR, "stream.m3u8"),
  ], { stdio: ["ignore", "pipe", "pipe"] });

  hlsProcess.stderr.on("data", (d) => {
    const msg = d.toString();
    if (msg.includes("Error") || msg.includes("error")) {
      console.error("[HLS]", msg.trim());
    }
  });

  hlsProcess.on("exit", (code) => {
    console.log(`[HLS] Process exited with code ${code}`);
    hlsProcess = null;
  });

  hlsLastAccess = Date.now();
}

function stopHls() {
  if (hlsProcess) {
    console.log("[HLS] Stopping stream (idle)");
    hlsProcess.kill("SIGTERM");
    hlsProcess = null;
  }
}

setInterval(() => {
  if (hlsProcess && Date.now() - hlsLastAccess > HLS_IDLE_TIMEOUT) {
    stopHls();
  }
}, 10_000);

process.on("SIGTERM", () => { stopHls(); process.exit(0); });
process.on("SIGINT", () => { stopHls(); process.exit(0); });

// --- HTTP Server ---
const MIME = {
  ".m3u8": "application/vnd.apple.mpegurl",
  ".ts": "video/mp2t",
};

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");

  if (req.url?.startsWith("/snapshot")) {
    try {
      const data = await captureSnapshot();
      res.writeHead(200, {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=10",
      });
      res.end(data);
    } catch (err) {
      console.error("[Snapshot]", err.message);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Failed to capture snapshot" }));
    }
  } else if (req.url?.startsWith("/live") && req.url !== "/live/stop") {
    await ensureHlsDir();
    await startHls();
    hlsLastAccess = Date.now();

    const fileName = req.url.replace("/live", "") || "/stream.m3u8";
    const filePath = join(HLS_DIR, fileName.startsWith("/") ? fileName.slice(1) : fileName);
    const ext = fileName.substring(fileName.lastIndexOf("."));

    try {
      const data = await readFile(filePath);
      res.writeHead(200, {
        "Content-Type": MIME[ext] || "application/octet-stream",
        "Cache-Control": ext === ".m3u8" ? "no-cache" : "public, max-age=5",
      });
      res.end(data);
    } catch {
      if (ext === ".m3u8") {
        res.writeHead(503, { "Content-Type": "application/json", "Retry-After": "2" });
        res.end(JSON.stringify({ error: "Stream starting, retry in 2s" }));
      } else {
        res.writeHead(404);
        res.end();
      }
    }
  } else if (req.url === "/live/stop") {
    stopHls();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
  } else if (req.url === "/discover") {
    ipLastChecked = 0; // force re-scan
    const ip = await findCameraIP();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ip: ip || null, mac: KASA_CAMERA_MAC }));
  } else {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", service: "home-control-local-proxy", cameraIP: resolvedIP || "unknown" }));
  }
});

server.listen(PORT, () => {
  console.log(`Local proxy running on http://localhost:${PORT}`);
  console.log(`Kasa camera MAC: ${KASA_CAMERA_MAC}`);
  console.log(`Kasa camera IP hint: ${KASA_CAMERA_IP_HINT || "none (will auto-discover)"}`);
  console.log(`Endpoints: /snapshot, /live/stream.m3u8, /live/stop, /discover`);

  // Pre-discover camera on startup
  findCameraIP().then((ip) => {
    if (ip) console.log(`Camera ready at ${ip}`);
    else console.log("Camera not found yet, will retry on first request");
  });
});
