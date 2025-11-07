// ABOUTME: Sankey diagram visualization component
// ABOUTME: Renders Sankey diagram with tooltip support

import { useState } from 'react';
import { SankeyDiagram } from '../visualization/sankey/SankeyDiagram';
import { SankeyTooltip } from '../visualization/sankey/SankeyTooltip';
import type { SankeyData, SankeyNode, SankeyLink } from '../visualization/sankey/types';

type SankeyOverlayProps = {
  data: SankeyData;
  width: number;
  height: number;
};

export function SankeyOverlay({ data, width, height }: SankeyOverlayProps) {
  const [hoveredNode, setHoveredNode] = useState<SankeyNode | null>(null);
  const [hoveredLink, setHoveredLink] = useState<SankeyLink | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Handle mouse move for tooltips
  const handleMouseMove = (event: React.MouseEvent) => {
    setTooltipPosition({
      x: event.clientX,
      y: event.clientY,
    });
  };

  return (
    <div className="w-full h-full" onMouseMove={handleMouseMove}>
      <SankeyDiagram
        data={data}
        width={width}
        height={height}
        onNodeHover={(node) => setHoveredNode(node)}
        onLinkHover={(link) => setHoveredLink(link)}
      />

      {/* Tooltip */}
      {(hoveredNode || hoveredLink) && (
        <SankeyTooltip
          node={hoveredNode}
          link={hoveredLink}
          position={tooltipPosition}
          units={data.units}
        />
      )}
    </div>
  );
}
