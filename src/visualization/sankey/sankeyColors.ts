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
  // Public Equities family: Blues
  'Public Equities': '#3b82f6',           // Blue 500
  'US Large Cap': '#60a5fa',              // Blue 400
  'US Small/Mid Cap': '#93c5fd',          // Blue 300
  'Developed ex-US': '#60a5fa',           // Blue 400
  'Emerging Markets': '#93c5fd',          // Blue 300

  // Fixed Income family: Greens
  'Fixed Income': '#10b981',              // Emerald 500
  'Core Fixed Income': '#34d399',         // Emerald 400
  'High Yield / Loans': '#6ee7b7',        // Emerald 300
  'Alternative Credit': '#6ee7b7',        // Emerald 300

  // Private Markets family: Purples
  'Private Markets': '#8b5cf6',           // Violet 500
  'Private Equity': '#a78bfa',            // Violet 400
  'Real Estate': '#c4b5fd',               // Violet 300
  'Infrastructure': '#c4b5fd',            // Violet 300
  'Alternatives': '#a78bfa',              // Violet 400

  // Root and pension funds: Grays
  'NYC Pension System': '#6b7280',        // Gray 500
  'NYCERS': '#9ca3af',                    // Gray 400
  'TRS': '#9ca3af',                       // Gray 400
  'Police': '#9ca3af',                    // Gray 400
  'Fire': '#9ca3af',                      // Gray 400
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
