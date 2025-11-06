// ABOUTME: Layout configuration for all subviews (structural and workflow)
// ABOUTME: Orchestrates different layout algorithms (concentric, elk-mrtree, elk-layered)

import type { Core, LayoutOptions, NodeSingular, Position } from 'cytoscape';
import type { SubviewDefinition } from '../../data/types';
import { ANIMATION_DURATION, ANIMATION_EASING } from '../animation';
import { createConcentricLayout } from './concentric';

/**
 * Creates layout options for subviews by reading SubviewDefinition.layout config
 * Workflows: positioned relative to viewport center (anchor nodes may not exist yet)
 * Structural: positioned relative to entry node (anchor exists in main graph)
 */
export function createStructuralLayoutOptions(
  subview: SubviewDefinition,
  cy: Core,
  viewportCenter?: { x: number; y: number }
): LayoutOptions {
  const layoutConfig = subview.layout;

  // Determine entry node ID (needed for concentric layout)
  const entryNodeId = subview.anchor?.nodeId || subview.anchor?.nodeIds?.[0] || subview.nodes[0];

  // Determine positioning anchor for ELK layouts
  let anchorPos: { x: number; y: number };
  if (viewportCenter) {
    // Workflows: use viewport center (anchor node typically doesn't exist yet)
    anchorPos = viewportCenter;
  } else {
    // Structural: use entry node position (exists in main graph)
    const entryNode = cy.getElementById(entryNodeId);
    anchorPos = entryNode.length > 0 ? entryNode.position() : { x: 0, y: 0 };
  }

  const baseOptions = {
    animate: layoutConfig.animate ?? true,
    animationDuration: ANIMATION_DURATION,
    animationEasing: ANIMATION_EASING,
    fit: layoutConfig.fit ?? false,  // Don't auto-fit during layout - controller handles viewport
    padding: layoutConfig.padding ?? 80,
  };

  switch (layoutConfig.type) {
    case 'concentric':
      return createConcentricLayout(subview, entryNodeId, baseOptions);

    case 'elk-mrtree':
      return {
        ...baseOptions,
        name: 'elk',
        elk: {
          algorithm: 'mrtree',
          'elk.direction': layoutConfig.options?.direction || 'DOWN',
          'elk.spacing.nodeNode': layoutConfig.options?.spacing || 60,
          ...layoutConfig.options,
        },
        transform: (_node: NodeSingular, pos: Position): Position => ({
          x: pos.x + anchorPos.x,
          y: pos.y + anchorPos.y,
        }),
      } as LayoutOptions;

    case 'elk-layered':
      return {
        ...baseOptions,
        name: 'elk',
        elk: {
          algorithm: 'layered',
          'elk.direction': layoutConfig.options?.direction || 'RIGHT',
          'elk.spacing.nodeNode': layoutConfig.options?.spacing || 80,
          ...layoutConfig.options,
        },
        transform: (_node: NodeSingular, pos: Position): Position => ({
          x: pos.x + anchorPos.x,
          y: pos.y + anchorPos.y,
        }),
      } as LayoutOptions;

    default:
      return {
        ...baseOptions,
        name: 'preset',
      };
  }
}
