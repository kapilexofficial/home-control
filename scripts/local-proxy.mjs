import http from "node:http";
import { execFile } from "node:child_process";
import { readFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const PORT = 3002;
const KASA_CAMERA_IP = process.env.KASA_CAMERA_IP || "192.168.7.30";
const KASA_EMAIL = process.env.KASA_EMAIL || "";
const KASA_PASSWORD = process.env.KASA_PASSWORD || "";

// Cache snapshot for 10 seconds
let cachedSnapshot = null;
let cacheTime = 0;
const CACHE_TTL = 10_000;

async function captureSnapshot() {
  const now = Date.now();
  if (cachedSnapshot && now - cacheTime < CACHE_TTL) {
    return cachedSnapshot;
  }

  const tmpFile = join(tmpdir(), `kasa-snap-${now}.jpg`);
  const auth = Buffer.from(`${KASA_EMAIL}:${KASA_PASSWORD}`).toString("base64");
  const streamUrl = `https://${KASA_CAMERA_IP}:19443/https/stream/mixed?video=h264&audio=g711&resolution=hd`;

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

const server = http.createServer(async (req, res) => {
  // CORS
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
  } else {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", service: "home-control-local-proxy" }));
  }
});

server.listen(PORT, () => {
  console.log(`Local proxy running on http://localhost:${PORT}`);
  console.log(`Kasa camera: ${KASA_CAMERA_IP}`);
});
