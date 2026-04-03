import type { Device, DeviceType } from "./device";

export interface Room {
  id: string;
  name: string;
  icon: string;
  order: number;
  devices: Device[];
  deviceCounts: Partial<Record<DeviceType, number>>;
}
