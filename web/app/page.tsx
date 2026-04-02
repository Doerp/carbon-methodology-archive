import Link from "next/link";
import { listMethodologies, getDisplayName, type MethodologyMetadata, type VerraMetadata } from "@/lib/archive";
import { supabase, SCHEMA_VERSION, type Extraction } from "@/lib/supabase";

const HIGHLIGHT_DIMS = ["baseline_calculation_method", "additionality_procedure", "crediting_period"];

async function getHighlights(): Promise<Record<string, Record<string, string>>> {
  const { data } = await supabase
    .from("methodology_extractions")
    .select("methodology_id, dimension, value")
    .in("dimension", HIGHLIGHT_DIMS)
    .eq("schema_version", SCHEMA_VERSION);

  const result: Record<string, Record<string, string>> = {};
  for (const row of (data ?? []) as Pick<Extraction, "methodology_id" | "dimension" | "value">[]) {
    if (!result[row.methodology_id]) result[row.methodology_id] = {};
    if (row.value) result[row.methodology_id][row.dimension] = row.value;
  }
  return result;
}

function truncate(s: string, n: number) {
  return s.length <= n ? s : s.slice(0, n).replace(/\s+\S*$/, "") + "…";
}

function MethodologyCard({ meta, highlights }: { meta: MethodologyMetadata; highlights?: Record<string, string> }) {
  const href = `/methodology/${meta.registry}/${meta.id}?tab=taxonomy`;
  const isVerra = meta.registry === "verra";
  const type = (meta as VerraMetadata).versions ? "Verra VCS" : "Isometric";

  return (
    <Link href={href} className="block group">
      <div className="h-full bg-zinc-900 border border-zinc-800 group-hover:border-zinc-600 rounded-xl p-5 transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
            isVerra
              ? "border-emerald-800 text-emerald-400 bg-emerald-950/40"
              : "border-blue-800 text-blue-400 bg-blue-950/40"
          }`}>
            {type}
          </span>
          <span className="text-[10px] font-mono text-zinc-600">{meta.id}</span>
        </div>

        {/* Title */}
        <h2 className="text-sm font-semibold text-zinc-100 leading-snug mb-4">
          {getDisplayName(meta)}
        </h2>

        {/* Highlights */}
        {highlights && (
          <div className="space-y-2 mb-4">
            {HIGHLIGHT_DIMS.map((dim) => {
              const v = highlights[dim];
              if (!v) return null;
              const label = dim === "baseline_calculation_method" ? "Baseline"
                : dim === "additionality_procedure" ? "Additionality"
                : "Crediting";
              return (
                <div key={dim} className="flex gap-2 items-start">
                  <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-wide w-16 shrink-0 pt-px">{label}</span>
                  <span className="text-[11px] text-zinc-500 leading-snug">{truncate(v, 60)}</span>
                </div>
              );
            })}
          </div>
        )}

        <div className="text-[10px] font-mono text-zinc-700">
          {new Date(meta.last_synced).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </div>
      </div>
    </Link>
  );
}

export default async function Home() {
  const [methodologies, highlights] = await Promise.all([
    listMethodologies(),
    getHighlights(),
  ]);

  const verra = methodologies.filter((m) => m.registry === "verra");
  const isometric = methodologies.filter((m) => m.registry === "isometric");

  return (
    <main>
      {/* Top bar */}
      <div className="flex items-center justify-between mb-8">
        <p className="text-xs text-zinc-600 font-mono">
          {methodologies.length} methodologies · AI-extracted taxonomy · open archive
        </p>
        <Link
          href="/compare"
          className="text-xs font-mono text-zinc-500 hover:text-zinc-300 transition-colors border border-zinc-800 hover:border-zinc-600 px-3 py-1.5 rounded-md"
        >
          Compare →
        </Link>
      </div>

      {verra.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-mono uppercase tracking-widest text-zinc-500">Verra VCS</h2>
            <span className="text-[10px] font-mono text-zinc-700">{verra.length} methodologies</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {verra.map((m) => (
              <MethodologyCard key={m.id} meta={m} highlights={highlights[m.id]} />
            ))}
          </div>
        </section>
      )}

      {isometric.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-mono uppercase tracking-widest text-zinc-500">Isometric</h2>
            <span className="text-[10px] font-mono text-zinc-700">{isometric.length} protocols</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {isometric.map((m) => (
              <MethodologyCard key={m.id} meta={m} highlights={highlights[m.id]} />
            ))}
          </div>
        </section>
      )}

      <p className="mt-10 text-[10px] text-zinc-700 font-mono">
        <a href="https://github.com/Doerp/carbon-methodology-archive" target="_blank" rel="noopener noreferrer"
          className="hover:text-zinc-500 underline">
          github.com/Doerp/carbon-methodology-archive
        </a>
        {" · "}synced monthly
      </p>
    </main>
  );
}
