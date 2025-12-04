import { useState, useEffect } from "react";
import api from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const API_URL = "/api/auth/";
const STORAGE_KEY_SESSION = "admin_session";

function isOnline() {
  return typeof window !== "undefined" && window.navigator.onLine;
}

export const useAuth = () => {
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingVerification, setPendingVerification] = useState<any | null>(null);
  const [online, setOnline] = useState(isOnline());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    // Try to fetch user from API if online
    const fetchUser = async () => {
      const token = localStorage.getItem("jwt_token");
      if (isOnline() && token) {
        try {
          const userData = await api.get('/api/users/me/');
          setCurrentUser(userData);
          setIsLoading(false);
          return;
        } catch (e: any) {
          // Token invalide ou erreur -> nettoyer
          localStorage.removeItem("jwt_token");
          localStorage.removeItem(STORAGE_KEY_SESSION);
          console.error("Erreur récupération utilisateur:", e);
        }
      }
      // fallback: session from localStorage
      const session = localStorage.getItem(STORAGE_KEY_SESSION);
      setCurrentUser(session ? { username: session } : null);
      setIsLoading(false);
    };
    fetchUser();
    // Listen for global auth logout events
    const onLogout = () => {
      setCurrentUser(null);
    };
    window.addEventListener('auth:logout', onLogout as EventListener);
    return () => window.removeEventListener('auth:logout', onLogout as EventListener);
  }, [online]);

  const register = async (username: string, email: string, password: string, first_name?: string, last_name?: string) => {
    setError(null);
    if (isOnline()) {
      try {
        await api.post(API_URL + "register/", { username, email, password, first_name, last_name });
        return { success: true };
      } catch (err: any) {
        const msg = err?.payload?.detail || err?.message || 'Erreur d\'inscription';
        setError(msg);
        return { success: false, error: msg };
      }
    } else {
      // fallback local
      localStorage.setItem(STORAGE_KEY_SESSION, username);
      setCurrentUser({ username });
      return { success: true };
    }
  };

  const login = async (username: string, password: string) => {
    setError(null);
    if (isOnline()) {
      try {
        const data = await api.post(API_URL + "token/", { username, password });
        localStorage.setItem(STORAGE_KEY_SESSION, username);
        localStorage.setItem("jwt_token", data.access);
        setCurrentUser({ username });
        return { success: true };
      } catch (err: any) {
        const msg = err?.payload?.detail || err?.message || 'Erreur de connexion';
        setError(msg);
        return { success: false, error: msg };
      }
    } else {
      // fallback local
      localStorage.setItem(STORAGE_KEY_SESSION, username);
      setCurrentUser({ username });
      return { success: true };
    }
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY_SESSION);
    localStorage.removeItem("jwt_token");
    localStorage.removeItem("user_data");
    setCurrentUser(null);
    setError(null);
  };

  const hasAdminAccess = (): boolean => {
    return currentUser !== null;
  };

  return {
    currentUser,
    isLoading,
    register,
    login,
    logout,
    hasAdminAccess,
    online,
    error,
    setError,
  };
};
