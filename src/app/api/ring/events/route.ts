import { NextResponse } from "next/server";
import { RingApi } from "ring-client-api";

let ringApiInstance: RingApi | null = null;

function getRingApi(): RingApi {
  if (ringApiInstance) return ringApiInstance;

  const refreshToken = process.env.RING_REFRESH_TOKEN;
  if (!refreshToken) throw new Error("RING_REFRESH_TOKEN not set");

  ringApiInstance = new RingApi({
    refreshToken,
    cameraStatusPollingSeconds: 60,
  });

  ringApiInstance.onRefreshTokenUpdated.subscribe(() => {
    console.log("[Ring] Refresh token updated");
  });

  return ringApiInstance;
}

export const dynamic = "force-dynamic";

export async function GET() {
  if (!process.env.RING_REFRESH_TOKEN) {
    return NextResponse.json({ events: [] });
  }

  try {
    const api = getRingApi();
    const cameras = await api.getCameras();

    const allEvents: Array<{
      time: string;
      title: string;
      description: string;
      camera: string;
      kind: string;
    }> = [];

    // Fetch recent events from each camera in parallel
    const eventResults = await Promise.allSettled(
      cameras.map(async (cam) => {
        const { events } = await cam.getEvents({ limit: 5 });
        return events.map((e: { created_at: string; kind: string }) => ({
          time: new Date(e.created_at).toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          title: cam.name,
          description: translateKind(e.kind),
          camera: cam.name,
          kind: e.kind,
          timestamp: new Date(e.created_at).getTime(),
        }));
      })
    );

    for (const result of eventResults) {
      if (result.status === "fulfilled") {
        allEvents.push(...result.value);
      }
    }

    // Sort by timestamp descending, take latest 10
    allEvents.sort((a, b) => (b as any).timestamp - (a as any).timestamp);

    return NextResponse.json({ events: allEvents.slice(0, 10) });
  } catch (error) {
    console.error("[Ring] Events error:", error);
    return NextResponse.json({ events: [], error: "Failed to fetch events" });
  }
}

function translateKind(kind: string): string {
  const map: Record<string, string> = {
    motion: "Movimento detectado",
    ding: "Campainha tocada",
    on_demand: "Visualização ao vivo",
    alarm: "Alarme disparado",
  };
  return map[kind] || kind;
}
