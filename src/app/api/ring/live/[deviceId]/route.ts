import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { RingApi } from "ring-client-api";

let ringApiInstance: RingApi | null = null;

function getRingApi(): RingApi {
  if (ringApiInstance) return ringApiInstance;

  const refreshToken = process.env.RING_REFRESH_TOKEN;
  if (!refreshToken) throw new Error("RING_REFRESH_TOKEN not set");

  ringApiInstance = new RingApi({
    refreshToken,
    cameraStatusPollingSeconds: 30,
  });

  ringApiInstance.onRefreshTokenUpdated.subscribe(({ newRefreshToken }) => {
    console.log("[Ring] Refresh token updated");
  });

  return ringApiInstance;
}

// POST: Start WebRTC session with SDP offer
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  const { deviceId } = await params;
  const ringId = deviceId.replace("ring-", "");

  try {
    const { sdp } = await request.json();
    if (!sdp) {
      return NextResponse.json({ error: "SDP offer required" }, { status: 400 });
    }

    const api = getRingApi();
    const cameras = await api.getCameras();
    const camera = cameras.find((c) => c.id.toString() === ringId);

    if (!camera) {
      return NextResponse.json({ error: "Camera not found" }, { status: 404 });
    }

    const session = camera.createSimpleWebRtcSession();
    const answerSdp = await session.start(sdp);

    return NextResponse.json({
      sdp: answerSdp,
      sessionId: session.sessionId,
    });
  } catch (error) {
    console.error("[Ring] Live stream error:", error);
    return NextResponse.json(
      { error: "Failed to start live stream" },
      { status: 500 }
    );
  }
}

// DELETE: End WebRTC session
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  // Session cleanup is handled by the browser closing the peer connection
  return NextResponse.json({ ok: true });
}
