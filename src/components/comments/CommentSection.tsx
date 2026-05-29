import React, { useState, useEffect } from "react";
import {
  collection, query, where, orderBy, onSnapshot, addDoc, updateDoc,
  deleteDoc, doc, serverTimestamp
} from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../contexts/AuthContext";
import {
  MessageCircle, Send, Edit2, Trash2, User, Loader2, X, Check, Shield
} from "lucide-react";

interface Comment {
  id: string;
  songId: string;
  userId: string;
  userDisplayName: string;
  userPhotoURL: string;
  userRole: string;
  text: string;
  createdAt: any;
  updatedAt: any;
}

interface CommentSectionProps {
  songId: string;
}

export default function CommentSection({ songId }: CommentSectionProps) {
  const { user, userProfile, isLoggedIn } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, "comments"),
      where("songId", "==", songId),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const list: Comment[] = [];
      snapshot.forEach((docRef) => {
        list.push({ id: docRef.id, ...docRef.data() } as Comment);
      });
      setComments(list);
      setLoading(false);
    }, (error) => {
      console.error("Erro ao carregar comentários:", error);
      setLoading(false);
    });
    return () => unsub();
  }, [songId]);

  const handleSubmit = async () => {
    if (!user || !userProfile || !newComment.trim()) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, "comments"), {
        songId,
        userId: user.uid,
        userDisplayName: user.displayName || "",
        userPhotoURL: user.photoURL || "",
        userRole: userProfile.role,
        text: newComment.trim(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setNewComment("");
    } catch (error) {
      console.error("Erro ao criar comentário:", error);
      alert("Erro ao publicar comentário.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (commentId: string) => {
    if (!editText.trim()) return;
    try {
      await updateDoc(doc(db, "comments", commentId), {
        text: editText.trim(),
        updatedAt: serverTimestamp(),
      });
      setEditingId(null);
      setEditText("");
    } catch (error) {
      console.error("Erro ao editar comentário:", error);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm("Deseja excluir este comentário?")) return;
    try {
      await deleteDoc(doc(db, "comments", commentId));
    } catch (error) {
      console.error("Erro ao excluir comentário:", error);
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp?.seconds) return "";
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex flex-col gap-3 mt-4">
      <div className="flex items-center gap-2">
        <MessageCircle className="w-4 h-4 text-indigo-400" />
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          Comentários ({comments.length})
        </h4>
      </div>

      {/* New comment form */}
      {isLoggedIn ? (
        <div className="flex items-start gap-2">
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt=""
              className="w-7 h-7 rounded-full border border-slate-700 shrink-0 mt-0.5"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center shrink-0 mt-0.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
            </div>
          )}
          <div className="flex-1 flex gap-2">
            <input
              type="text"
              placeholder="Escreva um comentário..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition"
            />
            <button
              onClick={handleSubmit}
              disabled={!newComment.trim() || submitting}
              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition cursor-pointer disabled:opacity-40"
            >
              {submitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-500 bg-slate-950 border border-slate-850 rounded-lg p-3 text-center">
          Faça login para comentar nesta cifra.
        </p>
      )}

      {/* Comments list */}
      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
        </div>
      ) : comments.length === 0 ? (
        <p className="text-xs text-slate-500 text-center py-4">Nenhum comentário ainda. Seja o primeiro!</p>
      ) : (
        <div className="flex flex-col gap-2">
          {comments.map((comment) => (
            <div key={comment.id} className="bg-slate-950 border border-slate-850 rounded-lg p-3">
              <div className="flex items-start gap-2">
                {comment.userPhotoURL ? (
                  <img
                    src={comment.userPhotoURL}
                    alt=""
                    className="w-6 h-6 rounded-full border border-slate-700 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center shrink-0">
                    <User className="w-3 h-3 text-slate-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-slate-200">
                      {comment.userDisplayName || "Anônimo"}
                    </span>
                    {comment.userRole === "admin" && (
                      <span className="text-[7px] bg-red-500/15 text-red-400 uppercase font-extrabold px-1 py-0 rounded border border-red-500/25 flex items-center gap-0.5">
                        <Shield className="w-2 h-2" /> Admin
                      </span>
                    )}
                    <span className="text-[10px] text-slate-500">{formatTime(comment.createdAt)}</span>
                  </div>

                  {editingId === comment.id ? (
                    <div className="flex items-center gap-2 mt-1.5">
                      <input
                        type="text"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                        autoFocus
                      />
                      <button
                        onClick={() => handleUpdate(comment.id)}
                        className="p-1 text-emerald-400 hover:bg-slate-800 rounded transition cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => { setEditingId(null); setEditText(""); }}
                        className="p-1 text-slate-400 hover:bg-slate-800 rounded transition cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">{comment.text}</p>
                  )}
                </div>

                {/* Actions for own comments */}
                {user?.uid === comment.userId && editingId !== comment.id && (
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      onClick={() => {
                        setEditingId(comment.id);
                        setEditText(comment.text);
                      }}
                      className="p-1 text-slate-500 hover:text-indigo-400 hover:bg-slate-800 rounded transition cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDelete(comment.id)}
                      className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
