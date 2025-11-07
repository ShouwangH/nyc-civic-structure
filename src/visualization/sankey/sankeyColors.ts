// ABOUTME: Color schemes for NYC Sankey diagrams (pension and budget)
// ABOUTME: Maps node names to colors based on diagram type and hierarchy

/**
 * Color schemes for two Sankey visualizations:
 *
 * 1. PENSION FUND ALLOCATION:
 *    - Root/Pension Funds: Neutral grays
 *    - Asset Classes: Distinct primary colors
 *    - Sub-categories: Medium shades
 *    - Individual Managers: Light shades
 *
 * 2. BUDGET EXPENSE ALLOCATION:
 *    - Root: Dark gray
 *    - Revenue Classes: Distinct colors by revenue type
 *    - Funds: Medium tones
 *    - Functions: Distinct colors by government function
 *    - Revenue Sources: Light default (many individual sources)
 */

// Main asset class colors
const ASSET_CLASS_COLORS = {
  // System root
  'NYC_Pensions': '#111827',              // Gray 900 (root)

  // Pension funds: Gray gradient
  'NYCERS': '#374151',                    // Gray 700
  'TRS': '#6b7280',                       // Gray 500
  'POLICE': '#d1d5db',                    // Gray 300
  'FIRE': '#f3f4f6',                      // Gray 100
  'BERS': '#9ca3af',                      // Gray 400

  // Asset buckets
  'Public Equity': '#1e3a8a',             // Blue 900
  'Fixed Income - Core': '#064e3b',       // Emerald 900
  'Fixed Income - Opportunistic': '#047857', // Emerald 700
  'Alternatives': '#4c1d95',              // Violet 900
  'Cash': '#78716c',                      // Stone 500

  // Public equity sub-assets: Blue gradient
  'Domestic Equity': '#1d4ed8',           // Blue 700
  'World ex-USA Equity': '#3b82f6',       // Blue 500
  'Emerging Markets Equity': '#60a5fa',   // Blue 400
  'International Equity FoF': '#93c5fd',  // Blue 300
  'Global Equity': '#dbeafe',             // Blue 100

  // Fixed income sub-assets: Emerald/Green gradient
  'Structured/Core Bonds': '#059669',     // Emerald 600
  'High Yield': '#10b981',                // Emerald 500
  'Bank Loans': '#34d399',                // Emerald 400
  'Core FI - Developing Managers': '#6ee7b7', // Emerald 300
  'TIPS': '#a7f3d0',                      // Emerald 200
  'Other Fixed Income': '#d1fae5',        // Emerald 100
  'Opportunistic Fixed Income': '#10b981', // Emerald 500

  // Alternatives sub-assets: Violet gradient
  'Hedge Funds': '#7c3aed',               // Violet 600
  'Private Equity': '#8b5cf6',            // Violet 500
  'Private Real Estate': '#a78bfa',       // Violet 400
  'Infrastructure': '#c4b5fd',            // Violet 300

  // Cash sub-asset
  'Cash Sub-Asset': '#a8a29e',            // Stone 400

  // === BUDGET SANKEY COLORS ===

  // System root (budget)
  'NYC_Finances': '#111827',              // Gray 900 (root)

  // Revenue Classes: Distinct colors for each major revenue category
  'Taxes': '#dc2626',                     // Red 600 (largest revenue source)
  'Intergovernmental Aid': '#2563eb',     // Blue 600
  'Charges & Fees': '#059669',            // Emerald 600
  'Other Revenues': '#71717a',            // Zinc 500

  // Budget Funds: Medium tones
  'City Funds': '#ea580c',                // Orange 600
  'Federal Funds': '#3b82f6',             // Blue 500
  'State Funds': '#8b5cf6',               // Violet 500
  'Other Funds': '#6b7280',               // Gray 500

  // Government Functions: Distinct colors
  'Education': '#b91c1c',                 // Red 700 (largest function)
  'Public Safety': '#1e40af',             // Blue 800
  'Health': '#047857',                    // Emerald 700
  'Social Services': '#7c3aed',           // Violet 600
  'Transportation': '#d97706',            // Amber 600
  'Environmental Protection': '#16a34a',  // Green 600
  'Housing': '#ea580c',                   // Orange 600
  'Cultural & Recreation': '#db2777',     // Pink 600
  'General Government': '#475569',        // Slate 600
  'Community Development': '#7c2d12',     // Orange 900
} as const;

// Default color for unlabeled nodes (pension managers, budget revenue sources)
const DEFAULT_NODE_COLOR = '#e5e7eb';      // Gray 200 (light neutral for many individual items)

/**
 * Get color for a node by name
 * Falls back to light gray for unknown nodes (pension managers, budget revenue sources)
 */
export function getNodeColor(nodeName: string): string {
  // Check if it's a defined node in our color map
  if (nodeName in ASSET_CLASS_COLORS) {
    return ASSET_CLASS_COLORS[nodeName as keyof typeof ASSET_CLASS_COLORS];
  }

  // All other nodes get the default color (pension managers, budget revenue sources)
  return DEFAULT_NODE_COLOR;
}

/**
 * Get color for a link based on its source node
 * Links inherit the color of their source
 */
export function getLinkColor(sourceNodeName: string): string {
  return getNodeColor(sourceNodeName);
}

/**
 * Create a gradient ID for a link between two nodes
 * Used for SVG gradient definitions
 */
export function getGradientId(sourceNodeName: string, targetNodeName: string): string {
  // Create a stable, URL-safe ID
  const cleanSource = sourceNodeName.replace(/[^a-zA-Z0-9]/g, '_');
  const cleanTarget = targetNodeName.replace(/[^a-zA-Z0-9]/g, '_');
  return `gradient_${cleanSource}_to_${cleanTarget}`;
}

/**
 * Get gradient colors for a link (from source color to target color)
 */
export function getGradientColors(sourceNodeName: string, targetNodeName: string): {
  startColor: string;
  endColor: string;
} {
  return {
    startColor: getNodeColor(sourceNodeName),
    endColor: getNodeColor(targetNodeName),
  };
}
