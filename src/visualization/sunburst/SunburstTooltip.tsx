// ABOUTME: Tooltip component for sunburst diagram displaying node information
// ABOUTME: Shows node name, value, and percentage of total revenue

import type { HierarchyRectangularNode } from 'd3-hierarchy';
import type { SunburstNode } from './types';

type SunburstTooltipProps = {
  node: HierarchyRectangularNode<SunburstNode> | null;
  position: { x: number; y: number };
  totalValue: number;
};

export function SunburstTooltip({ node, position }: SunburstTooltipProps) {
  if (!node) return null;

  const value = node.value || 0;
  const valueBillion = value / 1_000_000_000;

  return (
    <div
      className="absolute z-50 bg-gray-900 text-white px-3 py-2 rounded-md shadow-lg text-sm pointer-events-none"
      style={{
        left: `${position.x + 10}px`,
        top: `${position.y + 10}px`,
        maxWidth: '300px'
      }}
    >
      <div className="font-semibold mb-1">{node.data.name}</div>
      <div className="text-gray-300">
        ${valueBillion.toFixed(2)}B
      </div>
    </div>
  );
}
