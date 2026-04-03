export enum DeviceType {
  LIGHT = "light",
  SWITCH = "switch",
  CLIMATE = "climate",
  SENSOR = "sensor",
  CAMERA = "camera",
  COVER = "cover",
  MEDIA_PLAYER = "media_player",
  LOCK = "lock",
  FAN = "fan",
}

export type DeviceState = "on" | "off" | "unavailable";

export interface DeviceAttributes {
  brightness?: number; // 0-100
  color_temp?: number;
  temperature?: number;
  humidity?: number;
  position?: number; // cover position 0-100
  volume?: number;
  [key: string]: unknown;
}

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  state: DeviceState;
  roomId: string | null;
  attributes: DeviceAttributes;
  online: boolean;
  lastUpdated: string;
  platform: "tuya" | "hue" | "hubspace" | "ring" | "kasa" | "alexa" | "mock";
}

export interface DeviceCommand {
  code: string;
  value: unknown;
}
