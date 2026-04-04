"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, UserPlus, Trash2, Users, Loader2, Check, Shield, Settings2, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { ROOMS } from "@/config/rooms";

interface Profile {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
  allowed_rooms: string[] | null;
  can_control: boolean;
  created_at: string;
}

const ALL_ROOMS = ROOMS.map((r) => ({ id: r.id, name: r.name }));

export default function AdminPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "user">("user");
  const [newRooms, setNewRooms] = useState<string[]>([]);
  const [allRoomsAccess, setAllRoomsAccess] = useState(true);
  const [newCanControl, setNewCanControl] = useState(true);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const fetchProfiles = useCallback(async () => {
    const res = await fetch("/api/admin/profiles");
    const data = await res.json();
    setProfiles(data.profiles || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setMessage(null);

    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: newEmail,
        password: newPassword,
        name: newName,
        role: newRole,
        allowed_rooms: allRoomsAccess ? null : newRooms,
        can_control: newCanControl,
      }),
    });
    const data = await res.json();

    if (data.error) {
      setMessage({ type: "error", text: data.error });
    } else {
      setMessage({ type: "success", text: `${newName} adicionado!` });
      setNewName("");
      setNewEmail("");
      setNewPassword("");
      setNewRole("user");
      setNewRooms([]);
      setAllRoomsAccess(true);
      setNewCanControl(true);
      fetchProfiles();
    }
    setCreating(false);
  };

  const handleDelete = async (userId: string, name: string) => {
    if (!confirm(`Remover ${name}?`)) return;
    const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
    const data = await res.json();
    if (data.error) {
      setMessage({ type: "error", text: data.error });
    } else {
      setMessage({ type: "success", text: `${name} removido` });
      fetchProfiles();
    }
  };

  const handleUpdateProfile = async (userId: string, updates: Partial<Profile>) => {
    const res = await fetch(`/api/admin/profiles/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (!data.error) {
      setMessage({ type: "success", text: "Permissões atualizadas!" });
      fetchProfiles();
    }
  };

  const toggleRoom = (rooms: string[], roomId: string) => {
    return rooms.includes(roomId)
      ? rooms.filter((r) => r !== roomId)
      : [...rooms, roomId];
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
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nome completo"
                required
                className="flex-1 px-4 py-2.5 bg-secondary rounded-xl text-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
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
                className="sm:w-36 px-4 py-2.5 bg-secondary rounded-xl text-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {/* Role */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">Perfil:</span>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="radio" checked={newRole === "user"} onChange={() => setNewRole("user")} className="accent-primary" />
                <span className="text-sm">Usuário</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="radio" checked={newRole === "admin"} onChange={() => setNewRole("admin")} className="accent-primary" />
                <span className="text-sm">Admin</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer ml-4">
                <input type="checkbox" checked={newCanControl} onChange={(e) => setNewCanControl(e.target.checked)} className="accent-primary" />
                <span className="text-sm">Pode controlar</span>
              </label>
            </div>

            {/* Room access */}
            <div>
              <label className="flex items-center gap-1.5 cursor-pointer mb-2">
                <input type="checkbox" checked={allRoomsAccess} onChange={(e) => setAllRoomsAccess(e.target.checked)} className="accent-primary" />
                <span className="text-sm">Acesso a todos os cômodos</span>
              </label>
              {!allRoomsAccess && (
                <div className="flex flex-wrap gap-2">
                  {ALL_ROOMS.map((room) => (
                    <button
                      key={room.id}
                      type="button"
                      onClick={() => setNewRooms(toggleRoom(newRooms, room.id))}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                        newRooms.includes(room.id)
                          ? "bg-primary/20 border-primary/30 text-primary"
                          : "bg-secondary border-border text-muted-foreground hover:border-primary/30"
                      )}
                    >
                      {room.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={creating}
              className="w-full sm:w-auto px-6 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Criar Usuário"}
            </button>
          </form>
        </div>

        {/* User list */}
        <div className="card-dark rounded-2xl p-5">
          <h2 className="text-base font-semibold flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-blue-400" />
            Usuários ({profiles.length})
          </h2>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-2">
              {profiles.map((p) => {
                const isExpanded = expandedUser === p.id;
                return (
                  <div key={p.id} className="rounded-xl bg-secondary/30 overflow-hidden">
                    {/* User row */}
                    <div className="flex items-center gap-3 py-3 px-4 hover:bg-secondary/50 transition-colors">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                        {p.name?.charAt(0).toUpperCase() || "?"}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{p.name || p.email}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{p.email}</p>
                      </div>

                      <span className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full shrink-0",
                        p.role === "admin" ? "bg-violet-400/15 text-violet-400" : "bg-blue-400/15 text-blue-400"
                      )}>
                        {p.role === "admin" ? "Admin" : "Usuário"}
                      </span>

                      {!p.can_control && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-400 shrink-0">
                          Somente leitura
                        </span>
                      )}

                      <button
                        onClick={() => setExpandedUser(isExpanded ? null : p.id)}
                        className="p-2 rounded-lg hover:bg-secondary transition-colors shrink-0"
                        title="Configurar permissões"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <Settings2 className="w-4 h-4" />}
                      </button>

                      <button
                        onClick={() => handleDelete(p.id, p.name || p.email)}
                        className="p-2 rounded-lg hover:bg-destructive/20 hover:text-destructive transition-colors shrink-0"
                        title="Remover"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Expanded permissions */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-1 border-t border-border/30 space-y-3">
                        {/* Name */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-16">Nome:</span>
                          <input
                            defaultValue={p.name}
                            onBlur={(e) => {
                              if (e.target.value !== p.name) handleUpdateProfile(p.id, { name: e.target.value });
                            }}
                            className="flex-1 px-3 py-1.5 bg-secondary rounded-lg text-sm border border-border focus:outline-none focus:ring-1 focus:ring-primary/50"
                          />
                        </div>

                        {/* Role */}
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground w-16">Perfil:</span>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="radio"
                              checked={p.role === "user"}
                              onChange={() => handleUpdateProfile(p.id, { role: "user" })}
                              className="accent-primary"
                            />
                            <span className="text-xs">Usuário</span>
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="radio"
                              checked={p.role === "admin"}
                              onChange={() => handleUpdateProfile(p.id, { role: "admin" })}
                              className="accent-primary"
                            />
                            <span className="text-xs">Admin</span>
                          </label>
                        </div>

                        {/* Can control */}
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground w-16">Controle:</span>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={p.can_control}
                              onChange={(e) => handleUpdateProfile(p.id, { can_control: e.target.checked })}
                              className="accent-primary"
                            />
                            <span className="text-xs">Pode ligar/desligar dispositivos</span>
                          </label>
                        </div>

                        {/* Room access */}
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-xs text-muted-foreground w-16">Cômodos:</span>
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={p.allowed_rooms === null}
                                onChange={(e) =>
                                  handleUpdateProfile(p.id, {
                                    allowed_rooms: e.target.checked ? null : ALL_ROOMS.map((r) => r.id),
                                  })
                                }
                                className="accent-primary"
                              />
                              <span className="text-xs">Todos</span>
                            </label>
                          </div>
                          {p.allowed_rooms !== null && (
                            <div className="flex flex-wrap gap-1.5 ml-[76px]">
                              {ALL_ROOMS.map((room) => (
                                <button
                                  key={room.id}
                                  onClick={() =>
                                    handleUpdateProfile(p.id, {
                                      allowed_rooms: toggleRoom(p.allowed_rooms || [], room.id),
                                    })
                                  }
                                  className={cn(
                                    "px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors",
                                    (p.allowed_rooms || []).includes(room.id)
                                      ? "bg-primary/20 border-primary/30 text-primary"
                                      : "bg-secondary border-border text-muted-foreground/50"
                                  )}
                                >
                                  {room.name}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
