import { useState, useEffect } from "react";
import { Declaration, DeclarationStatus, Priority } from "@/types/declaration";

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

  const addDeclaration = (declaration: Omit<Declaration, "id" | "trackingCode" | "status" | "createdAt" | "updatedAt">) => {
    const newDeclaration: Declaration = {
      ...declaration,
      id: crypto.randomUUID(),
      trackingCode: generateUniqueTrackingCode(),
      status: "en_attente",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveDeclarations([...declarations, newDeclaration]);
    return newDeclaration.trackingCode;
  };

  const updateDeclarationStatus = (id: string, status: DeclarationStatus, priority?: Priority, validatedBy?: string) => {
    const updated = declarations.map((d) =>
      d.id === id
        ? {
            ...d,
            status,
            priority,
            validatedBy,
            updatedAt: new Date().toISOString(),
          }
        : d
    );
    saveDeclarations(updated);
  };

  const getDeclarationByCode = (code: string) => {
    return declarations.find((d) => d.trackingCode === code);
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

  return {
    declarations,
    addDeclaration,
    updateDeclarationStatus,
    getDeclarationByCode,
    getValidatedDeclarations,
  };
};
