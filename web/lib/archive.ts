const REPO = "Doerp/carbon-methodology-archive";
const RAW = `https://raw.githubusercontent.com/${REPO}/main`;
const API = `https://api.github.com/repos/${REPO}/contents`;

export type MethodologyVersion = {
  label: string;
  url: string;
  hash: string;
  is_current: boolean;
};

export type VerraMetadata = {
  id: string;
  registry: "verra";
  page_url: string;
  versions: MethodologyVersion[];
  last_synced: string;
};

export type IsometricMetadata = {
  id: string;
  registry: "isometric";
  version: string;
  current_hash: string;
  protocol_url: string;
  last_synced: string;
};

export type MethodologyMetadata = VerraMetadata | IsometricMetadata;

const VERRA_IDS = ["VM0007", "VM0042", "VM0047"];
const ISOMETRIC_SLUGS = [
  "biochar",
  "enhanced-weathering-in-agriculture",
  "reforestation",
];

const VERRA_NAMES: Record<string, string> = {
  VM0007: "REDD+ Methodology Framework (REDD-MF)",
  VM0042: "Improved Agricultural Land Management",
  VM0047: "Afforestation, Reforestation and Revegetation",
};

const ISOMETRIC_NAMES: Record<string, string> = {
  "biochar": "Biochar Production and Storage",
  "enhanced-weathering-in-agriculture": "Enhanced Weathering in Agriculture",
  "reforestation": "Reforestation",
};

export function getDisplayName(meta: MethodologyMetadata): string {
  if (meta.registry === "verra") return VERRA_NAMES[meta.id] ?? meta.id;
  return ISOMETRIC_NAMES[meta.id] ?? meta.id;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`Fetch failed: ${url} → ${res.status}`);
  return res.json();
}

export async function listMethodologies(): Promise<MethodologyMetadata[]> {
  const results: MethodologyMetadata[] = [];

  for (const id of VERRA_IDS) {
    try {
      const meta = await fetchJson<VerraMetadata>(
        `${RAW}/methodologies/verra/${id}/metadata.json`
      );
      results.push(meta);
    } catch {
      // skip if not yet synced
    }
  }

  for (const slug of ISOMETRIC_SLUGS) {
    try {
      const meta = await fetchJson<IsometricMetadata>(
        `${RAW}/methodologies/isometric/${slug}/metadata.json`
      );
      results.push(meta);
    } catch {
      // skip if not yet synced
    }
  }

  return results;
}

export async function getMethodology(
  registry: string,
  id: string
): Promise<MethodologyMetadata | null> {
  try {
    const path =
      registry === "verra"
        ? `methodologies/verra/${id.toUpperCase()}/metadata.json`
        : `methodologies/isometric/${id}/metadata.json`;
    return await fetchJson<MethodologyMetadata>(`${RAW}/${path}`);
  } catch {
    return null;
  }
}

export async function listGitHubFiles(
  registry: string,
  id: string
): Promise<{ name: string; download_url: string; size: number }[]> {
  const path =
    registry === "verra"
      ? `methodologies/verra/${id.toUpperCase()}`
      : `methodologies/isometric/${id}`;
  try {
    const entries = await fetchJson<
      { name: string; download_url: string; size: number; type: string }[]
    >(`${API}/${path}`);
    return entries.filter(
      (e) => e.type === "file" && e.name !== "metadata.json" && !e.name.startsWith(".")
    );
  } catch {
    return [];
  }
}

export function githubBrowseUrl(registry: string, id: string): string {
  const path =
    registry === "verra"
      ? `methodologies/verra/${id.toUpperCase()}`
      : `methodologies/isometric/${id}`;
  return `https://github.com/${REPO}/tree/main/${path}`;
}
