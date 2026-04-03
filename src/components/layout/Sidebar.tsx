"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/config/navigation";
import { Home, Wifi, WifiOff } from "lucide-react";

interface SidebarProps {
  connected?: boolean;
}

export function Sidebar({ connected = false }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-sidebar border-r border-border h-screen fixed left-0 top-0 z-30">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
        <div className="w-9 h-9 bg-primary/20 rounded-lg flex items-center justify-center">
          <Home className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-base font-semibold text-foreground">Home Control</h1>
          <p className="text-xs text-muted-foreground">Automação Residencial</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-primary/10 text-primary border-l-2 border-primary"
                  : "text-sidebar-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Connection Status */}
      <div className="px-4 py-4 border-t border-border">
        <div className="flex items-center gap-2 text-xs">
          {connected ? (
            <>
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Conectado</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Desconectado</span>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
