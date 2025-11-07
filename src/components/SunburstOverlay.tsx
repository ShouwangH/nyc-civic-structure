// ABOUTME: Sunburst diagram visualization component
// ABOUTME: Renders sunburst diagram with tooltip support

import { useState } from 'react';
import type { SunburstData } from '../visualization/sunburst/types';
import { SunburstDiagram } from '../visualization/sunburst/SunburstDiagram';
import { SunburstTooltip } from '../visualization/sunburst/SunburstTooltip';
import type { HierarchyRectangularNode } from 'd3-hierarchy';
import type { SunburstNode } from '../visualization/sunburst/types';

type SunburstOverlayProps = {
  data: SunburstData;
  width: number;
  height: number;
};

export function SunburstOverlay({ data, width, height }: SunburstOverlayProps) {
  const [hoveredNode, setHoveredNode] = useState<HierarchyRectangularNode<SunburstNode> | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const handleNodeHover = (node: HierarchyRectangularNode<SunburstNode> | null, event?: React.MouseEvent) => {
    setHoveredNode(node);
    if (event) {
      setTooltipPosition({ x: event.clientX, y: event.clientY });
    }
  };

  const totalValue = data.data.value || 0;

  return (
    <div className="w-full h-full flex items-center justify-center">
      <SunburstDiagram
        data={data}
        width={Math.min(width, height)}
        height={Math.min(width, height)}
        onNodeHover={handleNodeHover}
      />

      {/* Tooltip */}
      <SunburstTooltip
        node={hoveredNode}
        position={tooltipPosition}
        totalValue={totalValue}
      />
    </div>
  );
}
