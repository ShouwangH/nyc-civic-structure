// ABOUTME: Modal overlay wrapper for sunburst diagram visualization
// ABOUTME: Provides full-screen display with header, close button, and tooltip integration

import { useState } from 'react';
import type { SubviewDefinition } from '../data/types';
import type { SunburstData } from '../visualization/sunburst/types';
import { SunburstDiagram } from '../visualization/sunburst/SunburstDiagram';
import { SunburstTooltip } from '../visualization/sunburst/SunburstTooltip';
import type { HierarchyRectangularNode } from 'd3-hierarchy';
import type { SunburstNode } from '../visualization/sunburst/types';

type SunburstOverlayProps = {
  subview: SubviewDefinition;
  data: SunburstData;
  onClose: () => void;
  controlPanelWidth: number;
};

export function SunburstOverlay({ subview, data, onClose, controlPanelWidth }: SunburstOverlayProps) {
  const [hoveredNode, setHoveredNode] = useState<HierarchyRectangularNode<SunburstNode> | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const handleNodeHover = (node: HierarchyRectangularNode<SunburstNode> | null, event?: React.MouseEvent) => {
    setHoveredNode(node);
    if (event) {
      setTooltipPosition({ x: event.clientX, y: event.clientY });
    }
  };

  const width = window.innerWidth * 0.9 - controlPanelWidth;
  const height = window.innerHeight * 0.9;

  const totalValue = data.data.value || 0;

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
        style={{ left: `${controlPanelWidth}px` }}
      />
      <div
        className="fixed bg-white rounded-lg shadow-2xl z-50 flex flex-col"
        style={{
          left: `${controlPanelWidth + window.innerWidth * 0.05}px`,
          top: '5vh',
          width: `${width}px`,
          height: `${height}px`
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{subview.label || 'Revenue Breakdown'}</h2>
            <div className="text-sm text-gray-600 mt-1">
              {data.meta.source} | Total: ${data.meta.total_revenue_billion}B
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Sunburst */}
        <div className="flex-1 flex items-center justify-center p-8 overflow-hidden">
          <SunburstDiagram
            data={data}
            width={Math.min(width - 64, height - 120)}
            height={Math.min(width - 64, height - 120)}
            onNodeHover={handleNodeHover}
          />
        </div>

        {/* Instructions */}
        <div className="px-4 pb-4 text-sm text-gray-500 text-center">
          Click on a segment to zoom in. Click the center or same segment to zoom out.
        </div>
      </div>

      {/* Tooltip */}
      <SunburstTooltip
        node={hoveredNode}
        position={tooltipPosition}
        totalValue={totalValue}
      />
    </>
  );
}
