/* ================================================================
   View 2 — PIPELINE
   Full-width job list, auto-refreshes, expandable rows
   ================================================================ */

import { useState, useEffect, useCallback } from "react";
import {
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Send,
  Mail,
  ExternalLink,
  Copy,
  Loader2,
  Radio,
  FolderUp,
  Link,
  FileText,
  MailIcon,
} from "lucide-react";
import StatusToast, { type Toast } from "../components/StatusToast";
import { getJobs, routeToSonia, routeEmail } from "../api";
import type { JobSummary } from "../types";

const REFRESH_INTERVAL = 10_000;

const SOURCE_ICON: Record<string, typeof Radio> = {
  escl: Radio,
  epson_connect: Radio,
  ingest: FolderUp,
  ingest_url: Link,
  ingest_text: FileText,
  email: MailIcon,
};

const STATUS_COLORS: Record<string, string> = {
  ingested: "bg-gray-500/15 text-gray-400",
  processing: "bg-yellow-500/15 text-yellow-400",
  completed: "bg-green-500/15 text-green-400",
  routed: "bg-fh-accent/15 text-fh-accent",
  error: "bg-red-500/15 text-red-400",
};

function scoreColor(score: number): string {
  if (score >= 0.8) return "bg-fh-accent";
  if (score >= 0.5) return "bg-yellow-400";
  return "bg-red-400";
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function PipelineView() {
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback(
    (type: Toast["type"], message: string) => {
      setToasts((t) => [...t, { id: crypto.randomUUID(), type, message }]);
    },
    []
  );
  const dismissToast = useCallback(
    (id: string) => setToasts((t) => t.filter((x) => x.id !== id)),
    []
  );

  const fetchJobs = useCallback(async () => {
    try {
      const data = await getJobs({ limit: 100 });
      setJobs(data);
    } catch {
      // silent refresh failures
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
    const iv = setInterval(fetchJobs, REFRESH_INTERVAL);
    return () => clearInterval(iv);
  }, [fetchJobs]);

  // Stats
  const today = new Date().toISOString().slice(0, 10);
  const todayJobs = jobs.filter((j) => j.created_at?.startsWith(today));
  const processingCount = jobs.filter((j) => j.status === "processing").length;
  const routedCount = jobs.filter((j) => j.routed_at).length;
  const avgDna =
    jobs.length > 0
      ? (jobs.reduce((a, j) => a + (j.dna_score || 0), 0) / jobs.length).toFixed(2)
      : "—";

  async function handleRoute(jobId: string) {
    try {
      const r = await routeToSonia(jobId);
      toast(r.success ? "success" : "error", r.success ? "Routed to Sonia" : "Routing failed");
      fetchJobs();
    } catch (e: unknown) {
      toast("error", (e as Error).message);
    }
  }

  async function handleEmail(jobId: string) {
    try {
      await routeEmail(jobId);
      toast("info", "Email generated");
    } catch (e: unknown) {
      toast("error", (e as Error).message);
    }
  }

  return (
    <div className="p-4 flex flex-col gap-4">
      {/* ── Stats bar ─────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: "TODAY", value: todayJobs.length },
          { label: "PROCESSING", value: processingCount },
          { label: "ROUTED", value: routedCount },
          { label: "AVG DNA", value: avgDna },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="card px-4 py-2.5 flex items-baseline gap-2"
          >
            <span className="text-xl font-bold text-white">{value}</span>
            <span className="text-xs text-fh-dim font-medium tracking-wider">
              {label}
            </span>
          </div>
        ))}
        <button
          onClick={() => {
            setLoading(true);
            fetchJobs();
          }}
          className="btn-secondary flex items-center gap-2 text-sm ml-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* ── Job table ─────────────────────────────────────────── */}
      <div className="card overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[40px_2fr_1fr_100px_1fr_110px] gap-2 px-4 py-2.5 border-b border-fh-border text-xs text-fh-dim font-medium uppercase tracking-wider">
          <span />
          <span>File Name</span>
          <span>Doc Type</span>
          <span>DNA</span>
          <span>Time</span>
          <span>Status</span>
        </div>

        {/* Rows */}
        {loading && jobs.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-fh-dim">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Loading jobs...
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-16 text-fh-dim text-sm">
            No jobs yet. Go to Capture to ingest a document.
          </div>
        ) : (
          jobs.map((job) => {
            const isExpanded = expanded === job.job_id;
            const SrcIcon = SOURCE_ICON[job.source] || FolderUp;
            const displayStatus = job.routed_at ? "routed" : job.status;

            return (
              <div key={job.job_id} className="border-b border-fh-border last:border-0">
                {/* Main row */}
                <div
                  className="grid grid-cols-[40px_2fr_1fr_100px_1fr_110px] gap-2 px-4 py-3 items-center cursor-pointer hover:bg-white/[0.02] transition-colors"
                  onClick={() => setExpanded(isExpanded ? null : job.job_id)}
                >
                  <div className="flex items-center gap-1">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-fh-dim" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-fh-dim" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 min-w-0">
                    <SrcIcon className="w-4 h-4 text-fh-dim flex-shrink-0" />
                    <span className="text-sm text-white truncate">
                      {job.file_name || "Untitled"}
                    </span>
                  </div>
                  <span className="text-sm text-fh-muted truncate">
                    {job.doc_type || "—"}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-fh-border rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${scoreColor(job.dna_score)}`}
                        style={{ width: `${(job.dna_score || 0) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-fh-dim w-8 text-right">
                      {Math.round((job.dna_score || 0) * 100)}
                    </span>
                  </div>
                  <span className="text-xs text-fh-dim">
                    {job.created_at ? timeAgo(job.created_at) : "—"}
                  </span>
                  <span
                    className={`badge text-center justify-center ${STATUS_COLORS[displayStatus] || STATUS_COLORS.completed}`}
                  >
                    {displayStatus}
                  </span>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 bg-white/[0.01]">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm mb-3">
                      <div>
                        <span className="text-fh-dim">Job ID: </span>
                        <span className="text-fh-muted font-mono text-xs">
                          {job.job_id}
                        </span>
                      </div>
                      <div>
                        <span className="text-fh-dim">Source: </span>
                        <span className="text-fh-muted">{job.source}</span>
                      </div>
                      <div>
                        <span className="text-fh-dim">Title: </span>
                        <span className="text-white">
                          {job.title || "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-fh-dim">Routed: </span>
                        <span className="text-fh-muted">
                          {job.routed_to || "Not routed"}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="btn-primary text-xs flex items-center gap-1.5"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRoute(job.job_id);
                        }}
                      >
                        <Send className="w-3 h-3" />
                        Route to Sonia
                      </button>
                      <button
                        className="btn-secondary text-xs flex items-center gap-1.5"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEmail(job.job_id);
                        }}
                      >
                        <Mail className="w-3 h-3" />
                        Email
                      </button>
                      {job.file_url && (
                        <a
                          href={job.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-secondary text-xs flex items-center gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="w-3 h-3" />
                          View File
                        </a>
                      )}
                      <button
                        className="btn-secondary text-xs flex items-center gap-1.5"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(job.file_url || "");
                          toast("info", "URL copied");
                        }}
                      >
                        <Copy className="w-3 h-3" />
                        Copy URL
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <StatusToast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
