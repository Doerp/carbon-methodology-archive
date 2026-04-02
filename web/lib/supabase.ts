import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(url, key);

export type Extraction = {
  id: number;
  methodology_id: string;
  schema_version: number;
  dimension: string;
  value: string | null;
  procedure: string | null;
  source_quote: string | null;
  source_section: string | null;
  page_ref: number | null;
  confidence: "high" | "medium" | "low" | "not_specified";
  reviewed: boolean;
};

export const SCHEMA_VERSION = 2;

export type DimensionMeta = {
  label: string;
  group: string;
};

export const DIMENSIONS: Record<string, DimensionMeta> = {
  // Baseline & Reference Region
  reference_region_delineation:  { label: "Reference Region Delineation",   group: "baseline" },
  baseline_calculation_method:   { label: "Baseline Emissions Calculation",  group: "baseline" },
  baseline_data_sources:         { label: "Baseline Data Requirements",      group: "baseline" },
  baseline_update_procedure:     { label: "Baseline Reassessment Rules",     group: "baseline" },
  // Additionality
  additionality_procedure:       { label: "Additionality Procedure",         group: "additionality" },
  performance_standard:          { label: "Performance Standard / Threshold", group: "additionality" },
  // Carbon Quantification
  carbon_pools:                  { label: "Carbon Pools",                    group: "quantification" },
  biomass_estimation_method:     { label: "Biomass Estimation Method",       group: "quantification" },
  uncertainty_requirements:      { label: "Uncertainty Requirements",        group: "quantification" },
  emission_factors:              { label: "Emission Factors & Data Sources", group: "quantification" },
  // Monitoring
  monitoring_parameters:         { label: "Monitoring Parameters",           group: "monitoring" },
  remote_sensing_requirements:   { label: "Remote Sensing Requirements",     group: "monitoring" },
  // Leakage
  leakage_calculation:           { label: "Leakage Calculation Procedure",   group: "leakage" },
  // Permanence & Verification
  buffer_pool_calculation:       { label: "Buffer Pool Calculation",         group: "permanence" },
  reversal_accounting:           { label: "Reversal & Non-Permanence",       group: "permanence" },
  verification_requirements:     { label: "Verification Requirements",       group: "permanence" },
};

export const GROUPS: Record<string, string> = {
  baseline:       "Baseline & Reference Region",
  additionality:  "Additionality",
  quantification: "Carbon Quantification",
  monitoring:     "Monitoring",
  leakage:        "Leakage",
  permanence:     "Permanence & Verification",
};

export const DIMENSION_ORDER = Object.keys(DIMENSIONS);

// Legacy compat for v1 pages
export const DIMENSION_LABELS = Object.fromEntries(
  Object.entries(DIMENSIONS).map(([k, v]) => [k, v.label])
);
