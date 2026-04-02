"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Extraction, DimensionMeta } from "@/lib/supabase";

const CONFIDENCE_COLOR: Record<string, string> = {
  high:          "text-emerald-400",
  medium:        "text-amber-400",
  low:           "text-red-400",
  not_specified: "text-zinc-600",
};

function CellDetail({ extraction }: { extraction: Extraction }) {
  const [tab, setTab] = useState<"procedure" | "source">("procedure");
  return (
    <div className="mt-3 border-t border-zinc-700/50 pt-3">
      <div className="flex gap-1 mb-2">
        {(["procedure", "source"] as const).map((t) => (
          <button
            key={t}
            onClick={(e) => { e.stopPropagation(); setTab(t); }}
            className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-colors ${
              tab === t
                ? "bg-zinc-700 border-zinc-600 text-zinc-200"
                : "border-zinc-700 text-zinc-600 hover:text-zinc-400"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "procedure" && extraction.procedure && (
        <div className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap font-mono">
          {extraction.procedure}
        </div>
      )}
      {tab === "source" && extraction.source_quote && (
        <blockquote className="text-xs text-zinc-400 leading-relaxed border-l-2 border-zinc-700 pl-3 italic">
          &ldquo;{extraction.source_quote}&rdquo;
          {extraction.source_section && (
            <cite className="not-italic block mt-1 text-zinc-600 font-mono">
              — {extraction.source_section}{extraction.page_ref ? ` · p.${extraction.page_ref}` : ""}
            </cite>
          )}
        </blockquote>
      )}
      {tab === "procedure" && !extraction.procedure && (
        <p className="text-xs text-zinc-600 italic">No procedure extracted.</p>
      )}
      {tab === "source" && !extraction.source_quote && (
        <p className="text-xs text-zinc-600 italic">No source quote.</p>
      )}
    </div>
  );
}

function CompareCell({
  extraction,
  differs,
}: {
  extraction: Extraction | undefined;
  differs: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  if (!extraction) {
    return (
      <td className="px-4 py-3 align-top border-b border-zinc-800/60 text-zinc-700 text-xs italic">—</td>
    );
  }
  const conf = extraction.confidence ?? "not_specified";
  return (
    <td
      className={`px-4 py-3 align-top border-b border-zinc-800/60 cursor-pointer transition-colors ${
        differs ? "border-l border-amber-900/40 hover:bg-amber-950/20" : "hover:bg-zinc-800/30"
      } ${expanded ? (differs ? "bg-amber-950/20" : "bg-zinc-800/30") : ""}`}
      onClick={() => setExpanded((e) => !e)}
    >
      <p className="text-sm text-zinc-200 leading-snug">{extraction.value ?? "—"}</p>
      <p className={`text-[10px] font-mono mt-1 ${CONFIDENCE_COLOR[conf]}`}>
        {extraction.source_section
          ? `${extraction.source_section}${extraction.page_ref ? ` · p.${extraction.page_ref}` : ""} · ${conf}`
          : conf}
      </p>
      {expanded && <CellDetail extraction={extraction} />}
    </td>
  );
}

export default function CompareClient({
  allIds,
  initialSelectedIds,
  extractionMap,
  nameMap,
  dimensions,
  groups,
}: {
  allIds: string[];
  initialSelectedIds: string[];
  extractionMap: Record<string, Record<string, Extraction>>;
  nameMap: Record<string, string>;
  dimensions: Record<string, DimensionMeta>;
  groups: Record<string, string>;
}) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState(initialSelectedIds);

  function toggle(id: string) {
    const next = selectedIds.includes(id)
      ? selectedIds.filter((s) => s !== id)
      : [...selectedIds, id];
    setSelectedIds(next);
    const q = next.length > 0 ? `?ids=${next.join(",")}` : "";
    router.push(`/compare${q}`, { scroll: false });
  }

  function valuesDiffer(dimension: string): boolean {
    const vals = selectedIds.map((id) => {
      const e = extractionMap[id]?.[dimension];
      return (e?.value ?? "").toLowerCase().trim();
    });
    return new Set(vals).size > 1;
  }

  // Group dimensions
  const grouped: Record<string, string[]> = {};
  for (const [dim, meta] of Object.entries(dimensions)) {
    if (!grouped[meta.group]) grouped[meta.group] = [];
    grouped[meta.group].push(dim);
  }

  const differentCount = Object.keys(dimensions).filter(valuesDiffer).length;

  return (
    <div>
      {/* Selector */}
      <div className="flex flex-wrap gap-2 mt-4 mb-6">
        {allIds.map((id) => {
          const active = selectedIds.includes(id);
          return (
            <button
              key={id}
              onClick={() => toggle(id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-all ${
                active
                  ? "bg-emerald-950/40 border-emerald-700 text-emerald-300"
                  : "bg-zinc-900 border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-emerald-400" : "bg-zinc-600"}`} />
              <span className="font-mono text-xs">{id}</span>
              <span className="text-xs truncate max-w-[160px]">{nameMap[id] ?? id}</span>
            </button>
          );
        })}
        <span className="self-center text-xs text-zinc-600 font-mono ml-2">
          {differentCount} of {Object.keys(dimensions).length} dimensions differ
        </span>
      </div>

      {/* Matrix */}
      <div className="overflow-x-auto border border-zinc-800 rounded-lg">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-zinc-900/80">
              <th className="text-left px-4 py-3 text-xs font-mono text-zinc-500 uppercase tracking-wide w-48 border-b border-zinc-800 sticky left-0 bg-zinc-900">
                Dimension
              </th>
              {selectedIds.map((id) => (
                <th key={id} className="text-left px-4 py-3 border-b border-zinc-800 min-w-[280px]">
                  <span className="text-xs font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800 px-2 py-0.5 rounded">
                    {id}
                  </span>
                  <div className="text-xs text-zinc-400 font-normal mt-1 leading-snug">
                    {nameMap[id] ?? id}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(groups).map(([groupKey, groupLabel]) => {
              const dims = grouped[groupKey] ?? [];
              return [
                <tr key={`group-${groupKey}`}>
                  <td
                    colSpan={selectedIds.length + 1}
                    className="px-4 py-2 bg-zinc-900/60 border-b border-zinc-800"
                  >
                    <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                      {groupLabel}
                    </span>
                  </td>
                </tr>,
                ...dims.map((dim) => {
                  const differs = valuesDiffer(dim);
                  return (
                    <tr key={dim} className={differs ? "bg-amber-950/10" : ""}>
                      <td className="px-4 py-3 border-b border-zinc-800/60 align-top sticky left-0 bg-zinc-950">
                        <div className="flex items-center gap-1.5">
                          {differs && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />}
                          <span className="text-xs font-medium text-zinc-400">
                            {dimensions[dim]?.label ?? dim}
                          </span>
                        </div>
                      </td>
                      {selectedIds.map((id) => (
                        <CompareCell
                          key={id}
                          extraction={extractionMap[id]?.[dim]}
                          differs={differs}
                        />
                      ))}
                    </tr>
                  );
                }),
              ];
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-zinc-600 font-mono flex items-center gap-2">
        <span className="inline-flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-400" /> amber = differs
        </span>
        <span>·</span>
        <span>click any cell to expand procedure</span>
      </p>
    </div>
  );
}
