import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const KASA_PROXY_URL = process.env.KASA_PROXY_URL || "";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  if (!KASA_PROXY_URL) {
    return NextResponse.json({ error: "No proxy configured" }, { status: 500 });
  }

  const { path } = await params;
  const filePath = path.join("/") || "stream.m3u8";

  try {
    const res = await fetch(`${KASA_PROXY_URL}/live/${filePath}`, {
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Proxy returned ${res.status}` },
        { status: res.status }
      );
    }

    const data = new Uint8Array(await res.arrayBuffer());
    const contentType = res.headers.get("content-type") || "application/octet-stream";

    return new NextResponse(data, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": filePath.endsWith(".m3u8") ? "no-cache" : "public, max-age=5",
      },
    });
  } catch (error) {
    console.error("[Kasa] Live proxy error:", error);
    return NextResponse.json({ error: "Stream not available" }, { status: 503 });
  }
}
