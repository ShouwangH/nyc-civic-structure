// ABOUTME: TypeScript type definitions for Capital Budget feature
// ABOUTME: Defines interfaces for capital projects data and component props

import type { Feature, Polygon, MultiPolygon, Point } from 'geojson';

/**
 * Capital project properties from database
 */
export type CapitalProjectProperties = {
  maprojid: string;
  description: string;
  magencyname: string;
  magencyacro: string;
  typecategory: string;
  mindate: string;
  maxdate: string;
  allocate_total: number;
  commit_total: number;
  spent_total: number;
  plannedcommit_total: number;
  fiscalYear?: number;
  completionYear?: number;
};

/**
 * GeoJSON Feature type for capital projects
 */
export type CapitalProjectFeature = Feature<Polygon | MultiPolygon | Point, CapitalProjectProperties>;

/**
 * Capital project with computed centroid for column rendering
 */
export type CapitalProjectWithCentroid = CapitalProjectFeature & {
  centroid: [number, number];
};

/**
 * View mode for capital budget visualization
 */
export type ViewMode = 'budget' | 'footprint';

/**
 * Agency color mapping
 */
export type AgencyColorMap = Record<string, [number, number, number]>;

/**
 * Component props
 */
export type CapitalBudgetProps = {
  // Container component has no props currently
};

export type Map3DProps = {
  projects: CapitalProjectWithCentroid[];
  selectedProjectIds: Set<string>;
  viewMode: ViewMode;
  onHover: (project: CapitalProjectFeature | null) => void;
  onClick: (projectId: string) => void;
};

export type LegendProps = {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  agencyColors: AgencyColorMap;
};

export type TooltipProps = {
  project: CapitalProjectFeature | null;
};
