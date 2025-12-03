import { useState, useEffect } from "react";

interface AdminUser {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  createdAt: string;
  twoFactorEnabled?: boolean;
  twoFactorSecret?: string;
}

interface PendingVerification {
  userId: string;
  code: string;
  expiresAt: number;
}

const STORAGE_KEY_USERS = "admin_users";
const STORAGE_KEY_SESSION = "admin_session";
const STORAGE_KEY_PENDING_2FA = "pending_2fa";

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

// Generate 6-digit OTP code
const generateOTPCode = (): string => {
  const randomValues = new Uint32Array(1);
  crypto.getRandomValues(randomValues);
  return (randomValues[0] % 1000000).toString().padStart(6, '0');
};

export const useAuth = () => {
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFirstSetup, setIsFirstSetup] = useState(false);
  const [pendingVerification, setPendingVerification] = useState<PendingVerification | null>(null);

  useEffect(() => {
    // Check for existing session
    const session = localStorage.getItem(STORAGE_KEY_SESSION);
    const users = getUsers();
    setIsFirstSetup(users.length === 0);
    
    // Check for pending 2FA
    const pending2FA = localStorage.getItem(STORAGE_KEY_PENDING_2FA);
    if (pending2FA) {
      const parsed = JSON.parse(pending2FA);
      if (parsed.expiresAt > Date.now()) {
        setPendingVerification(parsed);
      } else {
        localStorage.removeItem(STORAGE_KEY_PENDING_2FA);
      }
    }
    
    if (session) {
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

  const register = (username: string, email: string, password: string, enable2FA: boolean = false): { success: boolean; error?: string } => {
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
      twoFactorEnabled: enable2FA,
    };

    users.push(newUser);
    saveUsers(users);
    
    return { success: true };
  };

  const login = (username: string, password: string): { success: boolean; error?: string; requires2FA?: boolean; verificationCode?: string } => {
    const users = getUsers();
    const user = users.find((u) => u.username === username && u.passwordHash === simpleHash(password));
    
    if (!user) {
      return { success: false, error: "Nom d'utilisateur ou mot de passe incorrect" };
    }

    // If 2FA is enabled, generate and require verification
    if (user.twoFactorEnabled) {
      const code = generateOTPCode();
      const pending: PendingVerification = {
        userId: user.id,
        code,
        expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes expiry
      };
      
      localStorage.setItem(STORAGE_KEY_PENDING_2FA, JSON.stringify(pending));
      setPendingVerification(pending);
      
      // In a real app, this would be sent via email/SMS
      // For demo purposes, we'll show it in the console and return it
      console.log(`Code de vérification 2FA: ${code}`);
      
      return { 
        success: false, 
        requires2FA: true, 
        verificationCode: code, // Only for demo - never do this in production!
      };
    }

    localStorage.setItem(STORAGE_KEY_SESSION, user.id);
    setCurrentUser(user);
    
    return { success: true };
  };

  const verify2FA = (code: string): { success: boolean; error?: string } => {
    if (!pendingVerification) {
      return { success: false, error: "Aucune vérification en attente" };
    }

    if (Date.now() > pendingVerification.expiresAt) {
      localStorage.removeItem(STORAGE_KEY_PENDING_2FA);
      setPendingVerification(null);
      return { success: false, error: "Le code a expiré. Veuillez vous reconnecter." };
    }

    if (code !== pendingVerification.code) {
      return { success: false, error: "Code de vérification incorrect" };
    }

    // Verification successful
    localStorage.setItem(STORAGE_KEY_SESSION, pendingVerification.userId);
    localStorage.removeItem(STORAGE_KEY_PENDING_2FA);
    
    const users = getUsers();
    const user = users.find(u => u.id === pendingVerification.userId);
    if (user) {
      setCurrentUser(user);
    }
    
    setPendingVerification(null);
    
    return { success: true };
  };

  const cancelPending2FA = () => {
    localStorage.removeItem(STORAGE_KEY_PENDING_2FA);
    setPendingVerification(null);
  };

  const enable2FA = (userId: string): { success: boolean; error?: string } => {
    const users = getUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      return { success: false, error: "Utilisateur non trouvé" };
    }

    users[userIndex].twoFactorEnabled = true;
    saveUsers(users);
    
    if (currentUser?.id === userId) {
      setCurrentUser({ ...currentUser, twoFactorEnabled: true });
    }
    
    return { success: true };
  };

  const disable2FA = (userId: string): { success: boolean; error?: string } => {
    const users = getUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      return { success: false, error: "Utilisateur non trouvé" };
    }

    users[userIndex].twoFactorEnabled = false;
    saveUsers(users);
    
    if (currentUser?.id === userId) {
      setCurrentUser({ ...currentUser, twoFactorEnabled: false });
    }
    
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
    isFirstSetup,
    verify2FA,
    pendingVerification,
    cancelPending2FA,
    enable2FA,
    disable2FA,
  };
};
