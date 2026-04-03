export interface TuyaTokenResponse {
  result: {
    access_token: string;
    refresh_token: string;
    expire_time: number;
    uid: string;
  };
  success: boolean;
  t: number;
}

export interface TuyaDeviceResponse {
  result: TuyaDevice[];
  success: boolean;
  t: number;
}

export interface TuyaDevice {
  id: string;
  name: string;
  category: string;
  online: boolean;
  status: TuyaDeviceStatus[];
  product_name: string;
  local_key: string;
  sub: boolean;
  time_zone: string;
  update_time: number;
}

export interface TuyaDeviceStatus {
  code: string;
  value: unknown;
}

export interface TuyaCommandRequest {
  commands: { code: string; value: unknown }[];
}

// Tuya category → DeviceType mapping
export const TUYA_CATEGORY_MAP: Record<string, string> = {
  dj: "light",       // Light
  dd: "light",       // Light strip
  fwd: "light",      // Ambient light
  xdd: "light",      // Ceiling light
  dc: "light",       // String light
  kg: "switch",      // Switch
  pc: "switch",      // Power strip
  cz: "switch",      // Socket
  dlq: "switch",     // Circuit breaker
  kt: "climate",     // Air conditioner
  wk: "climate",     // Thermostat
  rs: "climate",     // Heater
  fs: "fan",         // Fan
  sp: "camera",      // Smart camera
  sgbj: "sensor",    // Alarm host
  wsdcg: "sensor",   // Temperature humidity sensor
  mcs: "sensor",     // Door sensor
  pir: "sensor",     // PIR sensor
  cl: "cover",       // Curtain
  clkg: "cover",     // Curtain switch
  ykq: "media_player", // Remote control
  ms: "lock",        // Lock
};
