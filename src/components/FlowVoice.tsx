/* ================================================================
   FlowVoice — Gemini Live voice agent for FlowHub
   ================================================================
   Flow is the intelligent document assistant. She can scan,
   check status, route to Sonia, and ingest content by voice.

   Model: gemini-2.5-flash-native-audio-preview-12-2025
   Pattern: same as Katie/AIVA/Story Scribe — direct GoogleGenAI,
   NO httpOptions, NO api-proxy (breaks WebSocket on Firebase).
   ================================================================ */

import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, MicOff, X, Send, Loader2 } from "lucide-react";
import type { DnaResult } from "../types";

// ── Gemini SDK (imported from @google/genai) ─────────────────────

import { GoogleGenAI, type LiveServerMessage } from "@google/genai";

// ── Config ───────────────────────────────────────────────────────

const API_KEY =
  (import.meta as Record<string, Record<string, string>>).env?.VITE_API_KEY ||
  "";
const CLOUD_RUN =
  (import.meta as Record<string, Record<string, string>>).env
    ?.VITE_CLOUD_RUN_URL ||
  "https://flowhub-push-webhook-286939318734.us-west1.run.app";
const SUPABASE_URL =
  (import.meta as Record<string, Record<string, string>>).env
    ?.VITE_SUPABASE_URL || "https://ldzzlndsspkyohvzfiiu.supabase.co";
const SUPABASE_ANON_KEY =
  (import.meta as Record<string, Record<string, string>>).env
    ?.VITE_SUPABASE_ANON_KEY || "";

const MODEL = "gemini-2.5-flash-native-audio-preview-12-2025";

const SYSTEM_INSTRUCTION =
  "You are Flow, the intelligent document assistant for FlowHub " +
  "by Gemynd. You help users scan, process, and route documents " +
  "using your voice. You are efficient, professional, and " +
  "proactive. When a user asks you to scan something, immediately " +
  "call discover_scanners then scan_document. When a document is " +
  "processed, summarize what you found and ask if they want to " +
  "route it to Sonia. Keep responses concise — users are working.";

// ── Tool declarations ────────────────────────────────────────────

