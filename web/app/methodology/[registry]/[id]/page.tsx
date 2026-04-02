import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  getMethodology,
  listGitHubFiles,
  getDisplayName,
  githubBrowseUrl,
  type VerraMetadata,
  type IsometricMetadata,
} from "@/lib/archive";
import { supabase, SCHEMA_VERSION, type Extraction } from "@/lib/supabase";
import TaxonomyTab from "./TaxonomyTab";
import ProjectsTab from "./ProjectsTab";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function getExtractions(methodologyId: string): Promise<Extraction[]> {
  const { data } = await supabase
    .from("methodology_extractions")
    .select("*")
    .eq("methodology_id", methodologyId)
    .eq("schema_version", SCHEMA_VERSION)
    .order("id");
  return (data ?? []) as Extraction[];
}

async function getProjects(methodologyId: string) {
  const { data: projectRows } = await supabase
    .from("projects")
    .select("id, name, country, start_year, credits_issued, metadata")
    .eq("methodology_id", methodologyId)
    .order("start_year");
  if (!projectRows || projectRows.length === 0) return [];

  const projectIds = projectRows.map((p) => p.id);
  const { data: compliance } = await supabase
    .from("project_compliance")
    .select("project_id, dimension, methodology_req, project_impl, source_quote, source_section, page_ref, confidence")
    .in("project_id", projectIds);

  const complianceByProject: Record<string, typeof compliance> = {};
  for (const row of compliance ?? []) {
    if (!complianceByProject[row.project_id]) complianceByProject[row.project_id] = [];
    complianceByProject[row.project_id]!.push(row);
  }

  return projectRows.map((p) => ({
    ...p,
    compliance: complianceByProject[p.id] ?? [],
  }));
}

export default async function MethodologyPage({
  params,
  searchParams,
}: {
  params: Promise<{ registry: string; id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { registry, id } = await params;
  const { tab = "taxonomy" } = await searchParams;

  const meta = await getMethodology(registry, id);
  if (!meta) notFound();

  const [files, extractions, projects] = await Promise.all([
    listGitHubFiles(registry, id),
    getExtractions(id.toUpperCase()),
    getProjects(id.toUpperCase()),
  ]);

  const browseUrl = githubBrowseUrl(registry, id);
  const synced = new Date(meta.last_synced).toLocaleString("en-US", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit", timeZoneName: "short",
  });

  const tabs = [
    { key: "documents", label: "Documents" },
    { key: "taxonomy", label: "Taxonomy" },
    { key: "projects", label: "Projects" },
  ];

  const baseHref = `/methodology/${registry}/${id}`;

  return (
    <main>
      <div className="mb-1">
        <Link href="/" className="text-xs font-mono text-zinc-500 hover:text-zinc-300 transition-colors">
          ← all methodologies
        </Link>
      </div>

      <div className="flex flex-wrap items-start gap-3 mt-4 mb-6">
        <Badge
          variant="outline"
          className={registry === "verra"
            ? "border-emerald-700 text-emerald-400 bg-emerald-950/40"
            : "border-blue-700 text-blue-400 bg-blue-950/40"}
        >
          {registry === "verra" ? "Verra VCS" : "Isometric"}
        </Badge>
        <span className="text-xs font-mono text-zinc-500 self-center">{id}</span>
        <Link
          href={`/compare?ids=${id.toUpperCase()}`}
          className="ml-auto text-xs font-mono text-zinc-600 hover:text-zinc-400 transition-colors border border-zinc-800 hover:border-zinc-600 px-2.5 py-1 rounded-md"
        >
          + Compare
        </Link>
      </div>

      <h1 className="text-2xl font-semibold text-white mb-1">
        {getDisplayName(meta)}
      </h1>

      {registry === "verra" ? (
        <a href={(meta as VerraMetadata).page_url} target="_blank" rel="noopener noreferrer"
          className="text-xs font-mono text-zinc-500 hover:text-zinc-300 transition-colors">
          {(meta as VerraMetadata).page_url} ↗
        </a>
      ) : (
        <a href={(meta as IsometricMetadata).protocol_url} target="_blank" rel="noopener noreferrer"
          className="text-xs font-mono text-zinc-500 hover:text-zinc-300 transition-colors">
          {(meta as IsometricMetadata).protocol_url} ↗
        </a>
      )}

      <Separator className="my-6 bg-zinc-800" />

      {/* Tab nav */}
      <div className="flex gap-1 mb-6 border-b border-zinc-800 pb-0">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`${baseHref}?tab=${t.key}`}
            className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors -mb-px border-b-2 ${
              tab === t.key
                ? "text-white border-emerald-500"
                : "text-zinc-500 hover:text-zinc-300 border-transparent"
            }`}
          >
            {t.label}
            {t.key === "taxonomy" && extractions.length > 0 && (
              <span className="ml-1.5 text-[10px] bg-zinc-800 text-zinc-400 rounded-full px-1.5 py-0.5">
                {extractions.length}
              </span>
            )}
            {t.key === "projects" && projects.length > 0 && (
              <span className="ml-1.5 text-[10px] bg-zinc-800 text-zinc-400 rounded-full px-1.5 py-0.5">
                {projects.length}
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* Documents tab */}
      {tab === "documents" && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-500">Documents</h2>
            <a href={browseUrl} target="_blank" rel="noopener noreferrer"
              className="text-xs font-mono text-zinc-600 hover:text-zinc-400 transition-colors">
              browse on GitHub ↗
            </a>
          </div>

          {files.length === 0 ? (
            <p className="text-sm text-zinc-500 italic">No documents synced yet.</p>
          ) : (
            <div className="space-y-1">
              {files.map((file) => (
                <a key={file.name} href={file.download_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-zinc-800 transition-colors group">
                  <span className="text-sm font-mono text-zinc-300 group-hover:text-white truncate">{file.name}</span>
                  <span className="text-xs font-mono text-zinc-600 ml-4 shrink-0">{formatBytes(file.size)}</span>
                </a>
              ))}
            </div>
          )}

          {registry === "verra" && (meta as VerraMetadata).versions && (
            <div className="mt-8">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-500 mb-3">Version history</h2>
              <div className="space-y-1">
                {(meta as VerraMetadata).versions.map((v, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 rounded-md bg-zinc-900">
                    <div className="flex items-center gap-2 min-w-0">
                      {v.is_current && <span className="text-xs text-emerald-400 font-mono shrink-0">current</span>}
                      <span className="text-sm text-zinc-300 truncate">{v.label}</span>
                    </div>
                    <span className="text-xs font-mono text-zinc-600 ml-4 shrink-0">{v.hash.slice(7, 15)}…</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Taxonomy tab */}
      {tab === "taxonomy" && (
        <TaxonomyTab extractions={extractions} methodologyId={id.toUpperCase()} />
      )}

      {/* Projects tab */}
      {tab === "projects" && (
        <ProjectsTab projects={projects} methodologyId={id.toUpperCase()} />
      )}

      <p className="mt-8 text-xs font-mono text-zinc-600">Last synced: {synced}</p>
    </main>
  );
}
