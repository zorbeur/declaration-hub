export type DeclarationStatus = "en_attente" | "validee" | "rejetee";
export type DeclarationType = "plainte" | "perte";
export type Priority = "faible" | "moyenne" | "importante" | "urgente";

export interface DeclarationAttachment {
  id: string;
  name: string;
  data: string; // base64
  type: string;
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
}
