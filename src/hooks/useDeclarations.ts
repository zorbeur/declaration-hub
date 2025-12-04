import { useState, useEffect } from "react";
import { Declaration, DeclarationStatus, Priority, Tip, Message } from "@/types/declaration";

const STORAGE_KEY = "declarations";

// Generate a cryptographically strong random tracking code
const generateSecureTrackingCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excludes confusing chars like 0, O, I, 1
  const segments = [4, 4, 4]; // Format: XXXX-XXXX-XXXX
  
  let code = '';
  const randomValues = new Uint32Array(12);
  crypto.getRandomValues(randomValues);
  
  let idx = 0;
  segments.forEach((length, segIndex) => {
    for (let i = 0; i < length; i++) {
      code += chars[randomValues[idx] % chars.length];
      idx++;
    }
    if (segIndex < segments.length - 1) {
      code += '-';
    }
  });
  
  return code;
};

export const useDeclarations = () => {
  const [declarations, setDeclarations] = useState<Declaration[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setDeclarations(JSON.parse(stored));
    }
  }, []);

  const saveDeclarations = (newDeclarations: Declaration[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newDeclarations));
    setDeclarations(newDeclarations);
  };

  const isTrackingCodeUnique = (code: string): boolean => {
    return !declarations.some(d => d.trackingCode === code);
  };

  const generateUniqueTrackingCode = (): string => {
    let code = generateSecureTrackingCode();
    let attempts = 0;
    
    // Ensure uniqueness (extremely unlikely to need retries)
    while (!isTrackingCodeUnique(code) && attempts < 10) {
      code = generateSecureTrackingCode();
      attempts++;
    }
    
    return code;
  };

  const addDeclaration = (declaration: Omit<Declaration, "id" | "trackingCode" | "status" | "createdAt" | "updatedAt" | "statusHistory" | "tips" | "messages">) => {
    const newDeclaration: Declaration = {
      ...declaration,
      id: crypto.randomUUID(),
      trackingCode: generateUniqueTrackingCode(),
      status: "en_attente",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      statusHistory: [{
        status: "en_attente",
        changedBy: "Système",
        changedAt: new Date().toISOString(),
        comment: "Déclaration créée"
      }],
      tips: [],
      messages: [],
    };
    saveDeclarations([...declarations, newDeclaration]);
    return newDeclaration.trackingCode;
  };

  const updateDeclarationStatus = (
    id: string, 
    status: DeclarationStatus, 
    priority?: Priority, 
    validatedBy?: string,
    comment?: string,
    assignedTo?: string
  ) => {
    const updated = declarations.map((d) =>
      d.id === id
        ? {
            ...d,
            status,
            priority,
            validatedBy,
            assignedTo: assignedTo || d.assignedTo,
            updatedAt: new Date().toISOString(),
            statusHistory: [
              ...(d.statusHistory || []),
              {
                status,
                changedBy: validatedBy || "Système",
                changedAt: new Date().toISOString(),
                comment
              }
            ]
          }
        : d
    );
    saveDeclarations(updated);
  };

  const addTip = (declarationId: string, tip: Omit<Tip, "id" | "createdAt" | "isRead">) => {
    const updated = declarations.map((d) =>
      d.id === declarationId
        ? {
            ...d,
            tips: [
              ...(d.tips || []),
              {
                ...tip,
                id: crypto.randomUUID(),
                createdAt: new Date().toISOString(),
                isRead: false,
              }
            ],
            updatedAt: new Date().toISOString(),
          }
        : d
    );
    saveDeclarations(updated);
  };

  const markTipAsRead = (declarationId: string, tipId: string) => {
    const updated = declarations.map((d) =>
      d.id === declarationId
        ? {
            ...d,
            tips: d.tips?.map(tip => 
              tip.id === tipId ? { ...tip, isRead: true } : tip
            )
          }
        : d
    );
    saveDeclarations(updated);
  };

  const addMessage = (declarationId: string, message: Omit<Message, "id" | "createdAt" | "isRead">) => {
    const updated = declarations.map((d) =>
      d.id === declarationId
        ? {
            ...d,
            messages: [
              ...(d.messages || []),
              {
                ...message,
                id: crypto.randomUUID(),
                createdAt: new Date().toISOString(),
                isRead: false,
              }
            ],
            updatedAt: new Date().toISOString(),
          }
        : d
    );
    saveDeclarations(updated);
  };

  const markMessagesAsRead = (declarationId: string, senderType: "admin" | "declarant") => {
    const updated = declarations.map((d) =>
      d.id === declarationId
        ? {
            ...d,
            messages: d.messages?.map(msg => 
              msg.senderType !== senderType ? { ...msg, isRead: true } : msg
            )
          }
        : d
    );
    saveDeclarations(updated);
  };

  const getDeclarationByCode = (code: string) => {
    return declarations.find((d) => d.trackingCode === code);
  };

  const getDeclarationById = (id: string) => {
    return declarations.find((d) => d.id === id);
  };

  const getValidatedDeclarations = () => {
    return declarations
      .filter((d) => d.status === "validee")
      .sort((a, b) => {
        const priorityOrder = { urgente: 4, importante: 3, moyenne: 2, faible: 1 };
        const aPriority = priorityOrder[a.priority || "faible"];
        const bPriority = priorityOrder[b.priority || "faible"];
        if (aPriority !== bPriority) return bPriority - aPriority;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  };

  const getUnreadTipsCount = () => {
    return declarations.reduce((count, d) => {
      return count + (d.tips?.filter(t => !t.isRead).length || 0);
    }, 0);
  };

  const getUnreadMessagesCount = (forAdmin: boolean = true) => {
    return declarations.reduce((count, d) => {
      return count + (d.messages?.filter(m => !m.isRead && (forAdmin ? m.senderType === "declarant" : m.senderType === "admin")).length || 0);
    }, 0);
  };

  // Export all data for backup
  const exportData = () => {
    return JSON.stringify(declarations, null, 2);
  };

  // Import data from backup
  const importData = (data: string) => {
    try {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        saveDeclarations(parsed);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  return {
    declarations,
    addDeclaration,
    updateDeclarationStatus,
    getDeclarationByCode,
    getDeclarationById,
    getValidatedDeclarations,
    addTip,
    markTipAsRead,
    addMessage,
    markMessagesAsRead,
    getUnreadTipsCount,
    getUnreadMessagesCount,
    exportData,
    importData,
  };
};
