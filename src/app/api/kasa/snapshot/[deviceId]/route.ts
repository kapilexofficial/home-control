import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCameraIp, setCameraIp } from "@/services/kasa/cameraIp";
import { discoverCameraIp } from "@/services/kasa/discover";

const KASA_PROXY_URL = process.env.KASA_PROXY_URL || "";
const KASA_EMAIL = process.env.KASA_EMAIL || "";
const KASA_PASSWORD = process.env.KASA_PASSWORD || "";

async function captureSnapshot(ip: string): Promise<Buffer> {
  const { execFile } = await import("child_process");
  const { promisify } = await import("util");
  const { readFile, unlink } = await import("fs/promises");
  const { tmpdir } = await import("os");
  const { join } = await import("path");

  const execFileAsync = promisify(execFile);
  const tmpFile = join(tmpdir(), `kasa-snapshot-${Date.now()}.jpg`);
  const authHeader = `Authorization: Basic ${Buffer.from(`${KASA_EMAIL}:${KASA_PASSWORD}`).toString("base64")}`;
  const streamUrl = `https://${ip}:19443/https/stream/mixed?video=h264&audio=g711&resolution=hd`;

  try {
    await execFileAsync(
      "ffmpeg",
      [
        "-y",
        "-headers", authHeader,
        "-i", streamUrl,
        "-frames:v", "1",
        "-update", "1",
        tmpFile,
      ],
      { timeout: 15000 }
    );
    const data = await readFile(tmpFile);
    await unlink(tmpFile).catch(() => {});
    return data;
  } catch (error) {
    await unlink(tmpFile).catch(() => {});
    throw error;
  }
}

function jpegResponse(data: Buffer): NextResponse {
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=10",
    },
  });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  await params;

  // If we have a proxy URL (cloud deploy), use it
  if (KASA_PROXY_URL) {
    try {
      const res = await fetch(`${KASA_PROXY_URL}/snapshot`, {
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) throw new Error(`Proxy returned ${res.status}`);
      const data = new Uint8Array(await res.arrayBuffer());
      return new NextResponse(data, {
        headers: {
          "Content-Type": "image/jpeg",
          "Cache-Control": "public, max-age=10",
        },
      });
    } catch (error) {
      console.error("[Kasa] Proxy snapshot error:", error);
      return NextResponse.json(
        { error: "Failed to get snapshot from proxy" },
        { status: 500 }
      );
    }
  }

  // Local: ffmpeg, with auto-rediscovery on failure
  const currentIp = await getCameraIp();

  // First attempt with cached IP
  if (currentIp) {
    try {
      const data = await captureSnapshot(currentIp);
      return jpegResponse(data);
    } catch {
      console.warn(`[Kasa] Snapshot failed at ${currentIp}, attempting rediscovery...`);
    }
  }

  // Rediscover by MAC and retry
  const newIp = await discoverCameraIp();
  if (!newIp) {
    console.error("[Kasa] Camera not found on network");
    return NextResponse.json(
      { error: "Camera offline or unreachable on local network" },
      { status: 502 }
    );
  }

  if (newIp !== currentIp) {
    console.log(`[Kasa] Camera IP updated: ${currentIp || "(none)"} → ${newIp}`);
    await setCameraIp(newIp);
  }

  try {
    const data = await captureSnapshot(newIp);
    return jpegResponse(data);
  } catch (error) {
    console.error("[Kasa] Snapshot retry failed:", error);
    return NextResponse.json(
      { error: "Failed to get snapshot after rediscovery" },
      { status: 500 }
    );
  }
}
