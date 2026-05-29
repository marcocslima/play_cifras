import React, { useState } from "react";
import {
  Shield, Plus, Trash2, Edit2, Save, LogOut, AlertCircle,
  CheckCircle, Music, X, Crown, Users
} from "lucide-react";
import { Song } from "../types";
import SongForm from "./SongForm";
import { useAuth } from "../contexts/AuthContext";
import UserManagement from "./admin/UserManagement";

interface AdminPanelProps {
  songs: Song[];
  onAddCentralSong: (song: Song) => Promise<void>;
  onUpdateCentralSong: (song: Song) => Promise<void>;
  onDeleteCentralSong: (id: string) => Promise<void>;
  onClose: () => void;
}

type AdminTab = "cifras" | "users";

export default function AdminPanel({
  songs,
  onAddCentralSong,
  onUpdateCentralSong,
  onDeleteCentralSong,
  onClose,
}: AdminPanelProps) {
  const { user, userProfile, isAdmin, logout } = useAuth();

  const [activeTab, setActiveTab] = useState<AdminTab>("cifras");
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  const handleEditClick = (song: Song) => {
    setEditingSong(song);
    setIsAddingNew(false);
  };

  const handleDeleteClick = async (id: string) => {
    if (confirm("Deseja realmente excluir esta cifra do catálogo central?")) {
      try {
        await onDeleteCentralSong(id);
        setSuccessMsg("Cifra removida com sucesso!");
        setTimeout(() => setSuccessMsg(""), 3000);
      } catch (e: any) {
        setErrorMsg("Erro ao excluir cifra: " + e.message);
      }
    }
  };

  const handleSaveSongForm = async (song: Song) => {
    try {
      if (editingSong) {
        const updated = { ...song, id: editingSong.id };
        await onUpdateCentralSong(updated);
        setSuccessMsg("Cifra central atualizada com sucesso!");
        setEditingSong(null);
      } else {
        await onAddCentralSong(song);
        setSuccessMsg("Nova cifra central adicionada com sucesso!");
        setIsAddingNew(false);
      }
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (e: any) {
      setErrorMsg("Erro ao salvar cifra: " + e.message);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative">
      <div className="absolute top-0 left-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="bg-slate-950 p-5 border-b border-slate-850 flex items-center justify-between z-10 relative">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              Painel Administrativo
              <span className="text-[9px] bg-red-500/15 text-red-400 uppercase font-extrabold px-2 py-0.5 rounded-full border border-red-500/25 tracking-wider">
                Sessão Ativa
              </span>
            </h2>
            <p className="text-slate-400 text-xs">
              Gerenciamento de cifras e usuários da plataforma
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition duration-150 cursor-pointer"
          title="Fechar Painel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-slate-950/50 border-b border-slate-850 px-5 flex gap-1">
        <button
          onClick={() => setActiveTab("cifras")}
          className={`px-4 py-3 text-xs font-bold border-b-2 transition cursor-pointer ${
            activeTab === "cifras"
              ? "text-indigo-400 border-indigo-400"
              : "text-slate-400 border-transparent hover:text-slate-200"
          }`}
        >
          <Music className="w-3.5 h-3.5 inline mr-1.5" />
          Cifras ({songs.length})
        </button>
        <button
          onClick={() => setActiveTab("users")}
          className={`px-4 py-3 text-xs font-bold border-b-2 transition cursor-pointer ${
            activeTab === "users"
              ? "text-indigo-400 border-indigo-400"
              : "text-slate-400 border-transparent hover:text-slate-200"
          }`}
        >
          <Users className="w-3.5 h-3.5 inline mr-1.5" />
          Usuários
        </button>
      </div>

      {/* Content */}
      <div className="p-6 relative z-10 min-h-[300px]">
        {successMsg && (
          <div className="mb-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3.5 flex items-center gap-2.5 text-emerald-400 text-xs">
            <CheckCircle className="w-4.5 h-4.5 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="mb-4 bg-rose-500/10 border border-rose-500/20 rounded-xl p-3.5 flex items-center gap-2.5 text-rose-300 text-xs">
            <AlertCircle className="w-4.5 h-4.5 shrink-0" />
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg("")} className="ml-auto text-rose-400 hover:text-white font-bold px-1.5 py-0.5">X</button>
          </div>
        )}

        {activeTab === "users" ? (
          <UserManagement />
        ) : (
          <div>
            {/* Admin Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-950/50 p-4 rounded-xl border border-slate-850 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 shrink-0 border border-red-500/20">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-200">
                    {userProfile?.displayName || user?.displayName || "Administrador"} · Sessão Ativa
                  </p>
                  <span className="text-[10px] text-slate-450 font-medium">
                    Alterações salvam diretamente no Firestore.
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                <button
                  onClick={() => {
                    setEditingSong(null);
                    setIsAddingNew(true);
                  }}
                  className="flex-1 sm:flex-none px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg cursor-pointer transition flex items-center justify-center gap-1.5 border border-indigo-500"
                >
                  <Plus className="w-4 h-4" /> Nova Cifra Central
                </button>

                <button
                  onClick={handleLogout}
                  className="px-3 py-2 bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-bold rounded-lg cursor-pointer transition flex items-center gap-1.5 border border-slate-750"
                >
                  <LogOut className="w-4 h-4" /> Sair
                </button>
              </div>
            </div>

            {/* Form or List */}
            {isAddingNew || editingSong ? (
              <div className="bg-slate-950/30 p-4 rounded-2xl border border-slate-850">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-widest block">
                    {editingSong ? `Editando: ${editingSong.title}` : "Inserir Nova Cifra"}
                  </span>
                  <button
                    onClick={() => {
                      setEditingSong(null);
                      setIsAddingNew(false);
                    }}
                    className="text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>

                {editingSong ? (
                  <SongFormEditHelper
                    song={editingSong}
                    onSave={handleSaveSongForm}
                    onCancel={() => setEditingSong(null)}
                  />
                ) : (
                  <SongForm
                    onAddSong={handleSaveSongForm}
                    onCancel={() => setIsAddingNew(false)}
                  />
                )}
              </div>
            ) : (
              <div className="bg-slate-950 rounded-xl border border-slate-850 overflow-hidden">
                <div className="p-4 bg-slate-950 border-b border-slate-850 text-xs font-extrabold text-slate-400 uppercase tracking-wider grid grid-cols-12 gap-2 select-none">
                  <div className="col-span-5 sm:col-span-6">Cifra / Artista</div>
                  <div className="col-span-3 sm:col-span-2 text-center">Tom</div>
                  <div className="col-span-2 hidden sm:block text-center">BPM</div>
                  <div className="col-span-4 sm:col-span-2 text-right">Ações</div>
                </div>

                <div className="divide-y divide-slate-850 flex flex-col">
                  {songs.length > 0 ? (
                    songs.map((song) => (
                      <div
                        key={song.id}
                        className="p-4 grid grid-cols-12 gap-2 items-center text-sm hover:bg-slate-900/40 transition duration-150"
                      >
                        <div className="col-span-5 sm:col-span-6 flex items-center gap-2.5 min-w-0">
                          <div className="p-1.5 bg-slate-900 rounded-lg text-indigo-400 border border-slate-800 shrink-0">
                            <Music className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-slate-200 truncate leading-tight">{song.title}</h4>
                            <p className="text-slate-500 text-xs truncate mt-0.5">{song.artist}</p>
                          </div>
                        </div>
                        <div className="col-span-3 sm:col-span-2 text-center">
                          <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 font-mono font-bold rounded text-xs border border-indigo-500/10">
                            {song.tone}
                          </span>
                        </div>
                        <div className="col-span-2 hidden sm:block text-center font-mono text-slate-400">
                          {song.bpm || "--"}
                        </div>
                        <div className="col-span-4 sm:col-span-2 flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleEditClick(song)}
                            className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-indigo-400 border border-slate-800 rounded-lg transition cursor-pointer"
                            title="Editar cifra"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(song.id)}
                            className="p-2 bg-slate-900 hover:bg-rose-950/30 text-slate-450 hover:text-rose-400 border border-slate-800 rounded-lg transition cursor-pointer"
                            title="Remover cifra"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-slate-500 text-xs">
                      Nenhuma cifra disponível no catálogo central.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* Mini edit helper */
interface SongFormEditHelperProps {
  song: Song;
  onSave: (song: Song) => Promise<void>;
  onCancel: () => void;
}

function SongFormEditHelper({ song, onSave, onCancel }: SongFormEditHelperProps) {
  const [title, setTitle] = useState(song.title);
  const [artist, setArtist] = useState(song.artist);
  const [tone, setTone] = useState(song.tone);
  const [bpm, setBpm] = useState(song.bpm || 90);
  const [rawLrc, setRawLrc] = useState(song.rawLrc);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !artist.trim() || !rawLrc.trim()) {
      setErrorMsg("Preencha título, artista e letras sincronizadas LRC.");
      return;
    }
    onSave({
      id: song.id,
      title: title.trim(),
      artist: artist.trim(),
      tone: tone.trim(),
      bpm: Number(bpm) || 90,
      rawLrc: rawLrc.trim(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {errorMsg && (
        <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-lg">
          {errorMsg}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Nome da Música</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500" required />
        </div>
        <div>
          <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Artista</label>
          <input type="text" value={artist} onChange={(e) => setArtist(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500" required />
        </div>
        <div>
          <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Tom</label>
          <input type="text" value={tone} onChange={(e) => setTone(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500" />
        </div>
        <div>
          <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">BPM</label>
          <input type="number" value={bpm} onChange={(e) => setBpm(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500" />
        </div>
      </div>
      <div>
        <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">LRC Sincronizado</label>
        <textarea rows={10} value={rawLrc} onChange={(e) => setRawLrc(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 font-mono text-xs text-slate-200 focus:outline-none" required />
      </div>
      <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-800">
        <button type="button" onClick={onCancel} className="px-3.5 py-1.5 border border-slate-800 text-xs font-semibold text-slate-400 hover:text-white rounded cursor-pointer transition">
          Voltar
        </button>
        <button type="submit" className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white rounded cursor-pointer transition flex items-center gap-1.5">
          <Save className="w-3.5 h-3.5" /> Salvar Edição
        </button>
      </div>
    </form>
  );
}
