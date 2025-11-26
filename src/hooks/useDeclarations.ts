import { useState, useEffect } from "react";
import { Declaration, DeclarationStatus, Priority } from "@/types/declaration";

const STORAGE_KEY = "declarations";

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

  const generateTrackingCode = (): string => {
    const year = new Date().getFullYear();
    const count = declarations.length + 1;
    return `DECL-${year}-${count.toString().padStart(6, "0")}`;
  };

  const addDeclaration = (declaration: Omit<Declaration, "id" | "trackingCode" | "status" | "createdAt" | "updatedAt">) => {
    const newDeclaration: Declaration = {
      ...declaration,
      id: crypto.randomUUID(),
      trackingCode: generateTrackingCode(),
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
