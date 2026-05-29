import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from "firebase/firestore";
import { auth, db, loginWithGoogle, logout as firebaseLogout } from "../firebase";

export type UserRole = "admin" | "user";

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: UserRole;
  createdAt: any;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isLoggedIn: boolean;
  login: () => Promise<User | undefined>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  loading: true,
  isAdmin: false,
  isLoggedIn: false,
  login: async () => undefined,
  logout: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

/**
 * Cria ou atualiza o documento do usuário na coleção `users` do Firestore.
 * Na primeira vez (signup), define role como 'user' por padrão.
 */
async function ensureUserDocument(firebaseUser: User): Promise<UserProfile> {
  const userRef = doc(db, "users", firebaseUser.uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    // Atualiza displayName e photoURL caso tenham mudado no Google
    const existingData = userSnap.data() as UserProfile;
    if (
      existingData.displayName !== firebaseUser.displayName ||
      existingData.photoURL !== firebaseUser.photoURL
    ) {
      await setDoc(
        userRef,
        {
          displayName: firebaseUser.displayName || "",
          photoURL: firebaseUser.photoURL || "",
        },
        { merge: true }
      );
    }
    return {
      ...existingData,
      displayName: firebaseUser.displayName || existingData.displayName,
      photoURL: firebaseUser.photoURL || existingData.photoURL,
    };
  } else {
    // Primeiro login - criar documento com role 'user'
    const newProfile: UserProfile = {
      uid: firebaseUser.uid,
      email: firebaseUser.email || "",
      displayName: firebaseUser.displayName || "",
      photoURL: firebaseUser.photoURL || "",
      role: "user",
      createdAt: serverTimestamp(),
    };
    await setDoc(userRef, newProfile);
    return newProfile;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      // Limpar listener anterior do perfil
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          // Garante que o documento existe
          await ensureUserDocument(firebaseUser);

          // Escuta mudanças no perfil em tempo real (ex: quando admin muda role)
          const userRef = doc(db, "users", firebaseUser.uid);
          unsubscribeProfile = onSnapshot(userRef, (snap) => {
            if (snap.exists()) {
              setUserProfile(snap.data() as UserProfile);
            }
          });
        } catch (error) {
          console.error("Erro ao carregar perfil do usuário:", error);
          // Fallback: criar perfil local básico
          setUserProfile({
            uid: firebaseUser.uid,
            email: firebaseUser.email || "",
            displayName: firebaseUser.displayName || "",
            photoURL: firebaseUser.photoURL || "",
            role: "user",
            createdAt: null,
          });
        }
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const login = async () => {
    try {
      const loggedUser = await loginWithGoogle();
      return loggedUser;
    } catch (error) {
      console.error("Erro no login:", error);
      throw error;
    }
  };

  const logout = async () => {
    await firebaseLogout();
    localStorage.removeItem("playcifras_admin_logged");
    setUser(null);
    setUserProfile(null);
  };

  const isAdmin = userProfile?.role === "admin";
  const isLoggedIn = !!user;

  const value: AuthContextType = {
    user,
    userProfile,
    loading,
    isAdmin,
    isLoggedIn,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
