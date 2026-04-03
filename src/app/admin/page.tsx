"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, UserPlus, Trash2, Users, Loader2, Check, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface User {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  confirmed: boolean;
}

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchUsers = useCallback(async () => {
    const res = await fetch("/api/admin/users");
    const data = await res.json();
    setUsers(data.users || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setMessage(null);

    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: newEmail, password: newPassword }),
    });
    const data = await res.json();

    if (data.error) {
      setMessage({ type: "error", text: data.error });
    } else {
      setMessage({ type: "success", text: `Usuário ${newEmail} criado!` });
      setNewEmail("");
      setNewPassword("");
      fetchUsers();
    }
    setCreating(false);
  };

  const handleDelete = async (userId: string, email: string) => {
    if (!confirm(`Remover ${email}?`)) return;

    const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
    const data = await res.json();

    if (data.error) {
      setMessage({ type: "error", text: data.error });
    } else {
      setMessage({ type: "success", text: `${email} removido` });
      fetchUsers();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[800px] mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/" className="p-2 rounded-lg hover:bg-secondary transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <Shield className="w-5 h-5 text-primary" />
          <h1 className="text-2xl font-semibold">Admin</h1>
        </div>

        {/* Message */}
        {message && (
          <div className={cn(
            "rounded-xl px-4 py-3 text-sm mb-4 flex items-center gap-2",
            message.type === "success" ? "bg-emerald-400/10 text-emerald-400" : "bg-destructive/10 text-destructive"
          )}>
            {message.type === "success" ? <Check className="w-4 h-4" /> : null}
            {message.text}
          </div>
        )}

        {/* Add user form */}
        <div className="card-dark rounded-2xl p-5 mb-5">
          <h2 className="text-base font-semibold flex items-center gap-2 mb-4">
            <UserPlus className="w-4 h-4 text-primary" />
            Adicionar Usuário
          </h2>
          <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="Email"
              required
              className="flex-1 px-4 py-2.5 bg-secondary rounded-xl text-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Senha"
              required
              minLength={6}
              className="flex-1 px-4 py-2.5 bg-secondary rounded-xl text-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <button
              type="submit"
              disabled={creating}
              className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 shrink-0"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Criar"}
            </button>
          </form>
        </div>

        {/* User list */}
        <div className="card-dark rounded-2xl p-5">
          <h2 className="text-base font-semibold flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-blue-400" />
            Usuários ({users.length})
          </h2>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-2">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 py-3 px-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors"
                >
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                    {user.email?.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user.email}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Criado em {new Date(user.created_at).toLocaleDateString("pt-BR")}
                      {user.last_sign_in_at && (
                        <> · Último login {new Date(user.last_sign_in_at).toLocaleDateString("pt-BR")}</>
                      )}
                    </p>
                  </div>

                  {/* Status */}
                  <span className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full shrink-0",
                    user.confirmed ? "bg-emerald-400/15 text-emerald-400" : "bg-amber-400/15 text-amber-400"
                  )}>
                    {user.confirmed ? "Ativo" : "Pendente"}
                  </span>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(user.id, user.email || "")}
                    className="p-2 rounded-lg hover:bg-destructive/20 hover:text-destructive transition-colors shrink-0"
                    title="Remover"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
