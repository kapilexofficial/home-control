"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDevices } from "@/hooks/useDevices";
import { useCommand } from "@/hooks/useCommand";
import { useProfile } from "@/hooks/useProfile";
import { TopNav } from "@/components/dashboard/TopNav";
import { CameraFeed } from "@/components/devices/CameraFeed";
import { DeviceType } from "@/types/device";
import type { Device } from "@/types/device";
import { ROOMS as ROOM_CONFIG } from "@/config/rooms";
import {
  Loader2, MapPin, Droplets, Thermometer, Bell, Eye, Video, Camera,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ROOMS = [
  { id: "all", name: "Todos" },
  ...ROOM_CONFIG.map((r) => ({ id: r.id, name: r.name })),
];

const ROOM_COLORS: Record<string, { bg: string; accent: string; glow: string; badge: string }> = {
  sala:              { bg: "from-blue-500/10 to-indigo-500/5",   accent: "text-blue-400",    glow: "glow-blue",    badge: "bg-blue-400/15 text-blue-400" },
  "suite-principal": { bg: "from-violet-500/10 to-purple-500/5", accent: "text-violet-400",  glow: "glow-violet",  badge: "bg-violet-400/15 text-violet-400" },
  "quarto-victoria": { bg: "from-pink-500/10 to-rose-500/5",    accent: "text-pink-400",    glow: "glow-rose",    badge: "bg-pink-400/15 text-pink-400" },
  "quarto-visitas":  { bg: "from-orange-500/10 to-amber-500/5", accent: "text-orange-400",  glow: "glow-amber",   badge: "bg-orange-400/15 text-orange-400" },
  piscina:           { bg: "from-teal-500/10 to-cyan-500/5",    accent: "text-teal-400",    glow: "glow-emerald", badge: "bg-teal-400/15 text-teal-400" },
  frente:            { bg: "from-amber-500/10 to-yellow-500/5", accent: "text-amber-400",   glow: "glow-amber",   badge: "bg-amber-400/15 text-amber-400" },
  garagem:           { bg: "from-slate-500/10 to-gray-500/5",   accent: "text-slate-400",   glow: "glow-blue",    badge: "bg-slate-400/15 text-slate-400" },
  escritorio:        { bg: "from-emerald-500/10 to-green-500/5",accent: "text-emerald-400", glow: "glow-emerald", badge: "bg-emerald-400/15 text-emerald-400" },
  "suite-piscina":   { bg: "from-cyan-500/10 to-sky-500/5",    accent: "text-cyan-400",    glow: "glow-blue",    badge: "bg-cyan-400/15 text-cyan-400" },
};
const DEFAULT_ROOM_COLOR = { bg: "from-slate-500/10 to-gray-500/5", accent: "text-slate-400", glow: "", badge: "bg-slate-400/15 text-slate-400" };

function useCurrentTime() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return time;
}

