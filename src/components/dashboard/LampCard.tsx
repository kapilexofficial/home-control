"use client";

import type { Device } from "@/types/device";
import { ChevronLeft, ChevronRight, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

interface LampCardProps {
  devices: Device[];
  onToggle?: (deviceId: string, newState: boolean) => void;
  onBrightnessChange?: (deviceId: string, brightness: number) => void;
}

export function LampCard({ devices, onToggle, onBrightnessChange }: LampCardProps) {
  const activeDevice = devices[0];
  if (!activeDevice) return null;

  const isOn = activeDevice.state === "on";
  const brightness = (activeDevice.attributes.brightness as number) ?? 55;

  return (
    <div className="bg-card rounded-2xl p-5 flex flex-col h-full card-hover">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-base font-semibold">Smart Lamp</h3>
          <p className="text-xs text-muted-foreground">{devices.length} dispositivo{devices.length !== 1 ? "s" : ""}</p>
        </div>
        <div
          className={cn(
            "w-3 h-3 rounded-full transition-colors",
            isOn ? "bg-primary" : "bg-muted-foreground/30"
          )}
        />
      </div>

      {/* Lamp visual */}
      <div className="flex-1 flex items-center justify-center relative my-2">
        {/* Lamp SVG illustration */}
        <div className="relative">
          {/* Glow effect when on */}
          {isOn && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
          )}
          <svg width="120" height="100" viewBox="0 0 120 100" className="relative z-10">
            {/* Lamp shade */}
            <ellipse cx="60" cy="50" rx="50" ry="30"
              fill={isOn ? "#2a2520" : "#1e1e20"}
              stroke={isOn ? "#c9a84c" : "#3a3a3e"}
              strokeWidth="1.5"
            />
            {/* Inner gold */}
            <ellipse cx="60" cy="55" rx="40" ry="20"
              fill={isOn ? "#c9a84c20" : "transparent"}
            />
            {/* Cord */}
            <line x1="60" y1="0" x2="60" y2="20" stroke="#4a4a4e" strokeWidth="2" />
          </svg>
        </div>

        {/* Carousel arrows */}
        {devices.length > 1 && (
          <>
            <button className="absolute left-0 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-secondary/80 flex items-center justify-center hover:bg-secondary transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button className="absolute right-0 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-secondary/80 flex items-center justify-center hover:bg-secondary transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 mt-auto">
        <div className="flex items-center gap-2 bg-secondary rounded-full px-1 py-1">
          <button
            onClick={() => onToggle?.(activeDevice.id, !isOn)}
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center transition-all",
              isOn ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}
          >
            <Sun className="w-4 h-4" />
          </button>
          <div
            className={cn(
              "w-8 h-8 rounded-full transition-all",
              isOn ? "bg-foreground" : "bg-muted-foreground/30"
            )}
          />
        </div>
        <span className="text-sm font-medium tabular-nums">{isOn ? `${brightness}%` : "Off"}</span>
      </div>
    </div>
  );
}
