import { useState, useEffect } from "react";

export type ActivityAction = 
  | "connexion"
  | "deconnexion"
  | "declaration_creee"
  | "declaration_validee"
  | "declaration_rejetee"
  | "declaration_en_cours"
  | "declaration_resolue"
  | "declaration_classee"
  | "priorite_modifiee"
  | "assignation_modifiee"
  | "indice_recu"
  | "indice_lu"
  | "message_envoye"
  | "message_lu"
  | "utilisateur_ajoute"
  | "utilisateur_supprime"
  | "donnees_exportees"
  | "donnees_importees"
  | "donnees_effacees"
  | "2fa_active"
  | "2fa_desactive"
  | "filtre_applique"
  | "recherche_effectuee"
  | "piece_jointe_ajoutee"
  | "piece_jointe_supprimee"
  | "commentaire_ajoute"
  | "erreur_systeme"
  | "autre";

export interface ActivityLog {
  id: string;
  timestamp: string;
  userId: string;
  username: string;
  action: ActivityAction;
  actionLabel: string;
  details: string;
  declarationId?: string;
  declarationCode?: string;
  metadata?: Record<string, any>;
}

const STORAGE_KEY = "activity_logs";
const MAX_LOGS = 5000; // Increased for more history

const ACTION_LABELS: Record<ActivityAction, string> = {
  connexion: "Connexion",
  deconnexion: "Déconnexion",
  declaration_creee: "Déclaration créée",
  declaration_validee: "Déclaration validée",
  declaration_rejetee: "Déclaration rejetée",
  declaration_en_cours: "En cours de traitement",
  declaration_resolue: "Déclaration résolue",
  declaration_classee: "Déclaration classée",
  priorite_modifiee: "Priorité modifiée",
  assignation_modifiee: "Assignation modifiée",
  indice_recu: "Indice reçu",
  indice_lu: "Indice lu",
  message_envoye: "Message envoyé",
  message_lu: "Message lu",
  utilisateur_ajoute: "Utilisateur ajouté",
  utilisateur_supprime: "Utilisateur supprimé",
  donnees_exportees: "Données exportées",
  donnees_importees: "Données importées",
  donnees_effacees: "Données effacées",
  "2fa_active": "2FA activé",
  "2fa_desactive": "2FA désactivé",
  filtre_applique: "Filtre appliqué",
  recherche_effectuee: "Recherche effectuée",
  piece_jointe_ajoutee: "Pièce jointe ajoutée",
  piece_jointe_supprimee: "Pièce jointe supprimée",
  commentaire_ajoute: "Commentaire ajouté",
  erreur_systeme: "Erreur système",
  autre: "Autre action",
};

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
    action: ActivityAction,
    details: string,
    declarationId?: string,
    declarationCode?: string,
    metadata?: Record<string, any>
  ) => {
    const newLog: ActivityLog = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      userId,
      username,
      action,
      actionLabel: ACTION_LABELS[action],
      details,
      declarationId,
      declarationCode,
      metadata,
    };
    saveLogs([...logs, newLog]);
    return newLog;
  };

  const clearLogs = () => {
    localStorage.removeItem(STORAGE_KEY);
    setLogs([]);
  };

  const getRecentLogs = (limit: number = 50) => {
    return logs.slice(-limit).reverse();
  };

  const getLogsByUser = (userId: string) => {
    return logs.filter((log) => log.userId === userId).reverse();
  };

  const getLogsByDeclaration = (declarationId: string) => {
    return logs.filter((log) => log.declarationId === declarationId).reverse();
  };

  const getLogsByAction = (action: ActivityAction) => {
    return logs.filter((log) => log.action === action).reverse();
  };

  const getLogsByDateRange = (startDate: Date, endDate: Date) => {
    return logs.filter((log) => {
      const logDate = new Date(log.timestamp);
      return logDate >= startDate && logDate <= endDate;
    }).reverse();
  };

  const searchLogs = (query: string) => {
    const lowerQuery = query.toLowerCase();
    return logs.filter((log) => 
      log.details.toLowerCase().includes(lowerQuery) ||
      log.username.toLowerCase().includes(lowerQuery) ||
      log.actionLabel.toLowerCase().includes(lowerQuery) ||
      log.declarationCode?.toLowerCase().includes(lowerQuery)
    ).reverse();
  };

  const exportLogs = () => {
    return JSON.stringify(logs, null, 2);
  };

  return {
    logs,
    addLog,
    clearLogs,
    getRecentLogs,
    getLogsByUser,
    getLogsByDeclaration,
    getLogsByAction,
    getLogsByDateRange,
    searchLogs,
    exportLogs,
  };
};
