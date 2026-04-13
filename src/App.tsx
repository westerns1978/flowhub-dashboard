/* ================================================================
   FlowHub Dashboard v2 — App Shell
   twAIn Robotics brand: black, red, white. Technical authority.
   ================================================================ */

import { useState } from "react";
import { Scan, GitBranch, Settings } from "lucide-react";
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
    <div className="min-h-screen flex flex-col bg-fh-bg">
      {/* ── Top Nav ───────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-6 py-3 border-b-2 border-fh-red bg-fh-bg-alt sticky top-0 z-50">
        <div className="flex items-center gap-3">
          {/* Scanner/document icon */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
            <rect x="3" y="3" width="18" height="14" rx="2" stroke="#cc1111" strokeWidth="2" fill="none"/>
            <line x1="3" y1="20" x2="21" y2="20" stroke="#cc1111" strokeWidth="2" strokeLinecap="round"/>
            <line x1="7" y1="7" x2="17" y2="7" stroke="#cc1111" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
            <line x1="7" y1="10" x2="14" y2="10" stroke="#cc1111" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
            <line x1="7" y1="13" x2="11" y2="13" stroke="#cc1111" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
          </svg>
          <span className="text-lg font-mono font-medium tracking-tight text-white">
            Flow<span className="text-fh-red">Hub</span>
          </span>
          <span className="text-xs text-fh-dim ml-1 hidden sm:inline font-sans">
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
                  ? "bg-fh-red/10 text-fh-red border border-fh-red/30"
                  : "text-fh-muted hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </nav>

        <div className="text-xs text-fh-red font-mono tracking-widest hidden md:block uppercase">
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
      <footer className="text-center text-xs text-fh-dim py-3 border-t border-fh-border font-sans">
        <span className="font-mono text-fh-muted">FlowHub v2</span>
        {" "}&middot; Gemynd LLC &middot;{" "}
        <span className="text-fh-red">TWAIN Innovation Cloud</span>
        {" "}Reference Implementation
      </footer>

      {/* ── Flow Voice Agent (persists across all views) ──────── */}
      <FlowVoice />
    </div>
  );
}
