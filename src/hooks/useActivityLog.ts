import { useState, useEffect } from "react";

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

export const useActivityLog = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setLogs(JSON.parse(stored));
    }
  }, []);

  const saveLogs = (newLogs: ActivityLog[]) => {
    // Keep only the most recent logs
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
    saveLogs([...logs, newLog]);
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
  };
};
