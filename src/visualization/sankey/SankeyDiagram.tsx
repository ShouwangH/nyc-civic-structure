// ABOUTME: Core Sankey diagram component using d3-sankey for layout
// ABOUTME: Renders NYC pension fund allocation as an interactive SVG visualization

import { useMemo, useState } from 'react';
import {
  sankey as d3Sankey,
  sankeyLinkHorizontal,
  sankeyJustify,
} from 'd3-sankey';
import type { SankeyData, SankeyNode, SankeyLink } from './types';
import {
  getNodeColor,
  getGradientId,
  getGradientColors,
} from './sankeyColors';

type SankeyDiagramProps = {
  data: SankeyData;
  width: number;
  height: number;
  onNodeHover?: (node: SankeyNode | null) => void;
  onLinkHover?: (link: SankeyLink | null) => void;
};

const NODE_WIDTH = 15;
const NODE_PADDING = 8;
const PADDING = 60; // Padding around the diagram

export function SankeyDiagram({
  data,
  width,
  height,
  onNodeHover,
  onLinkHover,
}: SankeyDiagramProps) {
  const [hoveredNodeId, setHoveredNodeId] = useState<number | null>(null);
  const [hoveredLinkId, setHoveredLinkId] = useState<string | null>(null);

  // Compute Sankey layout using d3-sankey
  const { nodes, links, gradients } = useMemo(() => {
    // Create sankey layout generator (using any to avoid d3-sankey generic complexity)
    const sankeyGenerator = d3Sankey<any, any>()
      .nodeWidth(NODE_WIDTH)
      .nodePadding(NODE_PADDING)
      .extent([
        [PADDING, PADDING],
        [width - PADDING, height - PADDING],
      ])
      .nodeId((d: any) => d.name)
      .nodeAlign(sankeyJustify);

    // Compute layout
    const graph = sankeyGenerator({
      nodes: data.nodes.map(d => ({ ...d })) as any,
      links: data.links.map(d => ({ ...d })) as any,
    }) as { nodes: SankeyNode[]; links: SankeyLink[] };

    // Generate gradient definitions for links
    const gradientDefs = graph.links.map((link) => {
      const sourceNode = link.source as SankeyNode;
      const targetNode = link.target as SankeyNode;
      const gradientId = getGradientId(sourceNode.name, targetNode.name);
      const { startColor, endColor } = getGradientColors(sourceNode.name, targetNode.name);

      return {
        id: gradientId,
        startColor,
        endColor,
      };
    });

    return {
      nodes: graph.nodes,
      links: graph.links,
      gradients: gradientDefs,
    };
  }, [data, width, height]);

  // Create path generator for links
  const linkPath = sankeyLinkHorizontal();

  // Handle node hover
  const handleNodeMouseEnter = (node: SankeyNode) => {
    setHoveredNodeId(node.index ?? null);
    onNodeHover?.(node);
  };

  const handleNodeMouseLeave = () => {
    setHoveredNodeId(null);
    onNodeHover?.(null);
  };

  // Handle link hover
  const handleLinkMouseEnter = (link: SankeyLink) => {
    const sourceNode = link.source as SankeyNode;
    const targetNode = link.target as SankeyNode;
    const linkId = `${sourceNode.name}-${targetNode.name}`;
    setHoveredLinkId(linkId);
    onLinkHover?.(link);
  };

  const handleLinkMouseLeave = () => {
    setHoveredLinkId(null);
    onLinkHover?.(null);
  };

  return (
    <svg
      width={width}
      height={height}
      style={{ backgroundColor: '#fafafa' }}
    >
      {/* Define gradients for links */}
      <defs>
        {gradients.map((gradient) => (
          <linearGradient
            key={gradient.id}
            id={gradient.id}
            gradientUnits="userSpaceOnUse"
            x1="0%"
            x2="100%"
          >
            <stop offset="0%" stopColor={gradient.startColor} stopOpacity={0.5} />
            <stop offset="100%" stopColor={gradient.endColor} stopOpacity={0.5} />
          </linearGradient>
        ))}
      </defs>

      {/* Render links */}
      <g className="links">
        {links.map((link, i) => {
          const sourceNode = link.source as SankeyNode;
          const targetNode = link.target as SankeyNode;
          const linkId = `${sourceNode.name}-${targetNode.name}`;
          const gradientId = getGradientId(sourceNode.name, targetNode.name);
          const isHovered = hoveredLinkId === linkId;

          return (
            <path
              key={`link-${i}`}
              d={linkPath(link) || undefined}
              fill="none"
              stroke={`url(#${gradientId})`}
              strokeWidth={Math.max(1, link.width ?? 0)}
              opacity={isHovered ? 1 : 0.6}
              style={{
                cursor: 'pointer',
                transition: 'opacity 0.2s ease',
              }}
              onMouseEnter={() => handleLinkMouseEnter(link)}
              onMouseLeave={handleLinkMouseLeave}
            />
          );
        })}
      </g>

      {/* Render nodes */}
      <g className="nodes">
        {nodes.map((node, i) => {
          const isHovered = hoveredNodeId === node.index;
          const nodeColor = getNodeColor(node.name);

          // Calculate dynamic font size based on node height
          const nodeHeight = node.y1! - node.y0!;
          const minFontSize = 10;
          const maxFontSize = 30;
          const minHeight = 20;  // Minimum node height for smallest font
          const maxHeight = 100; // Node height for largest font

          // Linear interpolation between min and max font sizes
          const fontSize = Math.max(
            minFontSize,
            Math.min(
              maxFontSize,
              minFontSize + ((nodeHeight - minHeight) / (maxHeight - minHeight)) * (maxFontSize - minFontSize)
            )
          );

          return (
            <g key={`node-${i}`}>
              {/* Node rectangle */}
              <rect
                x={node.x0}
                y={node.y0}
                width={node.x1! - node.x0!}
                height={node.y1! - node.y0!}
                fill={nodeColor}
                opacity={isHovered ? 1 : 0.8}
                rx={2}
                style={{
                  cursor: 'pointer',
                  transition: 'opacity 0.2s ease',
                }}
                onMouseEnter={() => handleNodeMouseEnter(node)}
                onMouseLeave={handleNodeMouseLeave}
              />

              {/* Node label */}
              <text
                x={node.x0! < width / 2 ? node.x1! + 6 : node.x0! - 6}
                y={(node.y0! + node.y1!) / 2}
                dy="0.35em"
                textAnchor={node.x0! < width / 2 ? 'start' : 'end'}
                fontSize={fontSize}
                fontFamily="SF Pro Display, sans-serif"
                fill="#374151"
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                {node.name}
              </text>

              {/* Value label (show on hover or for important nodes) */}
              {isHovered && node.value && (
                <text
                  x={node.x0! < width / 2 ? node.x1! + 6 : node.x0! - 6}
                  y={(node.y0! + node.y1!) / 2 + Math.max(12, fontSize * 0.6)}
                  dy="0.35em"
                  textAnchor={node.x0! < width / 2 ? 'start' : 'end'}
                  fontSize={Math.max(8, fontSize * 0.6)}
                  fontFamily="SF Pro Display, sans-serif"
                  fill="#6b7280"
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  ${node.value.toFixed(1)}B
                </text>
              )}
            </g>
          );
        })}
      </g>
    </svg>
  );
}
