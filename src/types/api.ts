// Types for API request/response payloads

export interface AttachmentResponse {
  id: string;
  name: string;
  file: string;
  mime_type: string;
  size: number;
  uploaded_at: string;
}

export interface DeclarationCreatePayload {
  declarant_name: string;
  phone: string;
  email?: string | null;
  type: string;
  category: string;
  description: string;
  incident_date: string; // ISO
  location: string;
  reward?: string | null;
  browser_info?: string | null;
  device_type?: string | null;
  device_model?: string | null;
  ip_address?: string | null;
  recaptcha?: string;
}

export interface DeclarationResponse {
  id: string;
  tracking_code: string;
  declarant_name: string;
  phone: string;
  email?: string | null;
  type: string;
  category: string;
  description: string;
  incident_date: string;
  location: string;
  reward?: string | null;
  attachments: AttachmentResponse[];
  status: string;
  priority?: string | null;
  created_at: string;
  updated_at: string;
  validated_by?: any | null;
  browser_info?: string | null;
  device_type?: string | null;
  device_model?: string | null;
  ip_address?: string | null;
}

export interface ClueCreatePayload {
  declaration: string;
  phone: string;
  description: string;
  image?: string | null; // attachment id
}

export interface ClueResponse {
  id: string;
  declaration: string;
  phone: string;
  description: string;
  image?: AttachmentResponse | null;
  created_at: string;
  is_verified: boolean;
  verified_by?: any | null;
}

export interface ActivityLogResponse {
  id: string;
  timestamp: string;
  user?: any | null;
  username: string;
  action: string;
  details: string;
  declaration?: DeclarationResponse | null;
}

export interface ProtectionSettingsResponse {
  enable_rate_limit_declarations: boolean;
  rate_limit_declarations: string;
  enable_captcha_declarations: boolean;
  enable_rate_limit_attachments: boolean;
  enable_captcha_clues: boolean;
  ip_blacklist: string;
  updated_at: string;
}

export interface AuthTokenResponse {
  access: string;
  refresh?: string;
}

export interface SyncResponse {
  synced_count: number;
  error_count: number;
  synced: string[];
  errors: any[];
}

export type ApiError = {
  detail?: string;
  [key: string]: any;
};
