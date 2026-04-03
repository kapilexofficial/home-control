"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Home, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      setError("Email ou senha incorretos");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center border border-primary/20 mb-4">
            <Home className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold">
            Home <span className="gradient-text">Control</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Automação Residencial
          </p>
        </div>

        {/* Login form */}
        <form onSubmit={handleSubmit} className="card-dark rounded-2xl p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 bg-destructive/10 text-destructive rounded-xl px-4 py-3 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              className="w-full px-4 py-3 bg-secondary rounded-xl text-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-4 py-3 bg-secondary rounded-xl text-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={cn(
              "w-full py-3 rounded-xl text-sm font-semibold transition-all",
              "bg-primary text-primary-foreground hover:bg-primary/90",
              loading && "opacity-50 cursor-not-allowed"
            )}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin mx-auto" />
            ) : (
              "Entrar"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
