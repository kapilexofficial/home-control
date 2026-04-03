"use client";

import { useQuery } from "@tanstack/react-query";
import { Camera, Bell, Eye, Video, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface RingEvent {
  time: string;
  title: string;
  description: string;
  kind: string;
}

const KIND_COLORS: Record<string, string> = {
  motion: "bg-yellow-400",
  ding: "bg-red-400",
  on_demand: "bg-blue-400",
};

export function ActivityPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ["ring-events"],
    queryFn: async () => {
      const res = await fetch("/api/ring/events");
      const data = await res.json();
      return data.events as RingEvent[];
    },
    refetchInterval: 30000,
  });

  const events = data || [];

  const now = new Date();
  const dateStr = now.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="bg-[#1e1e20] rounded-2xl p-5 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-[15px] font-semibold">Activity</h2>
        <span className="text-xs text-muted-foreground hover:text-primary cursor-pointer transition-colors">
          See All &gt;
        </span>
      </div>
      <p className="text-xs text-muted-foreground mb-5">{dateStr}</p>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto pr-1 relative">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : events.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-12">
            Nenhum evento recente
          </p>
        ) : (
          <>
            {/* Timeline line */}
            <div className="absolute left-[42px] top-4 bottom-4 w-[2px] bg-primary/20 rounded-full" />

            {events.map((event, index) => {
              const dotColor = KIND_COLORS[event.kind] || "bg-muted-foreground";
              return (
                <div key={index} className="flex items-start gap-3 mb-4 relative">
                  {/* Time */}
                  <div className="w-8 text-right shrink-0 pt-0.5">
                    <span className="text-[11px] font-semibold tabular-nums">{event.time.split(":")[0]}:{event.time.split(":")[1]}</span>
                    <span className="block text-[9px] text-muted-foreground uppercase">
                      {Number(event.time.split(":")[0]) < 12 ? "AM" : "PM"}
                    </span>
                  </div>

                  {/* Dot on timeline */}
                  <div className="relative z-10 mt-1.5 shrink-0">
                    <div className={cn("w-2.5 h-2.5 rounded-full", dotColor)} />
                  </div>

                  {/* Content card */}
                  <div className="flex-1 bg-white/[0.03] rounded-xl px-3.5 py-2.5 border border-white/[0.04]">
                    <p className="text-[13px] font-medium">{event.title}</p>
                    <p className="text-[11px] text-muted-foreground">{event.description}</p>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
