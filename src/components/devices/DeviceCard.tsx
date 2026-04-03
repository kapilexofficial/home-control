"use client";

import { cn } from "@/lib/utils";
import type { Device } from "@/types/device";
import { DeviceType } from "@/types/device";
import { DeviceIcon } from "@/components/shared/DeviceIcon";
import { LightControl } from "./LightControl";
import { SwitchControl } from "./SwitchControl";
import { SensorDisplay } from "./SensorDisplay";
import { ClimateControl } from "./ClimateControl";
import { CoverControl } from "./CoverControl";
import { CameraFeed } from "./CameraFeed";

interface DeviceCardProps {
  device: Device;
  onToggle?: (deviceId: string, newState: boolean) => void;
  onBrightnessChange?: (deviceId: string, brightness: number) => void;
  onCommand?: (deviceId: string, code: string, value: unknown) => void;
}

const GLOW_MAP: Partial<Record<DeviceType, string>> = {
  [DeviceType.LIGHT]: "glow-amber",
  [DeviceType.SWITCH]: "glow-emerald",
  [DeviceType.SENSOR]: "glow-blue",
  [DeviceType.CAMERA]: "glow-blue",
  [DeviceType.CLIMATE]: "glow-rose",
  [DeviceType.COVER]: "glow-violet",
  [DeviceType.LOCK]: "glow-rose",
  [DeviceType.FAN]: "glow-emerald",
};

const ICON_COLOR_MAP: Partial<Record<DeviceType, string>> = {
  [DeviceType.LIGHT]: "bg-amber-400/15 text-amber-400",
  [DeviceType.SWITCH]: "bg-emerald-400/15 text-emerald-400",
  [DeviceType.SENSOR]: "bg-blue-400/15 text-blue-400",
  [DeviceType.CAMERA]: "bg-blue-400/15 text-blue-400",
  [DeviceType.CLIMATE]: "bg-rose-400/15 text-rose-400",
  [DeviceType.COVER]: "bg-violet-400/15 text-violet-400",
  [DeviceType.LOCK]: "bg-rose-400/15 text-rose-400",
  [DeviceType.FAN]: "bg-emerald-400/15 text-emerald-400",
};

export function DeviceCard({
  device,
  onToggle,
  onBrightnessChange,
  onCommand,
}: DeviceCardProps) {
  const isOn = device.state === "on";
  const isAvailable = device.online && device.state !== "unavailable";
  const isCamera = device.type === DeviceType.CAMERA;

  if (isCamera) {
    return (
      <div className="card-dark rounded-2xl overflow-hidden">
        <CameraFeed device={device} />
      </div>
    );
  }

  const glowClass = isOn && isAvailable ? GLOW_MAP[device.type] || "" : "";
  const iconColor = isOn
    ? ICON_COLOR_MAP[device.type] || "bg-primary/15 text-primary"
    : "bg-secondary text-muted-foreground";

  return (
    <div
      className={cn(
        "card-dark rounded-2xl p-5 transition-all duration-300 relative overflow-hidden",
        glowClass,
        !isAvailable && "opacity-40"
      )}
    >
      <div className="relative">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-all", iconColor)}>
            <DeviceIcon type={device.type} size={18} />
          </div>
          <div className={cn(
            "w-2.5 h-2.5 rounded-full transition-all",
            !isAvailable ? "bg-muted-foreground/30"
              : isOn ? "bg-emerald-400 shadow-sm shadow-emerald-400/40"
              : "bg-muted-foreground/40"
          )} />
        </div>

        {/* Name */}
        <div className="mb-4">
          <h3 className="text-[14px] font-medium leading-tight">{device.name}</h3>
          <span className="text-[11px] text-muted-foreground mt-0.5 block">
            {!isAvailable ? "Offline" : isOn ? "Ligado" : "Desligado"}
          </span>
        </div>

        {/* Control */}
        {renderControl(device, { onToggle, onBrightnessChange, onCommand })}
      </div>
    </div>
  );
}

function renderControl(
  device: Device,
  handlers: {
    onToggle?: (deviceId: string, newState: boolean) => void;
    onBrightnessChange?: (deviceId: string, brightness: number) => void;
    onCommand?: (deviceId: string, code: string, value: unknown) => void;
  }
) {
  const isAvailable = device.online && device.state !== "unavailable";

  switch (device.type) {
    case DeviceType.LIGHT:
      return (
        <LightControl
          device={device}
          onToggle={handlers.onToggle}
          onBrightnessChange={handlers.onBrightnessChange}
          disabled={!isAvailable}
        />
      );
    case DeviceType.SWITCH:
    case DeviceType.FAN:
    case DeviceType.LOCK:
      return (
        <SwitchControl
          device={device}
          onToggle={handlers.onToggle}
          disabled={!isAvailable}
        />
      );
    case DeviceType.CAMERA:
      return <CameraFeed device={device} />;
    case DeviceType.SENSOR:
      return <SensorDisplay device={device} />;
    case DeviceType.CLIMATE:
      return (
        <ClimateControl
          device={device}
          onCommand={handlers.onCommand}
          disabled={!isAvailable}
        />
      );
    case DeviceType.COVER:
      return (
        <CoverControl
          device={device}
          onCommand={handlers.onCommand}
          disabled={!isAvailable}
        />
      );
    default:
      return (
        <SwitchControl
          device={device}
          onToggle={handlers.onToggle}
          disabled={!isAvailable}
        />
      );
  }
}
