import http from "node:http";
import { execFile, spawn } from "node:child_process";
import { readFile, unlink, mkdir, readdir, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const PORT = 3002;
const KASA_CAMERA_IP = process.env.KASA_CAMERA_IP || "192.168.6.170";
const KASA_EMAIL = process.env.KASA_EMAIL || "";
const KASA_PASSWORD = process.env.KASA_PASSWORD || "";

const auth = Buffer.from(`${KASA_EMAIL}:${KASA_PASSWORD}`).toString("base64");
const streamUrl = `https://${KASA_CAMERA_IP}:19443/https/stream/mixed?video=h264&audio=g711&resolution=hd`;

// --- Snapshot ---
let cachedSnapshot = null;
let cacheTime = 0;
const CACHE_TTL = 10_000;

async function captureSnapshot() {
  const now = Date.now();
  if (cachedSnapshot && now - cacheTime < CACHE_TTL) {
    return cachedSnapshot;
  }

  const tmpFile = join(tmpdir(), `kasa-snap-${now}.jpg`);

  try {
    await execFileAsync("ffmpeg", [
      "-y",
      "-headers", `Authorization: Basic ${auth}`,
      "-i", streamUrl,
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
const HLS_IDLE_TIMEOUT = 60_000; // Stop after 60s of no viewers

async function ensureHlsDir() {
  await mkdir(HLS_DIR, { recursive: true });
}

function startHls() {
  if (hlsProcess) return;

  console.log("[HLS] Starting live stream...");
  hlsProcess = spawn("ffmpeg", [
    "-y",
    "-headers", `Authorization: Basic ${auth}`,
    "-i", streamUrl,
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

// Auto-stop HLS when no viewers
setInterval(() => {
  if (hlsProcess && Date.now() - hlsLastAccess > HLS_IDLE_TIMEOUT) {
    stopHls();
  }
}, 10_000);

// Clean up on exit
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
  } else if (req.url?.startsWith("/live")) {
    // HLS live stream
    await ensureHlsDir();
    startHls();
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
      // Playlist not ready yet
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
  } else {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", service: "home-control-local-proxy" }));
  }
});

server.listen(PORT, () => {
  console.log(`Local proxy running on http://localhost:${PORT}`);
  console.log(`Kasa camera: ${KASA_CAMERA_IP}`);
  console.log(`Endpoints: /snapshot, /live/stream.m3u8, /live/stop`);
});
