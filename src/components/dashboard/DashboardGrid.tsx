"use client";

import type { Device } from "@/types/device";
import type { Room } from "@/types/room";
import { RoomCard } from "./RoomCard";

interface DashboardGridProps {
  rooms: Room[];
  devices: Device[];
}

export function DashboardGrid({ rooms, devices }: DashboardGridProps) {
  // Enrich rooms with their devices
  const enrichedRooms = rooms.map((room) => ({
    ...room,
    devices: devices.filter((d) => d.roomId === room.id),
  }));

  return (
    <div>
      <h2 className="text-sm font-medium text-muted-foreground mb-3">
        Cômodos
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {enrichedRooms.map((room) => (
          <RoomCard
            key={room.id}
            id={room.id}
            name={room.name}
            icon={room.icon}
            devices={room.devices}
          />
        ))}
      </div>
    </div>
  );
}
