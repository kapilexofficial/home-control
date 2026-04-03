import {
  LayoutDashboard,
  Home,
  Cpu,
  Clapperboard,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Cômodos", href: "/rooms", icon: Home },
  { label: "Dispositivos", href: "/devices", icon: Cpu },
  { label: "Cenas", href: "/scenes", icon: Clapperboard },
  { label: "Configurações", href: "/settings", icon: Settings },
];
