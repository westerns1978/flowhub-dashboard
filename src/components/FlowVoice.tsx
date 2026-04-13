/* ================================================================
   FlowVoice — Gemini Live voice agent for FlowHub
   ================================================================
   AudioWorklet mic capture, tool callback prop for App integration.
   Model: gemini-2.5-flash-native-audio-preview-12-2025
   Pattern: Katie/AIVA — direct GoogleGenAI, NO httpOptions/proxy.
   ================================================================ */

import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, MicOff, X, Loader2 } from "lucide-react";
import type { DnaResult } from "../types";
import { GoogleGenAI, Modality, Type, type LiveServerMessage } from "@google/genai";

// ── Config ───────────────────────────────────────────────────────

const apiKey = import.meta.env.VITE_API_KEY;
const CLOUD_RUN =
  import.meta.env.VITE_CLOUD_RUN_URL ||
  "https://flowhub-push-webhook-286939318734.us-west1.run.app";
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://ldzzlndsspkyohvzfiiu.supabase.co";
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY || "";

const MODEL = "gemini-2.5-flash-native-audio-preview-12-2025";

const SYSTEM_INSTRUCTION =
  "You are Flow, the intelligent document assistant for FlowHub " +
  "by Gemynd. You help users scan, process, and route documents " +
  "using your voice. You are efficient, professional, and helpful. " +
  "IMPORTANT: Do NOT call any tools until the user speaks and " +
  "explicitly asks you to do something. When you first connect, " +
  "just greet the user briefly and wait for their request. " +
  "When a user asks you to scan, call discover_scanners first, " +
  "then scan_document. When a document is processed, summarize " +
  "what you found and ask if they want to route it to Sonia. " +
  "Keep responses concise — users are working.";

// ── Tool declarations ────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TOOLS: any[] = [
  {
    functionDeclarations: [
      {
        name: "scan_document",
        description: "Trigger a scan on a local or network scanner",
        parameters: {
          type: Type.OBJECT,
          properties: {
            scanner_ip: { type: Type.STRING, description: "Scanner IP. Omit for first available." },
            format: { type: Type.STRING, enum: ["pdf", "jpeg"], description: "Output format" },
          },
        },
      },
      {
        name: "discover_scanners",
        description: "Find available scanners on the network",
        parameters: { type: Type.OBJECT, properties: {} },
      },
      {
        name: "get_job_status",
        description: "Check status and DNA result of a document job",
        parameters: {
          type: Type.OBJECT,
          properties: { job_id: { type: Type.STRING, description: "Job UUID" } },
          required: ["job_id"],
        },
      },
      {
        name: "route_to_sonia",
        description: "Send a processed document to Sonia AI agent for action",
        parameters: {
          type: Type.OBJECT,
          properties: {
            job_id: { type: Type.STRING, description: "Job UUID to route" },
            instructions: { type: Type.STRING, description: "Optional instructions for Sonia" },
          },
          required: ["job_id"],
        },
      },
      {
        name: "ingest_content",
        description: "Submit text, email, or URL for AI processing",
        parameters: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING, description: "Text to ingest" },
            url: { type: Type.STRING, description: "URL to fetch and ingest" },
            title: { type: Type.STRING, description: "Optional title" },
          },
        },
      },
    ],
  },
];

// ── Types ────────────────────────────────────────────────────────

