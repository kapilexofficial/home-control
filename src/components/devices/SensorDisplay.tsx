import type { Device } from "@/types/device";
import { Thermometer, Droplets, Battery } from "lucide-react";

interface SensorDisplayProps {
  device: Device;
}

export function SensorDisplay({ device }: SensorDisplayProps) {
  const temperature = device.attributes.temperature;
  const humidity = device.attributes.humidity;
  const battery = device.attributes.battery as number | undefined;

  return (
    <div className="space-y-3">
      {/* Main reading */}
      {temperature != null && (
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-light tabular-nums">{temperature}</span>
          <span className="text-lg text-muted-foreground">°C</span>
        </div>
      )}

      {/* Secondary readings */}
      <div className="flex items-center gap-4">
        {humidity != null && (
          <div className="flex items-center gap-1.5">
            <Droplets className="w-3.5 h-3.5 text-blue-400/70" />
            <span className="text-xs text-muted-foreground">{humidity}%</span>
          </div>
        )}
        {battery != null && (
          <div className="flex items-center gap-1.5">
            <Battery className="w-3.5 h-3.5 text-emerald-400/70" />
            <span className="text-xs text-muted-foreground">{battery}%</span>
          </div>
        )}
      </div>
    </div>
  );
}
