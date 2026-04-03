"use client";

import { useState, useEffect } from "react";
import { Camera, RefreshCw, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Device } from "@/types/device";

interface CameraFeedProps {
  device: Device;
}

export function CameraFeed({ device }: CameraFeedProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const isRing = device.id.startsWith("ring-");
  const isKasa = device.id.startsWith("kasa-");
  const hasSnapshot = isRing || isKasa;

  const snapshotUrl = isRing
    ? `/api/ring/snapshot/${device.id}?t=${refreshKey}`
    : isKasa
      ? `/api/kasa/snapshot/${device.id}?t=${refreshKey}`
      : null;

  useEffect(() => {
    if (!snapshotUrl) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);
    setImageUrl(snapshotUrl);
  }, [snapshotUrl]);

  const handleRefresh = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRefreshKey((k) => k + 1);
  };

  return (
    <>
      {/* Camera card */}
      <div
        className={cn(
          "relative overflow-hidden cursor-pointer group",
          expanded
            ? "fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
            : "aspect-[16/10] rounded-2xl"
        )}
        onClick={() => setExpanded(!expanded)}
      >
        {imageUrl && !error ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={device.name}
              className={cn(
                "object-cover",
                expanded ? "max-w-full max-h-full rounded-2xl" : "w-full h-full"
              )}
              onLoad={() => setLoading(false)}
              onError={() => { setLoading(false); setError(true); }}
            />
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                <RefreshCw className="w-5 h-5 animate-spin text-white/60" />
              </div>
            )}
          </>
        ) : (
          <div className="absolute inset-0 bg-secondary/50 flex flex-col items-center justify-center gap-2">
            <Camera className="w-8 h-8 text-muted-foreground/30" />
            <span className="text-[11px] text-muted-foreground">
              {error ? "Sem preview" : "Carregando..."}
            </span>
          </div>
        )}

        {/* Overlay info */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />

        {/* Live badge */}
        {!error && imageUrl && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/40 backdrop-blur-md rounded-full px-2.5 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 live-dot" />
            <span className="text-[10px] font-medium text-white/90">LIVE</span>
          </div>
        )}

        {/* Camera name */}
        <div className="absolute bottom-3 left-3 right-12">
          <p className="text-[13px] font-medium text-white truncate">{device.name}</p>
        </div>

        {/* Actions */}
        <div className="absolute bottom-3 right-3 flex gap-1.5">
          {hasSnapshot && (
            <button
              onClick={handleRefresh}
              className="w-7 h-7 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <RefreshCw className={cn("w-3 h-3 text-white", loading && "animate-spin")} />
            </button>
          )}
          <div className="w-7 h-7 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Maximize2 className="w-3 h-3 text-white" />
          </div>
        </div>

        {/* Close button when expanded */}
        {expanded && (
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(false); }}
            className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white text-lg hover:bg-white/20 transition-colors"
          >
            &times;
          </button>
        )}
      </div>
    </>
  );
}
