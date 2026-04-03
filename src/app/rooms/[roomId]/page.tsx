"use client";

import { use } from "react";
import Link from "next/link";
import { useDevices } from "@/hooks/useDevices";
import { useCommand } from "@/hooks/useCommand";
import { DeviceGrid } from "@/components/devices/DeviceGrid";
import { EmptyState } from "@/components/shared/EmptyState";
import { ROOMS } from "@/config/rooms";
import { ArrowLeft, Home, Loader2 } from "lucide-react";

export default function RoomDetailPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = use(params);
  const { data: devices, isLoading } = useDevices();
  const { toggle, setBrightness, sendCommand } = useCommand();

  const room = ROOMS.find((r) => r.id === roomId);
  const roomDevices = (devices || []).filter((d) => d.roomId === roomId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/rooms"
          className="p-2 rounded-lg hover:bg-secondary transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{room?.name || "Cômodo"}</h1>
          <p className="text-sm text-muted-foreground">
            {roomDevices.length} dispositivo{roomDevices.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {roomDevices.length > 0 ? (
        <DeviceGrid
          devices={roomDevices}
          onToggle={toggle}
          onBrightnessChange={setBrightness}
          onCommand={sendCommand}
        />
      ) : (
        <EmptyState
          icon={Home}
          title="Nenhum dispositivo neste cômodo"
          description="Adicione dispositivos a este cômodo nas configurações."
        />
      )}
    </div>
  );
}
