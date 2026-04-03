"use client";

import Link from "next/link";
import { ArrowLeft, Settings, ExternalLink } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/"
          className="p-2 rounded-lg hover:bg-secondary transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Configurações</h1>
          <p className="text-sm text-muted-foreground">
            Configure as integrações e personalize o painel
          </p>
        </div>
      </div>

      <div className="space-y-4 max-w-2xl">
        {/* Tuya Integration */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-medium flex items-center gap-2">
            <Settings className="w-4 h-4 text-primary" />
            Integração Tuya
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Configure suas credenciais da Tuya IoT Platform para conectar seus dispositivos.
          </p>
          <div className="mt-4 space-y-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">
                Client ID
              </label>
              <input
                type="text"
                placeholder="Seu Tuya Client ID"
                className="w-full px-3 py-2 bg-secondary rounded-xl text-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary/50"
                disabled
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">
                Client Secret
              </label>
              <input
                type="password"
                placeholder="Seu Tuya Client Secret"
                className="w-full px-3 py-2 bg-secondary rounded-xl text-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary/50"
                disabled
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Configure via variáveis de ambiente (.env.local).
            </p>
          </div>
        </div>

        {/* Philips Hue Integration */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-medium flex items-center gap-2">
            <Settings className="w-4 h-4 text-yellow-400" />
            Integração Philips Hue
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Conecte sua Hue Bridge para controlar lâmpadas Philips Hue.
          </p>
          <div className="mt-3">
            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
              Em breve
            </span>
          </div>
        </div>

        {/* Links */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-medium">Links Úteis</h3>
          <div className="mt-3 space-y-2">
            <a
              href="https://iot.tuya.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-primary hover:underline"
            >
              Tuya IoT Platform
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
