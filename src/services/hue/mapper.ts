import type { Device } from "@/types/device";
import { DeviceType } from "@/types/device";
import type { HueLight, HueGroup } from "./client";

export function mapHueLight(
  light: HueLight,
  roomId: string | null
): Device {
  const brightness = Math.round((light.state.bri / 254) * 100);

  return {
    id: `hue-${light.id}`,
    name: light.name,
    type: DeviceType.LIGHT,
    state: !light.state.reachable
      ? "unavailable"
      : light.state.on
        ? "on"
        : "off",
    roomId,
    attributes: {
      brightness,
      color_temp: light.state.ct,
    },
    online: light.state.reachable,
    lastUpdated: new Date().toISOString(),
    platform: "hue",
  };
}

export function mapHueLightsWithRooms(
  lights: HueLight[],
  groups: HueGroup[]
): Device[] {
  // Build light-to-room mapping
  const lightRoomMap = new Map<string, string>();
  for (const group of groups) {
    for (const lightId of group.lights) {
      lightRoomMap.set(lightId, `hue-room-${group.id}`);
    }
  }

  return lights.map((light) =>
    mapHueLight(light, lightRoomMap.get(light.id) || null)
  );
}
