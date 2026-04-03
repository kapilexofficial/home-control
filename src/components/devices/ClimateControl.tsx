"use client";

import type { Device } from "@/types/device";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface ClimateControlProps {
  device: Device;
  onCommand?: (deviceId: string, code: string, value: unknown) => void;
  disabled?: boolean;
}

export function ClimateControl({
  device,
  onCommand,
  disabled,
}: ClimateControlProps) {
  const temperature = (device.attributes.temperature as number) ?? 24;
  const isOn = device.state === "on";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onCommand?.(device.id, "temp_set", temperature - 1)}
            disabled={disabled || !isOn}
            className={cn(
              "w-7 h-7 rounded-full bg-secondary flex items-center justify-center transition-colors hover:bg-muted",
              (disabled || !isOn) && "cursor-not-allowed opacity-50"
            )}
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <span className="text-2xl font-semibold tabular-nums min-w-[3ch] text-center">
            {temperature}°
          </span>
          <button
            onClick={() => onCommand?.(device.id, "temp_set", temperature + 1)}
            disabled={disabled || !isOn}
            className={cn(
              "w-7 h-7 rounded-full bg-secondary flex items-center justify-center transition-colors hover:bg-muted",
              (disabled || !isOn) && "cursor-not-allowed opacity-50"
            )}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          onClick={() =>
            onCommand?.(device.id, "switch", !isOn)
          }
          disabled={disabled}
          className={cn(
            "relative w-11 h-6 rounded-full transition-colors duration-200",
            isOn ? "bg-primary" : "bg-secondary",
            disabled && "cursor-not-allowed opacity-50"
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-200",
              isOn && "translate-x-5"
            )}
          />
        </button>
      </div>
    </div>
  );
}
