import React, { useState } from "react";
import { Plus, Upload, BookOpen, FileText, AlertCircle } from "lucide-react";
import { Song } from "../types";

interface SongFormProps {
  onAddSong: (song: Song) => void;
  onCancel: () => void;
}

export default function SongForm({ onAddSong, onCancel }: SongFormProps) {
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [tone, setTone] = useState("C");
  const [bpm, setBpm] = useState(90);
  const [rawLrc, setRawLrc] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const loadExample = () => {
    setTitle("Tribunal de Rua");
    setArtist("O Rappa");
    setTone("Am");
    setBpm(96);
    setRawLrc(`[00:11.40]       Am
[00:11.40] A viatura foi chegando devagar
[00:14.02]         Dm                     Em
[00:14.02] E de repente, de repente resolveu me parar
[00:16.71]         Am
[00:16.71] Um dos caras saiu de lá de dentro
[00:19.03]                    Dm
[00:19.03] Já dizendo: aí compadre, cê perdeu
[00:21.40]          Em                        Am
[00:21.40] Se eu tiver que procurar, cê tá fudido
[00:24.26]                                      Dm         Em
[00:24.26] Acho melhor cê ir deixando esse flagrante comigo`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !artist.trim() || !rawLrc.trim()) {
      setErrorMsg("Por favor, preencha o Título, Artista e envie as Cifras sincronizadas LRC.");
      return;
    }
    
    const newSong: Song = {
      id: `custom-${Date.now()}`,
      title: title.trim(),
      artist: artist.trim(),
      tone: tone.trim() || "C",
      bpm: Number(bpm) || 90,
      rawLrc: rawLrc.trim(),
    };

    onAddSong(newSong);
  };

  // Drag and Drop files upload helper
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        setRawLrc(text);
        
        // Try to pre-extract song info if standard LRC codes [ti:xxx], [ar:xxx] or filename format "Artist - Title.lrc" are seen
        const filename = file.name.replace(/\.[^/.]+$/, "");
        if (filename.includes("-")) {
          const parts = filename.split("-");
          setArtist(parts[0].trim());
          setTitle(parts[1].trim());
        } else {
          setTitle(filename.trim());
        }

        // Try parsing tags inside text like [ti: Title] or [ar: Artist]
        const tiMatch = text.match(/\[ti:\s*(.*?)\]/i);
        const arMatch = text.match(/\[ar:\s*(.*?)\]/i);
        const toneMatch = text.match(/\[tone:\s*(.*?)\]/i);
        const bpmMatch = text.match(/\[bpm:\s*(\d+)\]/i);

        if (tiMatch) setTitle(tiMatch[1]);
        if (arMatch) setArtist(arMatch[1]);
        if (toneMatch) setTone(toneMatch[1]);
        if (bpmMatch) setBpm(Number(bpmMatch[1]));
      }
    };
    reader.readAsText(file);
  };

  return (
    <div id="add-song-form-container" className="bg-slate-900 border border-slate-800 rounded-xl max-w-3xl mx-auto overflow-hidden animate-fade-in shadow-xl">
      <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-indigo-400" />
          <h2 className="text-md font-semibold text-slate-100">Adicionar Nova Cifra Sincronizada (LRC)</h2>
        </div>
        <button
          onClick={loadExample}
          id="btn-load-form-example"
          type="button"
          className="text-xs py-1 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded cursor-pointer transition border border-slate-700 flex items-center gap-1.5"
        >
          <FileText className="w-3.5 h-3.5 text-indigo-400" /> Carregar Exemplo do O Rappa
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
        {errorMsg && (
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-3 flex items-start gap-2 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
              Nome da Música *
            </label>
            <input
              id="input-title"
              type="text"
              placeholder="Ex: Tribunal de Rua"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setErrorMsg("");
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
              Artista / Banda *
            </label>
            <input
              id="input-artist"
              type="text"
              placeholder="Ex: O Rappa"
              value={artist}
              onChange={(e) => {
                setArtist(e.target.value);
                setErrorMsg("");
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
              Tom (Cifra Principal)
            </label>
            <input
              id="input-tone"
              type="text"
              placeholder="Ex: Am, G, C#m, E"
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
              Velocidade Padrão (BPM)
            </label>
            <input
              id="input-bpm"
              type="number"
              min="40"
              max="240"
              value={bpm}
              onChange={(e) => setBpm(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>
        </div>

        {/* LRC chord container */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
            Cifra Sincronizada no Novo Formato LRC *
          </label>
          <span className="text-[11px] text-slate-400 mb-1 leading-relaxed">
            Escreva ou Cole o texto com o tempo no início de cada linha. Se a cifra estiver na linha exatamente anterior à letra com o <strong>mesmo</strong> tempo, elas acenderão juntas de forma sincronizada!
          </span>

          <div
            id="drag-and-drop-container"
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`relative rounded-lg border-2 border-dashed flex flex-col transition duration-200 ${
              dragActive
                ? "border-indigo-500 bg-indigo-500/5"
                : "border-slate-800 bg-slate-950 hover:border-slate-700"
            }`}
          >
            <textarea
              id="textarea-raw-lrc"
              rows={12}
              value={rawLrc}
              onChange={(e) => {
                setRawLrc(e.target.value);
                setErrorMsg("");
              }}
              placeholder={`Cole aqui seu script ou arquivo LRC de cifras integrado. Exemplo:\n[00:11.40]       Am\n[00:11.40] A viatura foi chegando devagar\n[00:14.02]         Dm                     Em\n[00:14.02] E de repente, de repente resolveu me parar`}
              className="w-full bg-transparent border-0 p-3 font-mono text-sm text-slate-200 focus:outline-none resize-y min-h-[160px]"
              required
            />

            {/* Drag & Drop Visual prompt inside textarea area on empty */}
            {!rawLrc && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-4 text-center opacity-40">
                <Upload className="w-8 h-8 text-slate-400 mb-2" />
                <span className="text-xs font-bold text-slate-200">Arraste seu arquivo .lrc ou .txt aqui</span>
                <span className="text-[10px] text-slate-500 mt-1">ou clique para fazer upload</span>
                <input
                  id="file-upload-invisible"
                  type="file"
                  accept=".lrc,.txt"
                  onChange={handleFileInputChange}
                  className="absolute inset-0 opacity-0 cursor-pointer pointer-events-auto"
                />
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
          <button
            onClick={onCancel}
            id="btn-cancel-add"
            type="button"
            className="px-4 py-2 border border-slate-705 text-xs font-medium text-slate-350 hover:text-slate-100 hover:bg-slate-850 rounded-lg cursor-pointer transition"
          >
            Voltar
          </button>
          <button
            id="btn-submit-song"
            type="submit"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-slate-100 shadow-md rounded-lg cursor-pointer transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Salvar Música
          </button>
        </div>
      </form>
    </div>
  );
}