const TOOLS = [
  {
    functionDeclarations: [
      {
        name: "scan_document",
        description: "Trigger a scan on a local or network scanner",
        parameters: {
          type: "object" as const,
          properties: {
            scanner_ip: {
              type: "string" as const,
              description:
                "IP address of the scanner. If omitted, uses first available.",
            },
            format: {
              type: "string" as const,
              enum: ["pdf", "jpeg"],
              description: "Output format (default: pdf)",
            },
          },
        },
      },
      {
        name: "discover_scanners",
        description: "Find available scanners on the network",
        parameters: {
          type: "object" as const,
          properties: {},
        },
      },
      {
        name: "get_job_status",
        description: "Check status and DNA result of a document processing job",
        parameters: {
          type: "object" as const,
          properties: {
            job_id: {
              type: "string" as const,
              description: "The UUID of the job to check",
            },
          },
          required: ["job_id"],
        },
      },
      {
        name: "route_to_sonia",
        description:
          "Send a processed document to Sonia AI agent for review and action",
        parameters: {
          type: "object" as const,
          properties: {
            job_id: {
              type: "string" as const,
              description: "The UUID of the job to route",
            },
            instructions: {
              type: "string" as const,
              description:
                "Optional instructions for Sonia about what to do with this document",
            },
          },
          required: ["job_id"],
        },
      },
      {
        name: "ingest_content",
        description:
          "Submit text, email content, or a URL for AI processing and DNA extraction",
        parameters: {
          type: "object" as const,
          properties: {
            text: {
              type: "string" as const,
              description: "Text or email content to ingest",
            },
            url: {
              type: "string" as const,
              description: "URL to fetch and ingest",
            },
            title: {
              type: "string" as const,
              description: "Optional title for the content",
            },
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

// ── Tool execution ───────────────────────────────────────────────

async function executeTool(
  name: string,
  args: Record<string, unknown>
): Promise<Record<string, unknown>> {
  try {
    switch (name) {
      case "scan_document": {
        const body: Record<string, unknown> = {
          source: "escl",
          format: args.format || "pdf",
        };
        if (args.scanner_ip) body.scanner_ip = args.scanner_ip;
        const r = await fetch(`${CLOUD_RUN}/api/push-scan`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image_data: "",
            file_name: `flow_scan_${Date.now()}.pdf`,
            source: "escl",
            ...body,
          }),
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
        const payload: Record<string, unknown> = {
          job_id: args.job_id,
          source: "flowhub",
        };
        if (args.instructions) payload.instructions = args.instructions;

        const r = await fetch(
          `${SUPABASE_URL}/functions/v1/sonia-bridge`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify(payload),
          }
        );
        if (!r.ok) {
          // Fallback to direct Cloud Run route
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
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: args.url }),
          });
          return await r.json();
        }
        if (args.text) {
          const r = await fetch(`${CLOUD_RUN}/api/ingest/text`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: args.text,
              title: args.title,
            }),
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

export default function FlowVoice() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [toolStatus, setToolStatus] = useState<string | null>(null);
  const [lastDna, setLastDna] = useState<DnaResult | null>(null);

  // Refs for session management
  const sessionRef = useRef<ReturnType<
    ReturnType<typeof GoogleGenAI.prototype.live.connect> extends Promise<infer S> ? () => S : never
  > | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // Audio playback queue
  const playbackCtxRef = useRef<AudioContext | null>(null);
  const playbackQueueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);

  // Auto-scroll transcript
  useEffect(() => {
    if (panelRef.current) {
      panelRef.current.scrollTop = panelRef.current.scrollHeight;
    }
  }, [transcript]);

  const addTranscript = useCallback(
    (role: TranscriptEntry["role"], text: string) => {
      setTranscript((prev) => [
        ...prev.slice(-50), // Keep last 50 entries
        { role, text, timestamp: Date.now() },
      ]);
    },
    []
  );

  // ── Stop all audio ─────────────────────────────────────────────

  const stopAllAudio = useCallback(() => {
    // Stop microphone
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    // Stop playback
    if (playbackCtxRef.current) {
      playbackCtxRef.current.close().catch(() => {});
      playbackCtxRef.current = null;
    }
    playbackQueueRef.current = [];
    isPlayingRef.current = false;
  }, []);

  // ── Audio playback (PCM from Gemini) ───────────────────────────

  const playAudioChunk = useCallback((pcmData: ArrayBuffer) => {
    if (!playbackCtxRef.current) {
      playbackCtxRef.current = new AudioContext({ sampleRate: 24000 });
    }
    const ctx = playbackCtxRef.current;

    // Convert Int16 PCM to Float32
    const int16 = new Int16Array(pcmData);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768;
    }

    playbackQueueRef.current.push(float32);
    drainPlaybackQueue(ctx);
  }, []);

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
    source.onended = () => {
      isPlayingRef.current = false;
      drainPlaybackQueue(ctx);
    };
    source.start();
  }

  // ── Start session ──────────────────────────────────────────────

  const startSession = useCallback(async () => {
    if (!API_KEY) {
      addTranscript("tool", "Error: VITE_API_KEY not set. Add it to .env");
      return;
    }

    // Stop any previous session
    stopAllAudio();

    try {
      setActive(true);
      addTranscript("flow", "Connecting...");

      const client = new GoogleGenAI({ apiKey: API_KEY });

      // Get microphone
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;

      // Create audio context for mic capture
      const audioCtx = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioCtx;
      const micSource = audioCtx.createMediaStreamSource(stream);
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      // Connect to Gemini Live
      const session = await client.live.connect({
        model: MODEL,
        callbacks: {
          onopen: () => {
            setTranscript([]);
            addTranscript("flow", "Flow here. How can I help?");
          },
          onmessage: (msg: LiveServerMessage) => {
            handleServerMessage(msg);
          },
          onerror: (err: ErrorEvent) => {
            console.error("[FlowVoice] Session error:", err);
            addTranscript("tool", `Connection error: ${err.message || "unknown"}`);
            endSession();
          },
          onclose: () => {
            addTranscript("tool", "Session ended.");
            setActive(false);
          },
        },
        config: {
          responseModalities: ["AUDIO", "TEXT"],
          systemInstruction: {
            parts: [{ text: SYSTEM_INSTRUCTION }],
          },
          tools: TOOLS,
        },
      });

      sessionRef.current = session as typeof sessionRef.current;

      // Stream mic audio to session
      processor.onaudioprocess = (e) => {
        if (!sessionRef.current) return;
        const inputData = e.inputBuffer.getChannelData(0);
        // Convert Float32 to Int16 PCM
        const pcm = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }
        try {
          (sessionRef.current as { sendRealtimeInput?: (msg: { audio: { data: string; mimeType: string } }) => void })
            ?.sendRealtimeInput?.({
              audio: {
                data: btoa(
                  String.fromCharCode(...new Uint8Array(pcm.buffer))
                ),
                mimeType: "audio/pcm;rate=16000",
              },
            });
        } catch {
          // Session may have closed
        }
      };

      micSource.connect(processor);
      processor.connect(audioCtx.destination);
    } catch (err) {
      console.error("[FlowVoice] Start error:", err);
      addTranscript("tool", `Failed to start: ${String(err)}`);
      stopAllAudio();
      setActive(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addTranscript, stopAllAudio]);

  // ── Handle server messages ─────────────────────────────────────

  const handleServerMessage = useCallback(
    (msg: LiveServerMessage) => {
      // Text response
      const serverContent = (msg as Record<string, unknown>).serverContent as
        | { modelTurn?: { parts?: { text?: string; inlineData?: { data: string; mimeType: string } }[] } }
        | undefined;

      if (serverContent?.modelTurn?.parts) {
        for (const part of serverContent.modelTurn.parts) {
          if (part.text) {
            addTranscript("flow", part.text);
          }
          if (part.inlineData?.data && part.inlineData.mimeType?.includes("audio")) {
            // Decode base64 audio and play
            const raw = atob(part.inlineData.data);
            const bytes = new Uint8Array(raw.length);
            for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
            playAudioChunk(bytes.buffer);
          }
        }
      }

      // Tool calls
      const toolCall = (msg as Record<string, unknown>).toolCall as
        | { functionCalls?: { name: string; args: Record<string, unknown>; id: string }[] }
        | undefined;

      if (toolCall?.functionCalls) {
        for (const fc of toolCall.functionCalls) {
          handleToolCall(fc.name, fc.args, fc.id);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [addTranscript, playAudioChunk]
  );

  // ── Execute tool calls ─────────────────────────────────────────

  const handleToolCall = useCallback(
    async (name: string, args: Record<string, unknown>, callId: string) => {
      const statusMap: Record<string, string> = {
        scan_document: "Scanning...",
        discover_scanners: "Discovering scanners...",
        get_job_status: "Checking job status...",
        route_to_sonia: "Routing to Sonia...",
        ingest_content: "Processing content...",
      };

      setToolStatus(statusMap[name] || `Running ${name}...`);
      addTranscript("tool", statusMap[name] || `Calling ${name}...`);

      const result = await executeTool(name, args);

      // Track DNA results
      if (result.dna && typeof result.dna === "object") {
        setLastDna(result.dna as DnaResult);
      }

      setToolStatus(null);

      // Send result back to session
      if (sessionRef.current) {
        try {
          (
            sessionRef.current as {
              sendToolResponse?: (msg: {
                functionResponses: { response: Record<string, unknown>; id: string }[];
              }) => void;
            }
          )?.sendToolResponse?.({
            functionResponses: [
              {
                response: result,
                id: callId,
              },
            ],
          });
        } catch (e) {
          console.error("[FlowVoice] Tool response send failed:", e);
        }
      }
    },
    [addTranscript]
  );

  // ── End session ────────────────────────────────────────────────

  const endSession = useCallback(() => {
    if (sessionRef.current) {
      try {
        (sessionRef.current as { close?: () => void })?.close?.();
      } catch {
        // Already closed
      }
      sessionRef.current = null;
    }
    stopAllAudio();
    setActive(false);
    setToolStatus(null);
  }, [stopAllAudio]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      endSession();
    };
  }, [endSession]);

  // ── Toggle ─────────────────────────────────────────────────────

  function toggle() {
    if (active) {
      endSession();
    } else {
      setOpen(true);
      startSession();
    }
  }

  // ── Render ─────────────────────────────────────────────────────

  return (
    <>
      {/* Floating button */}
      <button
        onClick={toggle}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${
          active
            ? "bg-fh-accent text-fh-bg shadow-fh-accent/30 shadow-xl"
            : "bg-fh-card border border-fh-border text-fh-accent hover:bg-fh-accent/10"
        }`}
        title={active ? "Stop Flow" : "Start Flow voice assistant"}
      >
        {active ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}

        {/* Pulsing ring when active */}
        {active && (
          <>
            <span className="absolute inset-0 rounded-full border-2 border-fh-accent animate-ping opacity-30" />
            <span className="absolute inset-[-4px] rounded-full border border-fh-accent/20 animate-pulse" />
          </>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div
          className={`fixed bottom-24 right-6 z-50 w-96 max-h-[70vh] rounded-xl overflow-hidden shadow-2xl border border-fh-border bg-fh-card flex flex-col transition-all duration-300 ${
            open ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-fh-border bg-fh-bg/50">
            <div className="flex items-center gap-3">
              {/* Waveform avatar */}
              <div className="w-8 h-8 rounded-full bg-fh-accent/10 flex items-center justify-center relative overflow-hidden">
                {active ? (
                  <div className="flex items-end gap-[2px] h-4">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="w-[3px] bg-fh-accent rounded-full"
                        style={{
                          animation: `waveform 0.8s ease-in-out ${i * 0.1}s infinite alternate`,
                          height: "4px",
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <Mic className="w-4 h-4 text-fh-accent" />
                )}
              </div>
              <div>
                <span className="text-sm font-semibold text-white">Flow</span>
                <span className="text-xs text-fh-dim ml-2">
                  {active ? "Listening" : "Idle"}
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                endSession();
                setOpen(false);
              }}
              className="text-fh-dim hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tool status banner */}
          {toolStatus && (
            <div className="px-4 py-2 bg-fh-accent/5 border-b border-fh-accent/20 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 text-fh-accent animate-spin" />
              <span className="text-xs text-fh-accent font-medium">
                {toolStatus}
              </span>
            </div>
          )}

          {/* Transcript */}
          <div
            ref={panelRef}
            className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[200px]"
          >
            {transcript.length === 0 && !active && (
              <div className="text-center text-fh-dim text-sm py-8">
                <p>Tap the mic button to start talking to Flow.</p>
                <p className="mt-1 text-xs">
                  She can scan documents, check jobs, and route to Sonia.
                </p>
              </div>
            )}

            {transcript.map((entry, i) => (
              <div
                key={i}
                className={`flex gap-2 ${
                  entry.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                    entry.role === "user"
                      ? "bg-fh-accent/10 text-fh-accent"
                      : entry.role === "tool"
                        ? "bg-yellow-500/10 text-yellow-300 text-xs font-mono"
                        : "bg-white/5 text-fh-muted"
                  }`}
                >
                  {entry.text}
                </div>
              </div>
            ))}
          </div>

          {/* Last DNA result mini-card */}
          {lastDna && (
            <div className="px-4 py-2 border-t border-fh-border bg-fh-bg/30">
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{
                    background:
                      lastDna.dna_score >= 0.8
                        ? "rgba(94,234,212,0.15)"
                        : "rgba(250,204,21,0.15)",
                    color:
                      lastDna.dna_score >= 0.8 ? "#5eead4" : "#facc15",
                  }}
                >
                  {Math.round(lastDna.dna_score * 100)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white font-medium truncate">
                    {lastDna.title}
                  </p>
                  <p className="text-[10px] text-fh-dim truncate">
                    {lastDna.document_type} &middot;{" "}
                    {lastDna.entities?.slice(0, 3).join(", ")}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Footer hint */}
          <div className="px-4 py-2 border-t border-fh-border text-center">
            <p className="text-[10px] text-fh-dim">
              {active
                ? "Speak naturally — Flow is listening"
                : "Click the mic to start a session"}
            </p>
          </div>
        </div>
      )}

      {/* Waveform keyframes */}
      <style>{`
        @keyframes waveform {
          0% { height: 4px; }
          100% { height: 16px; }
        }
      `}</style>
    </>
  );
}
