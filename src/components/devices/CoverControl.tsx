"use client";

import type { Device } from "@/types/device";
import { ChevronUp, ChevronDown, Square } from "lucide-react";
import { cn } from "@/lib/utils";

interface CoverControlProps {
  device: Device;
  onCommand?: (deviceId: string, code: string, value: unknown) => void;
  disabled?: boolean;
}

export function CoverControl({
  device,
  onCommand,
  disabled,
}: CoverControlProps) {
  const position = (device.attributes.position as number) ?? 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{position}% aberta</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onCommand?.(device.id, "control", "open")}
            disabled={disabled}
            className={cn(
              "w-8 h-8 rounded-lg bg-secondary flex items-center justify-center hover:bg-muted transition-colors",
              disabled && "cursor-not-allowed opacity-50"
            )}
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            onClick={() => onCommand?.(device.id, "control", "stop")}
            disabled={disabled}
            className={cn(
              "w-8 h-8 rounded-lg bg-secondary flex items-center justify-center hover:bg-muted transition-colors",
              disabled && "cursor-not-allowed opacity-50"
            )}
          >
            <Square className="w-3 h-3" />
          </button>
          <button
            onClick={() => onCommand?.(device.id, "control", "close")}
            disabled={disabled}
            className={cn(
              "w-8 h-8 rounded-lg bg-secondary flex items-center justify-center hover:bg-muted transition-colors",
              disabled && "cursor-not-allowed opacity-50"
            )}
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
