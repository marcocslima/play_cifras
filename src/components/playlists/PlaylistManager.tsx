import React, { useState, useEffect } from "react";
import {
  collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp, arrayUnion, arrayRemove
} from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../contexts/AuthContext";
import { Song } from "../../types";
import {
  ListMusic, Plus, Trash2, Edit2, Save, X, Music, Search,
  Loader2, FolderPlus, ChevronRight, ArrowLeft, Check
} from "lucide-react";

export interface Playlist {
  id: string;
  name: string;
  description: string;
  songIds: string[];
  userId: string;
  createdAt: any;
  updatedAt: any;
}

interface PlaylistManagerProps {
  songs: Song[];
  onPlaySong?: (songId: string) => void;
}

export default function PlaylistManager({ songs, onPlaySong }: PlaylistManagerProps) {
  const { user } = useAuth();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [addingSongsTo, setAddingSongsTo] = useState<string | null>(null);
  const [songSearch, setSongSearch] = useState("");

  // Form state
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "playlists"),
      where("userId", "==", user.uid)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const list: Playlist[] = [];
      snapshot.forEach((docRef) => {
        list.push({ id: docRef.id, ...docRef.data() } as Playlist);
      });
      list.sort((a, b) => {
        const aTime = a.updatedAt?.seconds || 0;
        const bTime = b.updatedAt?.seconds || 0;
        return bTime - aTime;
      });
      setPlaylists(list);
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  const handleCreate = async () => {
    if (!user || !formName.trim()) return;
    try {
      await addDoc(collection(db, "playlists"), {
        name: formName.trim(),
        description: formDesc.trim(),
        songIds: [],
        userId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setFormName("");
      setFormDesc("");
      setCreating(false);
    } catch (error) {
      console.error("Erro ao criar playlist:", error);
      alert("Erro ao criar playlist.");
    }
  };

  const handleUpdate = async (playlistId: string) => {
    if (!formName.trim()) return;
    try {
      await updateDoc(doc(db, "playlists", playlistId), {
        name: formName.trim(),
        description: formDesc.trim(),
        updatedAt: serverTimestamp(),
      });
      setEditingId(null);
      setFormName("");
      setFormDesc("");
    } catch (error) {
      console.error("Erro ao atualizar playlist:", error);
    }
  };

  const handleDelete = async (playlistId: string) => {
    if (!confirm("Deseja realmente excluir esta playlist?")) return;
    try {
      await deleteDoc(doc(db, "playlists", playlistId));
      if (selectedPlaylist?.id === playlistId) setSelectedPlaylist(null);
    } catch (error) {
      console.error("Erro ao excluir playlist:", error);
    }
  };

  const handleAddSong = async (playlistId: string, songId: string) => {
    try {
      await updateDoc(doc(db, "playlists", playlistId), {
        songIds: arrayUnion(songId),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Erro ao adicionar música:", error);
    }
  };

  const handleRemoveSong = async (playlistId: string, songId: string) => {
    try {
      await updateDoc(doc(db, "playlists", playlistId), {
        songIds: arrayRemove(songId),
        updatedAt: serverTimestamp(),
      });
      // Atualizar playlist selecionada localmente
      if (selectedPlaylist?.id === playlistId) {
        setSelectedPlaylist({
          ...selectedPlaylist,
          songIds: selectedPlaylist.songIds.filter((id) => id !== songId),
        });
      }
    } catch (error) {
      console.error("Erro ao remover música:", error);
    }
  };

  const startEdit = (pl: Playlist) => {
    setEditingId(pl.id);
    setFormName(pl.name);
    setFormDesc(pl.description);
    setCreating(false);
  };

  const startCreate = () => {
    setCreating(true);
    setEditingId(null);
    setFormName("");
    setFormDesc("");
  };

  if (!user) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
        <ListMusic className="w-10 h-10 text-slate-600 mx-auto mb-3" />
        <h3 className="text-sm font-bold text-slate-300 mb-1">Faça login para usar Playlists</h3>
        <p className="text-xs text-slate-500">Você precisa estar logado para criar e gerenciar suas playlists.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
      </div>
    );
  }

  // View: adding songs to a playlist
  if (addingSongsTo) {
    const playlist = playlists.find((p) => p.id === addingSongsTo);
    if (!playlist) { setAddingSongsTo(null); return null; }
    const filteredSongs = songs.filter((s) => {
      const q = songSearch.toLowerCase();
      return s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q);
    });

    return (
      <div className="flex flex-col gap-4">
        <button
          onClick={() => { setAddingSongsTo(null); setSongSearch(""); }}
          className="flex items-center gap-1.5 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition cursor-pointer self-start"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar para "{playlist.name}"
        </button>

        <h3 className="text-sm font-bold text-slate-200">Adicionar músicas à playlist</h3>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar músicas..."
            value={songSearch}
            onChange={(e) => setSongSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition"
          />
        </div>

        <div className="bg-slate-950 rounded-xl border border-slate-850 divide-y divide-slate-850 max-h-[400px] overflow-y-auto">
          {filteredSongs.map((song) => {
            const isInPlaylist = playlist.songIds.includes(song.id);
            return (
              <div key={song.id} className="p-3 flex items-center justify-between gap-2 hover:bg-slate-900/40 transition">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Music className="w-4 h-4 text-indigo-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-200 truncate">{song.title}</p>
                    <p className="text-[10px] text-slate-400 truncate">{song.artist}</p>
                  </div>
                </div>
                {isInPlaylist ? (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold shrink-0">
                    <Check className="w-3.5 h-3.5" /> Adicionada
                  </span>
                ) : (
                  <button
                    onClick={() => handleAddSong(playlist.id, song.id)}
                    className="px-2.5 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-[10px] font-bold rounded-lg border border-indigo-500/20 transition cursor-pointer shrink-0"
                  >
                    + Adicionar
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // View: selected playlist details
  if (selectedPlaylist) {
    const currentPlaylist = playlists.find((p) => p.id === selectedPlaylist.id) || selectedPlaylist;
    const playlistSongs = songs.filter((s) => currentPlaylist.songIds.includes(s.id));

    return (
      <div className="flex flex-col gap-4">
        <button
          onClick={() => setSelectedPlaylist(null)}
          className="flex items-center gap-1.5 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition cursor-pointer self-start"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar às Playlists
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-200">{currentPlaylist.name}</h3>
            {currentPlaylist.description && (
              <p className="text-xs text-slate-400 mt-0.5">{currentPlaylist.description}</p>
            )}
          </div>
          <button
            onClick={() => setAddingSongsTo(currentPlaylist.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Adicionar Músicas
          </button>
        </div>

        {playlistSongs.length === 0 ? (
          <div className="bg-slate-950 border border-slate-850 rounded-xl p-8 text-center">
            <Music className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-400">Nenhuma música nesta playlist ainda.</p>
          </div>
        ) : (
          <div className="bg-slate-950 rounded-xl border border-slate-850 divide-y divide-slate-850">
            {playlistSongs.map((song) => (
              <div key={song.id} className="p-3 flex items-center justify-between gap-2 hover:bg-slate-900/40 transition">
                <div
                  className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1"
                  onClick={() => onPlaySong?.(song.id)}
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-indigo-400 shrink-0 border border-slate-800">
                    <Music className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-200 truncate hover:text-indigo-400 transition">{song.title}</p>
                    <p className="text-[10px] text-slate-400 truncate">{song.artist} · Tom: {song.tone}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveSong(currentPlaylist.id, song.id)}
                  className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition cursor-pointer shrink-0"
                  title="Remover da playlist"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Main view: playlist list
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListMusic className="w-5 h-5 text-indigo-400" />
          <h3 className="text-sm font-bold text-slate-200">Minhas Playlists</h3>
        </div>
        {!creating && (
          <button
            onClick={startCreate}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition cursor-pointer"
          >
            <FolderPlus className="w-3.5 h-3.5" /> Nova Playlist
          </button>
        )}
      </div>

      {/* Create/Edit form */}
      {(creating || editingId) && (
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            {creating ? "Nova Playlist" : "Editar Playlist"}
          </h4>
          <input
            type="text"
            placeholder="Nome da playlist"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition"
          />
          <input
            type="text"
            placeholder="Descrição (opcional)"
            value={formDesc}
            onChange={(e) => setFormDesc(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition"
          />
          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={() => {
                setCreating(false);
                setEditingId(null);
                setFormName("");
                setFormDesc("");
              }}
              className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={() => editingId ? handleUpdate(editingId) : handleCreate()}
              disabled={!formName.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" /> Salvar
            </button>
          </div>
        </div>
      )}

      {/* Playlists list */}
      {playlists.length === 0 && !creating ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
          <ListMusic className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-300 mb-1">Nenhuma playlist criada</h3>
          <p className="text-xs text-slate-500 mb-4">Crie sua primeira playlist e organize suas cifras favoritas!</p>
          <button
            onClick={startCreate}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition cursor-pointer"
          >
            <FolderPlus className="w-4 h-4 inline mr-1.5" /> Criar Playlist
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {playlists.map((pl) => (
            <div
              key={pl.id}
              className="bg-slate-900 border border-slate-850 rounded-xl p-4 hover:border-slate-700 transition group"
            >
              <div className="flex items-start justify-between gap-2">
                <div
                  className="flex-1 cursor-pointer min-w-0"
                  onClick={() => setSelectedPlaylist(pl)}
                >
                  <h4 className="text-sm font-bold text-slate-200 group-hover:text-indigo-400 transition truncate">
                    {pl.name}
                  </h4>
                  {pl.description && (
                    <p className="text-[11px] text-slate-400 mt-0.5 truncate">{pl.description}</p>
                  )}
                  <p className="text-[10px] text-slate-500 mt-2 flex items-center gap-1">
                    <Music className="w-3 h-3" /> {pl.songIds.length} música{pl.songIds.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => startEdit(pl)}
                    className="p-1.5 text-slate-500 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(pl.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setSelectedPlaylist(pl)}
                    className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
