/* ================================================================
   View 1 — CAPTURE — twAIn red theme
   ================================================================ */

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Upload,
  Link,
  FileText,
  Scan,
  Loader2,
  Clipboard,
} from "lucide-react";
import DnaPanel from "../components/DnaPanel";
import StatusToast, { type Toast } from "../components/StatusToast";
import {
  ingestFile,
  ingestUrl,
  ingestText,
  getScanners,
  routeToSonia,
  routeEmail,
} from "../api";
import type { IngestResult, Scanner } from "../types";

type Tab = "drop" | "url" | "text" | "scanner";

const TABS: { id: Tab; label: string; icon: typeof Upload }[] = [
  { id: "drop", label: "Drop Zone", icon: Upload },
  { id: "url", label: "URL", icon: Link },
  { id: "text", label: "Text / Email", icon: FileText },
  { id: "scanner", label: "Scanner", icon: Scan },
];

export default function CaptureView() {
  const [tab, setTab] = useState<Tab>("drop");
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<IngestResult | null>(null);
  const [routing, setRouting] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Listen for Flow voice agent events
  useEffect(() => {
    function onDiscover() { setTab("scanner"); }
    function onScan() { setTab("scanner"); }
    window.addEventListener("flow:discover-scanners", onDiscover);
    window.addEventListener("flow:scan-document", onScan);
    return () => {
      window.removeEventListener("flow:discover-scanners", onDiscover);
      window.removeEventListener("flow:scan-document", onScan);
    };
  }, []);

  const toast = useCallback(
    (type: Toast["type"], message: string) => {
      const id = crypto.randomUUID();
      setToasts((t) => [...t, { id, type, message }]);
    },
    []
  );
  const dismissToast = useCallback(
    (id: string) => setToasts((t) => t.filter((x) => x.id !== id)),
    []
  );

  async function handleIngest(fn: () => Promise<IngestResult>) {
    setProcessing(true);
    try {
      const r = await fn();
      setResult(r);
      toast("success", `Processed: ${r.dna?.title || r.file_name}`);
    } catch (e: unknown) {
      toast("error", `Ingest failed: ${(e as Error).message}`);
    } finally {
      setProcessing(false);
    }
  }

  async function handleRoute(jobId: string) {
    setRouting(true);
    try {
      const r = await routeToSonia(jobId);
      toast(r.success ? "success" : "error", r.success ? "Routed to Sonia" : "Routing failed");
    } catch (e: unknown) {
      toast("error", (e as Error).message);
    } finally {
      setRouting(false);
    }
  }

  async function handleEmail(jobId: string) {
    try {
      const r = await routeEmail(jobId);
      toast("info", r.success ? "Email sent" : "Email content generated (no SendGrid key)");
    } catch (e: unknown) {
      toast("error", (e as Error).message);
    }
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 p-4 h-[calc(100vh-7rem)]">
      {/* ── Left panel: inputs ─────────────────────────────────── */}
      <div className="lg:w-1/2 flex flex-col card overflow-hidden relative">
        {/* Tab bar */}
        <div className="flex border-b border-fh-border">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                tab === id
                  ? "text-white border-b-2 border-fh-red bg-fh-red/5"
                  : "text-fh-dim hover:text-fh-muted"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 p-5 overflow-y-auto relative">
          {processing && (
            <div className="absolute inset-0 bg-fh-bg/80 z-10 flex items-center justify-center rounded-lg">
              <div className="flex items-center gap-3 text-fh-red">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="text-sm font-mono">
                  Processing with Gemini...
                </span>
              </div>
            </div>
          )}

          {tab === "drop" && (
            <DropTab onIngest={(file) => handleIngest(() => ingestFile(file))} />
          )}
          {tab === "url" && (
            <UrlTab onIngest={(url) => handleIngest(() => ingestUrl(url))} />
          )}
          {tab === "text" && (
            <TextTab
              onIngest={(text, title) =>
                handleIngest(() => ingestText(text, title))
              }
            />
          )}
          {tab === "scanner" && <ScannerTab />}
        </div>
      </div>

      {/* ── Right panel: DNA result ────────────────────────────── */}
      <div className="lg:w-1/2">
        <DnaPanel
          result={result}
          onRoute={handleRoute}
          onEmail={handleEmail}
          routing={routing}
        />
      </div>

      <StatusToast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

/* ================================================================
   Tab: Drop Zone — red dashed border, red glow on drag
   ================================================================ */

function DropTab({ onIngest }: { onIngest: (file: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) onIngest(file);
  }

  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const file = e.clipboardData?.files[0];
      if (file) onIngest(file);
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [onIngest]);

  return (
    <div className="h-full flex flex-col gap-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex-1 min-h-[240px] border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-200 ${
          dragOver
            ? "border-fh-red bg-fh-red/5 shadow-[0_0_30px_rgba(204,17,17,0.15)]"
            : "border-fh-border hover:border-fh-red/50"
        }`}
      >
        <Upload
          className={`w-10 h-10 ${
            dragOver ? "text-fh-red" : "text-fh-dim"
          }`}
        />
        <div className="text-center">
          <p className="text-white font-medium">Drop anything here</p>
          <p className="text-fh-dim text-sm mt-1">
            PDF, images, Word, text — or click to browse
          </p>
        </div>
        <div className="flex items-center gap-2 text-fh-dim text-xs font-mono">
          <Clipboard className="w-3.5 h-3.5" />
          <span>Ctrl+V to paste from clipboard</span>
        </div>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onIngest(f);
          }}
        />
      </div>
    </div>
  );
}

/* ================================================================
   Tab: URL
   ================================================================ */

function UrlTab({ onIngest }: { onIngest: (url: string) => void }) {
  const [url, setUrl] = useState("");

  return (
    <div className="flex flex-col gap-4 h-full">
      <label className="text-sm text-fh-muted font-mono uppercase tracking-wider">
        Document URL
      </label>
      <input
        className="input font-mono text-sm"
        placeholder="https://example.com/document.pdf"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && url.trim()) onIngest(url.trim());
        }}
      />
      <button
        className="btn-primary self-start"
        disabled={!url.trim()}
        onClick={() => onIngest(url.trim())}
      >
        Fetch &amp; Process
      </button>
      <p className="text-xs text-fh-dim mt-auto">
        Supports PDF, image, and HTML URLs. The server will fetch, store, and
        analyze the content.
      </p>
    </div>
  );
}

/* ================================================================
   Tab: Text / Email
   ================================================================ */

function TextTab({
  onIngest,
}: {
  onIngest: (text: string, title?: string) => void;
}) {
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");

  return (
    <div className="flex flex-col gap-4 h-full">
      <input
        className="input"
        placeholder="Title (optional)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <textarea
        className="input flex-1 min-h-[200px] resize-none"
        placeholder="Paste email, text, notes, or any content..."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button
        className="btn-primary self-start"
        disabled={!text.trim()}
        onClick={() => onIngest(text.trim(), title.trim() || undefined)}
      >
        Process
      </button>
    </div>
  );
}

/* ================================================================
   Tab: Scanner
   ================================================================ */

function ScannerTab() {
  const [scanners, setScanners] = useState<Scanner[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function discover() {
    setLoading(true);
    setError("");
    try {
      const list = await getScanners();
      setScanners(list);
      if (list.length === 0) setError("No scanners discovered.");
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        className="btn-primary self-start flex items-center gap-2"
        onClick={discover}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Scan className="w-4 h-4" />
        )}
        Discover Scanners
      </button>

      {error && <p className="text-fh-red text-sm font-mono">{error}</p>}

      {scanners.length > 0 && (
        <div className="flex flex-col gap-2">
          {scanners.map((s, i) => (
            <div
              key={i}
              className="card p-3 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-2.5 h-2.5 rounded-full ${
                    s.status === "online" ? "bg-fh-success" : "bg-fh-red"
                  }`}
                />
                <div>
                  <p className="text-sm text-white font-medium">{s.name}</p>
                  <p className="text-xs text-fh-dim font-mono">
                    {s.ip} &middot; {s.protocol.toUpperCase()}
                  </p>
                </div>
              </div>
              <span
                className={`badge ${
                  s.status === "online"
                    ? "bg-fh-success/10 text-fh-success"
                    : "bg-fh-red/10 text-fh-red"
                }`}
              >
                {s.status}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-auto pt-4 border-t border-fh-border">
        <p className="text-xs text-fh-dim">
          For Epson EOP touchscreen scanning, configure the scanner to push to
          the <code className="text-fh-red font-mono">/eop</code> endpoint.
        </p>
      </div>
    </div>
  );
}
