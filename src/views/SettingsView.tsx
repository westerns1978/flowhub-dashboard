/* ================================================================
   View 3 — SETTINGS — twAIn red theme
   ================================================================ */

import { useState, useEffect, useCallback } from "react";
import {
  Server,
  Scan,
  Webhook,
  Info,
  RefreshCw,
  Plus,
  Trash2,
  Loader2,
  CheckCircle,
  XCircle,
  Shield,
} from "lucide-react";
import StatusToast, { type Toast } from "../components/StatusToast";
import { getBridges, getScanners, getHealth, runTdCert } from "../api";
import type { Bridge, Scanner } from "../types";

export default function SettingsView() {
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

  return (
    <div className="p-4 max-w-4xl mx-auto flex flex-col gap-6">
      <BridgeSection toast={toast} />
      <ScannerSection toast={toast} />
      <RoutingSection toast={toast} />
      <AboutSection />
      <StatusToast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

/* ── Section 1 — Bridge Status ────────────────────────────────── */

function BridgeSection({
  toast,
}: {
  toast: (type: "success" | "error" | "info", msg: string) => void;
}) {
  const [bridges, setBridges] = useState<Bridge[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setBridges(await getBridges());
    } catch {
      toast("error", "Failed to load bridges");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  function heartbeatAge(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const secs = Math.floor(diff / 1000);
    if (secs < 60) return `${secs}s ago`;
    return `${Math.floor(secs / 60)}m ago`;
  }

  return (
    <section className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Server className="w-5 h-5 text-fh-red" />
          <h2 className="text-white font-mono font-medium">Bridge Status</h2>
        </div>
        <button onClick={load} className="btn-secondary text-xs flex items-center gap-1.5">
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {loading && bridges.length === 0 ? (
        <div className="flex items-center gap-2 text-fh-dim text-sm py-4">
          <Loader2 className="w-4 h-4 animate-spin" /> <span className="font-mono">Loading...</span>
        </div>
      ) : bridges.length === 0 ? (
        <p className="text-fh-dim text-sm font-mono">No bridges registered.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {bridges.map((b) => {
            const online = b.status === "online";
            let scannersList: string[] = [];
            try {
              const raw = typeof b.scanners === "string" ? JSON.parse(b.scanners) : b.scanners;
              if (Array.isArray(raw))
                scannersList = raw.map((s: unknown) =>
                  typeof s === "string" ? s : (s as { name: string }).name
                );
            } catch { /* ignore */ }

            return (
              <div key={b.bridge_id} className="flex items-center gap-4 p-3 rounded-lg bg-fh-bg border border-fh-border">
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${online ? "bg-fh-success" : "bg-fh-red"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium">{b.machine_name || b.bridge_id}</p>
                  <p className="text-xs text-fh-dim font-mono">
                    {b.local_server_url || "No URL"} &middot; Last seen{" "}
                    {b.last_heartbeat ? heartbeatAge(b.last_heartbeat) : "never"}
                  </p>
                  {scannersList.length > 0 && (
                    <p className="text-xs text-fh-muted mt-1 font-mono">
                      TWAIN sources: {scannersList.join(", ")}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  {b.supports_escl && <span className="badge bg-fh-red/10 text-fh-red font-mono">eSCL</span>}
                  {b.supports_certification && <span className="badge bg-fh-muted/10 text-fh-muted font-mono">Cert</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

/* ── Section 2 — Scanner Config ───────────────────────────────── */

function ScannerSection({
  toast,
}: {
  toast: (type: "success" | "error" | "info", msg: string) => void;
}) {
  const [scanners, setScanners] = useState<Scanner[]>([]);
  const [loading, setLoading] = useState(false);
  const [newIp, setNewIp] = useState("");
  const [customIps, setCustomIps] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("flowhub_scanner_ips") || "[]"); } catch { return []; }
  });
  const [certRunning, setCertRunning] = useState<string | null>(null);

  useEffect(() => { localStorage.setItem("flowhub_scanner_ips", JSON.stringify(customIps)); }, [customIps]);

  async function discover() {
    setLoading(true);
    try { setScanners(await getScanners()); } catch (e: unknown) { toast("error", (e as Error).message); } finally { setLoading(false); }
  }

  function addIp() {
    const ip = newIp.trim();
    if (ip && !customIps.includes(ip)) { setCustomIps((prev) => [...prev, ip]); setNewIp(""); }
  }

  async function certify(ip: string) {
    setCertRunning(ip);
    try {
      const report = await runTdCert(ip);
      toast("success", `Certification complete for ${ip}: ${report.status || "done"}`);
    } catch (e: unknown) { toast("error", `Cert failed: ${(e as Error).message}`); } finally { setCertRunning(null); }
  }

  return (
    <section className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Scan className="w-5 h-5 text-fh-red" />
        <h2 className="text-white font-mono font-medium">Scanner Config</h2>
      </div>

      <div className="flex gap-2 mb-4">
        <input className="input flex-1 font-mono text-sm" placeholder="Add scanner IP (e.g. 192.168.1.100)" value={newIp} onChange={(e) => setNewIp(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addIp()} />
        <button className="btn-primary" onClick={addIp}><Plus className="w-4 h-4" /></button>
        <button className="btn-secondary flex items-center gap-2" onClick={discover} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Discover
        </button>
      </div>

      {customIps.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {customIps.map((ip) => (
            <span key={ip} className="badge bg-fh-bg border border-fh-border text-fh-muted font-mono flex items-center gap-1.5">
              {ip}
              <button onClick={() => setCustomIps((prev) => prev.filter((x) => x !== ip))} className="hover:text-fh-red"><Trash2 className="w-3 h-3" /></button>
            </span>
          ))}
        </div>
      )}

      {scanners.length > 0 && (
        <div className="flex flex-col gap-2">
          {scanners.map((s, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-fh-bg border border-fh-border">
              <div className="flex items-center gap-3">
                {s.status === "online" ? <CheckCircle className="w-4 h-4 text-fh-success" /> : <XCircle className="w-4 h-4 text-fh-red" />}
                <div>
                  <p className="text-sm text-white">{s.name}</p>
                  <p className="text-xs text-fh-dim font-mono">{s.ip} &middot; {s.protocol.toUpperCase()}</p>
                </div>
              </div>
              {s.protocol === "escl" && s.status === "online" && (
                <button className="btn-secondary text-xs flex items-center gap-1.5" onClick={() => certify(s.ip)} disabled={certRunning === s.ip}>
                  {certRunning === s.ip ? <Loader2 className="w-3 h-3 animate-spin" /> : <Shield className="w-3 h-3" />} TD Cert
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* ── Section 3 — Routing Config ───────────────────────────────── */

function RoutingSection({
  toast,
}: {
  toast: (type: "success" | "error" | "info", msg: string) => void;
}) {
  const [webhookUrl, setWebhookUrl] = useState(() => localStorage.getItem("flowhub_sonia_url") || "");
  const [email, setEmail] = useState(() => localStorage.getItem("flowhub_notify_email") || "");

  function save() {
    localStorage.setItem("flowhub_sonia_url", webhookUrl);
    localStorage.setItem("flowhub_notify_email", email);
    toast("success", "Routing config saved");
  }

  async function testWebhook() {
    if (!webhookUrl) { toast("error", "Enter a webhook URL first"); return; }
    try {
      const r = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "flowhub", test: true, timestamp: new Date().toISOString() }),
      });
      toast(r.ok ? "success" : "error", r.ok ? `Webhook responded ${r.status}` : `Webhook failed: ${r.status}`);
    } catch (e: unknown) { toast("error", `Webhook unreachable: ${(e as Error).message}`); }
  }

  return (
    <section className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Webhook className="w-5 h-5 text-fh-red" />
        <h2 className="text-white font-mono font-medium">Routing Config</h2>
      </div>
      <div className="flex flex-col gap-4">
        <div>
          <label className="text-sm text-fh-muted mb-1 block font-mono uppercase tracking-wider text-xs">Sonia / OpenClaw Webhook URL</label>
          <div className="flex gap-2">
            <input className="input flex-1 font-mono text-sm" placeholder="https://your-agent-webhook.run.app/webhook" value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} />
            <button className="btn-secondary text-sm" onClick={testWebhook}>Test</button>
          </div>
        </div>
        <div>
          <label className="text-sm text-fh-muted mb-1 block font-mono uppercase tracking-wider text-xs">Notification Email</label>
          <input className="input font-mono text-sm" placeholder="notifications@yourorg.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <button className="btn-primary self-start" onClick={save}>Save Config</button>
      </div>
    </section>
  );
}

/* ── Section 4 — About ────────────────────────────────────────── */

function AboutSection() {
  const [health, setHealth] = useState<Record<string, unknown> | null>(null);
  useEffect(() => { getHealth().then(setHealth).catch(() => {}); }, []);

  return (
    <section className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Info className="w-5 h-5 text-fh-red" />
        <h2 className="text-white font-mono font-medium">About</h2>
      </div>
      <div className="text-sm text-fh-muted space-y-2">
        <p><span className="text-white font-mono font-medium">FlowHub v2</span> &middot; Gemynd LLC</p>
        <p><span className="text-fh-red">TWAIN Innovation Cloud</span> reference implementation</p>
        <p>Document ingestion, AI processing (Gemini), and agent routing platform.</p>
        {health && (
          <div className="mt-3 p-3 rounded-lg bg-fh-bg border border-fh-border text-xs font-mono">
            <p>Backend: {String(health.version)} &middot; {String(health.status)}</p>
            <p>Gemini: {health.gemini_configured ? <span className="text-fh-success">configured</span> : <span className="text-fh-red">not configured</span>}</p>
            <p>Supabase: {health.supabase_configured ? <span className="text-fh-success">configured</span> : <span className="text-fh-red">not configured</span>}</p>
            <p>Sonia: {health.sonia_configured ? <span className="text-fh-success">configured</span> : <span className="text-fh-warning">not configured</span>}</p>
          </div>
        )}
        <div className="flex gap-4 pt-2">
          <a href="https://flowhub-push-webhook-286939318734.us-west1.run.app/health" target="_blank" rel="noopener noreferrer" className="text-fh-red hover:underline text-xs font-mono">/health</a>
          <a href="https://flowhub-push-webhook-286939318734.us-west1.run.app/eop/diag" target="_blank" rel="noopener noreferrer" className="text-fh-red hover:underline text-xs font-mono">/eop/diag</a>
        </div>
      </div>
    </section>
  );
}
