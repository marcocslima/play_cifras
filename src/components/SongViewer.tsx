import React, { useRef, useState, useEffect } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Music,
  ChevronDown,
  ChevronUp,
  Sliders,
  Type,
  PlusCircle,
  Clock,
  Video,
  Lightbulb,
  CornerRightDown,
  Settings,
  X,
  Volume2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { LrcLine, Song, PlaybackState, FaceScrollSettings } from "../types";
import { parseLrcWithChords, transposeLine } from "../utils/lrcParser";

interface SongViewerProps {
  song: Song;
  onBackToLibrary: () => void;
  faceSettings: FaceScrollSettings;
  onFaceSettingsChange: (settings: FaceScrollSettings) => void;
}

export default function SongViewer({
  song,
  onBackToLibrary,
  faceSettings,
  onFaceSettingsChange,
}: SongViewerProps) {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  
  // Parse LRC text into structured elements
  const [lines, setLines] = useState<LrcLine[]>([]);
  useEffect(() => {
    setLines(parseLrcWithChords(song.rawLrc));
  }, [song.rawLrc]);

  // Audio and Timer-based State Management
  const [playback, setPlayback] = useState<PlaybackState>({
    isPlaying: false,
    currentTime: 0,
    speed: 1.0,
    transpose: 0,
  });

  // Font styling options - responsive starting size for mobile vs desktop
  const [fontSize, setFontSize] = useState<number>(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth < 640 ? 13 : 18;
    }
    return 18;
  });

  // State to toggle display of timestamps next to lyrics
  const [showTimestamps, setShowTimestamps] = useState(false);

  // Collapsible Playback Controls (LRC Player Deck) - Closed by default
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);

  // Store lines elements refs to perform automatic scroll centration
  const lineRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  
  // Track the current active line IDs to trigger scrolling ONLY on changes
  const [activeLineIds, setActiveLineIds] = useState<string[]>([]);
  
  // Toggle for LRC-based automatic clock scrolling
  const [isLrcScrollEnabled, setIsLrcScrollEnabled] = useState(true);
  
  // Tracking timer loop
  useEffect(() => {
    if (!playback.isPlaying) return;

    let lastTime = performance.now();
    let frameId: number;

    const tick = () => {
      const now = performance.now();
      const delta = (now - lastTime) / 1000; // in seconds
      lastTime = now;

      setPlayback((prev) => {
        // Find total duration (from max timestamp in LRC lines)
        const maxTime = lines.reduce((acc, current) => {
          return current.timestamp !== null && current.timestamp > acc
            ? current.timestamp
            : acc;
        }, 300); // default maximum 5min if empty

        const nextTime = prev.currentTime + delta * prev.speed;
        if (nextTime >= maxTime + 5) {
          // Song ended, pause and reset to start
          return { ...prev, isPlaying: false, currentTime: maxTime };
        }
        return { ...prev, currentTime: nextTime };
      });

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [playback.isPlaying, lines]);

  // Calculate matching active lines based on the current timestamp
  // An active item is the closest timestamp that is less than or equal to current time.
  // There can be multiple items sharing that identical active timestamp!
  const getActiveState = () => {
    if (lines.length === 0) return { activeIds: [], activeTimestamp: null };

    // Filter lines that have defined numeric timestamps
    const timestampedLines = lines.filter((l) => l.timestamp !== null) as (LrcLine & { timestamp: number })[];
    if (timestampedLines.length === 0) return { activeIds: [], activeTimestamp: null };

    // Find the latest timestamp that is <= current position
    let activeTimestamp: number | null = null;
    
    for (let i = 0; i < timestampedLines.length; i++) {
       const lineTime = timestampedLines[i].timestamp;
       if (lineTime <= playback.currentTime) {
         if (activeTimestamp === null || lineTime > activeTimestamp) {
           activeTimestamp = lineTime;
         }
       }
    }

    if (activeTimestamp === null) {
      return { activeIds: [], activeTimestamp: null };
    }

    // Capture all lines sharing this identical active timestamp
    const activeIds = lines
      .filter((l) => l.timestamp !== null && l.timestamp === activeTimestamp)
      .map((l) => l.id);

    return { activeIds, activeTimestamp };
  };

  const { activeIds, activeTimestamp } = getActiveState();

  // Scroll into view whenever the primary active IDs change (avoiding fighting manual scrolls)
  useEffect(() => {
    if (activeIds.length === 0) return;
    
    // Check if the current set of active lines has changed
    const isNewActive = 
      activeIds.length !== activeLineIds.length ||
      activeIds.some(id => !activeLineIds.includes(id));

    if (isNewActive) {
      setActiveLineIds(activeIds);

      // Scroll automatically only if LRC Scroll is enabled
      if (isLrcScrollEnabled) {
        const firstActiveId = activeIds[0];
        const targetElement = lineRefs.current[firstActiveId];
        if (targetElement && scrollContainerRef.current) {
          const container = scrollContainerRef.current;
          const offsetTop = targetElement.offsetTop;
          const halfContainerHeight = container.clientHeight / 2;
          
          container.scrollTo({
            top: offsetTop - halfContainerHeight + targetElement.clientHeight / 2,
            behavior: "smooth",
          });
        }
      }
    }
  }, [activeIds, activeLineIds, isLrcScrollEnabled]);

  // Handle fine-grained scroll actions coming from Webcam movements
  const handleFaceScrollAction = (pixels: number) => {
    if (scrollContainerRef.current) {
      // Direct additive scrollTop manipulation for pixel-perfect fluidity
      scrollContainerRef.current.scrollTop += pixels;
    }
  };

  // Convert digital timer into user-readable duration representation MM:SS.CC
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const hundredths = Math.floor((seconds % 1) * 100);
    
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}.${hundredths.toString().padStart(2, "0")}`;
  };

  // Music transpose offsets shifting helpers (-12 to +12 semitones)
  const handleTranspose = (offset: number) => {
    setPlayback((prev) => {
      let nextOffset = prev.transpose + offset;
      if (nextOffset > 11) nextOffset = -12;
      if (nextOffset < -12) nextOffset = 11;
      return { ...prev, transpose: nextOffset };
    });
  };

  const skipToTimestamp = (seconds: number) => {
    setPlayback((prev) => ({
      ...prev,
      currentTime: seconds,
    }));
  };

  const progressPercent = () => {
    const maxTime = lines.reduce((acc, current) => {
      return current.timestamp !== null && current.timestamp > acc
        ? current.timestamp
        : acc;
    }, 1);
    return Math.max(0, Math.min(100, (playback.currentTime / maxTime) * 100));
  };

  const handleProgressBarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const maxTime = lines.reduce((acc, current) => {
      return current.timestamp !== null && current.timestamp > acc
        ? current.timestamp
        : acc;
    }, 1);
    const nextPercent = parseFloat(e.target.value);
    const targetSeconds = (nextPercent / 100) * maxTime;
    
    setPlayback((prev) => ({
      ...prev,
      currentTime: targetSeconds,
    }));
  };

  return (
    <div id="song-viewer-dashboard" className="fixed inset-0 h-screen w-screen flex flex-col bg-slate-950 font-sans text-slate-100 overflow-hidden z-50">
      
      {/* Top Bar Navigation */}
      {!playback.isPlaying && (
        <header className="bg-slate-900 border-b border-slate-800 p-4 shrink-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md z-15">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToLibrary}
            id="btn-back-to-library"
            className="px-3 py-1.5 bg-slate-800 text-slate-300 hover:text-slate-100 hover:bg-slate-700 transition cursor-pointer text-xs font-semibold rounded-lg border border-slate-700"
          >
            ← Biblioteca
          </button>
          
          <div className="flex flex-col">
            <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest leading-none mb-1">
              Tocando Agora
            </span>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-100 leading-tight">
                {song.title}
              </h1>
              <span className="text-xs text-slate-400 font-medium">
                por {song.artist}
              </span>
            </div>
          </div>
        </div>

        {/* Dynamic Controls bar */}
        <div className="flex flex-wrap items-center gap-2 justify-end w-full sm:w-auto">
          {/* Key Transposer */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-1">
            <span className="text-[10px] text-slate-400 font-semibold px-2 uppercase">Tom</span>
            <button
              id="btn-transpose-down"
              onClick={() => handleTranspose(-1)}
              className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 text-indigo-400 font-mono font-bold rounded cursor-pointer text-xs"
            >
              -1
            </button>
            <span className="px-2 font-mono text-xs font-bold text-slate-200 min-w-[34px] text-center">
              {playback.transpose === 0
                ? song.tone
                : `${song.tone} (${playback.transpose > 0 ? "+" : ""}${playback.transpose})`}
            </span>
            <button
              id="btn-transpose-up"
              onClick={() => handleTranspose(1)}
              className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 text-indigo-400 font-mono font-bold rounded cursor-pointer text-xs"
            >
              +1
            </button>
          </div>

          {/* Font Resizer */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-1">
            <Type className="w-3.5 h-3.5 text-slate-500 mx-2" />
            <button
              id="btn-font-smaller"
              onClick={() => setFontSize((sz) => Math.max(12, sz - 2))}
              className="px-1.5 py-0.5 bg-slate-900 hover:bg-slate-800 rounded text-slate-400 cursor-pointer text-xs"
            >
              A-
            </button>
            <span className="px-2 font-mono text-xs text-slate-400 select-none">{fontSize}px</span>
            <button
              id="btn-font-larger"
              onClick={() => setFontSize((sz) => Math.min(32, sz + 2))}
              className="px-1.5 py-0.5 bg-slate-900 hover:bg-slate-800 rounded text-slate-400 cursor-pointer text-xs"
            >
              A+
            </button>
          </div>

          {/* Speed settings */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-1">
            <span className="text-[10px] text-slate-400 px-2 uppercase font-semibold">Velox</span>
            <select
              id="select-speed"
              value={playback.speed.toString()}
              onChange={(e) => {
                const targetSpeed = parseFloat(e.target.value);
                setPlayback((prev) => ({ ...prev, speed: targetSpeed }));
              }}
              className="bg-transparent text-xs text-indigo-400 outline-none cursor-pointer pr-1 font-semibold"
            >
              <option value="0.5" className="bg-slate-900">0.50x</option>
              <option value="0.75" className="bg-slate-900">0.75x</option>
              <option value="1" className="bg-slate-900">1.00x</option>
              <option value="1.25" className="bg-slate-900">1.25x</option>
              <option value="1.5" className="bg-slate-900">1.50x</option>
              <option value="2" className="bg-slate-900">2.00x</option>
            </select>
          </div>

          {/* Quick Play/Pause Shortcut */}
          <button
            id="btn-quick-play-lrc-header"
            onClick={() => setPlayback((p) => ({ ...p, isPlaying: !p.isPlaying }))}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition flex items-center gap-1.5 border leading-none shrink-0 ${
              playback.isPlaying
                ? "bg-emerald-600 hover:bg-emerald-550 text-white border-emerald-500 shadow-sm shadow-emerald-555/25"
                : "bg-slate-800 hover:bg-slate-750 text-slate-300 border-slate-700 hover:text-white"
            }`}
            title={playback.isPlaying ? "Pausar rolagem automática LRC" : "Iniciar rolagem automática LRC"}
          >
            {playback.isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 text-white fill-current shrink-0" />
                <span className="hidden xs:inline">Pausar</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 text-white fill-current ml-0.5 shrink-0" />
                <span className="hidden xs:inline">Tocar</span>
              </>
            )}
          </button>

          {/* Collapsible Playback Panel Toggle */}
          <button
            id="btn-toggle-playback-panel"
            onClick={() => setIsPlayerOpen(!isPlayerOpen)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition flex items-center gap-1.5 border shrink-0 ${
              isPlayerOpen
                ? "bg-slate-700 text-white border-slate-600"
                : "bg-slate-800 hover:bg-slate-750 text-slate-300 border-slate-700 hover:text-white"
            }`}
          >
            <Settings className={`w-3.5 h-3.5 ${playback.isPlaying ? "text-emerald-400 animate-spin-slow" : "text-slate-400"}`} />
            <span className="hidden leading-none xs:inline">Ajustes LRC</span>
            {isPlayerOpen ? (
              <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            )}
          </button>
        </div>
      </header>
      )}

      {/* Main Body */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Interactive Chord/LRC scrolling sheet container */}
        <div className="flex-1 flex flex-col relative h-full">
          {/* Legend Banner - Stay pinned at the top so buttons are always accessible to toggle controls */}
          {!playback.isPlaying && (
            <div className="bg-slate-900/60 backdrop-blur-sm px-4 py-2 border-b border-slate-800 flex flex-wrap justify-between items-center text-xs text-slate-400 gap-2 shrink-0">
              <span className="flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>Preserve o andamento tocando ou clicando nos botões de tempo</span>
              </span>
              <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                {/* Responsive show/hide timestamps toggle */}
                <button
                  id="btn-toggle-timestamps-lrc"
                  onClick={() => setShowTimestamps(!showTimestamps)}
                  className={`text-xs font-bold transition flex items-center gap-1.5 cursor-pointer px-2.5 py-1 rounded-md border ${
                    showTimestamps
                      ? "bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20"
                      : "bg-slate-800/40 text-slate-300 border-slate-700/50 hover:bg-slate-800"
                  }`}
                >
                  <Clock className="w-3 h-3 text-current" />
                  <span>{showTimestamps ? "Ocultar Marcadores" : "Exibir Tempos"}</span>
                </button>

                <span className="hidden sm:inline font-mono text-[10px] text-slate-500">
                  {lines.length} Linhas
                </span>
              </div>
            </div>
          )}

          {/* Sticky Controls Panel for Playback and Calibration - Centered, non-scrollable, responsive */}
          <div className="shrink-0 w-full max-w-5xl mx-auto px-4 z-20">
            <AnimatePresence>
              {isPlayerOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0, marginTop: 0, marginBottom: 0 }}
                  animate={{ height: "auto", opacity: 1, marginTop: 12, marginBottom: 4 }}
                  exit={{ height: 0, opacity: 0, marginTop: 0, marginBottom: 0 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  className="bg-slate-900 border border-slate-800 rounded-xl shadow-lg overflow-hidden shrink-0"
                >
                  <div className="p-3 sm:p-4 flex flex-col gap-3">
                    {/* Timeline bar */}
                    <div id="player-progress-track-top" className="flex items-center gap-3">
                      <span className="font-mono text-xs text-slate-400 w-14 sm:w-16 text-right">
                        {formatTime(playback.currentTime)}
                      </span>
                      <input
                        id="song-timeline-slider-top"
                        type="range"
                        min="0"
                        max="100"
                        step="0.05"
                        value={progressPercent()}
                        onChange={handleProgressBarChange}
                        className="flex-1 accent-indigo-550 h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-indigo-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 font-mono select-none">
                        {playback.isPlaying ? "ACOMPANHANDO" : "PAUSADO"}
                      </div>
                    </div>

                    {/* Player Buttons deck */}
                    <div className="flex items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2 sm:gap-4">
                        {/* Tone Helper badge */}
                        <div className="hidden xs:flex flex-col text-slate-400 leading-none">
                          <span className="text-[9px] uppercase tracking-wider mb-0.5">Andamento</span>
                          <span className="text-xs font-bold text-slate-300">{song.bpm || 90} BPM</span>
                        </div>

                        {/* LRC Auto-scroll toggle shortcut */}
                        <button
                          id="btn-toggle-lrc-scroll-top"
                          onClick={() => setIsLrcScrollEnabled(!isLrcScrollEnabled)}
                          className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors duration-200 flex items-center gap-1.5 border ${
                            isLrcScrollEnabled
                              ? "bg-indigo-650 border-indigo-500 text-slate-100 font-bold"
                              : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-100 hover:bg-slate-850"
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">{isLrcScrollEnabled ? "LRC Rolagem: Sim" : "LRC Rolagem: Não"}</span>
                          <span className="sm:hidden">{isLrcScrollEnabled ? "LRC: Sim" : "LRC: Não"}</span>
                        </button>
                      </div>

                      {/* Centered Trigger Controls */}
                      <div className="flex items-center gap-3">
                        <button
                          id="btn-player-reset-top"
                          onClick={() => setPlayback((p) => ({ ...p, currentTime: 0 }))}
                          className="p-2 sm:p-2.5 bg-slate-850 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-full cursor-pointer transition shadow hover:shadow-indigo-500/10"
                          title="Zerar música"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>

                        <button
                          id="btn-player-toggle-top"
                          onClick={() =>
                            setPlayback((p) => ({ ...p, isPlaying: !p.isPlaying }))
                          }
                          className="p-3 sm:p-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full cursor-pointer transition shadow-lg hover:shadow-indigo-600/30 ring-4 ring-indigo-650/10 border border-indigo-500"
                        >
                          {playback.isPlaying ? (
                            <Pause className="w-5 h-5 fill-white" />
                          ) : (
                            <Play className="w-5 h-5 fill-white ml-0.5" />
                          )}
                        </button>
                      </div>

                      {/* Quick exit control */}
                      <div className="flex items-center gap-2">
                        <button
                          id="btn-quit-viewer-top"
                          onClick={onBackToLibrary}
                          className="text-xs font-medium text-slate-400 hover:text-slate-100 transition cursor-pointer"
                        >
                          Sair da Cifra
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>


          </div>

          {/* Core Content: Text Display wrapper - Includes scrollable panels at the top to prevent layout locks on small height screens */}
          <div
            id="scrollable-sheet-viewport"
            ref={scrollContainerRef}
            className={`flex-1 overflow-y-auto overflow-x-auto px-2 sm:px-6 select-none relative scrollbar-thin transition-all duration-300 ${
              playback.isPlaying ? "pt-24 pb-32" : "py-4 sm:py-8"
            }`}
            style={{ scrollBehavior: "auto" }} // handled precisely by smooth ticks
          >
            <div className="max-w-3xl mx-auto flex flex-col gap-1 pb-32">
              {lines.map((line) => {
                const isActive = line.id && activeIds.includes(line.id);
                
                // Transpose text if it contains chords
                const displayedText = line.isChord
                  ? transposeLine(line.text, playback.transpose)
                  : line.text;

                return (
                  <div
                    key={line.id}
                    ref={(el) => {
                      lineRefs.current[line.id] = el;
                    }}
                    className={`group relative flex items-start p-1 rounded-lg border transition-all duration-200 ${
                      showTimestamps ? "gap-2.5 sm:gap-4" : "gap-0"
                    } ${
                      isActive
                        ? "bg-indigo-600/10 border-indigo-500/70 shadow-sm shadow-indigo-500/5 translate-x-1 sm:translate-x-2"
                        : "border-transparent hover:bg-slate-900/45"
                    }`}
                  >
                    {/* Fast Jump Audio Timer Action button - conditionally rendered to maximize horizontal space */}
                    {showTimestamps && (
                      line.timestamp !== null ? (
                        <button
                          onClick={() => skipToTimestamp(line.timestamp!)}
                          className={`mt-0.5 shrink-0 w-[68px] sm:w-[72px] h-6 text-[10px] font-mono cursor-pointer flex items-center justify-center gap-1 z-10 transition ${
                            isActive
                              ? "bg-indigo-600/90 text-white font-bold"
                              : "bg-slate-900 text-slate-400 group-hover:bg-slate-800 group-hover:text-amber-400"
                          }`}
                          title={`Ir para ${line.rawTimestamp}`}
                        >
                          <Clock className="w-2.5 h-2.5" />
                          {line.rawTimestamp?.replace(/[\[\]]/g, "")}
                        </button>
                      ) : (
                        // Spacer to maintain columns
                        <div className="w-[68px] sm:w-[72px] shrink-0 h-6" />
                      )
                    )}

                    {/* Preformatted Line Content */}
                    <pre
                      style={{ fontSize: `${fontSize}px` }}
                      className={`flex-1 font-mono whitespace-pre overflow-x-visible leading-relaxed tracking-wide ${
                        line.isChord
                          ? isActive
                            ? "text-amber-400 font-extrabold"
                            : "text-indigo-400 font-bold"
                          : isActive
                          ? "text-slate-100 font-semibold"
                          : "text-slate-350"
                      }`}
                    >
                      {displayedText || "\u200B"} 
                    </pre>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* Floating HUD shown only when playing - allows pausing & re-expanding options bar */}
      {playback.isPlaying && (
        <div 
          id="floating-playback-hud" 
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 bg-slate-900/95 border border-slate-800 rounded-full px-4 py-2 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-300 ring-1 ring-white/10"
        >
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="font-mono text-[11px] font-bold text-emerald-400 bg-slate-950 px-2 py-0.5 rounded-full border border-slate-850">
              {formatTime(playback.currentTime)}
            </span>
          </div>
          <div className="h-4 w-[1px] bg-slate-700/50" />
          <button
            id="btn-floating-pause-lrc"
            onClick={() => setPlayback((p) => ({ ...p, isPlaying: false }))}
            className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-full text-xs font-bold transition duration-200 shadow-md cursor-pointer"
            title="Pausar rolagem automática e reexibir opções"
          >
            <Pause className="w-3.5 h-3.5 text-white fill-current shrink-0" />
            <span>Pausar</span>
          </button>
        </div>
      )}
    </div>
  );
}

// Inline custom quick info icon
function InfoIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}
