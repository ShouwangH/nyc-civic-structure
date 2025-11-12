// ABOUTME: Type definitions for Sankey diagram data and layout
// ABOUTME: Defines the structure for pension fund allocation visualization

import type {
  SankeyNode as D3SankeyNode,
  SankeyLink as D3SankeyLink,
} from 'd3-sankey';

/**
 * Sankey node data structure (input format)
 * Matches the nyc_pension_sankey.json format
 */
export type SankeyNodeData = {
  id: string;
  label: string;
  level: number;
  type: string;
};

/**
 * Sankey link data structure (input format)
 * Represents money flow between entities with value in billions
 */
export type SankeyLinkData = {
  source: string | number;  // Node name or index
  target: string | number;  // Node name or index
  value: number;            // Amount in billions
};

/**
 * Complete Sankey dataset with metadata
 */
export type SankeyData = {
  units?: string;               // Units of values (e.g., "USD", "USD (millions)")
  description?: string;         // Dataset description
  meta?: {
    source?: string;           // Data source (e.g., "NYC Comptroller Monthly Performance Reviews 09-2025")
    total_aum_billion?: number; // Total assets under management
    [key: string]: unknown;
  };
  nodes: SankeyNodeData[];
  links: SankeyLinkData[];
};

// NOTE: SankeyReference is defined in src/data/types.ts (supports both 'file' and 'api' types)

/**
 * Extended Sankey node after d3-sankey layout computation
 * Includes position and dimension properties
 */
export type SankeyNode = D3SankeyNode<SankeyNodeData, SankeyLinkData>;

/**
 * Extended Sankey link after d3-sankey layout computation
 * Includes path width and coordinates
 */
export type SankeyLink = D3SankeyLink<SankeyNodeData, SankeyLinkData>;

/**
 * Computed Sankey layout ready for rendering
 */
export type SankeyGraph = {
  nodes: SankeyNode[];
  links: SankeyLink[];
};
