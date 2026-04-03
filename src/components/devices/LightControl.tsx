"use client";

import type { Device } from "@/types/device";
import { cn } from "@/lib/utils";

interface LightControlProps {
  device: Device;
  onToggle?: (deviceId: string, newState: boolean) => void;
  onBrightnessChange?: (deviceId: string, brightness: number) => void;
  disabled?: boolean;
}

export function LightControl({
  device,
  onToggle,
  onBrightnessChange,
  disabled,
}: LightControlProps) {
  const isOn = device.state === "on";
  const brightness = (device.attributes.brightness as number) ?? 100;
  const isHue = device.platform === "hue";

  return (
    <div className="space-y-3">
      {/* Toggle row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isOn && (
            <span className="text-[13px] font-medium tabular-nums text-primary">
              {brightness}%
            </span>
          )}
          {isHue && isOn && (
            <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
              Hue
            </span>
          )}
        </div>
        <button
          onClick={() => onToggle?.(device.id, !isOn)}
          disabled={disabled}
          className={cn(
            "relative w-12 h-7 rounded-full toggle-track",
            isOn ? "bg-primary" : "bg-muted",
            disabled && "cursor-not-allowed opacity-40"
          )}
        >
          <span
            className={cn(
              "absolute top-[3px] left-[3px] w-[22px] h-[22px] bg-white rounded-full toggle-thumb shadow-sm",
              isOn && "translate-x-5"
            )}
          />
        </button>
      </div>

      {/* Brightness slider - always visible when ON */}
      {isOn && (
        <div className="space-y-2">
          <div className="relative h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary/50 to-primary rounded-full transition-all duration-150"
              style={{ width: `${brightness}%` }}
            />
            <input
              type="range"
              min={1}
              max={100}
              value={brightness}
              onChange={(e) =>
                onBrightnessChange?.(device.id, Number(e.target.value))
              }
              disabled={disabled}
              className="absolute inset-0 w-full opacity-0 cursor-pointer"
            />
          </div>

          {/* Color temperature for Hue */}
          {isHue && (
            <div className="relative h-2 rounded-full overflow-hidden"
              style={{
                background: "linear-gradient(to right, #ffa94d, #fff5e6, #a8d8ff)"
              }}
            >
              <input
                type="range"
                min={153}
                max={500}
                value={device.attributes.color_temp ?? 300}
                onChange={() => {/* TODO: implement color temp control */}}
                disabled={disabled}
                className="absolute inset-0 w-full opacity-0 cursor-pointer"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
