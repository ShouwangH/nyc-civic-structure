// ABOUTME: Tooltip component for Sankey diagram hover interactions
// ABOUTME: Displays detailed value information for nodes and links

import type { SankeyNode, SankeyLink } from './types';

type SankeyTooltipProps = {
  node?: SankeyNode | null;
  link?: SankeyLink | null;
  position: { x: number; y: number };
  units?: string;  // Units from the data file (e.g., "USD", "USD (millions)")
};

/**
 * Format value based on units from the data file
 * - "USD (millions)" or "millions": value is already in millions, show as billions
 * - "USD" or default: value is in dollars, convert to appropriate scale
 */
function formatValue(value: number, units?: string): string {
  // Check if units indicate the value is already in millions
  const isMillions = units?.toLowerCase().includes('million');

  if (isMillions) {
    // Value is in millions, convert to billions
    const billions = value / 1000;
    if (billions >= 1) {
      return `$${billions.toFixed(1)}B`;
    } else {
      return `$${value.toFixed(0)}M`;
    }
  } else {
    // Value is in raw dollars, convert to appropriate scale
    const billions = value / 1_000_000_000;
    const millions = value / 1_000_000;

    if (billions >= 1) {
      return `$${billions.toFixed(1)}B`;
    } else if (millions >= 1) {
      return `$${millions.toFixed(0)}M`;
    } else {
      return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
    }
  }
}

/**
 * Calculate tooltip position to avoid going off-screen
 */
function getTooltipStyle(x: number, y: number, width: number, height: number) {
  const OFFSET = 12;
  const TOOLTIP_WIDTH = 200; // Approximate
  const TOOLTIP_HEIGHT = 80; // Approximate

  let left = x + OFFSET;
  let top = y + OFFSET;

  // Prevent going off right edge
  if (left + TOOLTIP_WIDTH > width) {
    left = x - TOOLTIP_WIDTH - OFFSET;
  }

  // Prevent going off bottom edge
  if (top + TOOLTIP_HEIGHT > height) {
    top = y - TOOLTIP_HEIGHT - OFFSET;
  }

  return { left, top };
}

export function SankeyTooltip({ node, link, position, units }: SankeyTooltipProps) {
  // Don't render if neither node nor link is provided
  if (!node && !link) {
    return null;
  }

  const { left, top } = getTooltipStyle(position.x, position.y, window.innerWidth, window.innerHeight);

  // Render node tooltip
  if (node) {
    return (
      <div
        className="fixed z-50 pointer-events-none"
        style={{
          left: `${left}px`,
          top: `${top}px`,
        }}
      >
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-3 min-w-[160px]">
          <div className="text-sm font-medium text-gray-900 mb-1">
            {node.label}
          </div>
          {node.value !== undefined && (
            <div className="text-xs text-gray-600">
              Total: <span className="font-semibold">{formatValue(node.value, units)}</span>
            </div>
          )}
          {node.sourceLinks && node.sourceLinks.length > 0 && (
            <div className="text-xs text-gray-500 mt-1">
              {node.sourceLinks.length} outgoing flow{node.sourceLinks.length > 1 ? 's' : ''}
            </div>
          )}
          {node.targetLinks && node.targetLinks.length > 0 && (
            <div className="text-xs text-gray-500">
              {node.targetLinks.length} incoming flow{node.targetLinks.length > 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Render link tooltip
  if (link) {
    const sourceNode = link.source as SankeyNode;
    const targetNode = link.target as SankeyNode;

    return (
      <div
        className="fixed z-50 pointer-events-none"
        style={{
          left: `${left}px`,
          top: `${top}px`,
        }}
      >
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-3 min-w-[180px]">
          <div className="text-xs text-gray-600 mb-2">
            <div className="font-medium text-gray-900">{sourceNode.label}</div>
            <div className="text-gray-400 my-1">↓</div>
            <div className="font-medium text-gray-900">{targetNode.label}</div>
          </div>
          <div className="text-sm font-semibold text-gray-900 mt-2">
            {formatValue(link.value, units)}
          </div>
          {sourceNode.value && (
            <div className="text-xs text-gray-500 mt-1">
              {((link.value / sourceNode.value) * 100).toFixed(1)}% of {sourceNode.label}
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
