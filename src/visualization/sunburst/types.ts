// ABOUTME: Type definitions for sunburst diagram data structures
// ABOUTME: Defines hierarchical node structure and metadata for revenue visualizations

export type SunburstNode = {
  name: string;
  value?: number;
  children?: SunburstNode[];
  actualValue?: number;
  isNegative?: boolean;
};

export type SunburstData = {
  meta: {
    source: string;
    total_revenue_billion: string;
    fiscal_year: string;
    funding_types: number;
    fps_groups: number;
  };
  data: SunburstNode;
};

// NOTE: SunburstReference is defined in src/data/types.ts (supports both 'file' and 'api' types)
