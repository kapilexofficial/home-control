import type { Device } from "@/types/device";
import { DeviceType } from "@/types/device";
import type { HueLight, HueGroup, HueSensor } from "./client";

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

const BUTTON_EVENTS: Record<number, string> = {
  1000: "Pressionado",
  1001: "Segurando",
  1002: "Clique curto",
  1003: "Clique longo",
  1004: "Segurando longo",
};

export function mapHueSensor(sensor: HueSensor): Device {
  const lastEvent = sensor.state.buttonevent;

  return {
    id: `hue-btn-${sensor.id}`,
    name: sensor.name,
    type: DeviceType.SWITCH,
    state: sensor.config.on ? "on" : "off",
    roomId: null,
    attributes: {
      battery: sensor.config.battery,
      lastEvent: lastEvent ? BUTTON_EVENTS[lastEvent] || `Evento ${lastEvent}` : undefined,
      lastUpdated: sensor.state.lastupdated,
      model: sensor.productname,
    },
    online: sensor.config.reachable,
    lastUpdated: sensor.state.lastupdated || new Date().toISOString(),
    platform: "hue",
  };
}
