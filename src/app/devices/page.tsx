"use client";

import { useState } from "react";
import Link from "next/link";
import { useDevices } from "@/hooks/useDevices";
import { useCommand } from "@/hooks/useCommand";
import { DeviceGrid } from "@/components/devices/DeviceGrid";
import { EmptyState } from "@/components/shared/EmptyState";
import { DEVICE_TYPE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { ArrowLeft, Cpu, Loader2 } from "lucide-react";

const ALL_TYPES = [
  { key: "all", label: "Todos" },
  ...Object.entries(DEVICE_TYPE_LABELS).map(([key, label]) => ({
    key,
    label,
  })),
];

export default function DevicesPage() {
  const [activeType, setActiveType] = useState("all");
  const { data: devices, isLoading } = useDevices();
  const { toggle, setBrightness, sendCommand } = useCommand();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const allDevices = devices || [];
  const filteredDevices =
    activeType === "all"
      ? allDevices
      : allDevices.filter((d) => d.type === activeType);

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/"
          className="p-2 rounded-lg hover:bg-secondary transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Dispositivos</h1>
          <p className="text-sm text-muted-foreground">
            {allDevices.length} dispositivos encontrados
          </p>
        </div>
      </div>

      {/* Type Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-4">
        {ALL_TYPES.map(({ key, label }) => {
          const count =
            key === "all"
              ? allDevices.length
              : allDevices.filter((d) => d.type === key).length;

          if (key !== "all" && count === 0) return null;

          return (
            <button
              key={key}
              onClick={() => setActiveType(key)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors shrink-0",
                activeType === key
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:text-foreground border border-border"
              )}
            >
              {label} ({count})
            </button>
          );
        })}
      </div>

      {filteredDevices.length > 0 ? (
        <DeviceGrid
          devices={filteredDevices}
          onToggle={toggle}
          onBrightnessChange={setBrightness}
          onCommand={sendCommand}
        />
      ) : (
        <EmptyState
          icon={Cpu}
          title="Nenhum dispositivo encontrado"
          description="Conecte seus dispositivos Tuya para começar."
        />
      )}
    </div>
  );
}
