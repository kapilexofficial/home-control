import { RingApi } from "ring-client-api";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { Device } from "@/types/device";
import { DeviceType } from "@/types/device";

let ringApiPromise: Promise<RingApi> | null = null;

export async function getRingApi(): Promise<RingApi> {
  if (ringApiPromise) return ringApiPromise;
  ringApiPromise = buildRingApi().catch((err) => {
    ringApiPromise = null;
    throw err;
  });
  return ringApiPromise;
}

async function buildRingApi(): Promise<RingApi> {
  const refreshToken = await loadRefreshToken();
  if (!refreshToken) {
    throw new Error(
      "Ring refresh token not found in Supabase or RING_REFRESH_TOKEN env"
    );
  }

  const api = new RingApi({
    refreshToken,
    cameraStatusPollingSeconds: 30,
  });

  api.onRefreshTokenUpdated.subscribe(({ newRefreshToken }) => {
    if (!newRefreshToken) return;
    persistRefreshToken(newRefreshToken).catch((err) => {
      console.error("[Ring] Failed to persist rotated token:", err);
    });
  });

  return api;
}

async function loadRefreshToken(): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("integration_tokens")
    .select("refresh_token")
    .eq("platform", "ring")
    .maybeSingle();
  if (error) {
    console.error("[Ring] Failed to load token from Supabase:", error);
  }
  if (data?.refresh_token) return data.refresh_token;
  return process.env.RING_REFRESH_TOKEN ?? null;
}

async function persistRefreshToken(newToken: string): Promise<void> {
  const { error } = await supabaseAdmin.from("integration_tokens").upsert(
    {
      platform: "ring",
      refresh_token: newToken,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "platform" }
  );
  if (error) throw error;
  console.log("[Ring] Refresh token rotated and persisted to Supabase");
}

export async function getRingDevices(): Promise<Device[]> {
  const devices: Device[] = [];

  try {
    const api = await getRingApi();
    const cameras = await api.getCameras();

    for (const cam of cameras) {
      devices.push({
        id: `ring-${cam.id}`,
        name: cam.name,
        type: DeviceType.CAMERA,
        state: cam.operatingOnBattery ? "on" : "on",
        roomId: null,
        attributes: {
          battery: cam.batteryLevel ?? undefined,
          deviceType: cam.deviceType,
        },
        online: true,
        lastUpdated: new Date().toISOString(),
        platform: "ring",
      });
    }
  } catch (error) {
    console.error("[Ring] Error fetching cameras:", error);
  }

  return devices;
}
