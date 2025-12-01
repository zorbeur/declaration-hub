import { Declaration } from "@/types/declaration";
import { ActivityLog } from "./useActivityLog";

export const useDataExport = () => {
  const exportToCSV = (declarations: Declaration[], filename: string = "declarations.csv") => {
    const headers = [
      "Code de suivi",
      "Type",
      "Catégorie",
      "Déclarant",
      "Téléphone",
      "Email",
      "Statut",
      "Priorité",
      "Date incident",
      "Lieu",
      "Description",
      "Date création",
      "Validé par"
    ];

    const rows = declarations.map((d) => [
      d.trackingCode,
      d.type === "plainte" ? "Plainte" : "Perte",
      d.category,
      d.declarantName,
      d.phone,
      d.email || "",
      d.status,
      d.priority || "",
      new Date(d.incidentDate).toLocaleDateString("fr-FR"),
      d.location,
      `"${d.description.replace(/"/g, '""')}"`,
      new Date(d.createdAt).toLocaleDateString("fr-FR"),
      d.validatedBy || ""
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    downloadBlob(blob, filename);
  };

  const exportToJSON = (data: any, filename: string = "export.json") => {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    downloadBlob(blob, filename);
  };

  const exportActivityLogs = (logs: ActivityLog[], filename: string = "activity_logs.csv") => {
    const headers = ["ID", "Date", "Utilisateur", "Action", "Détails", "Déclaration ID"];
    const rows = logs.map((log) => [
      log.id,
      new Date(log.timestamp).toLocaleString("fr-FR"),
      log.username,
      log.action,
      `"${log.details.replace(/"/g, '""')}"`,
      log.declarationId || ""
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    downloadBlob(blob, filename);
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const backupAllData = () => {
    const declarations = localStorage.getItem("declarations");
    const users = localStorage.getItem("admin_users");
    const logs = localStorage.getItem("activity_logs");
    const session = localStorage.getItem("admin_session");

    const backup = {
      timestamp: new Date().toISOString(),
      declarations: declarations ? JSON.parse(declarations) : [],
      users: users ? JSON.parse(users) : [],
      logs: logs ? JSON.parse(logs) : [],
      session: session || null,
    };

    exportToJSON(backup, `backup_${new Date().toISOString().split("T")[0]}.json`);
  };

  const restoreFromBackup = (file: File): Promise<boolean> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const backup = JSON.parse(e.target?.result as string);
          if (backup.declarations) localStorage.setItem("declarations", JSON.stringify(backup.declarations));
          if (backup.users) localStorage.setItem("admin_users", JSON.stringify(backup.users));
          if (backup.logs) localStorage.setItem("activity_logs", JSON.stringify(backup.logs));
          resolve(true);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  };

  return {
    exportToCSV,
    exportToJSON,
    exportActivityLogs,
    backupAllData,
    restoreFromBackup,
  };
};
