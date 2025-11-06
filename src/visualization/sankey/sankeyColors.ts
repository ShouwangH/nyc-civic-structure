// ABOUTME: Color scheme for NYC pension Sankey diagram
// ABOUTME: Maps node names to colors based on asset class hierarchy

/**
 * Color scheme for pension fund allocation visualization
 * Organized by hierarchy level:
 * - Root/Pension Funds: Neutral grays
 * - Asset Classes: Distinct primary colors
 * - Sub-categories: Medium shades
 * - Individual Managers: Light shades
 */

// Main asset class colors
const ASSET_CLASS_COLORS = {
  // Public Equities family: Blue gradient (900 down by 200)
  'Public Equities': '#1e3a8a',           // Blue 900
  'US Large Cap': '#1d4ed8',              // Blue 700
  'US Small/Mid Cap': '#3b82f6',          // Blue 500
  'Developed ex-US': '#93c5fd',           // Blue 300
  'Emerging Markets': '#dbeafe',          // Blue 100

  // Fixed Income family: Emerald gradient (900 down by 200)
  'Fixed Income': '#064e3b',              // Emerald 900
  'Core Fixed Income': '#047857',         // Emerald 700
  'High Yield / Loans': '#10b981',        // Emerald 500
  'Alternative Credit': '#6ee7b7',        // Emerald 300

  // Private Markets family: Violet gradient (900 down by 200)
  'Private Markets': '#4c1d95',           // Violet 900
  'Private Equity': '#6d28d9',            // Violet 700
  'Real Estate': '#8b5cf6',               // Violet 500
  'Infrastructure': '#c4b5fd',            // Violet 300
  'Alternatives': '#ede9fe',              // Violet 100

  // Root and pension funds: Gray gradient (900 down by 200)
  'NYC Pension System': '#111827',        // Gray 900 (root)
  'NYCERS': '#374151',                    // Gray 700
  'TRS': '#6b7280',                       // Gray 500
  'Police': '#d1d5db',                    // Gray 300
  'Fire': '#f3f4f6',                      // Gray 100
  'BERS': '#9ca3af',                      // Gray 400
} as const;

// Individual managers inherit lightest shade from their parent category
const MANAGER_COLOR = '#e0d5ff';           // Very light violet (for all managers)

/**
 * Get color for a node by name
 * Falls back to light gray for unknown nodes
 */
export function getNodeColor(nodeName: string): string {
  // Check if it's a defined asset class or pension fund
  if (nodeName in ASSET_CLASS_COLORS) {
    return ASSET_CLASS_COLORS[nodeName as keyof typeof ASSET_CLASS_COLORS];
  }

  // All other nodes (individual managers) get the manager color
  return MANAGER_COLOR;
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
