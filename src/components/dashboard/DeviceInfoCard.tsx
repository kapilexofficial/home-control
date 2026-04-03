"use client";

import type { Device } from "@/types/device";
import { cn } from "@/lib/utils";
import { Clock, Maximize2, Battery, type LucideIcon } from "lucide-react";

interface DeviceInfoCardProps {
  title: string;
  subtitle: string;
  device?: Device;
  stats?: { icon: LucideIcon; value: string; label: string }[];
  badge?: { value: string; label: string };
  children?: React.ReactNode;
}

export function DeviceInfoCard({
  title,
  subtitle,
  device,
  stats,
  badge,
  children,
}: DeviceInfoCardProps) {
  const isOn = device?.state === "on";

  return (
    <div className="bg-card rounded-2xl p-5 flex flex-col h-full card-hover">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-base font-semibold">{title}</h3>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <div
          className={cn(
            "w-3 h-3 rounded-full transition-colors",
            isOn ? "bg-primary" : "bg-muted-foreground/30"
          )}
        />
      </div>

      {/* Content area */}
      <div className="flex-1 flex items-center justify-center relative my-2">
        {badge && (
          <div className="absolute top-0 left-0 bg-secondary rounded-lg px-2.5 py-1.5">
            <p className="text-xs font-semibold">{badge.value}</p>
            <p className="text-[10px] text-muted-foreground">{badge.label}</p>
          </div>
        )}

        {children || (
          <div className="w-24 h-24 rounded-full bg-secondary/50 flex items-center justify-center">
            <Maximize2 className="w-8 h-8 text-muted-foreground/30" />
          </div>
        )}
      </div>

      {/* Stats row */}
      {stats && stats.length > 0 && (
        <div className="flex items-center justify-center gap-5 mt-auto">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div key={i} className="flex items-center gap-1.5">
                <Icon className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs font-medium">{stat.value}</span>
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
