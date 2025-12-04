export type DeclarationStatus = "en_attente" | "validee" | "rejetee" | "en_cours" | "resolue" | "classee";
export type DeclarationType = "plainte" | "perte";
export type Priority = "faible" | "moyenne" | "importante" | "urgente";

export interface DeclarationAttachment {
  id: string;
  name: string;
  data: string; // base64
  type: string;
}

export interface Tip {
  id: string;
  declarationId: string;
  tipsterPhone: string;
  description: string;
  attachments: DeclarationAttachment[];
  createdAt: string;
  isRead: boolean;
}

export interface Message {
  id: string;
  declarationId: string;
  senderId: string;
  senderName: string;
  senderType: "admin" | "declarant";
  content: string;
  createdAt: string;
  isRead: boolean;
}

export interface Declaration {
  id: string;
  trackingCode: string;
  declarantName: string;
  phone: string;
  email?: string;
  type: DeclarationType;
  category: string;
  description: string;
  incidentDate: string;
  location: string;
  reward?: string;
  attachments: DeclarationAttachment[];
  status: DeclarationStatus;
  priority?: Priority;
  createdAt: string;
  updatedAt: string;
  validatedBy?: string;
  assignedTo?: string;
  // Informations de suivi technique
  browserInfo?: string;
  deviceType?: string;
  deviceModel?: string;
  ipAddress?: string;
  // Historique des statuts pour workflow
  statusHistory?: {
    status: DeclarationStatus;
    changedBy: string;
    changedAt: string;
    comment?: string;
  }[];
  // Indices soumis par le public
  tips?: Tip[];
  // Messages pour la plainte
  messages?: Message[];
}

// Status labels for display
export const STATUS_LABELS: Record<DeclarationStatus, string> = {
  en_attente: "En attente",
  validee: "Validée",
  rejetee: "Rejetée",
  en_cours: "En cours de traitement",
  resolue: "Résolue",
  classee: "Classée sans suite"
};

export const STATUS_COLORS: Record<DeclarationStatus, string> = {
  en_attente: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  validee: "bg-success/10 text-success border-success/20",
  rejetee: "bg-destructive/10 text-destructive border-destructive/20",
  en_cours: "bg-primary/10 text-primary border-primary/20",
  resolue: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  classee: "bg-muted text-muted-foreground border-muted"
};
