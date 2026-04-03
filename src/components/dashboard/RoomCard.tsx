"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Device } from "@/types/device";
import {
  Sofa,
  BedDouble,
  BedSingle,
  CookingPot,
  Bath,
  Monitor,
  Car,
  Sun,
  DoorOpen,
  TreePine,
  WashingMachine,
  Waves,
  Baby,
  Home,
  type LucideIcon,
} from "lucide-react";

const ROOM_ICON_MAP: Record<string, LucideIcon> = {
  sofa: Sofa,
  "bed-double": BedDouble,
  "bed-single": BedSingle,
  "cooking-pot": CookingPot,
  bath: Bath,
  waves: Waves,
  baby: Baby,
  monitor: Monitor,
  car: Car,
  sun: Sun,
  "door-open": DoorOpen,
  "tree-pine": TreePine,
  "washing-machine": WashingMachine,
};

interface RoomCardProps {
  id: string;
  name: string;
  icon: string;
  devices: Device[];
}

export function RoomCard({ id, name, icon, devices }: RoomCardProps) {
  const Icon = ROOM_ICON_MAP[icon] || Home;
  const activeCount = devices.filter((d) => d.state === "on").length;
  const totalCount = devices.length;

  return (
    <Link
      href={`/rooms/${id}`}
      className={cn(
        "group relative rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:border-primary/30 hover:bg-card/80",
        activeCount > 0 && "border-primary/20"
      )}
    >
      <div className="flex items-start justify-between">
        <div
          className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
            activeCount > 0
              ? "bg-primary/20 text-primary"
              : "bg-secondary text-muted-foreground"
          )}
        >
          <Icon className="w-5 h-5" />
        </div>
        {activeCount > 0 && (
          <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
            {activeCount} ativo{activeCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      <div className="mt-3">
        <h3 className="font-medium text-card-foreground">{name}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {totalCount} dispositivo{totalCount !== 1 ? "s" : ""}
        </p>
      </div>
    </Link>
  );
}
