import type { Device } from "@/types/device";
import { Lightbulb, Power, Wifi, WifiOff } from "lucide-react";

interface StatusBarProps {
  devices: Device[];
}

export function StatusBar({ devices }: StatusBarProps) {
  const totalDevices = devices.length;
  const onlineDevices = devices.filter((d) => d.online).length;
  const activeDevices = devices.filter((d) => d.state === "on").length;
  const lightsOn = devices.filter(
    (d) => d.type === "light" && d.state === "on"
  ).length;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <StatusCard
        icon={<Wifi className="w-4 h-4 text-emerald-400" />}
        label="Online"
        value={`${onlineDevices}/${totalDevices}`}
      />
      <StatusCard
        icon={<Power className="w-4 h-4 text-primary" />}
        label="Ativos"
        value={String(activeDevices)}
      />
      <StatusCard
        icon={<Lightbulb className="w-4 h-4 text-yellow-400" />}
        label="Luzes"
        value={`${lightsOn} ligada${lightsOn !== 1 ? "s" : ""}`}
      />
      <StatusCard
        icon={<WifiOff className="w-4 h-4 text-muted-foreground" />}
        label="Offline"
        value={String(totalDevices - onlineDevices)}
      />
    </div>
  );
}

function StatusCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 bg-card rounded-xl border border-border px-4 py-3">
      <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}
