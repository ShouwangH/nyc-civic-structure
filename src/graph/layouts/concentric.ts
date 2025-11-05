// ABOUTME: Concentric layout algorithm for hierarchical graph visualization
// ABOUTME: Calculates node levels using bidirectional BFS from anchor node

import type { LayoutOptions, NodeSingular } from 'cytoscape';
import type { SubviewDefinition } from '../../data/types';

/**
 * Calculate concentric levels based on hierarchical graph traversal from anchor
 * Uses directional BFS: going down hierarchy (-1 level), going up hierarchy (+1 level)
 */
export function calculateConcentricLevels(
  nodes: string[],
  edges: SubviewDefinition['edges'],
  anchorNodeId: string
): Map<string, number> {
  const levels = new Map<string, number>();
  const BASE_LEVEL = 100;

  // Build directional adjacency lists
  const children = new Map<string, Set<string>>();
  const parents = new Map<string, Set<string>>();

  nodes.forEach(nodeId => {
    children.set(nodeId, new Set());
    parents.set(nodeId, new Set());
  });

  edges.forEach(edge => {
    children.get(edge.source)?.add(edge.target);
    parents.get(edge.target)?.add(edge.source);
  });

  // Directional BFS from anchor
  const queue: Array<{ nodeId: string; level: number }> = [
    { nodeId: anchorNodeId, level: BASE_LEVEL }
  ];
  const visited = new Set<string>();
  visited.add(anchorNodeId);
  levels.set(anchorNodeId, BASE_LEVEL);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentLevel = current.level;

    // Traverse to children (DOWN hierarchy: level - 1)
    const childNodes = children.get(current.nodeId) || new Set();
    childNodes.forEach(childId => {
      if (!visited.has(childId)) {
        visited.add(childId);
        const childLevel = currentLevel - 1;
        levels.set(childId, childLevel);
        queue.push({ nodeId: childId, level: childLevel });
      }
    });

    // Traverse to parents (UP hierarchy: level + 1)
    const parentNodes = parents.get(current.nodeId) || new Set();
    parentNodes.forEach(parentId => {
      if (!visited.has(parentId)) {
        visited.add(parentId);
        const parentLevel = currentLevel + 1;
        levels.set(parentId, parentLevel);
        queue.push({ nodeId: parentId, level: parentLevel });
      }
    });
  }

  // Handle disconnected nodes (assign lowest level)
  nodes.forEach(nodeId => {
    if (!levels.has(nodeId)) {
      levels.set(nodeId, 1);
    }
  });

  return levels;
}

/**
 * Creates concentric layout with hierarchical level calculation
 */
export function createConcentricLayout(
  subview: SubviewDefinition,
  anchorNodeId: string,
  baseOptions: Record<string, unknown>
): LayoutOptions {
  const nodeLevels = calculateConcentricLevels(subview.nodes, subview.edges, anchorNodeId);

  return {
    ...baseOptions,
    name: 'concentric',
    concentric: (node: NodeSingular): number => {
      const nodeId = node.id();
      const level = nodeLevels.get(nodeId) ?? 1;
      return level;
    },
    levelWidth: () => 1,
  } as LayoutOptions;
}
