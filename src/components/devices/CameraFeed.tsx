"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Camera, RefreshCw, Maximize2, Play, X } from "lucide-react";
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
  const [isLive, setIsLive] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const hlsRef = useRef<any>(null);
  const snapshotIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isRing = device.id.startsWith("ring-");
  const isKasa = device.id.startsWith("kasa-");
  const hasSnapshot = isRing || isKasa;
  const hasLive = isRing || isKasa;

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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopLive();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopLive = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    if (snapshotIntervalRef.current) {
      clearInterval(snapshotIntervalRef.current);
      snapshotIntervalRef.current = null;
    }
    setIsLive(false);
    setLiveError(null);
  }, []);

  const startRingLive = useCallback(async () => {
    setLiveError(null);
    try {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });
      pcRef.current = pc;

      pc.addTransceiver("audio", { direction: "recvonly" });
      pc.addTransceiver("video", { direction: "recvonly" });

      pc.ontrack = (event) => {
        if (videoRef.current && event.streams[0]) {
          videoRef.current.srcObject = event.streams[0];
        }
      };

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === "failed" || pc.iceConnectionState === "disconnected") {
          setLiveError("Conexão perdida");
          stopLive();
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Wait for ICE gathering to complete
      await new Promise<void>((resolve) => {
        if (pc.iceGatheringState === "complete") return resolve();
        pc.onicegatheringstatechange = () => {
          if (pc.iceGatheringState === "complete") resolve();
        };
        // Timeout after 5s
        setTimeout(resolve, 5000);
      });

      const res = await fetch(`/api/ring/live/${device.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sdp: pc.localDescription?.sdp }),
      });

      if (!res.ok) throw new Error("Falha ao iniciar stream");

      const { sdp } = await res.json();
      await pc.setRemoteDescription({ type: "answer", sdp });
      setIsLive(true);
    } catch (err) {
      console.error("[Ring Live]", err);
      setLiveError("Não foi possível conectar");
      stopLive();
    }
  }, [device.id, stopLive]);

  const startKasaLive = useCallback(async () => {
    setLiveError(null);
    try {
      const Hls = (await import("hls.js")).default;
      const hlsUrl = `/api/kasa/live/stream.m3u8`;

      if (!Hls.isSupported() && videoRef.current?.canPlayType("application/vnd.apple.mpegurl")) {
        // Safari native HLS
        videoRef.current.src = hlsUrl;
        videoRef.current.play();
        setIsLive(true);
        return;
      }

      if (!Hls.isSupported()) {
        setLiveError("Navegador não suporta HLS");
        return;
      }

      const hls = new Hls({
        liveSyncDurationCount: 2,
        liveMaxLatencyDurationCount: 4,
        enableWorker: true,
      });
      hlsRef.current = hls;

      hls.on(Hls.Events.ERROR, (_event: any, data: any) => {
        if (data.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            // Retry - stream might still be starting
            setTimeout(() => hls.loadSource(hlsUrl), 2000);
          } else {
            setLiveError("Erro no stream");
            stopLive();
          }
        }
      });

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        videoRef.current?.play();
        setIsLive(true);
      });

      hls.loadSource(hlsUrl);
      hls.attachMedia(videoRef.current!);

    } catch (err) {
      console.error("[Kasa Live]", err);
      setLiveError("Não foi possível conectar");
      stopLive();
    }
  }, [stopLive]);

  const startLive = useCallback(async () => {
    if (isRing) await startRingLive();
    else if (isKasa) await startKasaLive();
  }, [isRing, isKasa, startRingLive, startKasaLive]);

  const handleExpand = () => {
    setExpanded(true);
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    stopLive();
    setExpanded(false);
  };

  const handleRefresh = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRefreshKey((k) => k + 1);
  };

  const handleStartLive = (e: React.MouseEvent) => {
    e.stopPropagation();
    startLive();
  };

  return (
    <>
      {/* Camera card - thumbnail */}
      {!expanded && (
        <div
          className="relative overflow-hidden cursor-pointer group aspect-[16/10] rounded-2xl"
          onClick={handleExpand}
        >
          {imageUrl && !error ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt={device.name}
                className="w-full h-full object-cover"
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

          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />

          {/* Play button overlay */}
          {hasLive && !error && (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                <Play className="w-5 h-5 text-white ml-0.5" fill="white" />
              </div>
            </div>
          )}

          <div className="absolute bottom-3 left-3 right-12">
            <p className="text-[13px] font-medium text-white truncate">{device.name}</p>
          </div>

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
        </div>
      )}

      {/* Expanded live view */}
      {expanded && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4">
          {/* Header */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
            <div className="flex items-center gap-3">
              <h3 className="text-white font-medium">{device.name}</h3>
              {isLive && (
                <div className="flex items-center gap-1.5 bg-red-500/20 backdrop-blur-md rounded-full px-2.5 py-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 live-dot" />
                  <span className="text-[10px] font-medium text-red-400">AO VIVO</span>
                </div>
              )}
              {liveError && (
                <span className="text-[11px] text-red-400">{liveError}</span>
              )}
            </div>
            <button
              onClick={handleClose}
              className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Video / Image */}
          <div className="relative max-w-full max-h-[80vh] w-full flex items-center justify-center">
            {isLive ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="max-w-full max-h-[80vh] rounded-2xl"
              />
            ) : (
              <>
                {imageUrl && !error ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageUrl}
                    alt={device.name}
                    className="max-w-full max-h-[80vh] rounded-2xl object-contain"
                  />
                ) : (
                  <div className="w-96 h-64 bg-secondary/50 rounded-2xl flex flex-col items-center justify-center gap-2">
                    <Camera className="w-12 h-12 text-muted-foreground/30" />
                    <span className="text-sm text-muted-foreground">Sem preview</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Controls */}
          <div className="absolute bottom-6 flex gap-3">
            {!isLive && hasLive && (
              <button
                onClick={handleStartLive}
                className="flex items-center gap-2 px-5 py-2.5 bg-red-500/80 hover:bg-red-500 backdrop-blur-md rounded-full text-white text-sm font-medium transition-colors"
              >
                <Play className="w-4 h-4" fill="white" />
                Ao vivo
              </button>
            )}
            {isLive && (
              <button
                onClick={(e) => { e.stopPropagation(); stopLive(); }}
                className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white text-sm font-medium transition-colors"
              >
                Parar stream
              </button>
            )}
            {!isLive && hasSnapshot && (
              <button
                onClick={handleRefresh}
                className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white text-sm font-medium transition-colors"
              >
                <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                Atualizar
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
