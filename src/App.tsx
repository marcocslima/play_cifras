import React, { useState, useEffect } from "react";
import {
  Music,
  Search,
  Play,
  Info,
  Layers,
  Guitar,
  Shield,
  ListMusic,
  MessageCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { Song, FaceScrollSettings } from "./types";
import { PRESET_SONGS } from "./data/songs";
import SongViewer from "./components/SongViewer";
import SongForm from "./components/SongForm";
import AdminPanel from "./components/AdminPanel";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import LoginButton from "./components/auth/LoginButton";
import UserMenu from "./components/auth/UserMenu";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import PlaylistManager from "./components/playlists/PlaylistManager";
import CommentSection from "./components/comments/CommentSection";

// Firebase imports
import {
  collection,
  query,
  where,
  onSnapshot,
  setDoc,
  doc,
  deleteDoc,
  serverTimestamp,
  getDocFromServer,
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "./firebase";

// ==========================================
// Componente principal com rotas
// ==========================================
function AppContent() {
  const navigate = useNavigate();
  const { user, isAdmin, isLoggedIn, userProfile } = useAuth();

  const [centralSongs, setCentralSongs] = useState<Song[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSongId, setActiveSongId] = useState<string | null>(null);
  const [showComments, setShowComments] = useState(false);

  const songs = centralSongs;

  // FaceScroll settings
  const [faceSettings, setFaceSettings] = useState<FaceScrollSettings>(() => {
    const saved = localStorage.getItem("facescroll_settings_v1");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          isEnabled: false,
          sensitivity: parsed.sensitivity ?? 5,
          scrollSpeed: parsed.scrollSpeed ?? 3,
          thresholdPercent: parsed.thresholdPercent ?? 12,
          calibratedValue: parsed.calibratedValue ?? null,
          updateIntervalSeconds: parsed.updateIntervalSeconds ?? 3,
        };
      } catch (e) { /* fallback */ }
    }
    return {
      isEnabled: false,
      sensitivity: 5,
      scrollSpeed: 3,
      thresholdPercent: 12,
      calibratedValue: null,
      updateIntervalSeconds: 3,
    };
  });

  useEffect(() => {
    localStorage.setItem("facescroll_settings_v1", JSON.stringify(faceSettings));
  }, [faceSettings]);

  const [loadingSync, setLoadingSync] = useState(true);

  // Synchronize with Firebase Firestore
  useEffect(() => {
    let unsubscribeCentral: () => void = () => {};
    try {
      const q = query(
        collection(db, "songs"),
        where("ownerId", "==", "admin")
      );
      unsubscribeCentral = onSnapshot(
        q,
        (snapshot) => {
          const list: Song[] = [];
          snapshot.forEach((docRef) => {
            const data = docRef.data();
            list.push({
              id: docRef.id,
              title: data.title,
              artist: data.artist,
              tone: data.tone,
              bpm: data.bpm ?? undefined,
              rawLrc: data.rawLrc,
              ownerId: "admin",
            });
          });
          if (list.length > 0) {
            setCentralSongs(list);
          } else {
            const seeded = PRESET_SONGS.map((p) => ({ ...p, ownerId: "admin" }));
            setCentralSongs(seeded);
          }
          setLoadingSync(false);
        },
        (error) => {
          console.warn("Central collection listing from cloud fallback to presets: ", error);
          setCentralSongs(PRESET_SONGS.map((p) => ({ ...p, ownerId: "admin" })));
          setLoadingSync(false);
        }
      );
    } catch (err) {
      setCentralSongs(PRESET_SONGS.map((p) => ({ ...p, ownerId: "admin" })));
      setLoadingSync(false);
    }

    return () => {
      unsubscribeCentral();
    };
  }, []);

  // --- Admin-only cloud database mutations ---
  const handleAddCentralSong = async (newSong: Song) => {
    if (!isAdmin) {
      alert("Apenas administradores podem adicionar cifras.");
      return;
    }
    const rawId = newSong.id || `central-${Math.random().toString(36).substring(2, 12)}`;
    const docId = rawId.startsWith("custom-") ? rawId.replace("custom-", "central-") : rawId;
    setLoadingSync(true);
    try {
      const payload: any = {
        id: docId,
        title: newSong.title,
        artist: newSong.artist,
        tone: newSong.tone,
        rawLrc: newSong.rawLrc,
        ownerId: "admin",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (newSong.bpm && typeof newSong.bpm === "number" && !isNaN(newSong.bpm)) {
        payload.bpm = newSong.bpm;
      } else {
        payload.bpm = null;
      }
      await setDoc(doc(db, "songs", docId), payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `songs/${docId}`);
    } finally {
      setLoadingSync(false);
    }
  };

  const handleUpdateCentralSong = async (updatedSong: Song) => {
    if (!isAdmin) {
      alert("Apenas administradores podem editar cifras.");
      return;
    }
    const docRef = doc(db, "songs", updatedSong.id);
    setLoadingSync(true);
    try {
      const currentSnap = await getDocFromServer(docRef);
      let originalCreatedAt = serverTimestamp();
      if (currentSnap.exists()) {
        const data = currentSnap.data();
        if (data.createdAt) {
          originalCreatedAt = data.createdAt;
        }
      }
      const payload: any = {
        id: updatedSong.id,
        title: updatedSong.title,
        artist: updatedSong.artist,
        tone: updatedSong.tone,
        rawLrc: updatedSong.rawLrc,
        ownerId: "admin",
        createdAt: originalCreatedAt,
        updatedAt: serverTimestamp(),
      };
      if (updatedSong.bpm && typeof updatedSong.bpm === "number" && !isNaN(updatedSong.bpm)) {
        payload.bpm = updatedSong.bpm;
      } else {
        payload.bpm = null;
      }
      await setDoc(docRef, payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `songs/${updatedSong.id}`);
    } finally {
      setLoadingSync(false);
    }
  };

  const handleDeleteCentralSong = async (id: string) => {
    if (!isAdmin) {
      alert("Apenas administradores podem excluir cifras.");
      return;
    }
    setLoadingSync(true);
    try {
      await deleteDoc(doc(db, "songs", id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `songs/${id}`);
    } finally {
      setLoadingSync(false);
    }
  };

  const activeSong = songs.find((s) => s.id === activeSongId);

  const filteredSongs = songs.filter((song) => {
    const q = searchQuery.toLowerCase();
    return (
      song.title.toLowerCase().includes(q) ||
      song.artist.toLowerCase().includes(q) ||
      song.tone.toLowerCase().includes(q)
    );
  });

  // Layout quando uma cifra está ativa (modo visualização)
  if (activeSong) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-indigo-500/30 selection:text-indigo-200">
        <SongViewer
          song={activeSong}
          onBackToLibrary={() => {
            setActiveSongId(null);
            setShowComments(false);
          }}
          faceSettings={faceSettings}
          onFaceSettingsChange={setFaceSettings}
        />
        {/* Seção de comentários abaixo do viewer */}
        <div className="max-w-5xl w-full mx-auto px-4 py-4">
          <button
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-indigo-400 transition cursor-pointer mb-2"
          >
            <MessageCircle className="w-4 h-4" />
            {showComments ? "Ocultar Comentários" : "Ver Comentários"}
          </button>
          {showComments && <CommentSection songId={activeSong.id} />}
        </div>
      </div>
    );
  }

  // Header compartilhado
  const Header = () => (
    <header className="bg-slate-900 border-b border-slate-850 py-8 px-4 sm:px-6 relative overflow-hidden shrink-0">
      <div className="absolute top-0 right-1/4 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 left-10 w-60 h-60 bg-purple-600/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-6 z-10 relative">
        <div
          className="flex items-start gap-4 cursor-pointer"
          onClick={() => navigate("/")}
        >
          <div className="p-3 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-2xl shadow-lg ring-4 ring-indigo-500/10">
            <Music className="w-8 h-8 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] bg-indigo-500/10 text-indigo-400 font-extrabold uppercase px-2 py-0.5 rounded-full border border-indigo-500/25 tracking-wider">
                LRC + Chords Sincronizado
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-50">
              Play Cifras
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-lg">
              Seu leitor de cifras com andamento preciso. Trabalha com arquivos LRC contendo cifras e letras sincronizadas simultaneamente, além de rolagem mãos-livres por webcam!
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
          {/* Botões de navegação para usuários logados */}
          {isLoggedIn && (
            <button
              onClick={() => navigate("/playlists")}
              className="w-full sm:w-auto px-4 py-2.5 bg-slate-950 hover:bg-slate-900 text-slate-300 hover:text-white text-xs font-bold rounded-xl border border-slate-800 transition duration-200 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <ListMusic className="w-4 h-4 text-indigo-400" />
              Playlists
            </button>
          )}

          {/* Painel Admin só visível para admins */}
          {isAdmin && (
            <button
              onClick={() => navigate("/admin")}
              className="w-full sm:w-auto px-4 py-2.5 bg-slate-950 hover:bg-slate-900 text-slate-300 hover:text-white text-xs font-bold rounded-xl border border-slate-800 transition duration-200 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Shield className="w-4 h-4 text-red-400" />
              Painel Admin ⚙️
            </button>
          )}

          {/* Auth: Login ou UserMenu */}
          {isLoggedIn ? (
            <UserMenu onNavigate={(path) => navigate(path)} />
          ) : (
            <LoginButton />
          )}
        </div>
      </div>
    </header>
  );

  const Footer = () => (
    <footer className="mt-auto py-6 px-4 bg-slate-950 border-t border-slate-900 text-center text-xs text-slate-600 block shrink-0 font-medium">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5">
        <span>Play Cifras © 2026</span>
        <span className="flex items-center gap-1.5 justify-center">
          Feito para músicos <Guitar className="w-4 h-4 text-indigo-400 rotate-12 inline shrink-0" />
        </span>
      </div>
    </footer>
  );

  // Página principal: catálogo de músicas
  const CatalogPage = () => (
    <AnimatePresence mode="wait">
      <motion.div
        key="library-list"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
        className="flex flex-col gap-6"
      >
        {/* Search */}
        <div className="bg-slate-900 border border-slate-850 p-4 rounded-2xl flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 font-semibold" />
            <input
              type="text"
              placeholder="Buscar por música, artista ou tom..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-550 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>
          <div className="shrink-0 flex items-center gap-1.5 text-xs text-slate-400 bg-slate-950 border border-slate-800 px-3.5 py-2.5 rounded-xl font-medium w-full sm:w-auto justify-center select-none">
            <Layers className="w-4 h-4 text-slate-500" />
            <span>{filteredSongs.length} músicas na busca</span>
          </div>
        </div>

        {/* Songs Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSongs.length > 0 ? (
            filteredSongs.map((song) => (
              <div
                key={song.id}
                onClick={() => setActiveSongId(song.id)}
                className="group relative bg-slate-900 border border-slate-850 rounded-2xl p-4 cursor-pointer transition hover:bg-slate-850 hover:border-slate-700/80 hover:-translate-y-0.5 shadow duration-200 flex flex-col justify-between"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-950 flex items-center justify-center text-indigo-400 group-hover:text-indigo-300 transition duration-200 shrink-0 border border-slate-800">
                      <Music className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col">
                      <h3 className="font-bold text-slate-100 leading-tight group-hover:text-indigo-400 transition duration-200">
                        {song.title}
                      </h3>
                      <p className="text-slate-400 text-xs mt-0.5">{song.artist}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] bg-slate-950 border border-slate-850 px-2 py-1 rounded text-slate-450 uppercase font-extrabold tracking-wider font-mono">
                      Catálogo
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-800/60 text-xs">
                  <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 font-mono font-bold rounded-md border border-indigo-500/15">
                    Tom: {song.tone}
                  </span>
                  {song.bpm && (
                    <span className="px-2 py-0.5 bg-slate-950 text-slate-400 font-mono font-medium rounded-md border border-slate-800">
                      {song.bpm} BPM
                    </span>
                  )}
                  <div className="ml-auto flex items-center gap-1 text-[11px] font-bold text-indigo-400 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800 group-hover:bg-indigo-600 group-hover:text-white transition duration-200">
                    <Play className="w-2.5 h-2.5 fill-current" />
                    ABRIR CIFRA
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full bg-slate-900 border border-slate-850 rounded-2xl p-10 text-center flex flex-col items-center justify-center gap-3">
              <Info className="w-10 h-10 text-slate-600" />
              <h3 className="text-base font-bold text-slate-300">Nenhuma cifra encontrada</h3>
              <p className="text-slate-500 text-xs max-w-sm">
                Não encontramos resultados para a sua busca. Tente buscar por outros termos ou limpe o campo para ver todos os resultados.
              </p>
              <button
                onClick={() => setSearchQuery("")}
                className="px-3.5 py-1.5 bg-slate-850 hover:bg-slate-800 text-xs text-slate-300 font-medium rounded-lg border border-slate-700 transition cursor-pointer"
              >
                Limpar Busca
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-indigo-500/30 selection:text-indigo-200">
      <div className="flex-1 flex flex-col">
        <Header />

        <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 flex flex-col gap-6">
          <Routes>
            {/* Página principal - catálogo */}
            <Route path="/" element={<CatalogPage />} />

            {/* Playlists - requer login */}
            <Route
              path="/playlists"
              element={
                <ProtectedRoute>
                  <PlaylistManager
                    songs={centralSongs}
                    onPlaySong={(songId) => setActiveSongId(songId)}
                  />
                </ProtectedRoute>
              }
            />

            {/* Admin Panel - requer admin */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminPanel
                    songs={centralSongs}
                    onAddCentralSong={handleAddCentralSong}
                    onUpdateCentralSong={handleUpdateCentralSong}
                    onDeleteCentralSong={handleDeleteCentralSong}
                    onClose={() => navigate("/")}
                  />
                </ProtectedRoute>
              }
            />
          </Routes>
        </main>

        <Footer />
      </div>
    </div>
  );
}

// ==========================================
// Wrapper com providers
// ==========================================
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}
