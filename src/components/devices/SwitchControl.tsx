"use client";

import type { Device } from "@/types/device";
import { cn } from "@/lib/utils";

interface SwitchControlProps {
  device: Device;
  onToggle?: (deviceId: string, newState: boolean) => void;
  disabled?: boolean;
}

export function SwitchControl({
  device,
  onToggle,
  disabled,
}: SwitchControlProps) {
  const isOn = device.state === "on";

  return (
    <div className="flex items-center justify-end">
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
  );
}
