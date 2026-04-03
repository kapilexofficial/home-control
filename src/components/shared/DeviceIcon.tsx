import { DEVICE_TYPE_ICONS } from "@/lib/constants";
import { DeviceType } from "@/types/device";
import { cn } from "@/lib/utils";

interface DeviceIconProps {
  type: DeviceType;
  className?: string;
  size?: number;
}

export function DeviceIcon({ type, className, size = 20 }: DeviceIconProps) {
  const Icon = DEVICE_TYPE_ICONS[type];
  return <Icon className={cn("shrink-0", className)} size={size} />;
}
