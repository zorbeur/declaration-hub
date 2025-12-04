import { useState, useEffect, useRef } from "react";
import { Declaration, DeclarationStatus, Priority } from "@/types/declaration";
import api from "@/lib/api";

const STORAGE_KEY = "declarations";
const API_URL = "/api/declarations/";

function isOnline() {
  return typeof window !== "undefined" && window.navigator.onLine;
}

async function fetchDeclarationsAPI(token?: string) {
  return await api.get(API_URL);
}

async function postDeclarationAPI(declaration: any, recaptchaToken?: string) {
  const headers: any = { "Content-Type": "application/json" };

  // Normalize payload to API expected snake_case and remove client-only fields
  const payload: any = {
    id: declaration.id || declaration.ID || null,
    tracking_code: declaration.trackingCode || declaration.tracking_code,
    declarant_name: declaration.declarantName || declaration.declarant_name,
    phone: declaration.phone,
    email: declaration.email || null,
    type: declaration.type,
    category: declaration.category,
    description: declaration.description,
    // Ensure incident_date is ISO datetime if provided
    incident_date: declaration.incidentDate
      ? (new Date(declaration.incidentDate)).toISOString()
      : declaration.incident_date || null,
    location: declaration.location,
    reward: declaration.reward || null,
    status: declaration.status,
    priority: declaration.priority || null,
    browser_info: declaration.browser_info || declaration.browserInfo || null,
    device_type: declaration.device_type || declaration.deviceType || null,
    device_model: declaration.device_model || declaration.deviceModel || null,
    // ip_address must be a valid IP or null (do not send placeholder strings)
    ip_address: (() => {
      const ip = declaration.ip_address || declaration.ipAddress || null;
      if (!ip) return null;
      const v4 = /^\d{1,3}(?:\.\d{1,3}){3}$/;
      const v6 = /:/; // simple check for IPv6
      return (v4.test(ip) || v6.test(ip)) ? ip : null;
    })(),
  };

  if (recaptchaToken) payload.recaptcha = recaptchaToken;

  return await api.post(API_URL, payload);
}

export const useDeclarations = () => {
  const [declarations, setDeclarations] = useState<Declaration[]>([]);
  const offlineQueue = useRef<Declaration[]>([]);
  const [online, setOnline] = useState(isOnline());

  // Sync declarations from API or localStorage
  useEffect(() => {
    const sync = async () => {
      const token = localStorage.getItem("jwt_token");
      if (isOnline()) {
        try {
          const apiDecs = await fetchDeclarationsAPI(token);
          const decsArray = Array.isArray(apiDecs) ? apiDecs : apiDecs.results || [];
          setDeclarations(decsArray);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(decsArray));
        } catch (err) {
          console.error("Erreur API declarations:", err);
          // fallback local
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored) setDeclarations(JSON.parse(stored));
        }
      } else {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) setDeclarations(JSON.parse(stored));
      }
    };
    sync();
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Sync offline queue when back online
  useEffect(() => {
    if (online && offlineQueue.current.length > 0) {
      const token = localStorage.getItem("jwt_token");
      offlineQueue.current.forEach(async (dec) => {
        try {
          await postDeclarationAPI(dec, token);
        } catch (err) {
          console.error("Erreur sync declaration:", err);
        }
      });
      offlineQueue.current = [];
    }
  }, [online]);

  const saveDeclarations = (newDeclarations: Declaration[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newDeclarations));
    setDeclarations(newDeclarations);
  };

  const addDeclaration = async (declaration: Omit<Declaration, "id" | "trackingCode" | "status" | "createdAt" | "updatedAt">, recaptcha?: string): Promise<string> => {
    // Temporary local item (used if offline or on error)
    const tempId = crypto.randomUUID();
    const tempCode = Math.random().toString(36).slice(2, 14).toUpperCase();
    const newDeclaration: Declaration = {
      ...declaration,
      id: tempId,
      trackingCode: tempCode,
      status: "en_attente",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (!isOnline()) {
      offlineQueue.current.push(newDeclaration);
      saveDeclarations([...declarations, newDeclaration]);
      return tempCode;
    }

    try {
      const res = await postDeclarationAPI(newDeclaration, recaptcha);
      // API returns the created declaration (snake_case). Prefer tracking_code from server
      const serverCode = res.tracking_code || res.trackingCode || tempCode;
      const serverId = res.id || tempId;

      // Refresh declarations list from server to keep local state consistent
      try {
        const data = await fetchDeclarationsAPI();
        const decsArray = Array.isArray(data) ? data : data.results || [];
        setDeclarations(decsArray);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(decsArray));
      } catch (e) {
        // If refresh failed, incorporate server's info into local copy
        const updatedLocal = [...declarations, { ...newDeclaration, id: serverId, trackingCode: serverCode }];
        saveDeclarations(updatedLocal);
      }

      return serverCode;
    } catch (err) {
      console.error("Erreur post declaration:", err);
      // Fallback: queue for later sync
      offlineQueue.current.push(newDeclaration);
      saveDeclarations([...declarations, newDeclaration]);
      return tempCode;
    }
  };

  const updateDeclarationStatus = async (id: string, status: DeclarationStatus, priority?: Priority, validatedBy?: string) => {
    // Préparer les données
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
    
    // Syncer avec API si connected
    const token = localStorage.getItem("jwt_token");
    if (isOnline() && token) {
      const updatedDecl = updated.find(d => d.id === id);
      if (updatedDecl) {
        try {
          await api.patch(`${API_URL}${id}/`, {
            status,
            priority,
            validated_by: validatedBy
          });
          // Mise à jour réussie : sauvegarder localement
          saveDeclarations(updated);
        } catch (err) {
          console.error("Erreur PATCH declaration:", err);
          throw err; // Propager l'erreur au composant
        }
      }
    } else {
      // Mode offline : mise à jour locale uniquement
      saveDeclarations(updated);
    }
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
    online,
  };
};
