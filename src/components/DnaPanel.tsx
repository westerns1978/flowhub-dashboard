/* ================================================================
   DNA Result Panel — twAIn red theme
   ================================================================ */

import {
  FileText,
  Tag,
  Users,
  Send,
  Mail,
  ExternalLink,
  Copy,
} from "lucide-react";
import type { IngestResult } from "../types";

interface Props {
  result: IngestResult | null;
  onRoute: (jobId: string) => void;
  onEmail: (jobId: string) => void;
  routing: boolean;
}

function ScoreGauge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const r = 36;
  const circ = 2 * Math.PI * r;
  const offset = circ - score * circ;
  const color =
    pct >= 80 ? "#cc1111" : pct >= 50 ? "#ffaa00" : "#555555";

  return (
    <div className="relative w-24 h-24 flex-shrink-0">
      <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
        <circle
          cx="40" cy="40" r={r}
          fill="none" stroke="#2a2a2a" strokeWidth="6"
        />
        <circle
          cx="40" cy="40" r={r}
          fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-mono font-bold text-white">
          {pct}
        </span>
        <span className="text-[10px] text-fh-red font-mono uppercase tracking-wider">
          DNA
        </span>
      </div>
    </div>
  );
}

export default function DnaPanel({ result, onRoute, onEmail, routing }: Props) {
  if (!result) {
    return (
      <div className="card p-8 flex flex-col items-center justify-center h-full text-center">
        <FileText className="w-12 h-12 text-fh-dim mb-4" />
        <p className="text-fh-muted text-sm">
          Process a document to see its DNA analysis here.
        </p>
      </div>
    );
  }

  const { dna, job_id, file_url, file_name } = result;

  return (
    <div className="card p-5 flex flex-col gap-4 h-full overflow-y-auto">
      {/* Header row */}
      <div className="flex items-start gap-4">
        <ScoreGauge score={dna.dna_score} />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-fh-red font-mono font-medium uppercase tracking-wider mb-1">
            {dna.document_type}
          </p>
          <h3 className="text-white font-semibold text-lg leading-snug truncate">
            {dna.title}
          </h3>
          <p className="text-fh-muted text-xs mt-1 truncate font-mono">{file_name}</p>
        </div>
      </div>

      {/* Summary */}
      <p className="text-sm text-fh-muted leading-relaxed">{dna.summary}</p>

      {/* Entities */}
      {dna.entities.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Users className="w-3.5 h-3.5 text-fh-dim" />
            <span className="text-xs text-fh-dim font-mono uppercase tracking-wider">
              Entities
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {dna.entities.map((e, i) => (
              <span
                key={i}
                className="badge bg-fh-red/10 text-fh-red border border-fh-red/20"
              >
                {e}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tags */}
      {dna.tags.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Tag className="w-3.5 h-3.5 text-fh-dim" />
            <span className="text-xs text-fh-dim font-mono uppercase tracking-wider">
              Tags
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {dna.tags.map((t, i) => (
              <span
                key={i}
                className="badge bg-white/5 text-fh-muted border border-fh-border"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-auto pt-4 border-t border-fh-border flex flex-wrap gap-2">
        <button
          className="btn-primary flex items-center gap-2 text-sm"
          onClick={() => onRoute(job_id)}
          disabled={routing}
        >
          <Send className="w-3.5 h-3.5" />
          {routing ? "Routing..." : "Route to Sonia"}
        </button>
        <button
          className="btn-secondary flex items-center gap-2 text-sm"
          onClick={() => onEmail(job_id)}
        >
          <Mail className="w-3.5 h-3.5" />
          Email
        </button>
        {file_url && (
          <a
            href={file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            View
          </a>
        )}
        <button
          className="btn-secondary flex items-center gap-2 text-sm"
          onClick={() => navigator.clipboard.writeText(file_url)}
        >
          <Copy className="w-3.5 h-3.5" />
          URL
        </button>
      </div>
    </div>
  );
}