interface TranscriptEntry {
  role: "user" | "flow" | "tool";
  text: string;
  timestamp: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ToolCallHandler = (tool: string, params: any) => void;

interface FlowVoiceProps {
  onToolCall?: ToolCallHandler;
}

// ── Tool execution ───────────────────────────────────────────────

async function executeTool(
  name: string,
  args: Record<string, unknown>
): Promise<Record<string, unknown>> {
  try {
    switch (name) {
      case "scan_document": {
        const body: Record<string, unknown> = { source: "escl", format: args.format || "pdf" };
        if (args.scanner_ip) body.scanner_ip = args.scanner_ip;
        const r = await fetch(`${CLOUD_RUN}/api/push-scan`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image_data: "", file_name: `flow_scan_${Date.now()}.pdf`, source: "escl", ...body }),
        });
        return await r.json();
      }
      case "discover_scanners": {
        const r = await fetch(`${CLOUD_RUN}/api/scanners`);
        return await r.json();
      }
      case "get_job_status": {
        const r = await fetch(`${CLOUD_RUN}/api/jobs/${args.job_id}`);
        return await r.json();
      }
      case "route_to_sonia": {
        const payload: Record<string, unknown> = { job_id: args.job_id, source: "flowhub" };
        if (args.instructions) payload.instructions = args.instructions;
        // Try sonia-bridge edge function first, fallback to Cloud Run
        const r = await fetch(`${SUPABASE_URL}/functions/v1/sonia-bridge`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
          body: JSON.stringify(payload),
        });
        if (!r.ok) {
          const r2 = await fetch(`${CLOUD_RUN}/api/route/${args.job_id}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          });
          return await r2.json();
        }
        return await r.json();
      }
      case "ingest_content": {
        if (args.url) {
          const r = await fetch(`${CLOUD_RUN}/api/ingest/url`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: args.url }),
          });
          return await r.json();
        }
        if (args.text) {
          const r = await fetch(`${CLOUD_RUN}/api/ingest/text`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: args.text, title: args.title }),
          });
          return await r.json();
        }
        return { error: "Provide either text or url" };
      }
      default:
        return { error: `Unknown tool: ${name}` };
    }
  } catch (e) {
    return { error: String(e) };
  }
}

// ── Component ────────────────────────────────────────────────────

export default function FlowVoice({ onToolCall }: FlowVoiceProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(false);
  const [flowError, setFlowError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [toolStatus, setToolStatus] = useState<string | null>(null);
  const [lastDna, setLastDna] = useState<DnaResult | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sessionRef = useRef<any>(null);
  const connectingRef = useRef(false);
  const sessionStartTimeRef = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const playbackCtxRef = useRef<AudioContext | null>(null);
  const playbackQueueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);

  useEffect(() => {
    if (panelRef.current) panelRef.current.scrollTop = panelRef.current.scrollHeight;
  }, [transcript]);

  const addTranscript = useCallback(
    (role: TranscriptEntry["role"], text: string) => {
      setTranscript((prev) => [...prev.slice(-50), { role, text, timestamp: Date.now() }]);
    }, []
  );

  // ── Stop all audio ─────────────────────────────────────────────

  function stopAllAudio() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (playbackCtxRef.current) {
      playbackCtxRef.current.close().catch(() => {});
      playbackCtxRef.current = null;
    }
    playbackQueueRef.current = [];
    isPlayingRef.current = false;
  }

  // ── End session ────────────────────────────────────────────────

  function endSession() {
    console.log("[Flow] endSession called");
    const s = sessionRef.current;
    sessionRef.current = null;
    connectingRef.current = false;
    if (s) { try { s.close(); } catch { /* already closed */ } }
    stopAllAudio();
    setActive(false);
    setToolStatus(null);
  }

  // ── Audio playback ─────────────────────────────────────────────

  function playAudioChunk(pcmData: ArrayBuffer) {
    if (!playbackCtxRef.current) {
      playbackCtxRef.current = new AudioContext({ sampleRate: 24000 });
    }
    const ctx = playbackCtxRef.current;
    const int16 = new Int16Array(pcmData);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768;
    playbackQueueRef.current.push(float32);
    drainPlaybackQueue(ctx);
  }

  function drainPlaybackQueue(ctx: AudioContext) {
    if (isPlayingRef.current) return;
    const chunk = playbackQueueRef.current.shift();
    if (!chunk) return;
    isPlayingRef.current = true;
    const buffer = ctx.createBuffer(1, chunk.length, 24000);
    buffer.getChannelData(0).set(chunk);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.onended = () => { isPlayingRef.current = false; drainPlaybackQueue(ctx); };
    source.start();
  }

  // ── Handle server messages ─────────────────────────────────────

  function handleServerMessage(msg: LiveServerMessage) {
    const m = msg as any;
    const parts = m.serverContent?.modelTurn?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.text) addTranscript("flow", part.text);
        if (part.inlineData?.data && part.inlineData.mimeType?.includes("audio")) {
          const raw = atob(part.inlineData.data);
          const bytes = new Uint8Array(raw.length);
          for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
          playAudioChunk(bytes.buffer);
        }
      }
    }
    const functionCalls = m.toolCall?.functionCalls;
    if (functionCalls) {
      for (const fc of functionCalls) handleToolCall(fc.name, fc.args, fc.id);
    }
  }

  // ── Execute tool calls ─────────────────────────────────────────

  async function handleToolCall(name: string, args: Record<string, unknown>, callId: string) {
    const statusMap: Record<string, string> = {
      scan_document: "Scanning...",
      discover_scanners: "Discovering scanners...",
      get_job_status: "Checking job status...",
      route_to_sonia: "Routing to Sonia...",
      ingest_content: "Processing content...",
    };
    setToolStatus(statusMap[name] || `Running ${name}...`);
    addTranscript("tool", statusMap[name] || `Calling ${name}...`);

    // Notify parent App for UI actions
    onToolCall?.(name, args);

    const result = await executeTool(name, args);
    if (result.dna && typeof result.dna === "object") setLastDna(result.dna as DnaResult);
    setToolStatus(null);

    if (sessionRef.current) {
      try {
        sessionRef.current.sendToolResponse({ functionResponses: [{ response: result, id: callId }] });
      } catch (e) { console.error("[Flow] Tool response send failed:", e); }
    }
  }

  // ── Start session ──────────────────────────────────────────────

  async function startSession() {
    console.log("[Flow] startSession called");
    console.log("[Flow] apiKey:", apiKey ? "present" : "MISSING");
    console.log("[Flow] connectingRef:", connectingRef.current);
    console.log("[Flow] sessionRef:", sessionRef.current ? "exists" : "null");

    if (connectingRef.current || sessionRef.current) {
      console.warn("[Flow] Already connecting or connected, skipping");
      return;
    }
    if (!apiKey) {
      console.error("[Flow] No VITE_API_KEY found");
      addTranscript("tool", "Error: VITE_API_KEY not set. Add it to .env");
      return;
    }

    setFlowError(null);
    stopAllAudio();
    sessionRef.current = null;
    connectingRef.current = true;

    try {
      setActive(true);
      addTranscript("flow", "Connecting...");

      const ai = new GoogleGenAI({ apiKey });

      // Mic
      console.log("[Flow] Requesting microphone...");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;

      const audioCtx = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioCtx;
      const micSource = audioCtx.createMediaStreamSource(stream);

      // AudioWorklet for clean mic capture
      await audioCtx.audioWorklet.addModule("/audio-worklet.js");
      const workletNode = new AudioWorkletNode(audioCtx, "pcm-processor");
      workletNodeRef.current = workletNode;

      // Wire worklet → session (deferred until session is ready)
      function startMicStream() {
        console.log("[Flow] Starting AudioWorklet mic stream...");
        workletNode.port.onmessage = (e: MessageEvent<Float32Array>) => {
          if (!sessionRef.current) return;
          const float32 = e.data;
          const pcm = new Int16Array(float32.length);
          for (let i = 0; i < float32.length; i++) {
            const s = Math.max(-1, Math.min(1, float32[i]));
            pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
          }
          try {
            sessionRef.current.sendRealtimeInput({
              audio: {
                data: btoa(String.fromCharCode(...new Uint8Array(pcm.buffer))),
                mimeType: "audio/pcm;rate=16000",
              },
            });
          } catch { /* session closed */ }
        };
        micSource.connect(workletNode);
        workletNode.connect(audioCtx.destination);
        console.log("[Flow] AudioWorklet mic connected");
      }

      // Connect — MINIMAL config first, session ref AFTER await
      console.log(`[Flow] Connecting to ${MODEL}...`);
      const session = await ai.live.connect({
        model: MODEL,
        config: {
          responseModalities: [Modality.AUDIO],
        },
        callbacks: {
          onopen: () => {
            console.log("[Flow] WebSocket OPEN");
            sessionStartTimeRef.current = Date.now();
            connectingRef.current = false;
            setTranscript([]);
            addTranscript("flow", "Flow here. How can I help?");
          },
          onmessage: handleServerMessage,
          onerror: (e: ErrorEvent) => {
            const errMsg = e.message || "WebSocket connection error";
            console.error("[Flow] WebSocket ERROR:", errMsg, e);
            setFlowError(`Connection error: ${errMsg}`);
            addTranscript("tool", `Error: ${errMsg}`);
            sessionRef.current = null;
            connectingRef.current = false;
            stopAllAudio();
            setActive(false);
          },
          onclose: (e: CloseEvent) => {
            const dur = Date.now() - (sessionStartTimeRef.current || 0);
            const reason = e.reason || `code ${e.code}`;
            console.log("[Flow] WebSocket CLOSED after", dur, "ms —", reason);
            sessionRef.current = null;
            connectingRef.current = false;
            stopAllAudio();
            if (dur < 3000) {
              const errMsg = `Session closed after ${dur}ms (${reason}). Model may be unavailable or config rejected.`;
              console.error("[Flow] Too quick —", errMsg);
              setFlowError(errMsg);
              addTranscript("tool", errMsg);
              setActive(false);
              return;
            }
            addTranscript("tool", "Session ended.");
            setActive(false);
          },
        },
      });

      // Store session AFTER await resolves
      sessionRef.current = session;
      console.log("[Flow] Session stored, starting mic");
      startMicStream();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error("[Flow] Start failed:", errMsg, err);
      setFlowError(`Failed to start: ${errMsg}`);
      addTranscript("tool", `Failed to start: ${errMsg}`);
      sessionRef.current = null;
      connectingRef.current = false;
      stopAllAudio();
      setActive(false);
    }
  }

  useEffect(() => { return () => { endSession(); }; /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  function toggle() {
    console.log("[Flow] mic clicked, active:", active, "connecting:", connectingRef.current);
    if (active || connectingRef.current) { endSession(); } else { setOpen(true); startSession(); }
  }

  // ── Render ─────────────────────────────────────────────────────

  return (
    <>
      <button
        onClick={toggle}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${
          active ? "bg-fh-red text-white shadow-fh-red/40 shadow-xl" : "bg-fh-card border border-fh-border text-fh-red hover:bg-fh-red/10"
        }`}
        title={active ? "Stop Flow" : "Start Flow voice assistant"}
      >
        {active ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        {active && (
          <>
            <span className="absolute inset-0 rounded-full border-2 border-fh-red animate-ping opacity-30" />
            <span className="absolute inset-[-4px] rounded-full border border-fh-red/20 animate-pulse" />
          </>
        )}
      </button>

      {open && (
        <div className={`fixed bottom-24 right-6 z-50 w-96 max-h-[70vh] rounded-xl overflow-hidden shadow-2xl border border-fh-red/30 bg-fh-bg-alt flex flex-col transition-all duration-300 ${open ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-fh-border bg-fh-bg">
            <div className="flex items-center gap-3">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className={active ? "animate-pulse" : ""}>
                <circle cx="16" cy="16" r="16" fill="#cc1111"/>
                <rect x="6" y="13" width="3" height="6" rx="1.5" fill="white"/>
                <rect x="11" y="9" width="3" height="14" rx="1.5" fill="white"/>
                <rect x="16" y="11" width="3" height="10" rx="1.5" fill="white"/>
                <rect x="21" y="13" width="3" height="6" rx="1.5" fill="white"/>
                <rect x="26" y="14" width="3" height="4" rx="1.5" fill="white"/>
              </svg>
              <div>
                <span className="text-sm font-mono font-medium text-fh-red">Flow</span>
                <span className="text-xs text-fh-dim ml-2 font-mono">{active ? "Listening" : "Idle"}</span>
              </div>
            </div>
            <button onClick={() => { endSession(); setOpen(false); }} className="text-fh-dim hover:text-fh-text">
              <X className="w-4 h-4" />
            </button>
          </div>

          {toolStatus && (
            <div className="px-4 py-2 bg-fh-red/5 border-b border-fh-red/20 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 text-fh-red animate-spin" />
              <span className="text-xs text-fh-red font-mono">{toolStatus}</span>
            </div>
          )}

          {flowError && (
            <div className="px-4 py-3 bg-fh-red/10 border-b border-fh-red/20">
              <p className="text-xs text-fh-red-bright font-mono mb-2">{flowError}</p>
              <button onClick={() => { setFlowError(null); startSession(); }}
                className="text-xs font-mono font-medium text-white bg-fh-red px-3 py-1 rounded hover:bg-fh-red-bright transition-colors">
                Retry
              </button>
            </div>
          )}

          <div ref={panelRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[200px]">
            {transcript.length === 0 && !active && !flowError && (
              <div className="text-center text-fh-dim text-sm py-8">
                <p>Tap the mic button to start talking to Flow.</p>
                <p className="mt-1 text-xs font-mono">She can scan documents, check jobs, and route to Sonia.</p>
              </div>
            )}
            {transcript.map((entry, i) => (
              <div key={i} className={`flex gap-2 ${entry.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  entry.role === "user" ? "bg-fh-red/10 text-fh-red"
                  : entry.role === "tool" ? "bg-fh-warning/10 text-fh-warning text-xs font-mono"
                  : "bg-fh-border/30 text-fh-muted"
                }`}>{entry.text}</div>
              </div>
            ))}
          </div>

          {lastDna && (
            <div className="px-4 py-2 border-t border-fh-border bg-fh-bg/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono font-bold"
                  style={{
                    background: lastDna.dna_score >= 0.8 ? "rgba(204,17,17,0.15)" : "rgba(255,170,0,0.15)",
                    color: lastDna.dna_score >= 0.8 ? "#cc1111" : "#ffaa00",
                  }}>
                  {Math.round(lastDna.dna_score * 100)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{lastDna.title}</p>
                  <p className="text-[10px] text-fh-dim truncate font-mono">
                    {lastDna.document_type} &middot; {lastDna.entities?.slice(0, 3).join(", ")}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="px-4 py-2 border-t border-fh-border text-center">
            <p className="text-[10px] text-fh-dim font-mono">
              {active ? "Speak naturally — Flow is listening" : "Click the mic to start a session"}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
