import { useState, useEffect } from "react";

interface AdminUser {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

const STORAGE_KEY_USERS = "admin_users";
const STORAGE_KEY_SESSION = "admin_session";

// Simple hash function (for demo purposes - in production use proper hashing)
const simpleHash = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash.toString(36);
};

export const useAuth = () => {
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const session = localStorage.getItem(STORAGE_KEY_SESSION);
    if (session) {
      const users = getUsers();
      const user = users.find((u) => u.id === session);
      if (user) {
        setCurrentUser(user);
      } else {
        localStorage.removeItem(STORAGE_KEY_SESSION);
      }
    }
    setIsLoading(false);
  }, []);

  const getUsers = (): AdminUser[] => {
    const stored = localStorage.getItem(STORAGE_KEY_USERS);
    return stored ? JSON.parse(stored) : [];
  };

  const saveUsers = (users: AdminUser[]) => {
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
  };

  const register = (username: string, email: string, password: string): { success: boolean; error?: string } => {
    const users = getUsers();
    
    if (users.some((u) => u.username === username)) {
      return { success: false, error: "Ce nom d'utilisateur existe déjà" };
    }
    
    if (users.some((u) => u.email === email)) {
      return { success: false, error: "Cet email est déjà utilisé" };
    }

    const newUser: AdminUser = {
      id: crypto.randomUUID(),
      username,
      email,
      passwordHash: simpleHash(password),
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    saveUsers(users);
    
    return { success: true };
  };

  const login = (username: string, password: string): { success: boolean; error?: string } => {
    const users = getUsers();
    const user = users.find((u) => u.username === username && u.passwordHash === simpleHash(password));
    
    if (!user) {
      return { success: false, error: "Nom d'utilisateur ou mot de passe incorrect" };
    }

    localStorage.setItem(STORAGE_KEY_SESSION, user.id);
    setCurrentUser(user);
    
    return { success: true };
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY_SESSION);
    setCurrentUser(null);
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
    isFirstSetup: getUsers().length === 0,
  };
};
