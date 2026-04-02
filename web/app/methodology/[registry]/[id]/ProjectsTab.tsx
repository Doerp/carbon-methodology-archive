"use client";

import React, { useState, useCallback } from "react";
import { supabase, DIMENSIONS, GROUPS } from "@/lib/supabase";
import { SectionBlocks, inlineWithRefs } from "@/lib/sectionBlocks";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ProjectCompliance = {
  dimension: string;
  methodology_req: string | null;
  project_impl: string | null;
  source_quote: string | null;
  source_section: string | null;
  page_ref: number | null;
  confidence: "high" | "medium" | "low" | "not_found";
};

type Project = {
  id: string;
  name: string;
  country: string | null;
  start_year: number | null;
  credits_issued: number | null;
  metadata: { page_url?: string; pdd_filename?: string } | null;
  compliance: ProjectCompliance[];
};

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
  high:      "bg-emerald-950/60 text-emerald-400 border-emerald-800",
  medium:    "bg-amber-950/60  text-amber-400  border-amber-800",
  low:       "bg-red-950/60    text-red-400    border-red-800",
  not_found: "bg-zinc-800      text-zinc-500   border-zinc-700",
};

const REF_TYPE_COLOR: Record<string, string> = {
  module:     "bg-blue-950/60 border-blue-800 text-blue-300 hover:bg-blue-900/60",
  equation:   "bg-purple-950/60 border-purple-800 text-purple-300 hover:bg-purple-900/60",
  table:      "bg-amber-950/60 border-amber-800 text-amber-300 hover:bg-amber-900/60",
  definition: "bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700",
  section:    "bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700",
};

// ---------------------------------------------------------------------------
// Inline section panel (opens below a ref chip click)
// ---------------------------------------------------------------------------

