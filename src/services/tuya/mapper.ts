import type { Device, DeviceAttributes } from "@/types/device";
import { DeviceType } from "@/types/device";
import { TUYA_CATEGORY_MAP } from "@/types/tuya";
import type { TuyaDeviceRaw } from "./client";

export function mapTuyaDevice(
  raw: TuyaDeviceRaw,
  roomId: string | null = null
): Device[] {
  const statusMap = Object.fromEntries(
    raw.status.map((s) => [s.code, s.value])
  );

  // Detect multi-channel switches (switch_1, switch_2, etc.)
  const switchChannels = raw.status
    .filter((s) => /^switch_\d+$/.test(s.code))
    .map((s) => s.code);

  // Custom names for multi-channel devices
  const CHANNEL_NAMES: Record<string, Record<string, string>> = {
    "eb5fcc4488f8686397zjy9": { "1": "Luzes da Frente", "2": "Luz da Entrada" },
  };

  if (switchChannels.length > 1) {
    return switchChannels.map((channel, index) => {
      const channelNum = channel.replace("switch_", "");
      const customNames = CHANNEL_NAMES[raw.id];
      const name = customNames?.[channelNum] || `${raw.name || raw.product_name} - Canal ${channelNum}`;
      return {
        id: `${raw.id}_ch${channelNum}`,
        name,
        type: DeviceType.SWITCH,
        state: !raw.online
          ? "unavailable" as const
          : statusMap[channel]
            ? "on" as const
            : "off" as const,
        roomId,
        attributes: {
          channel: channelNum,
          switchCode: channel,
          ...extractAttributes(DeviceType.SWITCH, statusMap, raw.category),
        },
        online: raw.online,
        lastUpdated: new Date(raw.update_time * 1000).toISOString(),
        platform: "tuya" as const,
      };
    });
  }

  // Single device (normal case)
  const type = mapCategory(raw.category);
  const attributes = extractAttributes(type, statusMap, raw.category);
  const state = determineState(type, statusMap, raw.online);
  const name = raw.name || raw.product_name;

  return [{
    id: raw.id,
    name,
    type,
    state,
    roomId,
    attributes,
    online: raw.online,
    lastUpdated: new Date(raw.update_time * 1000).toISOString(),
    platform: "tuya",
  }];
}

function mapCategory(category: string): DeviceType {
  const mapped = TUYA_CATEGORY_MAP[category];
  if (mapped) return mapped as DeviceType;

  // Additional mappings for less common categories
  const extraMap: Record<string, DeviceType> = {
    tdq: DeviceType.SWITCH,     // Power strip / smart plug
    wg2: DeviceType.SWITCH,     // Gateway (show as switch for simplicity)
  };

  return extraMap[category] || DeviceType.SWITCH;
}

function determineState(
  type: DeviceType,
  status: Record<string, unknown>,
  online: boolean
): "on" | "off" | "unavailable" {
  if (!online) return "unavailable";

  // Different device categories use different status codes for on/off
  const switchCodes = ["switch_led", "switch_1", "switch", "Power"];
  for (const code of switchCodes) {
    if (code in status) {
      return status[code] ? "on" : "off";
    }
  }

  // Sensors are always "on" if online
  if (type === DeviceType.SENSOR) return "on";

  // Gateways - check master_state
  if ("master_state" in status) {
    return status.master_state === "normal" ? "on" : "off";
  }

  return "off";
}

function extractAttributes(
  type: DeviceType,
  status: Record<string, unknown>,
  category: string
): DeviceAttributes {
  const attrs: DeviceAttributes = {};

  switch (type) {
    case DeviceType.LIGHT:
      if ("bright_value_v2" in status) {
        attrs.brightness = Math.round(
          (Number(status.bright_value_v2) / 1000) * 100
        );
      } else if ("bright_value" in status) {
        attrs.brightness = Math.round(
          (Number(status.bright_value) / 255) * 100
        );
      }
      if ("temp_value_v2" in status) {
        attrs.color_temp = Number(status.temp_value_v2);
      }
      // RGB color data
      if ("colour_data" in status) {
        try {
          const colorData = typeof status.colour_data === "string"
            ? JSON.parse(status.colour_data)
            : status.colour_data;
          attrs.brightness = Math.round((colorData.v / 1000) * 100);
        } catch {
          // ignore parse errors
        }
      }
      break;

    case DeviceType.CLIMATE:
      if ("temp_current" in status) {
        attrs.temperature = Number(status.temp_current) / 10;
      } else if ("temp_set" in status) {
        attrs.temperature = Number(status.temp_set) / 10;
      }
      if ("humidity_value" in status) {
        attrs.humidity = Number(status.humidity_value);
      }
      break;

    case DeviceType.SENSOR:
      if ("va_temperature" in status) {
        attrs.temperature = Number(status.va_temperature) / 10;
      }
      if ("va_humidity" in status) {
        attrs.humidity = Number(status.va_humidity);
      }
      if ("battery_percentage" in status) {
        attrs.battery = Number(status.battery_percentage);
      }
      break;

    case DeviceType.COVER:
      if ("percent_control" in status) {
        attrs.position = Number(status.percent_control);
      }
      break;

    case DeviceType.MEDIA_PLAYER:
      if ("volume" in status) {
        attrs.volume = Number(status.volume);
      }
      break;

    case DeviceType.LOCK:
      if ("residual_electricity" in status) {
        attrs.battery = Number(status.residual_electricity);
      }
      break;
  }

  // Switch with energy monitoring
  if (category === "tdq") {
    if ("cur_power" in status) {
      attrs.power = Number(status.cur_power) / 10; // watts
    }
    if ("cur_voltage" in status) {
      attrs.voltage = Number(status.cur_voltage) / 10;
    }
    if ("cur_current" in status) {
      attrs.current = Number(status.cur_current);
    }
  }

  return attrs;
}
