import React, { useState, useRef, useEffect } from "react";
import { LogOut, Shield, User, ListMusic, ChevronDown } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

interface UserMenuProps {
  onNavigate?: (path: string) => void;
}

export default function UserMenu({ onNavigate }: UserMenuProps) {
  const { user, userProfile, isAdmin, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user) return null;

  const handleLogout = async () => {
    setOpen(false);
    await logout();
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 bg-slate-900 hover:bg-slate-800 rounded-xl border border-slate-700 transition cursor-pointer"
      >
        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt={user.displayName || "User"}
            className="w-7 h-7 rounded-full border border-slate-600"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-indigo-500/20 flex items-center justify-center">
            <User className="w-4 h-4 text-indigo-400" />
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-slate-200 max-w-[120px] truncate hidden sm:inline">
            {user.displayName || user.email}
          </span>
          {isAdmin && (
            <span className="text-[8px] bg-red-500/15 text-red-400 uppercase font-extrabold px-1.5 py-0.5 rounded-full border border-red-500/25 tracking-wider flex items-center gap-0.5">
              <Shield className="w-2.5 h-2.5" /> Admin
            </span>
          )}
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </div>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
          {/* User info header */}
          <div className="p-3 border-b border-slate-800">
            <p className="text-xs font-bold text-slate-200 truncate">{user.displayName}</p>
            <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
            {isAdmin && (
              <span className="inline-flex items-center gap-1 mt-1.5 text-[9px] bg-red-500/10 text-red-400 uppercase font-extrabold px-2 py-0.5 rounded-full border border-red-500/20">
                <Shield className="w-2.5 h-2.5" /> Administrador
              </span>
            )}
          </div>

          {/* Menu items */}
          <div className="p-1.5">
            <button
              onClick={() => {
                setOpen(false);
                onNavigate?.("/playlists");
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
            >
              <ListMusic className="w-4 h-4 text-indigo-400" />
              Minhas Playlists
            </button>

            {isAdmin && (
              <button
                onClick={() => {
                  setOpen(false);
                  onNavigate?.("/admin");
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
              >
                <Shield className="w-4 h-4 text-red-400" />
                Painel Admin
              </button>
            )}

            <div className="border-t border-slate-800 my-1" />

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
