import { cn } from "@/lib/utils";
import type { DeviceState } from "@/types/device";

interface StatusIndicatorProps {
  state: DeviceState;
  online?: boolean;
  className?: string;
}

export function StatusIndicator({
  state,
  online = true,
  className,
}: StatusIndicatorProps) {
  return (
    <span
      className={cn(
        "inline-block w-2 h-2 rounded-full",
        !online || state === "unavailable"
          ? "bg-muted-foreground"
          : state === "on"
            ? "bg-emerald-400"
            : "bg-slate-500",
        className
      )}
    />
  );
}
