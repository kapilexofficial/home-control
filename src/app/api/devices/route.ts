import { NextResponse } from "next/server";
import { getDevices as getTuyaDevices } from "@/services/tuya/client";
import { mapTuyaDevice } from "@/services/tuya/mapper";
import { getHueLights, getHueGroups } from "@/services/hue/client";
import { mapHueLightsWithRooms } from "@/services/hue/mapper";
import { getHubSpaceDevices } from "@/services/hubspace/client";
import { mapHubSpaceDevice } from "@/services/hubspace/mapper";
import { getRingDevices } from "@/services/ring/client";
import { getKasaDevices } from "@/services/kasa/client";
import { getDeviceRoom } from "@/config/rooms";
import type { Device } from "@/types/device";

export const dynamic = "force-dynamic";

export async function GET() {
  const devices: Device[] = [];
  const errors: string[] = [];

  // Fetch all platforms in parallel
  const results = await Promise.allSettled([
    // Tuya
    process.env.TUYA_CLIENT_ID
      ? getTuyaDevices().then((d) => d.flatMap((x) => mapTuyaDevice(x)))
      : Promise.resolve([]),

    // Hue
    (process.env.HUE_BRIDGE_IP || process.env.HUE_BRIDGE_URL) && process.env.HUE_API_KEY
      ? Promise.all([getHueLights(), getHueGroups()]).then(([lights, groups]) =>
          mapHueLightsWithRooms(lights, groups)
        )
      : Promise.resolve([]),

    // HubSpace
    process.env.HUBSPACE_REFRESH_TOKEN && process.env.HUBSPACE_ACCOUNT_ID
      ? getHubSpaceDevices().then((d) =>
          d.map(mapHubSpaceDevice).filter((x): x is Device => x !== null)
        )
      : Promise.resolve([]),

    // Ring
    process.env.RING_REFRESH_TOKEN
      ? getRingDevices()
      : Promise.resolve([]),

    // Kasa
    process.env.KASA_EMAIL
      ? getKasaDevices()
      : Promise.resolve([]),
  ]);

  const platformNames = ["Tuya", "Hue", "HubSpace", "Ring", "Kasa"];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === "fulfilled") {
      devices.push(...result.value);
    } else {
      console.error(`${platformNames[i]} error:`, result.reason);
      errors.push(`${platformNames[i]}: ${result.reason?.message || "unknown"}`);
    }
  }

  // Fallback to mock data if no integrations configured
  if (
    !process.env.TUYA_CLIENT_ID &&
    !process.env.HUE_BRIDGE_IP &&
    !process.env.HUBSPACE_REFRESH_TOKEN &&
    !process.env.RING_REFRESH_TOKEN &&
    !process.env.KASA_EMAIL
  ) {
    const { MOCK_DEVICES } = await import("@/lib/mock-data");
    return NextResponse.json({ devices: MOCK_DEVICES });
  }

  // Apply room assignments (our config overrides platform defaults)
  const devicesWithRooms = devices.map((d) => ({
    ...d,
    roomId: getDeviceRoom(d.id) || d.roomId || null,
  }));

  return NextResponse.json({
    devices: devicesWithRooms,
    ...(errors.length > 0 ? { errors } : {}),
  });
}
