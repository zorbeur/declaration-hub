
import { useState, useEffect, useRef } from "react";
import api from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export interface ActivityLog {
  id: string;
  timestamp: string;
  userId: string;
  username: string;
  action: string;
  details: string;
  declarationId?: string;
}

const STORAGE_KEY = "activity_logs";
const MAX_LOGS = 1000;
const API_URL = "/api/activity-logs/";

function isOnline() {
  return typeof window !== "undefined" && window.navigator.onLine;
}

async function fetchLogsAPI() {
  return await api.get(API_URL);
}

async function postLogAPI(log: any) {
  return await api.post(API_URL, log);
}

export const useActivityLog = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const offlineQueue = useRef<ActivityLog[]>([]);
  const [online, setOnline] = useState(isOnline());
  const { toast } = useToast();

  useEffect(() => {
    const sync = async () => {
      if (isOnline()) {
        try {
          const apiLogs = await fetchLogsAPI();
          setLogs(apiLogs);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(apiLogs));
        } catch (err: any) {
          // if unauthorized, show a toast and fallback to local
          if (err?.status === 401) {
            toast({ title: 'Session expirée', description: 'Veuillez vous reconnecter', variant: 'destructive' });
          }
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored) setLogs(JSON.parse(stored));
        }
      } else {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) setLogs(JSON.parse(stored));
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

  useEffect(() => {
    if (online && offlineQueue.current.length > 0) {
      offlineQueue.current.forEach(async (log) => {
        try {
          await postLogAPI(log);
        } catch {}
      });
      offlineQueue.current = [];
    }
  }, [online]);

  const saveLogs = (newLogs: ActivityLog[]) => {
    const trimmedLogs = newLogs.slice(-MAX_LOGS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedLogs));
    setLogs(trimmedLogs);
  };

  const addLog = (
    userId: string,
    username: string,
    action: string,
    details: string,
    declarationId?: string
  ) => {
    const newLog: ActivityLog = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      userId,
      username,
      action,
      details,
      declarationId,
    };
    if (isOnline()) {
      postLogAPI(newLog).then(() => {
        fetchLogsAPI().then(setLogs);
      }).catch(() => {
        offlineQueue.current.push(newLog);
        saveLogs([...logs, newLog]);
      });
    } else {
      offlineQueue.current.push(newLog);
      saveLogs([...logs, newLog]);
    }
  };

  const clearLogs = () => {
    localStorage.removeItem(STORAGE_KEY);
    setLogs([]);
  };

  const getRecentLogs = (limit: number = 50) => {
    return logs.slice(-limit).reverse();
  };

  const getLogsByUser = (userId: string) => {
    return logs.filter((log) => log.userId === userId);
  };

  const getLogsByDeclaration = (declarationId: string) => {
    return logs.filter((log) => log.declarationId === declarationId);
  };

  return {
    logs,
    addLog,
    clearLogs,
    getRecentLogs,
    getLogsByUser,
    getLogsByDeclaration,
    online,
  };
};
