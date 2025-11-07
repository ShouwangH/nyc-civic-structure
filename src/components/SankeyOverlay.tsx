// ABOUTME: Modal overlay wrapper for Sankey diagram visualization
// ABOUTME: Displays pension allocation data with header, close button, and tooltip support

import { useState } from 'react';
import { SankeyDiagram } from '../visualization/sankey/SankeyDiagram';
import { SankeyTooltip } from '../visualization/sankey/SankeyTooltip';
import type { SankeyData, SankeyNode, SankeyLink } from '../visualization/sankey/types';
import type { SubviewDefinition } from '../data/types';

type SankeyOverlayProps = {
  subview: SubviewDefinition;
  data: SankeyData;
  onClose: () => void;
  controlPanelWidth?: number; // Width of control panel to offset the overlay
};

export function SankeyOverlay({
  subview,
  data,
  onClose,
  controlPanelWidth = 0,
}: SankeyOverlayProps) {
  const [hoveredNode, setHoveredNode] = useState<SankeyNode | null>(null);
  const [hoveredLink, setHoveredLink] = useState<SankeyLink | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Calculate overlay dimensions (90% of viewport minus control panel)
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const overlayWidth = (viewportWidth - controlPanelWidth) * 0.9;
  const overlayHeight = viewportHeight * 0.9;

  // Handle mouse move for tooltips
  const handleMouseMove = (event: React.MouseEvent) => {
    setTooltipPosition({
      x: event.clientX,
      y: event.clientY,
    });
  };

  // Handle backdrop click to close
  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleBackdropClick}
      onMouseMove={handleMouseMove}
    >
      {/* Main panel */}
      <div
        className="bg-white rounded-lg shadow-2xl flex flex-col overflow-hidden"
        style={{
          width: `${overlayWidth}px`,
          height: `${overlayHeight}px`,
          maxWidth: '95vw',
          maxHeight: '95vh',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {subview.label}
            </h2>
            {data.meta?.source && (
              <p className="text-sm text-gray-600 mt-1">
                Data: {data.meta.source}
              </p>
            )}
            {data.meta?.total_aum_billion && (
              <p className="text-xs text-gray-500 mt-0.5">
                Total AUM: ${data.meta.total_aum_billion.toFixed(1)}B
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-md hover:bg-gray-100"
            aria-label="Close overlay"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Sankey diagram */}
        <div className="flex-1 overflow-hidden">
          <SankeyDiagram
            data={data}
            width={overlayWidth}
            height={overlayHeight - 100} // Subtract header height
            onNodeHover={(node) => setHoveredNode(node)}
            onLinkHover={(link) => setHoveredLink(link)}
          />
        </div>
      </div>

      {/* Tooltip */}
      {(hoveredNode || hoveredLink) && (
        <SankeyTooltip
          node={hoveredNode}
          link={hoveredLink}
          position={tooltipPosition}
        />
      )}
    </div>
  );
}
