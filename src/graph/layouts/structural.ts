// ABOUTME: Structural layout configuration for non-workflow subviews
// ABOUTME: Orchestrates different layout algorithms (concentric, elk-mrtree, elk-layered, elk-radial)

import type { Core, LayoutOptions, NodeSingular, Position } from 'cytoscape';
import type { SubviewDefinition } from '../../data/types';
import { ANIMATION_DURATION, ANIMATION_EASING } from '../animation';
import { createConcentricLayout } from './concentric';

/**
 * Creates layout options for structural subviews (non-workflow)
 * Uses SubviewDefinition.layout config, positioned relative to entry node
 */
export function createStructuralLayoutOptions(
  subview: SubviewDefinition,
  cy: Core
): LayoutOptions {
  const layoutConfig = subview.layout;
  const entryNodeId = subview.anchor?.nodeId || subview.anchor?.nodeIds?.[0] || subview.nodes[0];
  const entryNode = cy.getElementById(entryNodeId);
  const entryPos = entryNode.length > 0 ? entryNode.position() : { x: 0, y: 0 };

  const baseOptions = {
    animate: layoutConfig.animate ?? true,
    animationDuration: ANIMATION_DURATION,
    animationEasing: ANIMATION_EASING,
    fit: layoutConfig.fit ?? true,
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
          x: pos.x + entryPos.x,
          y: pos.y + entryPos.y,
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
          x: pos.x + entryPos.x,
          y: pos.y + entryPos.y,
        }),
      } as LayoutOptions;

    case 'elk-radial':
      return {
        ...baseOptions,
        name: 'elk',
        elk: {
          algorithm: 'radial',
          ...layoutConfig.options,
        },
        transform: (_node: NodeSingular, pos: Position): Position => ({
          x: pos.x + entryPos.x,
          y: pos.y + entryPos.y,
        }),
      } as LayoutOptions;

    default:
      return {
        ...baseOptions,
        name: 'preset',
      };
  }
}
