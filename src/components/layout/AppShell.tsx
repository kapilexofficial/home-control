"use client";

import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { MobileNav } from "./MobileNav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <div className="lg:pl-64">
        <TopBar />

        <main className="p-4 lg:p-8 pb-24 lg:pb-8">
          {children}
        </main>
      </div>

      <MobileNav />
    </div>
  );
}
