"use client";

import type { Device } from "@/types/device";
import { Droplets, Thermometer, Zap, Lightbulb } from "lucide-react";

interface LiveViewProps {
  devices: Device[];
}

export function LiveView({ devices }: LiveViewProps) {
  const tempDevice = devices.find(
    (d) => d.type === "sensor" && d.attributes.temperature != null
  );
  const humidityDevice = devices.find(
    (d) => d.type === "sensor" && d.attributes.humidity != null
  );
  const temperature = tempDevice?.attributes.temperature ?? "--";
  const humidity = humidityDevice?.attributes.humidity ?? "--";
  const lightsOn = devices.filter(
    (d) => d.type === "light" && d.state === "on"
  ).length;
  const totalOnline = devices.filter((d) => d.online).length;

  return (
    <div className="relative glass rounded-2xl overflow-hidden min-h-[260px] lg:min-h-[340px]">
      {/* Animated gradient background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a1612] via-[#12121a] to-[#0e1018]" />
        <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-gradient-to-bl from-primary/[0.03] to-transparent" />
        <div className="absolute bottom-0 left-0 w-1/3 h-1/3 bg-gradient-to-tr from-blue-500/[0.02] to-transparent" />
      </div>

      {/* Live badge */}
      <div className="absolute top-5 left-5 flex items-center gap-2">
        <div className="flex items-center gap-2 glass rounded-full px-3 py-1.5">
          <span className="w-2 h-2 rounded-full bg-red-500 live-dot" />
          <span className="text-[11px] font-medium tracking-wide">LIVE</span>
        </div>
      </div>

      {/* Status pills */}
      <div className="absolute top-5 right-5 flex items-center gap-2 flex-wrap justify-end">
        <Pill icon={<Thermometer className="w-3 h-3" />} value={`${temperature}°C`} />
        <Pill icon={<Droplets className="w-3 h-3" />} value={`${humidity}%`} />
        <Pill icon={<Lightbulb className="w-3 h-3" />} value={`${lightsOn}`} />
        <Pill icon={<Zap className="w-3 h-3" />} value={`${totalOnline}`} />
      </div>

      {/* Center content */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <p className="text-6xl font-extralight tabular-nums tracking-tight">
            {temperature}<span className="text-2xl text-muted-foreground">°</span>
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            {new Date().toLocaleDateString("pt-BR", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
        </div>
      </div>
    </div>
  );
}

function Pill({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <div className="flex items-center gap-1.5 glass rounded-full px-3 py-1.5">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-[11px] font-medium tabular-nums">{value}</span>
    </div>
  );
}
