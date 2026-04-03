"use client";

import type { Device } from "@/types/device";
import { Wifi, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface ClimateCardProps {
  device: Device | undefined;
  onCommand?: (deviceId: string, code: string, value: unknown) => void;
}

export function ClimateCard({ device, onCommand }: ClimateCardProps) {
  if (!device) return null;

  const isOn = device.state === "on";
  const temperature = (device.attributes.temperature as number) ?? 21;
  const minTemp = 15;
  const maxTemp = 29;

  // Calculate gauge percentage
  const range = maxTemp - minTemp;
  const progress = ((temperature - minTemp) / range) * 100;
  const circumference = 2 * Math.PI * 70; // radius = 70
  const dashOffset = circumference - (progress / 100) * circumference * 0.75; // 270° arc

  return (
    <div className="bg-card rounded-2xl p-5 flex flex-col h-full card-hover">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-base font-semibold">Ar Condicionado</h3>
          <p className="text-xs text-muted-foreground">Casa toda</p>
        </div>
        <div
          className={cn(
            "w-3 h-3 rounded-full transition-colors",
            isOn ? "bg-primary" : "bg-muted-foreground/30"
          )}
        />
      </div>

      {/* Circular gauge */}
      <div className="flex-1 flex items-center justify-center my-2">
        <div className="relative">
          <svg width="180" height="180" viewBox="0 0 180 180">
            {/* Background arc */}
            <circle
              cx="90"
              cy="90"
              r="70"
              fill="none"
              stroke="#2a2a2e"
              strokeWidth="6"
              strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
              strokeDashoffset={0}
              strokeLinecap="round"
              transform="rotate(135 90 90)"
            />
            {/* Progress arc */}
            {isOn && (
              <circle
                cx="90"
                cy="90"
                r="70"
                fill="none"
                stroke="#c9a84c"
                strokeWidth="6"
                strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                transform="rotate(135 90 90)"
                className="gauge-ring"
              />
            )}
          </svg>

          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Wifi className={cn("w-4 h-4 mb-1", isOn ? "text-primary" : "text-muted-foreground")} />
            <span className="text-4xl font-bold tabular-nums">{temperature}°</span>
          </div>

          {/* Min/Max labels */}
          <span className="absolute bottom-3 left-6 text-xs text-muted-foreground">{minTemp}</span>
          <span className="absolute bottom-3 right-6 text-xs text-muted-foreground">{maxTemp}</span>
        </div>
      </div>

      {/* Bottom info */}
      <div className="flex items-center justify-center gap-6 mt-auto">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Auto</span>
          <span className="text-xs font-medium">Auto Mode</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3 text-muted-foreground" />
          <span className="text-xs font-medium">35 min</span>
          <span className="text-xs text-muted-foreground">Tempo</span>
        </div>
      </div>
    </div>
  );
}