function InlineSectionPanel({
  section,
  methodologyId,
  onClose,
}: {
  section: Section;
  methodologyId: string;
  onClose: () => void;
}) {
  const [openRef, setOpenRef] = useState<string | null>(null);
  const [sub, setSub] = useState<Section | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRefClick = useCallback(async (ref: string) => {
    if (openRef === ref) { setOpenRef(null); setSub(null); return; }
    setLoading(true);
    setOpenRef(ref);
    const { data } = await supabase
      .from("methodology_sections")
      .select("*")
      .eq("methodology_id", methodologyId)
      .eq("ref", ref)
      .single();
    setSub(data as Section | null);
    setLoading(false);
  }, [openRef, methodologyId]);

  return (
    <div className="mt-2 bg-zinc-900 border border-zinc-700 rounded-lg">
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
          <button onClick={onClose} className="text-zinc-600 hover:text-zinc-400 text-xs font-mono ml-2">✕</button>
        </div>
        <SectionBlocks content={section.content} onRefClick={handleRefClick} openRef={openRef} />
        {loading && <p className="text-xs text-zinc-600 mt-2 font-mono">Loading {openRef}…</p>}
        {sub && openRef && (
          <div className="mt-3 bg-zinc-950/80 border-l border-zinc-700/50 pl-3 ml-2 rounded">
            <InlineSectionPanel
              section={sub}
              methodologyId={methodologyId}
              onClose={() => { setOpenRef(null); setSub(null); }}
            />
          </div>
        )}
        {openRef && !sub && !loading && (
          <p className="text-xs text-zinc-600 mt-2 italic font-mono">{openRef} — not extracted yet.</p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Text block with clickable refs
// ---------------------------------------------------------------------------

function RefText({
  text,
  methodologyId,
  className,
}: {
  text: string;
  methodologyId: string;
  className?: string;
}) {
  const [openRef, setOpenRef] = useState<string | null>(null);
  const [section, setSection] = useState<Section | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRefClick = useCallback(async (ref: string) => {
    if (openRef === ref) { setOpenRef(null); setSection(null); return; }
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
    <div>
      <p className={className ?? "text-xs text-zinc-300 leading-relaxed"}>
        {inlineWithRefs(text, handleRefClick, openRef)}
      </p>
      {loading && <p className="text-[11px] text-zinc-600 mt-1 font-mono">Loading {openRef}…</p>}
      {section && openRef && (
        <InlineSectionPanel
          section={section}
          methodologyId={methodologyId}
          onClose={() => { setOpenRef(null); setSection(null); }}
        />
      )}
      {openRef && !section && !loading && (
        <p className="text-[11px] text-zinc-600 mt-1 italic font-mono">{openRef} — not extracted yet.</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Compliance row — side-by-side requirement vs. implementation
// ---------------------------------------------------------------------------

function ComplianceRow({
  dim,
  compliance,
  methodologyId,
}: {
  dim: string;
  compliance: ProjectCompliance | undefined;
  methodologyId: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const label = DIMENSIONS[dim]?.label ?? dim;

  if (!compliance) {
    return (
      <div className="border-t border-zinc-800/60 px-4 py-3 flex items-center gap-3">
        <span className="text-[10px] font-mono text-zinc-600 w-40 shrink-0">{label}</span>
        <span className="text-xs text-zinc-700 italic">not extracted</span>
      </div>
    );
  }

  const conf = compliance.confidence ?? "not_found";
  const hasDetail = !!(compliance.methodology_req || compliance.source_quote);

  return (
    <div className="border-t border-zinc-800/60">
      {/* Summary row */}
      <button
        className="w-full flex items-start gap-3 px-4 py-3 hover:bg-zinc-900/40 text-left transition-colors"
        onClick={() => hasDetail && setExpanded((v) => !v)}
      >
        <span className="text-[10px] font-mono text-zinc-500 w-40 shrink-0 pt-0.5 leading-tight">{label}</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-zinc-300 leading-snug line-clamp-2">
            {compliance.project_impl ?? compliance.source_quote ?? <span className="text-zinc-600 italic">—</span>}
          </p>
        </div>
        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border shrink-0 ${CONFIDENCE_PILL[conf] ?? CONFIDENCE_PILL.not_found}`}>
          {conf}
        </span>
        {hasDetail && (
          <span className="text-zinc-700 text-xs shrink-0">{expanded ? "▲" : "▼"}</span>
        )}
      </button>

      {/* Expanded: requirement vs. implementation */}
      {expanded && (
        <div className="px-4 pb-5 bg-zinc-950/40 space-y-4">

          <div className="grid grid-cols-2 gap-4 pt-1">
            {/* Left: methodology requirement */}
            <div>
              <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-wide mb-1.5">
                Methodology requires
              </p>
              {compliance.methodology_req ? (
                <RefText
                  text={compliance.methodology_req}
                  methodologyId={methodologyId}
                  className="text-xs text-zinc-500 leading-relaxed"
                />
              ) : (
                <p className="text-xs text-zinc-700 italic">—</p>
              )}
            </div>

            {/* Right: project implementation */}
            <div>
              <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-wide mb-1.5">
                Project implements
              </p>
              {compliance.project_impl ? (
                <RefText
                  text={compliance.project_impl}
                  methodologyId={methodologyId}
                  className="text-xs text-zinc-200 leading-relaxed"
                />
              ) : (
                <p className="text-xs text-zinc-700 italic">—</p>
              )}
            </div>
          </div>

          {/* Source quote from PDD */}
          {compliance.source_quote && (
            <div className="border-t border-zinc-800/60 pt-3">
              <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-wide mb-1.5">
                PDD source
                {compliance.source_section && (
                  <span className="ml-2 text-zinc-700 normal-case tracking-normal">· {compliance.source_section}</span>
                )}
                {compliance.page_ref && (
                  <span className="ml-1 text-zinc-700 normal-case tracking-normal">p.{compliance.page_ref}</span>
                )}
              </p>
              <blockquote className="text-xs text-zinc-400 border-l-2 border-zinc-700 pl-3 italic leading-relaxed">
                &ldquo;{compliance.source_quote}&rdquo;
              </blockquote>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Project card
// ---------------------------------------------------------------------------

function ProjectCard({
  project,
  methodologyId,
}: {
  project: Project;
  methodologyId: string;
}) {
  const [open, setOpen] = useState(false);
  const byDim = Object.fromEntries(project.compliance.map((c) => [c.dimension, c]));
  const highCount = project.compliance.filter((c) => c.confidence === "high").length;
  const totalDims = project.compliance.length;
  const pageUrl = project.metadata?.page_url;

  const dimsByGroup: Record<string, string[]> = {};
  for (const [dim, meta] of Object.entries(DIMENSIONS)) {
    if (!dimsByGroup[meta.group]) dimsByGroup[meta.group] = [];
    dimsByGroup[meta.group].push(dim);
  }

  return (
    <div className="border border-zinc-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between px-5 py-4 bg-zinc-900/40">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-emerald-800 text-emerald-400 bg-emerald-950/40">
              Verra VCS
            </span>
            <span className="text-[10px] font-mono text-zinc-600">{project.id}</span>
            {project.country && (
              <span className="text-[10px] font-mono text-zinc-600">{project.country}</span>
            )}
            {project.start_year && (
              <span className="text-[10px] font-mono text-zinc-700">est. {project.start_year}</span>
            )}
          </div>
          <h3 className="text-sm font-semibold text-zinc-100 leading-snug">{project.name}</h3>
          {project.credits_issued && (
            <p className="text-[10px] font-mono text-zinc-600 mt-1">
              {project.credits_issued.toLocaleString()} buffer pool credits
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 ml-4 shrink-0">
          {pageUrl && (
            <a
              href={pageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-mono text-zinc-600 hover:text-zinc-400 transition-colors border border-zinc-800 hover:border-zinc-600 px-2 py-1 rounded-md"
            >
              PDD ↗
            </a>
          )}
          <button
            onClick={() => setOpen((v) => !v)}
            className="text-[11px] font-mono text-zinc-500 hover:text-zinc-300 border border-zinc-800 hover:border-zinc-600 px-2.5 py-1 rounded-md transition-colors"
          >
            {open ? "▲ hide" : "▼ compliance map"}
            {totalDims > 0 && (
              <span className="ml-1.5 text-zinc-600">
                {highCount}/{totalDims} high
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Compliance map */}
      {open && (
        <div>
          <div className="px-4 py-2 bg-zinc-900/20 border-t border-zinc-800">
            <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">
              Expand any row — left: what the methodology requires · right: what this project did · click any ref chip to view that section inline
            </p>
          </div>
          {Object.entries(GROUPS).map(([groupKey, groupLabel]) => {
            const dims = dimsByGroup[groupKey] ?? [];
            if (dims.length === 0) return null;
            return (
              <div key={groupKey}>
                <div className="px-4 py-2 bg-zinc-900/20 border-t border-zinc-800">
                  <p className="text-[9px] font-mono uppercase tracking-widest text-zinc-600">{groupLabel}</p>
                </div>
                {dims.map((dim) => (
                  <ComplianceRow
                    key={dim}
                    dim={dim}
                    compliance={byDim[dim]}
                    methodologyId={methodologyId}
                  />
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

export default function ProjectsTab({
  projects,
  methodologyId,
}: {
  projects: Project[];
  methodologyId: string;
}) {
  if (projects.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-zinc-500 italic">No project compliance documents linked yet.</p>
        <p className="text-xs text-zinc-700 mt-2 font-mono">
          Run scripts/extract_compliance.py to add project PDDs.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs text-zinc-600 mb-6 font-mono">
        {projects.length} project{projects.length !== 1 ? "s" : ""} · compliance extracted from PDDs · expand rows to compare requirement vs. implementation · click any ref chip to view the methodology section inline
      </p>
      <div className="space-y-4">
        {projects.map((p) => (
          <ProjectCard key={p.id} project={p} methodologyId={methodologyId} />
        ))}
      </div>
    </div>
  );
}
