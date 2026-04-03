"use client";

import { Search, Bell, Menu } from "lucide-react";
import { useState } from "react";

interface TopBarProps {
  onMenuClick?: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const now = new Date();
  const greeting = now.getHours() < 12
    ? "Bom dia"
    : now.getHours() < 18
      ? "Boa tarde"
      : "Boa noite";

  return (
    <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border px-4 lg:px-8 py-3">
      <div className="flex items-center justify-between gap-4">
        {/* Mobile menu button */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-secondary transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Greeting */}
        <div className="hidden sm:block">
          <h2 className="text-lg font-semibold">{greeting}</h2>
          <p className="text-xs text-muted-foreground">
            {now.toLocaleDateString("pt-BR", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
        </div>

        {/* Search */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar dispositivos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-secondary rounded-lg text-sm text-foreground placeholder:text-muted-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
            />
          </div>
        </div>

        {/* Notifications */}
        <button className="relative p-2 rounded-lg hover:bg-secondary transition-colors">
          <Bell className="w-5 h-5 text-muted-foreground" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
        </button>
      </div>
    </header>
  );
}
