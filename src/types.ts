/* ================================================================
   FlowHub Dashboard — Type Definitions
   ================================================================ */

export interface DnaResult {
  document_type: string;
  title: string;
  summary: string;
  entities: string[];
  tags: string[];
  language: string;
  dna_score: number;
  key_fields: Record<string, unknown>;
}

export interface JobSummary {
  job_id: string;
  status: string;
  source: string;
  file_name: string;
  file_url: string;
  doc_type: string;
  dna_score: number;
  title: string;
  created_at: string;
  routed_at: string | null;
  routed_to: string | null;
}

export interface JobDetail {
  id: string;
  status: string;
  source: string;
  file_name: string;
  file_url: string;
  dna_result: DnaResult | string | null;
  initiated_by: string;
  bridge_id: string | null;
  scanner_id: string | null;
  started_at: string;
  completed_at: string | null;
  created_at: string;
  routed_at: string | null;
  routed_to: string | null;
  settings: Record<string, unknown> | null;
}

export interface IngestResult {
  job_id: string;
  file_url: string;
  file_name: string;
  dna: DnaResult;
  status: string;
}

export interface Scanner {
  ip: string;
  name: string;
  status: string;
  protocol: string;
  protocol_url?: string;
  bridge_id?: string;
}

export interface Bridge {
  bridge_id: string;
  machine_name: string;
  status: string;
  last_heartbeat: string;
  scanners: unknown;
  supports_escl: boolean;
  supports_certification: boolean;
  local_server_url: string;
  capabilities: Record<string, unknown> | null;
}

export interface RouteResult {
  success: boolean;
  routed_to: string;
  webhook_url?: string;
  response?: unknown;
}

export type View = "capture" | "pipeline" | "settings";
