import type { Device } from "@/types/device";
import { DeviceType } from "@/types/device";
import type { HubSpaceDevice } from "./client";

export function mapHubSpaceDevice(raw: HubSpaceDevice): Device | null {
  // Skip unnamed/empty devices
  if (!raw.friendlyName) return null;

  return {
    id: `hubspace-${raw.deviceId}`,
    name: raw.friendlyName,
    type: DeviceType.LIGHT,
    state: raw.powerOn ? "on" : "off",
    roomId: null,
    attributes: {
      brightness: raw.brightness || undefined,
    },
    online: raw.available,
    lastUpdated: new Date().toISOString(),
    platform: "hubspace",
  };
}
