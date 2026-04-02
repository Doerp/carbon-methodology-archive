import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { supabase, DIMENSIONS, GROUPS, SCHEMA_VERSION, type Extraction } from "@/lib/supabase";
import { listMethodologies, getDisplayName } from "@/lib/archive";
import CompareClient from "./CompareClient";

const METHODOLOGY_IDS = ["VM0007", "VM0042", "VM0047"];

async function getAllExtractions(): Promise<Record<string, Record<string, Extraction>>> {
  const { data } = await supabase
    .from("methodology_extractions")
    .select("*")
    .in("methodology_id", METHODOLOGY_IDS)
    .eq("schema_version", SCHEMA_VERSION);

  const map: Record<string, Record<string, Extraction>> = {};
  for (const row of data ?? []) {
    const e = row as Extraction;
    if (!map[e.methodology_id]) map[e.methodology_id] = {};
    map[e.methodology_id][e.dimension] = e;
  }
  return map;
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  const { ids } = await searchParams;
  const selectedIds = ids
    ? ids.split(",").map((s) => s.trim().toUpperCase()).filter((s) => METHODOLOGY_IDS.includes(s))
    : METHODOLOGY_IDS;

  const [extractionMap, methodologies] = await Promise.all([
    getAllExtractions(),
    listMethodologies(),
  ]);

  const nameMap = Object.fromEntries(methodologies.map((m) => [m.id, getDisplayName(m)]));

  return (
    <main>
      <div className="mb-1">
        <Link href="/" className="text-xs font-mono text-zinc-500 hover:text-zinc-300 transition-colors">
          ← all methodologies
        </Link>
      </div>

      <div className="mt-6 mb-2">
        <h1 className="text-2xl font-semibold text-white mb-1">Methodology Comparison</h1>
        <p className="text-sm text-zinc-500">
          Procedural diff — amber rows diverge. Click any cell to expand the full procedure.
        </p>
      </div>

      <CompareClient
        allIds={METHODOLOGY_IDS}
        initialSelectedIds={selectedIds}
        extractionMap={extractionMap}
        nameMap={nameMap}
        dimensions={DIMENSIONS}
        groups={GROUPS}
      />
    </main>
  );
}
