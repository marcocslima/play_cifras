import React, { useState, useEffect } from "react";
import { collection, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth, UserProfile, UserRole } from "../../contexts/AuthContext";
import { Shield, User, Crown, Search, ArrowUpCircle, ArrowDownCircle, Loader2, Users } from "lucide-react";

export default function UserManagement() {
  const { userProfile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "users"), (snapshot) => {
      const list: UserProfile[] = [];
      snapshot.forEach((docRef) => {
        list.push(docRef.data() as UserProfile);
      });
      // Ordenar: admins primeiro, depois por nome
      list.sort((a, b) => {
        if (a.role === "admin" && b.role !== "admin") return -1;
        if (a.role !== "admin" && b.role === "admin") return 1;
        return (a.displayName || a.email).localeCompare(b.displayName || b.email);
      });
      setUsers(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleRoleChange = async (targetUid: string, newRole: UserRole) => {
    // Prevenir que admin remova o próprio acesso
    if (targetUid === userProfile?.uid && newRole !== "admin") {
      alert("Você não pode remover seu próprio acesso de administrador.");
      return;
    }

    setUpdating(targetUid);
    try {
      await updateDoc(doc(db, "users", targetUid), { role: newRole });
      setSuccessMsg(`Role atualizada para "${newRole}" com sucesso!`);
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (error) {
      console.error("Erro ao atualizar role:", error);
      alert("Erro ao atualizar role. Verifique as permissões.");
    } finally {
      setUpdating(null);
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      (u.displayName || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-400" />
          <h3 className="text-sm font-bold text-slate-200">Gerenciar Usuários ({users.length})</h3>
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-emerald-400 text-xs">
          {successMsg}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          placeholder="Buscar por nome ou email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition"
        />
      </div>

      {/* Users list */}
      <div className="bg-slate-950 rounded-xl border border-slate-850 overflow-hidden divide-y divide-slate-850">
        {filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            Nenhum usuário encontrado.
          </div>
        ) : (
          filteredUsers.map((u) => (
            <div key={u.uid} className="p-4 flex items-center justify-between gap-3 hover:bg-slate-900/40 transition">
              <div className="flex items-center gap-3 min-w-0">
                {u.photoURL ? (
                  <img
                    src={u.photoURL}
                    alt={u.displayName}
                    className="w-9 h-9 rounded-full border border-slate-700 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-slate-400" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-slate-200 truncate">{u.displayName || "Sem nome"}</p>
                    {u.role === "admin" && (
                      <span className="text-[8px] bg-red-500/15 text-red-400 uppercase font-extrabold px-1.5 py-0.5 rounded-full border border-red-500/25 tracking-wider flex items-center gap-0.5 shrink-0">
                        <Shield className="w-2.5 h-2.5" /> Admin
                      </span>
                    )}
                    {u.uid === userProfile?.uid && (
                      <span className="text-[8px] bg-indigo-500/15 text-indigo-400 uppercase font-extrabold px-1.5 py-0.5 rounded-full border border-indigo-500/25 tracking-wider shrink-0">
                        Você
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 truncate">{u.email}</p>
                </div>
              </div>

              <div className="shrink-0">
                {updating === u.uid ? (
                  <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                ) : u.uid === userProfile?.uid ? (
                  <span className="text-[10px] text-slate-500 font-medium">—</span>
                ) : u.role === "admin" ? (
                  <button
                    onClick={() => handleRoleChange(u.uid, "user")}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 text-xs font-bold rounded-lg border border-orange-500/20 transition cursor-pointer"
                    title="Rebaixar para usuário comum"
                  >
                    <ArrowDownCircle className="w-3.5 h-3.5" />
                    Rebaixar
                  </button>
                ) : (
                  <button
                    onClick={() => handleRoleChange(u.uid, "admin")}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-lg border border-emerald-500/20 transition cursor-pointer"
                    title="Promover a administrador"
                  >
                    <ArrowUpCircle className="w-3.5 h-3.5" />
                    Promover
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
