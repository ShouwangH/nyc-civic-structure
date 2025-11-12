// ABOUTME: Shared type-safe API contracts between frontend and backend
// ABOUTME: Ensures compile-time safety for API request/response shapes

import type { ProcessedBuilding } from '../components/HousingTimelapse/types';

/**
 * Generic API response wrapper
 * All API endpoints return this shape
 */
export type ApiResponse<T> =
  | { success: true; cached: boolean; data: T }
  | { success: false; error: string; message: string };

/**
 * Housing data API response
 * GET /api/housing-data
 */
export type HousingDataResponse = ApiResponse<{
  buildings: ProcessedBuilding[];
  demolitions: Array<{
    existing_dwelling_units: number;
    latest_action_date: string;
    bbl: string | null;
    borough: string;
    block: string | undefined;
    lot: string | undefined;
  }>;
}>;

/**
 * Capital budget API response
 * GET /api/capital-budget
 */
export type CapitalBudgetResponse = ApiResponse<Array<{
  type: 'Feature';
  geometry: any; // GeoJSON geometry
  properties: {
    maprojid: string;
    description: string;
    magencyname: string;
    magencyacro: string | null;
    typecategory: string | null;
    mindate: string | null;
    maxdate: string | null;
    allocate_total: number;
    commit_total: number;
    spent_total: number;
    plannedcommit_total: number;
    fiscalYear: number | null;
    completionYear: number | null;
  };
}>>;

/**
 * Financial data list API response
 * GET /api/financial-data
 */
export type FinancialDataListResponse = ApiResponse<{
  sankey: Array<{
    id: string;
    label: string;
    description: string;
    fiscalYear: number;
    dataType: string;
    units: string | null;
    generatedAt: Date;
  }>;
  sunburst: Array<{
    id: string;
    label: string;
    description: string;
    fiscalYear: number;
    dataType: string;
    units: string | null;
    totalValue: number | null;
    generatedAt: Date;
  }>;
}>;

/**
 * Sankey dataset API response
 * GET /api/financial-data/sankey/:id
 */
export type SankeyDatasetResponse = ApiResponse<{
  units?: string;
  description?: string;
  meta?: Record<string, unknown>;
  nodes: Array<{
    id: string;
    label: string;
    level: number;
    type: string;
  }>;
  links: Array<{
    source: string | number;
    target: string | number;
    value: number;
  }>;
}>;

/**
 * Sunburst dataset API response
 * GET /api/financial-data/sunburst/:id
 */
export type SunburstDatasetResponse = ApiResponse<{
  meta: {
    source: string;
    fiscal_year: string;
    units?: string;
    total_value?: number;
    [key: string]: unknown;
  };
  data: {
    name: string;
    value?: number;
    children?: Array<any>; // Recursive SunburstNode
  };
}>;

/**
 * Type guard to check if API response is successful
 */
export function isSuccessResponse<T>(
  response: ApiResponse<T>
): response is { success: true; cached: boolean; data: T } {
  return response.success === true;
}
