import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import { readFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

const execFileAsync = promisify(execFile);

const KASA_CAMERA_IP = process.env.KASA_CAMERA_IP || "192.168.7.30";
const KASA_EMAIL = process.env.KASA_EMAIL || "";
const KASA_PASSWORD = process.env.KASA_PASSWORD || "";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  await params; // consume params

  const tmpFile = join(tmpdir(), `kasa-snapshot-${Date.now()}.jpg`);
  const authHeader = `Authorization: Basic ${Buffer.from(`${KASA_EMAIL}:${KASA_PASSWORD}`).toString("base64")}`;
  const streamUrl = `https://${KASA_CAMERA_IP}:19443/https/stream/mixed?video=h264&audio=g711&resolution=hd`;

  try {
    await execFileAsync("ffmpeg", [
      "-y",
      "-headers", authHeader,
      "-i", streamUrl,
      "-frames:v", "1",
      "-update", "1",
      tmpFile,
    ], { timeout: 15000 });

    const imageData = await readFile(tmpFile);
    await unlink(tmpFile).catch(() => {});

    return new NextResponse(new Uint8Array(imageData), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=10",
      },
    });
  } catch (error) {
    await unlink(tmpFile).catch(() => {});
    console.error("[Kasa] Snapshot error:", error);
    return NextResponse.json(
      { error: "Failed to get snapshot" },
      { status: 500 }
    );
  }
}
