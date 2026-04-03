"use client";

import type { Device } from "@/types/device";
import { DeviceType } from "@/types/device";
import { DeviceCard } from "./DeviceCard";

interface DeviceGridProps {
  devices: Device[];
  onToggle?: (deviceId: string, newState: boolean) => void;
  onBrightnessChange?: (deviceId: string, brightness: number) => void;
  onCommand?: (deviceId: string, code: string, value: unknown) => void;
}

export function DeviceGrid({
  devices,
  onToggle,
  onBrightnessChange,
  onCommand,
}: DeviceGridProps) {
  const hasLights = devices.some((d) => d.type === DeviceType.LIGHT);

  return (
    <div
      className={
        hasLights
          ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
          : "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3"
      }
    >
      {devices.map((device) => (
        <DeviceCard
          key={device.id}
          device={device}
          onToggle={onToggle}
          onBrightnessChange={onBrightnessChange}
          onCommand={onCommand}
        />
      ))}
    </div>
  );
}
