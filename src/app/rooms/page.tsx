"use client";

import Link from "next/link";
import { useDevices } from "@/hooks/useDevices";
import { RoomCard } from "@/components/dashboard/RoomCard";
import { ROOMS } from "@/config/rooms";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function RoomsPage() {
  const { data: devices, isLoading } = useDevices();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const allDevices = devices || [];

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
          <h1 className="text-2xl font-bold">Cômodos</h1>
          <p className="text-sm text-muted-foreground">
            {ROOMS.length} cômodos configurados
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {ROOMS.map((room) => (
          <RoomCard
            key={room.id}
            id={room.id}
            name={room.name}
            icon={room.icon}
            devices={allDevices.filter((d) => d.roomId === room.id)}
          />
        ))}
      </div>
    </div>
  );
}
