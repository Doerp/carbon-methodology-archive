"use client";

import React, { useState, useCallback } from "react";
import { supabase, DIMENSIONS, GROUPS, type Extraction } from "@/lib/supabase";
import { SectionBlocks } from "@/lib/sectionBlocks";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Ref = { ref: string; type: string };
type ProcedureStep = { n: number; text: string; refs: Ref[] };

type Section = {
  id: number;
  ref: string;
  ref_type: string;
  title: string | null;
  content: string;
  page_start: number | null;
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const CONFIDENCE_PILL: Record<string, string> = {
  high:          "bg-emerald-950/60 text-emerald-400 border-emerald-800",
  medium:        "bg-amber-950/60  text-amber-400  border-amber-800",
  low:           "bg-red-950/60    text-red-400    border-red-800",
  not_specified: "bg-zinc-800      text-zinc-500   border-zinc-700",
};

const REF_TYPE_COLOR: Record<string, string> = {
  module:     "bg-blue-950/60 border-blue-800 text-blue-300 hover:bg-blue-900/60",
  equation:   "bg-purple-950/60 border-purple-800 text-purple-300 hover:bg-purple-900/60",
  table:      "bg-amber-950/60 border-amber-800 text-amber-300 hover:bg-amber-900/60",
  definition: "bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700",
  section:    "bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700",
};

// ---------------------------------------------------------------------------
// Section panel (recursive)
// ---------------------------------------------------------------------------

function SectionPanel({
  section,
  methodologyId,
  depth,
  onClose,
}: {
  section: Section;
  methodologyId: string;
  depth: number;
  onClose: () => void;
}) {
  const [openRef, setOpenRef] = useState<string | null>(null);
  const [subSection, setSubSection] = useState<Section | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRefClick = useCallback(async (ref: string) => {
    if (openRef === ref) {
      setOpenRef(null);
      setSubSection(null);
      return;
    }
    setLoading(true);
    setOpenRef(ref);
    const { data } = await supabase
      .from("methodology_sections")
      .select("*")
      .eq("methodology_id", methodologyId)
      .eq("ref", ref)
      .single();
    setSubSection(data as Section | null);
    setLoading(false);
  }, [openRef, methodologyId]);

  const bgClass = depth === 0
    ? "bg-zinc-900 border border-zinc-700 rounded-lg"
    : "bg-zinc-950/80 border-l border-zinc-700/50 pl-3 ml-2";

  return (
    <div className={bgClass}>
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${REF_TYPE_COLOR[section.ref_type] ?? REF_TYPE_COLOR.section}`}>
              {section.ref_type}
            </span>
            <span className="text-xs font-mono font-semibold text-zinc-300">{section.ref}</span>
            {section.title && <span className="text-xs text-zinc-500">— {section.title}</span>}
            {section.page_start && <span className="text-[10px] font-mono text-zinc-600">p.{section.page_start}</span>}
          </div>
          <button onClick={onClose} className="text-zinc-600 hover:text-zinc-400 text-xs font-mono shrink-0 ml-2">✕</button>
        </div>

        <SectionContent
          content={section.content}
          methodologyId={methodologyId}
          onRefClick={handleRefClick}
          openRef={openRef}
        />

        {loading && <p className="text-xs text-zinc-600 mt-3 font-mono">Loading {openRef}…</p>}
        {subSection && openRef && (
          <div className="mt-3">
            <SectionPanel
              section={subSection}
              methodologyId={methodologyId}
              depth={depth + 1}
              onClose={() => { setOpenRef(null); setSubSection(null); }}
            />
          </div>
        )}
        {openRef && !subSection && !loading && (
          <p className="text-xs text-zinc-600 mt-2 italic font-mono">{openRef} — not extracted yet.</p>
        )}
      </div>
    </div>
  );
}


function SectionContent({
  content,
  onRefClick,
  openRef,
}: {
  content: string;
  methodologyId: string;
  onRefClick: (ref: string) => void;
  openRef: string | null;
}) {
  return <SectionBlocks content={content} onRefClick={onRefClick} openRef={openRef} />;
}

// ---------------------------------------------------------------------------
// Procedure step with ref chips
// ---------------------------------------------------------------------------

function ProcedureStep({
  step,
  methodologyId,
}: {
  step: ProcedureStep;
  methodologyId: string;
}) {
  const [openRef, setOpenRef] = useState<string | null>(null);
  const [section, setSection] = useState<Section | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRefClick = useCallback(async (ref: string) => {
    if (openRef === ref) {
      setOpenRef(null);
      setSection(null);
      return;
    }
    setLoading(true);
    setOpenRef(ref);
    const { data } = await supabase
      .from("methodology_sections")
      .select("*")
      .eq("methodology_id", methodologyId)
      .eq("ref", ref)
      .single();
    setSection(data as Section | null);
    setLoading(false);
  }, [openRef, methodologyId]);

  return (
    <li className="flex gap-3">
      <span className="shrink-0 w-5 h-5 rounded bg-zinc-800 text-zinc-400 text-[10px] font-mono flex items-center justify-center mt-0.5">
        {step.n}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-zinc-200 leading-relaxed mb-2">{step.text}</p>

        {step.refs && step.refs.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {step.refs.map((r) => (
              <button
                key={r.ref}
                onClick={() => handleRefClick(r.ref)}
                className={`text-[11px] font-mono px-2 py-0.5 rounded border transition-all ${
                  openRef === r.ref
                    ? "bg-blue-900/60 border-blue-600 text-blue-200 shadow-sm shadow-blue-900/40"
                    : REF_TYPE_COLOR[r.type] ?? REF_TYPE_COLOR.section
                }`}
              >
                ↗ {r.ref}
              </button>
            ))}
          </div>
        )}

        {loading && <p className="text-xs text-zinc-600 font-mono">Loading {openRef}…</p>}

        {section && openRef && (
          <div className="mt-2">
            <SectionPanel
              section={section}
              methodologyId={methodologyId}
              depth={0}
              onClose={() => { setOpenRef(null); setSection(null); }}
            />
          </div>
        )}
        {openRef && !section && !loading && (
          <p className="text-xs text-zinc-600 mt-1 italic font-mono">
            {openRef} — not yet extracted.
          </p>
        )}
      </div>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Extraction card
// ---------------------------------------------------------------------------

function ExtractionCard({
  extraction,
  methodologyId,
}: {
  extraction: Extraction;
  methodologyId: string;
}) {
  const [panel, setPanel] = useState<"none" | "procedure" | "source">("none");
  const conf = extraction.confidence ?? "not_specified";
  const meta = DIMENSIONS[extraction.dimension];
  const structured: ProcedureStep[] | null = (extraction as any).procedure_structured ?? null;

  return (
    <div className="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-900/40">
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span className="text-xs font-semibold text-zinc-300">{meta?.label ?? extraction.dimension}</span>
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${CONFIDENCE_PILL[conf]}`}>
              {conf}
            </span>
            {extraction.source_section && (
              <span className="text-[10px] font-mono text-zinc-600">
                {extraction.source_section}{extraction.page_ref ? ` · p.${extraction.page_ref}` : ""}
              </span>
            )}
          </div>
          <p className="text-sm text-zinc-300 leading-relaxed">
            {extraction.value ?? <span className="text-zinc-600 italic">not specified</span>}
          </p>
        </div>
      </div>

      <div className="flex gap-1 px-4 pb-3">
        {(structured || extraction.procedure) && (
          <button
            onClick={() => setPanel(panel === "procedure" ? "none" : "procedure")}
            className={`text-[11px] px-2.5 py-1 rounded-md border transition-colors font-mono ${
              panel === "procedure"
                ? "bg-zinc-700 border-zinc-600 text-zinc-200"
                : "bg-zinc-800/50 border-zinc-700 text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {panel === "procedure" ? "▲" : "▼"} procedure
            {structured && <span className="ml-1 opacity-50">· {structured.length} steps · refs linkable</span>}
          </button>
        )}
        {extraction.source_quote && (
          <button
            onClick={() => setPanel(panel === "source" ? "none" : "source")}
            className={`text-[11px] px-2.5 py-1 rounded-md border transition-colors font-mono ${
              panel === "source"
                ? "bg-zinc-700 border-zinc-600 text-zinc-200"
                : "bg-zinc-800/50 border-zinc-700 text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {panel === "source" ? "▲" : "▼"} source
          </button>
        )}
      </div>

      {panel === "procedure" && (
        <div className="border-t border-zinc-800 px-4 py-4 bg-zinc-950/50">
          <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wide mb-3">
            Procedure{structured ? " — click any ref chip ↗ to expand inline" : ""}
          </p>
          {structured ? (
            <ol className="space-y-4 list-none">
              {structured.map((step) => (
                <ProcedureStep key={step.n} step={step} methodologyId={methodologyId} />
              ))}
            </ol>
          ) : (
            <pre className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap font-mono">
              {extraction.procedure}
            </pre>
          )}
        </div>
      )}

      {panel === "source" && extraction.source_quote && (
        <div className="border-t border-zinc-800 px-4 py-4 bg-zinc-950/50">
          <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wide mb-2">Source Quote</p>
          <blockquote className="text-xs text-zinc-400 leading-relaxed border-l-2 border-zinc-700 pl-3 italic">
            &ldquo;{extraction.source_quote}&rdquo;
          </blockquote>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

export default function TaxonomyTab({
  extractions,
  methodologyId,
}: {
  extractions: Extraction[];
  methodologyId: string;
}) {
  const byDimension = Object.fromEntries(extractions.map((e) => [e.dimension, e]));
  const grouped: Record<string, string[]> = {};
  for (const [dim, meta] of Object.entries(DIMENSIONS)) {
    if (!grouped[meta.group]) grouped[meta.group] = [];
    grouped[meta.group].push(dim);
  }

  if (extractions.length === 0) {
    return <p className="text-sm text-zinc-500 italic py-12 text-center">No taxonomy extracted yet.</p>;
  }

  const withStructured = extractions.filter((e) => (e as any).procedure_structured).length;

  return (
    <div>
      <p className="text-xs text-zinc-600 mb-6 font-mono">
        {extractions.length} dimensions · {withStructured} with linked refs
        {withStructured < extractions.length && (
          <span className="text-amber-600/80"> · extraction running in background</span>
        )}
      </p>
      <div className="space-y-8">
        {Object.entries(GROUPS).map(([groupKey, groupLabel]) => {
          const dims = grouped[groupKey] ?? [];
          const rows = dims.map((d) => byDimension[d]).filter(Boolean);
          if (rows.length === 0) return null;
          return (
            <div key={groupKey}>
              <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-3 flex items-center gap-2">
                <span className="w-6 h-px bg-zinc-700" />
                {groupLabel}
              </h3>
              <div className="space-y-2">
                {rows.map((e) => (
                  <ExtractionCard key={e.dimension} extraction={e} methodologyId={methodologyId} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
