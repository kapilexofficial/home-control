"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Home, LogOut, Shield } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const ROOM_TAB_COLORS: Record<string, { active: string; ring: string }> = {
  all:               { active: "bg-primary/15 text-primary",           ring: "ring-primary/30" },
  sala:              { active: "bg-blue-400/15 text-blue-400",         ring: "ring-blue-400/30" },
  "suite-principal": { active: "bg-violet-400/15 text-violet-400",     ring: "ring-violet-400/30" },
  "quarto-victoria": { active: "bg-pink-400/15 text-pink-400",         ring: "ring-pink-400/30" },
  "quarto-visitas":  { active: "bg-orange-400/15 text-orange-400",     ring: "ring-orange-400/30" },
  "suite-piscina":   { active: "bg-cyan-400/15 text-cyan-400",         ring: "ring-cyan-400/30" },
  piscina:           { active: "bg-teal-400/15 text-teal-400",         ring: "ring-teal-400/30" },
  frente:            { active: "bg-amber-400/15 text-amber-400",       ring: "ring-amber-400/30" },
  garagem:           { active: "bg-slate-400/15 text-slate-400",       ring: "ring-slate-400/30" },
  escritorio:        { active: "bg-emerald-400/15 text-emerald-400",   ring: "ring-emerald-400/30" },
};

const DEFAULT_TAB_COLOR = { active: "bg-primary/15 text-primary", ring: "ring-primary/30" };

interface TopNavProps {
  rooms: { id: string; name: string }[];
  activeRoom: string;
  onRoomChange: (roomId: string) => void;
}

export function TopNav({ rooms, activeRoom, onRoomChange }: TopNavProps) {
  const { signOut } = useAuth();
  return (
    <header className="flex items-center justify-between px-2 py-5">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center border border-primary/20">
          <Home className="w-5 h-5 text-primary" />
        </div>
        <div className="hidden sm:block">
          <span className="text-lg font-semibold tracking-tight">Home Control</span>
        </div>
      </div>

      {/* Room Tabs - Desktop */}
      <nav className="hidden md:flex items-center gap-1">
        {rooms.map((room) => {
          const colors = ROOM_TAB_COLORS[room.id] || DEFAULT_TAB_COLOR;
          return (
            <button
              key={room.id}
              onClick={() => onRoomChange(room.id)}
              className={cn(
                "px-4 py-2 rounded-full text-[13px] font-medium transition-all duration-200",
                activeRoom === room.id
                  ? cn(colors.active, "ring-1", colors.ring)
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              {room.name}
            </button>
          );
        })}
      </nav>

      {/* Room Selector - Mobile */}
      <div className="md:hidden">
        <select
          value={activeRoom}
          onChange={(e) => onRoomChange(e.target.value)}
          className="glass rounded-xl px-3 py-2 text-sm appearance-none pr-8 border-glass-border"
          style={{ backgroundImage: "none" }}
        >
          {rooms.map((room) => (
            <option key={room.id} value={room.id} className="bg-background">
              {room.name}
            </option>
          ))}
        </select>
      </div>

      {/* Profile + Admin + Logout */}
      <div className="flex items-center gap-1.5">
        <Link
          href="/admin"
          className="w-9 h-9 rounded-xl bg-secondary/50 flex items-center justify-center hover:bg-primary/20 hover:text-primary transition-all"
          title="Admin"
        >
          <Shield className="w-4 h-4" />
        </Link>
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-secondary to-muted flex items-center justify-center text-sm font-semibold">
          L
        </div>
        <button
          onClick={signOut}
          className="w-9 h-9 rounded-xl bg-secondary/50 flex items-center justify-center hover:bg-destructive/20 hover:text-destructive transition-all"
          title="Sair"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
