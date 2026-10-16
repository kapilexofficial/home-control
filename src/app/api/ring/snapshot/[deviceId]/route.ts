import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getRingApi } from "@/services/ring/client";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  const { deviceId } = await params;
  const ringId = deviceId.replace("ring-", "");

  try {
    const api = await getRingApi();
    const cameras = await api.getCameras();
    const camera = cameras.find((c) => String(c.id) === ringId);

    if (!camera) {
      return NextResponse.json({ error: "Camera not found" }, { status: 404 });
    }

    const snapshot = await camera.getSnapshot();

    return new NextResponse(new Uint8Array(snapshot), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=30",
      },
    });
  } catch (error) {
    console.error("[Ring] Snapshot error:", error);
    return NextResponse.json(
      { error: "Failed to get snapshot" },
      { status: 500 }
    );
  }
}
