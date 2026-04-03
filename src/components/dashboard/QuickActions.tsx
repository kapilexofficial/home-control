"use client";

import type { Device } from "@/types/device";
import { DeviceIcon } from "@/components/shared/DeviceIcon";
import { cn } from "@/lib/utils";

interface QuickActionsProps {
  devices: Device[];
  onToggle?: (deviceId: string, newState: boolean) => void;
}

export function QuickActions({ devices, onToggle }: QuickActionsProps) {
  if (devices.length === 0) return null;

  return (
    <div>
      <h2 className="text-sm font-medium text-muted-foreground mb-3">
        Acesso Rápido
      </h2>
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {devices.map((device) => {
          const isOn = device.state === "on";
          return (
            <button
              key={device.id}
              onClick={() => onToggle?.(device.id, !isOn)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl border whitespace-nowrap transition-all duration-200 shrink-0",
                isOn
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-card border-border text-muted-foreground hover:border-primary/20"
              )}
            >
              <DeviceIcon type={device.type} size={16} />
              <span className="text-sm font-medium">{device.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
