/* ================================================================
   FlowHub Dashboard — API Client
   All calls go to the Cloud Run push_webhook v3 backend.
   ================================================================ */

import type {
  IngestResult,
  JobSummary,
  JobDetail,
  Scanner,
  Bridge,
  RouteResult,
} from "./types";

const BASE =
  (typeof window !== "undefined" &&
    localStorage.getItem("flowhub_backend_url")) ||
  "https://flowhub-push-webhook-286939318734.us-west1.run.app";

async function request<T>(
  path: string,
  opts: RequestInit = {}
): Promise<T> {
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    ...opts,
    headers: {
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${body}`);
  }
  return res.json();
}

/* ── Health ─────────────────────────────────────────────────────── */

export async function getHealth(): Promise<Record<string, unknown>> {
  return request("/health");
}

/* ── Ingest ─────────────────────────────────────────────────────── */

export async function ingestFile(file: File): Promise<IngestResult> {
  const form = new FormData();
  form.append("file", file);
  return request("/api/ingest", { method: "POST", body: form });
}

export async function ingestUrl(url: string): Promise<IngestResult> {
  return request("/api/ingest/url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
}

export async function ingestText(
  text: string,
  title?: string
): Promise<IngestResult> {
  return request("/api/ingest/text", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, title }),
  });
}

/* ── Jobs ───────────────────────────────────────────────────────── */

export async function getJobs(params?: {
  limit?: number;
  status?: string;
  source?: string;
}): Promise<JobSummary[]> {
  const sp = new URLSearchParams();
  if (params?.limit) sp.set("limit", String(params.limit));
  if (params?.status) sp.set("status", params.status);
  if (params?.source) sp.set("source", params.source);
  const qs = sp.toString();
  return request(`/api/jobs${qs ? `?${qs}` : ""}`);
}

export async function getJobDetail(jobId: string): Promise<JobDetail> {
  return request(`/api/jobs/${jobId}`);
}

/* ── Routing ────────────────────────────────────────────────────── */

export async function routeToSonia(
  jobId: string,
  webhookUrl?: string
): Promise<RouteResult> {
  return request(`/api/route/${jobId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(webhookUrl ? { webhook_url: webhookUrl } : {}),
  });
}

export async function routeEmail(
  jobId: string,
  email?: string
): Promise<Record<string, unknown>> {
  return request(`/api/route/${jobId}/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(email ? { email } : {}),
  });
}

/* ── Scanners & Bridges ─────────────────────────────────────────── */

export async function getScanners(): Promise<Scanner[]> {
  return request("/api/scanners");
}

export async function getBridges(): Promise<Bridge[]> {
  return request("/api/bridges");
}

/* ── TD Certification ───────────────────────────────────────────── */

export async function runTdCert(
  ip: string,
  port?: number,
  badges?: string[]
): Promise<Record<string, unknown>> {
  return request("/api/td/certify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ip, port: port || 443, badges }),
  });
}
