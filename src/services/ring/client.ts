import { RingApi } from "ring-client-api";
import type { Device } from "@/types/device";
import { DeviceType } from "@/types/device";

let ringApiInstance: RingApi | null = null;

function getRingApi(): RingApi {
  if (ringApiInstance) return ringApiInstance;

  const refreshToken = process.env.RING_REFRESH_TOKEN;
  if (!refreshToken) throw new Error("RING_REFRESH_TOKEN not set");

  ringApiInstance = new RingApi({
    refreshToken,
    cameraStatusPollingSeconds: 30,
  });

  // Update refresh token when it changes
  ringApiInstance.onRefreshTokenUpdated.subscribe(({ newRefreshToken }) => {
    // In production, you'd save this to a persistent store
    // For now it stays in memory until server restart
    console.log("[Ring] Refresh token updated");
  });

  return ringApiInstance;
}

export async function getRingDevices(): Promise<Device[]> {
  const api = getRingApi();
  const devices: Device[] = [];

  try {
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
