/* ================================================================
   FlowHub Dashboard v2 — App Shell
   ================================================================ */

import { useState } from "react";
import { Scan, GitBranch, Settings, Activity } from "lucide-react";
import CaptureView from "./views/CaptureView";
import PipelineView from "./views/PipelineView";
import SettingsView from "./views/SettingsView";
import FlowVoice from "./components/FlowVoice";
import type { View } from "./types";

const NAV: { id: View; label: string; icon: typeof Scan }[] = [
  { id: "capture", label: "Capture", icon: Scan },
  { id: "pipeline", label: "Pipeline", icon: GitBranch },
  { id: "settings", label: "Settings", icon: Settings },
];

export default function App() {
  const [view, setView] = useState<View>("capture");

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Top Nav ───────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-fh-border bg-fh-card/60 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-fh-accent" />
          <span className="text-lg font-bold tracking-tight text-white">
            Flow<span className="text-fh-accent">Hub</span>
          </span>
          <span className="text-xs text-fh-dim ml-1 hidden sm:inline">
            by Gemynd
          </span>
        </div>

        <nav className="flex items-center gap-1">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setView(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                view === id
                  ? "bg-fh-accent/10 text-fh-accent border border-fh-accent/30"
                  : "text-fh-muted hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </nav>

        <div className="text-xs text-fh-dim hidden md:block">
          TWAIN Innovation Cloud
        </div>
      </header>

      {/* ── View ──────────────────────────────────────────────── */}
      <main className="flex-1">
        {view === "capture" && <CaptureView />}
        {view === "pipeline" && <PipelineView />}
        {view === "settings" && <SettingsView />}
      </main>

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer className="text-center text-xs text-fh-dim py-3 border-t border-fh-border">
        FlowHub v2 &middot; Gemynd LLC &middot; TWAIN Innovation Cloud
        Reference Implementation
      </footer>

      {/* ── Flow Voice Agent (persists across all views) ──────── */}
      <FlowVoice />
    </div>
  );
}
