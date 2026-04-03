"use client";

import Link from "next/link";
import { EmptyState } from "@/components/shared/EmptyState";
import { ArrowLeft, Clapperboard } from "lucide-react";

export default function ScenesPage() {
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
          <h1 className="text-2xl font-bold">Cenas</h1>
          <p className="text-sm text-muted-foreground">
            Crie cenários para controlar vários dispositivos de uma vez
          </p>
        </div>
      </div>

      <EmptyState
        icon={Clapperboard}
        title="Nenhuma cena configurada"
        description="Em breve você poderá criar cenas como 'Modo Cinema' ou 'Boa Noite' para controlar múltiplos dispositivos com um toque."
      />
    </div>
  );
}
