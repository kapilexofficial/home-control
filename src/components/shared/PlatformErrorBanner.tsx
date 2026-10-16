"use client";

import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { useDevices } from "@/hooks/useDevices";
import { cn } from "@/lib/utils";

interface PlatformError {
  platform: string;
  message: string;
  hint?: string;
}

// Friendly hints for errors we already know how to fix
const KNOWN_HINTS: Array<{ test: RegExp; hint: string }> = [
  {
    test: /28841002|subscription has expired/i,
    hint: "A assinatura do IoT Core expirou. Renove em iot.tuya.com → Cloud → Cloud Services → IoT Core.",
  },
  {
    test: /\b401\b|unauthori[sz]ed|invalid.*token|token.*(expired|invalid)/i,
    hint: "Credenciais expiradas ou inválidas. Refaça o login da plataforma.",
  },
  {
    test: /ECONNREFUSED|ETIMEDOUT|ENOTFOUND|fetch failed|timed? ?out/i,
    hint: "Sem conexão com a plataforma. Verifique rede, IP ou túnel.",
  },
];

// API errors come as "Platform: message"
function parseError(raw: string): PlatformError {
  const idx = raw.indexOf(": ");
  const platform = idx > 0 ? raw.slice(0, idx) : "Plataforma";
  const message = idx > 0 ? raw.slice(idx + 2) : raw;
  const hint = KNOWN_HINTS.find((h) => h.test.test(message))?.hint;
  return { platform, message, hint };
}

export function PlatformErrorBanner({ className }: { className?: string }) {
  const { platformErrors, fetchError } = useDevices();
  const [dismissedSignature, setDismissedSignature] = useState<string | null>(null);

  const items: PlatformError[] = fetchError
    ? [{ platform: "Servidor", message: fetchError, hint: "Não foi possível carregar a lista de dispositivos." }]
    : platformErrors.map(parseError);

  // Dismissal only lasts while the same set of errors persists
  const signature = items.map((e) => `${e.platform}:${e.message}`).join("|");
  if (items.length === 0 || dismissedSignature === signature) return null;

  const names = items.map((e) => e.platform);
  const title =
    names.length === 1
      ? `${names[0]} indisponível · dispositivos ocultos`
      : `${names.length} plataformas indisponíveis · dispositivos ocultos`;

  return (
    <div
      role="alert"
      className={cn(
        "flex gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3",
        className
      )}
    >
      <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-300">{title}</p>
        <ul className="mt-1 space-y-1.5">
          {items.map((e) => (
            <li key={`${e.platform}:${e.message}`} className="text-xs text-muted-foreground break-words">
              <span className="font-medium text-foreground">{e.platform}:</span> {e.message}
              {e.hint && <span className="block text-amber-300/90 mt-0.5">{e.hint}</span>}
            </li>
          ))}
        </ul>
      </div>
      <button
        type="button"
        onClick={() => setDismissedSignature(signature)}
        aria-label="Fechar aviso"
        className="p-1 h-fit rounded-lg text-muted-foreground hover:text-foreground hover:bg-amber-400/15 shrink-0 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