export default function DashboardPage() {
  const [activeRoom, setActiveRoom] = useState("all");
  const { data: devices, isLoading } = useDevices();
  const { toggle, setBrightness, sendCommand } = useCommand();
  const { data: profile } = useProfile();
  const [hueBtnSceneIndex, setHueBtnSceneIndex] = useState(-1);
  const now = useCurrentTime();

  const { data: weather } = useQuery({
    queryKey: ["weather"],
    queryFn: async () => { const r = await fetch("/api/weather"); return r.json(); },
    refetchInterval: 300000,
  });

  const { data: ringEvents } = useQuery({
    queryKey: ["ring-events"],
    queryFn: async () => { const r = await fetch("/api/ring/events"); return (await r.json()).events as Array<{ time: string; title: string; description: string; kind: string }>; },
    refetchInterval: 30000,
  });

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  const allDevicesRaw = devices || [];
  // Filter by user permissions (null = all rooms allowed)
  const allDevices = profile?.allowed_rooms
    ? allDevicesRaw.filter((d) => !d.roomId || profile.allowed_rooms!.includes(d.roomId))
    : allDevicesRaw;
  const visibleDevices = activeRoom === "all" ? allDevices : allDevices.filter((d) => d.roomId === activeRoom);
  const onlineDevices = visibleDevices.filter((d) => d.online);
  const cameras = onlineDevices.filter((d) => d.type === DeviceType.CAMERA);
  const sensors = onlineDevices.filter((d) => d.type === DeviceType.SENSOR);
  const lights = onlineDevices.filter((d) => d.type === DeviceType.LIGHT);
  const buttons = onlineDevices.filter((d) =>
    d.id.startsWith("hue-btn-") ||
    ((d.type === DeviceType.SWITCH || d.type === DeviceType.LOCK || d.type === DeviceType.COVER) &&
    (d.name.toLowerCase().includes("portão") || d.name.toLowerCase().includes("portao") || d.name.toLowerCase().includes("garagem") || d.name.toLowerCase().includes("gate") || d.roomId === "garagem"))
  );
  const switches = onlineDevices.filter((d) =>
    (d.type === DeviceType.SWITCH || d.type === DeviceType.LOCK || d.type === DeviceType.FAN) &&
    !buttons.some(b => b.id === d.id)
  );
  const lightsOn = lights.filter((d) => d.state === "on").length;

  const greeting = now.getHours() < 12 ? "Bom dia" : now.getHours() < 18 ? "Boa tarde" : "Boa noite";
  const events = ringEvents || [];
  const kindIcons: Record<string, typeof Eye> = { motion: Eye, ding: Bell, on_demand: Video };
  const kindColors: Record<string, string> = { motion: "text-yellow-400", ding: "text-red-400", on_demand: "text-blue-400" };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 pb-8">
        <TopNav rooms={ROOMS} activeRoom={activeRoom} onRoomChange={setActiveRoom} />

        <div className="space-y-5">
          {/* ── TOP: Greeting/Weather/Time + Sensors + Activity (all aligned) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-3">
            {/* Left column: greeting bar + sensor cards */}
            <div className="space-y-3">
              {/* Greeting bar */}
              <div className="card-dark rounded-2xl p-5 flex items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-semibold">
                    {greeting}, <span className="gradient-text">{profile?.name?.split(" ")[0] || "Usuário"}</span>
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    {now.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </div>
                <div className="hidden sm:flex items-center gap-3 px-5 border-l border-r border-border">
                  <span className="text-3xl">{weather?.emoji || "🌡️"}</span>
                  <div>
                    <span className="text-3xl font-light tabular-nums">{weather?.temperature ?? "--"}°</span>
                    {weather?.temperature != null && (
                      <span className="text-lg font-light tabular-nums text-muted-foreground ml-1.5">{Math.round(weather.temperature * 9/5 + 32)}°F</span>
                    )}
                    <div className="flex items-center gap-2 mt-0.5">
                      <MapPin className="w-3 h-3 text-primary" />
                      <span className="text-xs text-muted-foreground">Davenport, FL</span>
                      <Droplets className="w-3 h-3 text-blue-400 ml-1" />
                      <span className="text-xs text-muted-foreground">{weather?.humidity ?? "--"}%</span>
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-4xl font-light tabular-nums tracking-tight">
                    {now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    :{now.toLocaleTimeString("pt-BR", { second: "2-digit" }).split(":").pop()}
                  </p>
                </div>
              </div>

              {/* Sensor cards — 2 columns with thermometer illustration */}
              {sensors.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {sensors.map((sensor) => {
                    const temp = sensor.attributes.temperature;
                    const hum = sensor.attributes.humidity;
                    const battery = sensor.attributes.battery as number | undefined;
                    const shortName = sensor.name.replace("Temperatura ", "");
                    const isWarm = (temp ?? 0) > 25;
                    const tempPercent = Math.min(Math.max(((temp ?? 20) - 10) / 30, 0), 1) * 100;
                    return (
                      <div key={sensor.id} className={`card-dark rounded-2xl p-5 flex items-center gap-4 ${isWarm ? "glow-rose" : "glow-blue"}`}>
                        {/* Thermometer SVG */}
                        <div className="shrink-0">
                          <svg width="36" height="80" viewBox="0 0 36 80">
                            <defs>
                              <linearGradient id={`tg-${sensor.id}`} x1="0" y1="1" x2="0" y2="0">
                                <stop offset="0%" stopColor={isWarm ? "#fb7185" : "#60a5fa"} />
                                <stop offset="100%" stopColor={isWarm ? "#f43f5e" : "#3b82f6"} stopOpacity="0.3" />
                              </linearGradient>
                            </defs>
                            {/* Bulb */}
                            <circle cx="18" cy="66" r="12" fill={`url(#tg-${sensor.id})`} opacity="0.25" />
                            <circle cx="18" cy="66" r="9" fill={`url(#tg-${sensor.id})`} opacity="0.5" />
                            <circle cx="18" cy="66" r="6" fill={isWarm ? "#fb7185" : "#60a5fa"} />
                            {/* Tube */}
                            <rect x="14" y="8" width="8" height="50" rx="4" fill="rgba(255,255,255,0.06)" />
                            <rect x="14" y={8 + 50 * (1 - tempPercent / 100)} width="8" height={50 * tempPercent / 100} rx="4"
                              fill={`url(#tg-${sensor.id})`} />
                            {/* Cap */}
                            <rect x="12" y="4" width="12" height="6" rx="3" fill="rgba(255,255,255,0.08)" />
                            {/* Tick marks */}
                            <line x1="24" y1="18" x2="28" y2="18" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                            <line x1="24" y1="28" x2="28" y2="28" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                            <line x1="24" y1="38" x2="28" y2="38" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                            <line x1="24" y1="48" x2="28" y2="48" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                          </svg>
                        </div>
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium">{shortName}</span>
                            {battery != null && (
                              <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">{battery}%</span>
                            )}
                          </div>
                          <div className="flex items-baseline gap-2">
                            <p className={cn("text-5xl font-light tabular-nums leading-none", isWarm ? "text-rose-300" : "text-blue-300")}>
                              {temp != null ? `${temp}°` : "--°"}
                            </p>
                            {temp != null && (
                              <span className="text-xl font-light tabular-nums text-muted-foreground">{Math.round(temp * 9/5 + 32)}°F</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <Droplets className="w-3.5 h-3.5 text-blue-400" />
                            <span className="text-sm text-muted-foreground">{hum ?? "--"}%</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right column: Activity — aligned with left column height */}
            <div className="card-dark rounded-2xl p-4 flex flex-col self-start" style={{ maxHeight: "260px" }}>
              <div className="flex items-center justify-between mb-3 shrink-0">
                <div className="flex items-center gap-2">
                  <Camera className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-[13px] font-semibold">Atividade Ring</span>
                </div>
                <span className="text-[10px] text-muted-foreground">{events.length} eventos</span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-0.5 pr-1">
                {events.map((ev, i) => {
                  const Icon = kindIcons[ev.kind] || Eye;
                  const color = kindColors[ev.kind] || "text-muted-foreground";
                  return (
                    <div key={i} className="flex items-center gap-2 py-1.5 hover:bg-secondary/30 rounded-lg px-2 transition-colors">
                      <Icon className={cn("w-3.5 h-3.5 shrink-0", color)} />
                      <div className="flex-1 min-w-0">
                        <span className="text-[11px] font-medium truncate block">{ev.title}</span>
                        <span className="text-[10px] text-muted-foreground truncate block">{ev.description}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">{ev.time}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── LUZES & INTERRUPTORES side by side ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* LUZES — grid com cor do cômodo no label */}
            {lights.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <span className="text-base font-semibold">Luzes</span>
                  <span className="text-[11px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">{lights.length}</span>
                  {lightsOn > 0 && (
                    <span className="text-[11px] text-primary bg-primary/10 px-2 py-0.5 rounded-full ml-auto">
                      {lightsOn} ligada{lightsOn !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {lights.map((light) => (
                    <LightCard key={light.id} device={light} onToggle={toggle} onBrightnessChange={setBrightness} />
                  ))}
                </div>
              </div>
            )}

            {/* RIGHT COLUMN: INTERRUPTORES & BOTOES */}
            {(switches.length > 0 || buttons.length > 0) && (
              <div className="flex flex-col gap-5">
                {/* INTERRUPTORES */}
                {switches.length > 0 && (
                  <div className="card-dark rounded-2xl p-5 flex-1 self-start w-full">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                      <span className="text-base font-semibold">Interruptores</span>
                      <span className="text-[11px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">{switches.length}</span>
                    </div>
                    <div className="space-y-2">
                      {switches.map((sw) => {
                        const isOn = sw.state === "on";
                        const isAvailable = sw.online && sw.state !== "unavailable";
                        const roomConfig = ROOM_CONFIG.find((r) => r.id === sw.roomId);
                        const colors = ROOM_COLORS[sw.roomId || ""] || DEFAULT_ROOM_COLOR;
                        return (
                          <div key={sw.id} className={cn(
                            "rounded-xl p-3.5 transition-all duration-300 border border-transparent flex items-center gap-3",
                            isOn ? "bg-emerald-400/[0.04] border-emerald-400/10" : "bg-secondary/30",
                            !isAvailable && "opacity-35"
                          )}>
                            {/* Switch illustration */}
                            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", isOn ? "bg-emerald-400/15" : "bg-secondary")}>
                              <svg width="18" height="26" viewBox="0 0 18 26" className={isOn ? "opacity-100" : "opacity-30"}>
                                <rect x="1" y="1" width="16" height="24" rx="4" fill="none" stroke={isOn ? "#34d399" : "#444"} strokeWidth="1.5" />
                                <rect x="5" y={isOn ? 3 : 13} width="8" height="10" rx="2" fill={isOn ? "#34d399" : "#444"} opacity={isOn ? 0.8 : 0.4} />
                                {isOn && <circle cx="9" cy="8" r="1.5" fill="#fff" opacity="0.6" />}
                              </svg>
                            </div>

                            {/* Name + room */}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{sw.name}</p>
                              <p className={cn("text-[11px]", colors.accent)}>{roomConfig?.name || ""}</p>
                            </div>

                            {/* Status */}
                            <span className={cn("text-xs font-medium", isOn ? "text-emerald-400" : "text-muted-foreground")}>
                              {!isAvailable ? "Offline" : isOn ? "ON" : "OFF"}
                            </span>

                            {/* Toggle switch (interruptor style) */}
                            <button onClick={() => toggle(sw.id, !isOn)} disabled={!isAvailable}
                              className={cn(
                                "relative w-14 h-8 rounded-lg shrink-0 transition-all border",
                                isOn ? "bg-emerald-400/20 border-emerald-400/30" : "bg-muted border-border",
                                !isAvailable && "cursor-not-allowed opacity-40"
                              )}>
                              <span className={cn(
                                "absolute top-[3px] w-[24px] h-[26px] rounded-md shadow-md transition-all",
                                isOn ? "left-[26px] bg-emerald-400" : "left-[3px] bg-muted-foreground/60"
                              )} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* BOTOES */}
                <div className="card-dark rounded-2xl p-5 flex-1 self-start w-full min-h-[150px]">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
                    <span className="text-base font-semibold">Botões</span>
                    <span className="text-[11px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">{buttons.length}</span>
                  </div>
                  {buttons.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                      {buttons.map((btn) => {
                        const isHueBtn = btn.id.startsWith("hue-btn-");
                        // For Hue button: check if linked room lights are on
                        const hueBtnLights = isHueBtn ? allDevices.filter((d) =>
                          d.platform === "hue" && d.type === DeviceType.LIGHT &&
                          (d.id === "hue-9" || d.id === "hue-7")
                        ) : [];
                        const isOn = isHueBtn ? hueBtnLights.some((l) => l.state === "on") : btn.state === "on";
                        const isAvailable = isHueBtn ? btn.online : btn.online && btn.state !== "unavailable";

                        const HUE_BTN_SCENES = [
                          { id: "09o8DYaHz37aT84H", name: "Energizar" },
                          { id: "-5h5lqg0s8DNaqCl", name: "Concentrar" },
                          { id: "yQirFz2Nj1nTXuuP", name: "Leitura" },
                          { id: "swdiPp3coFXr1Gf7", name: "Relaxar" },
                          { id: "Rv4amZzcduLaDBEH", name: "Luz noturna" },
                        ];
                        const currentScene = isHueBtn ? HUE_BTN_SCENES[hueBtnSceneIndex] : null;

                        const handleClick = () => {
                          if (!isAvailable) return;
                          if (isHueBtn) {
                            const nextIndex = hueBtnSceneIndex + 1;
                            if (!isOn || nextIndex >= HUE_BTN_SCENES.length) {
                              // If off -> first scene; if last scene -> turn off
                              if (!isOn) {
                                setHueBtnSceneIndex(0);
                                sendCommand(btn.id, "scene", HUE_BTN_SCENES[0].id);
                              } else {
                                setHueBtnSceneIndex(-1);
                                sendCommand(btn.id, "off", true);
                              }
                            } else {
                              setHueBtnSceneIndex(nextIndex);
                              sendCommand(btn.id, "scene", HUE_BTN_SCENES[nextIndex].id);
                            }
                          } else {
                            toggle(btn.id, !isOn);
                          }
                        };

                        return (
                          <div key={btn.id} className={cn(
                            "rounded-xl p-3 transition-all duration-300 border border-transparent flex flex-col items-center justify-center gap-1.5 cursor-pointer active:scale-95",
                            isOn ? "bg-indigo-400/[0.06] border-indigo-400/15" : "bg-secondary/30",
                            !isAvailable && "opacity-35 cursor-not-allowed"
                          )}
                          onClick={handleClick}
                          >
                            {/* Power button icon - metallic 3D style */}
                            <div className="relative w-14 h-14 flex items-center justify-center">
                              <div className={cn(
                                "absolute inset-0 rounded-full",
                                isOn
                                  ? "bg-gradient-to-b from-indigo-300 via-indigo-400 to-indigo-600 shadow-[0_0_15px_rgba(129,140,248,0.4)]"
                                  : "bg-gradient-to-b from-zinc-400 via-zinc-500 to-zinc-700"
                              )} />
                              <div className={cn(
                                "absolute inset-[4px] rounded-full bg-gradient-to-b shadow-inner",
                                isOn ? "from-zinc-900 via-zinc-950 to-black" : "from-zinc-800 via-zinc-900 to-black"
                              )} />
                              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="relative z-10">
                                <path d="M12 3v8" stroke={isOn ? "#818cf8" : "#999"} strokeWidth="2.5" strokeLinecap="round" />
                                <path d="M17.5 6.5a8 8 0 1 1-11 0" stroke={isOn ? "#818cf8" : "#999"} strokeWidth="2.5" strokeLinecap="round" fill="none" />
                              </svg>
                            </div>

                            <p className="text-[11px] font-medium text-center truncate w-full">{btn.name}</p>
                            <span className={cn("text-[10px] font-semibold", isOn ? "text-indigo-400" : "text-muted-foreground")}>
                              {!isAvailable ? "Offline" : isHueBtn && currentScene ? currentScene.name : isOn ? "ON" : "OFF"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-6 text-center border border-dashed border-border/50 rounded-xl bg-secondary/10">
                      <span className="text-sm text-muted-foreground">Nenhum botão de Portão encontrado.</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── CAMERAS ── */}
          {cameras.length > 0 && (() => {
            // Fixed order: Piscina 01, Piscina 02, Garagem on top row, rest on bottom
            const topNames = ["piscina 01", "piscina 02", "garagem"];
            const topCams = topNames
              .map((n) => cameras.find((c) => c.name.toLowerCase() === n))
              .filter(Boolean) as Device[];
            const bottomCams = cameras.filter((c) => !topNames.includes(c.name.toLowerCase()));

            return (
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                  <span className="text-base font-semibold">Cameras</span>
                  <span className="text-[11px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">{cameras.length}</span>
                </div>
                {/* Top row */}
                <div className="grid grid-cols-3 gap-3 mb-3">
                  {topCams.map((cam) => (
                    <div key={cam.id} className="card-dark rounded-2xl overflow-hidden"><CameraFeed device={cam} /></div>
                  ))}
                </div>
                {/* Bottom row */}
                <div className="grid grid-cols-3 gap-3">
                  {bottomCams.map((cam) => (
                    <div key={cam.id} className="card-dark rounded-2xl overflow-hidden"><CameraFeed device={cam} /></div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

/* ── Device Card ── */
function RoomDeviceCard({ device, colors, onToggle, onBrightnessChange }: {
  device: Device; colors: { bg: string; accent: string; glow: string }; onToggle: (id: string, s: boolean) => void; onBrightnessChange: (id: string, b: number) => void;
}) {
  const isOn = device.state === "on";
  const isAvailable = device.online && device.state !== "unavailable";
  const brightness = (device.attributes.brightness as number) ?? 100;
  const isLight = device.type === DeviceType.LIGHT;
  const isHue = device.platform === "hue";

  return (
    <div className={cn("card-dark rounded-2xl overflow-hidden transition-all duration-300", isOn && isAvailable && colors.glow, !isAvailable && "opacity-35")}>
      {/* Illustration */}
      <div className={cn("relative h-28 flex items-center justify-center bg-gradient-to-br overflow-hidden", colors.bg)}>
        <DeviceIllustration device={device} isOn={isOn && isAvailable} accentColor={colors.accent} />
      </div>
      {/* Controls */}
      <div className="p-3.5 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-[12px] font-medium truncate">{device.name}</h3>
            <span className={cn("text-[10px]", isOn ? colors.accent : "text-muted-foreground")}>
              {!isAvailable ? "Offline" : isOn ? (isLight ? `${brightness}%` : "Ligado") : "Desligado"}
            </span>
          </div>
          <button onClick={() => onToggle(device.id, !isOn)} disabled={!isAvailable}
            className={cn("relative w-10 h-[22px] rounded-full shrink-0 transition-colors", isOn ? "bg-primary" : "bg-muted", !isAvailable && "cursor-not-allowed opacity-40")}>
            <span className={cn("absolute top-[2px] left-[2px] w-[18px] h-[18px] bg-white rounded-full shadow-sm transition-transform", isOn && "translate-x-[18px]")} />
          </button>
        </div>
        {isLight && isOn && isAvailable && (
          <div className="space-y-1.5">
            <div className="relative h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary/50 to-primary rounded-full transition-all" style={{ width: `${brightness}%` }} />
              <input type="range" min={1} max={100} value={brightness} onChange={(e) => onBrightnessChange(device.id, Number(e.target.value))} className="absolute inset-0 w-full opacity-0 cursor-pointer" />
            </div>
            {isHue && (
              <div className="relative h-1.5 rounded-full overflow-hidden color-temp-bar">
                <input type="range" min={153} max={500} value={device.attributes.color_temp ?? 300} onChange={() => {}} className="absolute inset-0 w-full opacity-0 cursor-pointer" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Light Card with rainbow gauge ── */
function LightCard({ device, onToggle, onBrightnessChange }: {
  device: Device; onToggle: (id: string, s: boolean) => void; onBrightnessChange: (id: string, b: number) => void;
}) {
  const isOn = device.state === "on";
  const bri = (device.attributes.brightness as number) ?? 100;
  const isHue = device.platform === "hue";
  const roomConfig = ROOM_CONFIG.find((r) => r.id === device.roomId);
  const roomColors = ROOM_COLORS[device.roomId || ""] || DEFAULT_ROOM_COLOR;
  const name = device.name.toLowerCase();

  // Rainbow gauge arc
  const gaugeRadius = 52;
  const gaugeCirc = 2 * Math.PI * gaugeRadius;
  const gaugeArc = gaugeCirc * 0.6; // 216 degrees
  const gaugeOffset = gaugeArc * (1 - bri / 100);

  // Pick illustration based on name
  let illustration: "pendant" | "bulb" | "tv" | "plant" | "spot" = "bulb";
  if (name.includes("abajur") || name.includes("lamp")) illustration = "pendant";
  if (name.includes("tv")) illustration = "tv";
  if (name.includes("vaso") || name.includes("jardim")) illustration = "plant";
  if (name.includes("entrada") || name.includes("frente")) illustration = "spot";

  return (
    <div className={cn(
      "card-dark rounded-2xl overflow-hidden transition-all duration-300",
      isOn && "glow-amber"
    )}>
      {/* Top: illustration */}
      <div className="relative h-32 flex items-center justify-center bg-gradient-to-br from-amber-900/10 via-transparent to-orange-900/5 overflow-hidden">
        {/* Glow behind */}
        {isOn && <div className="absolute w-24 h-24 rounded-full bg-amber-400/10 blur-2xl" />}
        <LightIllustration type={illustration} isOn={isOn} />
        {/* Toggle top right */}
        <button onClick={() => onToggle(device.id, !isOn)}
          className={cn("absolute top-3 right-3 w-10 h-5 rounded-full transition-colors", isOn ? "bg-primary" : "bg-muted/60")}>
          <span className={cn("absolute top-[2px] left-[2px] w-4 h-4 bg-white rounded-full shadow transition-transform", isOn && "translate-x-5")} />
        </button>
      </div>

      {/* Bottom: info + gauge */}
      <div className="p-4">
        {/* Name + room */}
        <p className="text-sm font-semibold truncate">{device.name}</p>
        <p className={cn("text-[11px]", roomColors.accent)}>{roomConfig?.name || ""}</p>

        {/* Gauge */}
        {isOn && (
          <div className="mt-3 flex flex-col items-center">
            <div className="relative w-[120px] h-[72px] overflow-hidden">
              <svg width="120" height="72" viewBox="0 0 120 72">
                <defs>
                  <linearGradient id={`rg-${device.id}`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#ef4444" />
                    <stop offset="25%" stopColor="#f59e0b" />
                    <stop offset="50%" stopColor="#22c55e" />
                    <stop offset="75%" stopColor="#06b6d4" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                </defs>
                {/* Background arc */}
                <circle cx="60" cy="60" r={gaugeRadius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8"
                  strokeDasharray={`${gaugeArc} ${gaugeCirc - gaugeArc}`}
                  strokeLinecap="round" transform="rotate(162 60 60)" />
                {/* Colored arc */}
                <circle cx="60" cy="60" r={gaugeRadius} fill="none" stroke={`url(#rg-${device.id})`} strokeWidth="8"
                  strokeDasharray={`${gaugeArc} ${gaugeCirc - gaugeArc}`}
                  strokeDashoffset={gaugeOffset}
                  strokeLinecap="round" transform="rotate(162 60 60)" className="gauge-ring" />
              </svg>
              {/* Percentage in center */}
              <div className="absolute inset-0 flex items-end justify-center pb-1">
                <span className="text-2xl font-bold tabular-nums">{bri}<span className="text-sm text-muted-foreground">%</span></span>
              </div>
            </div>
            {/* Slider invisible over gauge */}
            <input type="range" min={1} max={100} value={bri}
              onChange={(e) => onBrightnessChange(device.id, Number(e.target.value))}
              className="w-full mt-1 h-1 appearance-none bg-transparent cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:bg-muted [&::-webkit-slider-runnable-track]:rounded-full" />
            {/* Color temp for Hue */}
            {isHue && (
              <div className="relative h-1.5 w-full rounded-full overflow-hidden color-temp-bar mt-2">
                <input type="range" min={153} max={500} value={device.attributes.color_temp ?? 300}
                  onChange={() => {}} className="absolute inset-0 w-full opacity-0 cursor-pointer" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Light SVG Illustrations (detailed) ── */
function LightIllustration({ type, isOn }: { type: string; isOn: boolean }) {
  const o = isOn ? "opacity-100" : "opacity-25";
  const glow = isOn ? "drop-shadow(0 4px 20px rgba(232,184,75,0.5))" : "none";

  if (type === "pendant") {
    return (
      <svg width="90" height="110" viewBox="0 0 90 110" className={cn("transition-all duration-500", o)} style={{ filter: glow }}>
        {/* Wire */}
        <line x1="45" y1="0" x2="45" y2="25" stroke="#777" strokeWidth="1.5" />
        {/* Canopy */}
        <ellipse cx="45" cy="25" rx="6" ry="2.5" fill="#555" />
        {/* Shade outer */}
        <path d="M15 65 Q15 28 45 28 Q75 28 75 65 Z" fill={isOn ? "#3d3428" : "#222"} />
        {/* Shade rim */}
        <ellipse cx="45" cy="65" rx="30" ry="5" fill={isOn ? "#4a3c28" : "#282828"} />
        {/* Inner gold reflection */}
        <path d="M22 62 Q22 35 45 35 Q68 35 68 62 Z" fill={isOn ? "#e8b84b" : "#1a1a1c"} opacity={isOn ? 0.12 : 0.05} />
        {/* Light cone */}
        {isOn && <>
          <path d="M25 68 L8 105 L82 105 L65 68 Z" fill="rgba(232,184,75,0.04)" />
          <ellipse cx="45" cy="105" rx="37" ry="4" fill="rgba(232,184,75,0.06)" />
        </>}
      </svg>
    );
  }

  if (type === "tv") {
    return (
      <svg width="100" height="75" viewBox="0 0 100 75" className={cn("transition-all duration-500", o)}
        style={{ filter: isOn ? "drop-shadow(0 4px 20px rgba(96,165,250,0.5))" : "none" }}>
        <rect x="10" y="8" width="80" height="50" rx="4" fill="#0d1117" stroke={isOn ? "#4a90ff" : "#333"} strokeWidth="2" />
        <rect x="14" y="12" width="72" height="42" rx="2" fill={isOn ? "#111827" : "#111"} />
        {isOn && <>
          <rect x="2" y="12" width="5" height="42" rx="2.5" fill="rgba(96,165,250,0.5)" />
          <rect x="93" y="12" width="5" height="42" rx="2.5" fill="rgba(96,165,250,0.5)" />
          <rect x="14" y="12" width="72" height="42" rx="2" fill="rgba(96,165,250,0.03)" />
        </>}
        <rect x="35" y="60" width="30" height="4" rx="2" fill="#333" />
        <rect x="40" y="64" width="20" height="3" rx="1.5" fill="#2a2a2e" />
      </svg>
    );
  }

  if (type === "plant") {
    return (
      <svg width="80" height="100" viewBox="0 0 80 100" className={cn("transition-all duration-500", o)}
        style={{ filter: isOn ? "drop-shadow(0 4px 20px rgba(52,211,153,0.5))" : "none" }}>
        {/* Pot */}
        <path d="M22 62 L18 92 Q18 96 24 96 L56 96 Q62 96 62 92 L58 62 Z" fill={isOn ? "#5c3d2e" : "#2a2020"} />
        <rect x="18" y="58" width="44" height="6" rx="2" fill={isOn ? "#6d4a38" : "#332828"} />
        {/* Soil */}
        <ellipse cx="40" cy="62" rx="18" ry="3" fill={isOn ? "#3d2820" : "#221a1a"} />
        {/* Leaves */}
        {isOn ? <>
          <path d="M40 56 C35 38 20 32 24 16 C28 24 35 22 38 14 C36 28 40 38 40 56Z" fill="#22c55e" opacity="0.85" />
          <path d="M40 56 C45 40 56 34 54 20 C50 26 44 24 42 16 C43 30 39 38 40 56Z" fill="#16a34a" opacity="0.75" />
          <path d="M40 56 C37 44 28 42 30 30 C33 36 38 34 40 28 C39 38 41 44 40 56Z" fill="#4ade80" opacity="0.65" />
          <circle cx="30" cy="22" r="3.5" fill="#f472b6" opacity="0.7" />
          <circle cx="50" cy="26" r="3" fill="#fbbf24" opacity="0.6" />
          <circle cx="35" cy="34" r="2" fill="#c084fc" opacity="0.5" />
        </> : <>
          <path d="M40 56 C35 38 20 32 24 16 C28 24 35 22 38 14 C36 28 40 38 40 56Z" fill="#444" opacity="0.3" />
          <path d="M40 56 C45 40 56 34 54 20 C50 26 44 24 42 16 C43 30 39 38 40 56Z" fill="#444" opacity="0.25" />
        </>}
      </svg>
    );
  }

  if (type === "spot") {
    return (
      <svg width="70" height="90" viewBox="0 0 70 90" className={cn("transition-all duration-500", o)} style={{ filter: glow }}>
        {/* Ceiling mount */}
        <rect x="28" y="0" width="14" height="6" rx="2" fill="#444" />
        <line x1="35" y1="6" x2="35" y2="20" stroke="#666" strokeWidth="1.5" />
        {/* Spot head */}
        <ellipse cx="35" cy="30" rx="18" ry="12" fill={isOn ? "#2a2520" : "#1e1e20"} stroke={isOn ? "#e8b84b" : "#333"} strokeWidth="1.5" />
        <ellipse cx="35" cy="32" rx="12" ry="6" fill={isOn ? "rgba(232,184,75,0.2)" : "transparent"} />
        {/* Light beam */}
        {isOn && <>
          <path d="M20 36 L5 88 L65 88 L50 36 Z" fill="rgba(232,184,75,0.04)" />
          <ellipse cx="35" cy="88" rx="30" ry="3" fill="rgba(232,184,75,0.06)" />
        </>}
      </svg>
    );
  }

  // Default bulb
  return (
    <svg width="55" height="90" viewBox="0 0 55 90" className={cn("transition-all duration-500", o)} style={{ filter: glow }}>
      {/* Bulb glass */}
      <path d="M27.5 8 C12 8 3 24 3 36 C3 48 15 55 17 64 L38 64 C40 55 52 48 52 36 C52 24 43 8 27.5 8Z"
        fill={isOn ? "rgba(232,184,75,0.1)" : "#1a1a1c"} stroke={isOn ? "#e8b84b" : "#2a2a2e"} strokeWidth="1.5" />
      {/* Filament */}
      {isOn && <>
        <path d="M20 40 Q24 30 27.5 40 Q31 50 35 40" fill="none" stroke="#e8b84b" strokeWidth="1" opacity="0.6" />
        <circle cx="27.5" cy="36" r="10" fill="rgba(232,184,75,0.08)" />
      </>}
      {/* Base */}
      <rect x="17" y="64" width="21" height="5" rx="1" fill="#4a4a50" />
      <rect x="18" y="69" width="19" height="4" rx="1" fill="#3a3a40" />
      <rect x="19" y="73" width="17" height="4" rx="1" fill="#3a3a40" />
      <rect x="21" y="77" width="13" height="3" rx="1.5" fill="#333" />
      {/* Screw threads */}
      <line x1="17" y1="66" x2="38" y2="66" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
      <line x1="18" y1="71" x2="37" y2="71" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
    </svg>
  );
}

/* ── SVG Illustrations ── */
function DeviceIllustration({ device, isOn, accentColor }: { device: Device; isOn: boolean; accentColor: string }) {
  const name = device.name.toLowerCase();
  const o = isOn ? "opacity-100" : "opacity-30";
  const g = (color: string) => isOn ? `drop-shadow(0 0 15px ${color})` : "none";

  if (name.includes("abajur") || name.includes("lamp")) {
    return (
      <svg width="80" height="95" viewBox="0 0 80 95" className={cn("transition-all duration-500", o)} style={{ filter: g("rgba(232,184,75,0.4)") }}>
        <line x1="40" y1="0" x2="40" y2="22" stroke={isOn ? "#888" : "#333"} strokeWidth="2" />
        <path d="M12 50 Q12 22 40 22 Q68 22 68 50 Z" fill={isOn ? "#2d2820" : "#1a1a1c"} stroke={isOn ? "#e8b84b" : "#2a2a2e"} strokeWidth="1.5" />
        {isOn && <ellipse cx="40" cy="52" rx="22" ry="6" fill="rgba(232,184,75,0.12)" />}
        {isOn && <ellipse cx="40" cy="60" rx="12" ry="25" fill="rgba(232,184,75,0.04)" />}
        <path d="M12 50 L68 50" stroke={isOn ? "#c9a040" : "#2a2a2e"} strokeWidth="0.5" />
      </svg>
    );
  }

  if (name.includes("tv")) {
    return (
      <svg width="90" height="65" viewBox="0 0 90 65" className={cn("transition-all duration-500", o)} style={{ filter: g("rgba(96,165,250,0.4)") }}>
        <rect x="8" y="6" width="74" height="46" rx="5" fill="#0d1117" stroke={isOn ? "#60a5fa" : "#2a2a2e"} strokeWidth="1.5" />
        <rect x="12" y="10" width="66" height="38" rx="2" fill={isOn ? "#111827" : "#111"} />
        {isOn && <rect x="0" y="10" width="3" height="38" rx="1.5" fill="rgba(96,165,250,0.4)" />}
        {isOn && <rect x="87" y="10" width="3" height="38" rx="1.5" fill="rgba(96,165,250,0.4)" />}
        <rect x="32" y="54" width="26" height="3" rx="1.5" fill="#2a2a2e" />
      </svg>
    );
  }

  if (name.includes("jardim") || name.includes("vaso")) {
    return (
      <svg width="70" height="85" viewBox="0 0 70 85" className={cn("transition-all duration-500", o)} style={{ filter: g("rgba(52,211,153,0.4)") }}>
        <rect x="18" y="52" width="34" height="26" rx="4" fill={isOn ? "#1a2e1a" : "#1a1a1c"} stroke={isOn ? "#34d399" : "#2a2a2e"} strokeWidth="1.5" />
        <rect x="22" y="48" width="26" height="6" rx="2" fill={isOn ? "#1f3a1f" : "#1e1e20"} />
        {isOn && <>
          <path d="M35 48 C30 32 18 28 22 14 C25 20 32 18 34 12 C32 24 37 30 35 48Z" fill="#34d399" opacity="0.7" />
          <path d="M35 48 C40 34 50 30 48 18 C45 22 40 20 37 14 C38 26 34 32 35 48Z" fill="#22c55e" opacity="0.6" />
          <circle cx="28" cy="20" r="3" fill="#f472b6" opacity="0.6" />
          <circle cx="44" cy="24" r="2.5" fill="#fbbf24" opacity="0.5" />
        </>}
      </svg>
    );
  }

  if (name.includes("entrada") || name.includes("frente") || name.includes("door")) {
    return (
      <svg width="55" height="80" viewBox="0 0 55 80" className={cn("transition-all duration-500", o)} style={{ filter: g("rgba(232,184,75,0.4)") }}>
        <rect x="8" y="5" width="38" height="68" rx="3" fill={isOn ? "#1e1a14" : "#1a1a1c"} stroke={isOn ? "#e8b84b" : "#2a2a2e"} strokeWidth="1.5" />
        <rect x="13" y="10" width="28" height="22" rx="2" fill={isOn ? "#252018" : "#151515"} />
        <rect x="13" y="38" width="28" height="22" rx="2" fill={isOn ? "#252018" : "#151515"} />
        <circle cx="39" cy="42" r="3" fill={isOn ? "#e8b84b" : "#333"} />
        {isOn && <rect x="6" y="0" width="42" height="5" rx="2.5" fill="rgba(232,184,75,0.15)" />}
      </svg>
    );
  }

  if (name.includes("hub") || name.includes("zigbee") || name.includes("router")) {
    return (
      <svg width="80" height="60" viewBox="0 0 80 60" className={cn("transition-all duration-500", o)} style={{ filter: g("rgba(56,189,248,0.4)") }}>
        <rect x="6" y="26" width="68" height="28" rx="6" fill={isOn ? "#0f1a2e" : "#1a1a1c"} stroke={isOn ? "#38bdf8" : "#2a2a2e"} strokeWidth="1.5" />
        <line x1="18" y1="26" x2="12" y2="6" stroke={isOn ? "#38bdf8" : "#333"} strokeWidth="2.5" strokeLinecap="round" />
        <line x1="40" y1="26" x2="40" y2="3" stroke={isOn ? "#38bdf8" : "#333"} strokeWidth="2.5" strokeLinecap="round" />
        <line x1="62" y1="26" x2="68" y2="6" stroke={isOn ? "#38bdf8" : "#333"} strokeWidth="2.5" strokeLinecap="round" />
        {isOn && <>
          <circle cx="22" cy="40" r="3" fill="#38bdf8" opacity="0.9" />
          <circle cx="34" cy="40" r="3" fill="#34d399" opacity="0.9" />
          <circle cx="46" cy="40" r="3" fill="#38bdf8" opacity="0.5" />
          <circle cx="58" cy="40" r="3" fill="#fbbf24" opacity="0.7" />
        </>}
      </svg>
    );
  }

  if (name.includes("porta") || name.includes("lock") || name.includes("garagem")) {
    return (
      <svg width="55" height="75" viewBox="0 0 55 75" className={cn("transition-all duration-500", o)} style={{ filter: g("rgba(251,113,133,0.4)") }}>
        <path d="M12 34 Q12 12 27.5 12 Q43 12 43 34" fill="none" stroke={isOn ? "#fb7185" : "#333"} strokeWidth="4.5" strokeLinecap="round" />
        <rect x="7" y="32" width="41" height="34" rx="6" fill={isOn ? "#2a1520" : "#1a1a1c"} stroke={isOn ? "#fb7185" : "#2a2a2e"} strokeWidth="1.5" />
        <circle cx="27.5" cy="46" r="5.5" fill={isOn ? "#fb7185" : "#333"} opacity="0.9" />
        <rect x="25.5" y="50" width="4" height="9" rx="2" fill={isOn ? "#fb7185" : "#333"} opacity="0.7" />
      </svg>
    );
  }

  // Default lightbulb
  return (
    <svg width="48" height="80" viewBox="0 0 48 80" className={cn("transition-all duration-500", o)} style={{ filter: g("rgba(232,184,75,0.4)") }}>
      <path d="M24 8 C10 8 3 22 3 33 C3 44 14 50 16 58 L32 58 C34 50 45 44 45 33 C45 22 38 8 24 8Z"
        fill={isOn ? "rgba(232,184,75,0.12)" : "#1a1a1c"} stroke={isOn ? "#e8b84b" : "#2a2a2e"} strokeWidth="1.5" />
      <rect x="17" y="58" width="14" height="8" rx="2" fill={isOn ? "#3a3a3e" : "#1e1e20"} />
      <rect x="19" y="66" width="10" height="3" rx="1.5" fill={isOn ? "#2a2a2e" : "#161618"} />
      {isOn && <circle cx="24" cy="33" r="12" fill="rgba(232,184,75,0.08)" />}
    </svg>
  );
}
