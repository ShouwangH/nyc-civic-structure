// ABOUTME: Zoomable sunburst diagram component for hierarchical revenue data
// ABOUTME: Implements radial partition layout with click-to-zoom interaction using d3-hierarchy

import { useEffect, useRef } from 'react';
import { hierarchy, partition } from 'd3-hierarchy';
import type { HierarchyRectangularNode } from 'd3-hierarchy';
import { scaleOrdinal } from 'd3-scale';
import { schemeCategory10 } from 'd3-scale-chromatic';
import { arc as d3Arc } from 'd3-shape';
import { select } from 'd3-selection';
import { transition } from 'd3-transition';
import { interpolate } from 'd3-interpolate';
import type { SunburstData, SunburstNode } from './types';

// Register transition with d3-selection
select.prototype.transition = transition;

type SunburstDiagramProps = {
  data: SunburstData;
  width: number;
  height: number;
  onNodeHover?: (node: HierarchyRectangularNode<SunburstNode> | null, event?: React.MouseEvent) => void;
};

type ArcCoords = {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
};

type NodeWithCurrent = HierarchyRectangularNode<SunburstNode> & {
  current?: ArcCoords;
  target?: ArcCoords;
};

export function SunburstDiagram({ data, width, height, onNodeHover }: SunburstDiagramProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  const radius = Math.min(width, height) / 2;

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = select(svgRef.current);
    let g = svg.select('g.sunburst-container');

    // Clear any existing content
    g.selectAll('*').remove();

    // Create hierarchy and partition layout
    const hierarchyRoot = hierarchy<SunburstNode>(data.data)
      .sum((d: SunburstNode) => d.value || 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    // Partition - size is [angular span (2π), radial depth]
    const root = partition<SunburstNode>()
      .size([2 * Math.PI, hierarchyRoot.height + 1])(hierarchyRoot) as NodeWithCurrent;

    // Track current focus
    let currentFocus: NodeWithCurrent = root;

    // Initialize current coordinates relative to root focus
    root.each((d: NodeWithCurrent) => {
      d.current = {
        x0: Math.max(0, Math.min(1, (d.x0 - root.x0) / (root.x1 - root.x0))) * 2 * Math.PI,
        x1: Math.max(0, Math.min(1, (d.x1 - root.x0) / (root.x1 - root.x0))) * 2 * Math.PI,
        y0: Math.max(0, d.y0 - root.depth),
        y1: Math.max(0, d.y1 - root.depth)
      };
    });

    // Color scale
    const color = scaleOrdinal<string>(schemeCategory10);

    // Arc generator - normalize to visible depth range (3 levels)
    // After zoom, coordinates are remapped so focused node is at y0=0
    // We show 3 levels: focused (0-1), children (1-2), grandchildren (2-3)
    const arcGenerator = d3Arc<ArcCoords>()
      .startAngle(d => d.x0)
      .endAngle(d => d.x1)
      .padAngle(0.001)
      .padRadius(radius)
      .innerRadius(d => d.y0 * radius / 3)
      .outerRadius(d => Math.max(d.y0 * radius / 3, d.y1 * radius / 3 - 1));

    // Determine fill color for a node - color by level 1 ancestor (first child of root)
    const getColor = (node: NodeWithCurrent): string => {
      if (node.depth === 0) return '#f3f4f6';
      // Walk up to depth 1 (first level children)
      let current: NodeWithCurrent = node;
      while (current.depth > 1 && current.parent) current = current.parent as NodeWithCurrent;
      return color(current.data.name);
    };

    // Check if label should be visible (arc is large enough)
    const labelVisible = (d: ArcCoords): boolean => {
      const angularSize = d.x1 - d.x0;
      const radialSize = d.y1 - d.y0;
      return angularSize > 0.1 && radialSize > 0;
    };

    // Calculate label position
    const labelTransform = (d: ArcCoords): string => {
      const x = ((d.x0 + d.x1) / 2) * 180 / Math.PI;
      const y = ((d.y0 + d.y1) / 2) * radius / 3;
      const rotate = x - 90;
      return `rotate(${rotate}) translate(${y},0) rotate(${rotate > 90 ? 180 : 0})`;
    };

    // Check if arc is visible - show 2 child levels (skip focused node itself)
    const arcVisible = (d: ArcCoords) => {
      return d.y1 <= 3 && d.y0 >= 1 && d.x1 > d.x0;
    };

    // Calculate opacity based on value relative to parent, bounded by parent's opacity
    const getOpacity = (node: NodeWithCurrent): number => {
      if (!node.parent) return 1;

      const parentValue = node.parent.value || 1;
      const nodeValue = node.value || 0;
      const ratio = nodeValue / parentValue;

      // Map ratio to opacity range: 0.4 (small) to 1.0 (large)
      const baseOpacity = 0.4 + (ratio * 0.6);

      // Get parent's opacity and ensure child never exceeds it
      const parentOpacity = getOpacity(node.parent as NodeWithCurrent);
      return Math.min(baseOpacity, parentOpacity);
    };

    // Update center circle to track current focus
    const updateCenterCircle = (focusNode: NodeWithCurrent) => {
      const innerRadius = radius / hierarchyRoot.height;
      g.selectAll('circle.center-circle')
        .data([focusNode])
        .join('circle')
        .attr('class', 'center-circle')
        .attr('r', innerRadius)
        .attr('fill', 'white')
        .attr('pointer-events', 'all')
        .style('cursor', 'pointer')
        .on('click', clicked as any);
    };

    // Click handler - recalculates coordinates and transitions
    const clicked = (_event: MouseEvent, p: NodeWithCurrent) => {
      console.log('=== Sunburst Click Debug ===');
      console.log('Clicked node:', p.data.name, 'depth:', p.depth);
      console.log('Current focus:', currentFocus.data.name, 'depth:', currentFocus.depth);

      // Calculate depth below this node
      const maxDepthBelow = (node: NodeWithCurrent): number => {
        if (!node.children || node.children.length === 0) return 0;
        return 1 + Math.max(...(node.children as NodeWithCurrent[]).map(maxDepthBelow));
      };

      const depthBelow = maxDepthBelow(p);
      console.log('Depth below clicked node:', depthBelow);
      console.log('Has children:', !!p.children, 'count:', p.children?.length || 0);

      // Only allow zoom in if node has at least 1 level below it (has children)
      // If clicking the same node, zoom out to parent
      if (currentFocus === p) {
        console.log('Decision: Zoom out (clicked current focus)');
        // Zoom out to parent
        currentFocus = (p.parent as NodeWithCurrent) || root;
      } else if (depthBelow < 1 || !p.children || p.children.length === 0) {
        console.log('Decision: Zoom out (no children / leaf node)');
        // Leaf node or no depth below - treat as zoom out click on parent
        currentFocus = (p.parent as NodeWithCurrent) || root;
      } else {
        console.log('Decision: Zoom in (has children)');
        // Has children - zoom in
        currentFocus = p;
      }

      console.log('New focus:', currentFocus.data.name, 'depth:', currentFocus.depth);

      // Update focused label and center circle
      svg.select('.center-label').text(currentFocus.data.name);
      updateCenterCircle(currentFocus);

      // Calculate target coordinates for all nodes relative to clicked node
      root.each((d: NodeWithCurrent) => {
        d.target = {
          x0: Math.max(0, Math.min(1, (d.x0 - currentFocus.x0) / (currentFocus.x1 - currentFocus.x0))) * 2 * Math.PI,
          x1: Math.max(0, Math.min(1, (d.x1 - currentFocus.x0) / (currentFocus.x1 - currentFocus.x0))) * 2 * Math.PI,
          y0: Math.max(0, d.y0 - currentFocus.depth),
          y1: Math.max(0, d.y1 - currentFocus.depth)
        };
      });

      // Transition all paths
      const t = svg.transition().duration(750);

      g.selectAll<SVGPathElement, NodeWithCurrent>('path')
        .transition(t as any)
        .tween('data', (d: NodeWithCurrent) => {
          const i = interpolate(d.current!, d.target!);
          return (t: number) => {
            d.current = i(t);
          };
        })
        .attrTween('d', (d: NodeWithCurrent) => {
          return () => arcGenerator(d.current!) || '';
        })
        .attr('fill-opacity', (d: NodeWithCurrent) => {
          const visible = arcVisible(d.target!);
          return visible ? getOpacity(d) : 0;
        })
        .attr('pointer-events', (d: NodeWithCurrent) =>
          arcVisible(d.target!) ? 'auto' : 'none'
        );

      // Transition labels
      g.selectAll<SVGTextElement, NodeWithCurrent>('text')
        .transition(t as any)
        .attrTween('transform', (d: NodeWithCurrent) => {
          return () => labelTransform(d.current!);
        })
        .attr('fill-opacity', (d: NodeWithCurrent) => {
          const visible = arcVisible(d.target!) && labelVisible(d.target!);
          return visible ? 0.9 : 0;
        })
        .tween('text', function(d: NodeWithCurrent) {
          return function() {
            const name = d.data.name;
            const angularSize = (d.current!.x1 - d.current!.x0) * 180 / Math.PI;
            const radialMidpoint = (d.current!.y0 + d.current!.y1) / 2;
            const radialFactor = Math.max(0.3, radialMidpoint / 3);
            const maxChars = Math.floor(angularSize * radialFactor / 3);
            select(this).text(name.length > maxChars ? name.substring(0, Math.max(1, maxChars - 1)) + '…' : name);
          };
        });
    };

    // Initial render - include all descendants (no slice)
    const paths = g.selectAll<SVGPathElement, NodeWithCurrent>('path')
      .data(root.descendants())
      .join('path')
      .attr('fill', (d: NodeWithCurrent) => getColor(d))
      .attr('fill-opacity', (d: NodeWithCurrent) => {
        const visible = arcVisible(d.current!);
        return visible ? getOpacity(d) : 0;
      })
      .attr('pointer-events', (d: NodeWithCurrent) =>
        arcVisible(d.current!) ? 'auto' : 'none'
      )
      .attr('d', (d: NodeWithCurrent) => {
        const path = arcGenerator(d.current!);
        return path || '';
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)
      .style('cursor', 'pointer')
      .on('click', clicked as any)
      .on('mouseover', function(event: MouseEvent, d: NodeWithCurrent) {
        if (arcVisible(d.current!)) {
          // Highlight on hover by increasing opacity
          const currentOpacity = parseFloat(select(this).attr('fill-opacity')) || 0;
          select(this)
            .attr('data-original-opacity', currentOpacity)
            .attr('fill-opacity', Math.min(1, currentOpacity * 1.2));

          if (onNodeHover) {
            const mouseEvent = event as any as React.MouseEvent;
            onNodeHover(d, mouseEvent);
          }
        }
      })
      .on('mouseout', function(d: NodeWithCurrent) {
        // Restore original opacity
        const originalOpacity = parseFloat(select(this).attr('data-original-opacity')) || getOpacity(d);
        select(this)
          .attr('fill-opacity', originalOpacity);

        if (onNodeHover) {
          onNodeHover(null);
        }
      });

    // Add text labels with truncation based on both angular and radial size
    g.selectAll<SVGTextElement, NodeWithCurrent>('text')
      .data(root.descendants().slice(1))
      .join('text')
      .attr('transform', (d: NodeWithCurrent) => labelTransform(d.current!))
      .attr('dy', '0.35em')
      .attr('text-anchor', 'middle')
      .attr('fill', '#111827')
      .attr('fill-opacity', (d: NodeWithCurrent) => {
        const visible = arcVisible(d.current!) && labelVisible(d.current!);
        return visible ? 0.9 : 0;
      })
      .attr('pointer-events', 'none')
      .style('font-size', '10px')
      .style('font-weight', '500')
      .text((d: NodeWithCurrent) => {
        const name = d.data.name;
        // Calculate max chars based on arc angular size and radial position
        const angularSize = (d.current!.x1 - d.current!.x0) * 180 / Math.PI;
        const radialMidpoint = (d.current!.y0 + d.current!.y1) / 2;
        // Inner rings get more aggressive truncation
        const radialFactor = Math.max(0.3, radialMidpoint / 3);
        const maxChars = Math.floor(angularSize * radialFactor / 3);
        return name.length > maxChars ? name.substring(0, Math.max(1, maxChars - 1)) + '…' : name;
      });

    console.log('=== Sunburst Debug ===');
    console.log('Radius:', radius);
    console.log('Hierarchy height:', hierarchyRoot.height);
    console.log('Total nodes:', root.descendants().length);
    console.log('Rendered paths:', paths.size());

    const visibleNodes = root.descendants().filter(d => arcVisible(d as any));
    console.log('Visible paths:', visibleNodes.length);

    if (visibleNodes.length > 0) {
      const firstVisible = visibleNodes[0] as any;
      console.log('First visible node:', firstVisible.data.name);
      console.log('  y0:', firstVisible.y0, 'y1:', firstVisible.y1, 'depth:', firstVisible.depth);
      console.log('  x0:', firstVisible.x0, 'x1:', firstVisible.x1);
    }

    // Add center circle for clicking to zoom out (size of innermost ring)
    const innerRadius = radius / hierarchyRoot.height;
    g.selectAll('circle.center-circle')
      .data([root])
      .join('circle')
      .attr('class', 'center-circle')
      .attr('r', innerRadius)
      .attr('fill', 'white')
      .attr('pointer-events', 'all')
      .style('cursor', 'pointer')
      .on('click', clicked as any);

    // Initialize center label
    svg.select('.center-label').text(root.data.name);

  }, [data, width, height, radius]);

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      viewBox={`${-width / 2} ${-height / 2} ${width} ${height}`}
      style={{ maxWidth: '100%', height: 'auto', background: '#fafafa' }}
    >
      {/* Debug: outer boundary */}
      <circle cx="0" cy="0" r={radius * 0.95} fill="none" stroke="#ddd" strokeWidth="1" strokeDasharray="4" />

      <g className="sunburst-container">
        {/* Paths will be added by d3 */}
      </g>

      <text
        className="center-label"
        textAnchor="middle"
        dy="0.35em"
        style={{
          fontSize: '1.2rem',
          fontWeight: 600,
          fill: '#111827',
          pointerEvents: 'none'
        }}
      />
    </svg>
  );
}
