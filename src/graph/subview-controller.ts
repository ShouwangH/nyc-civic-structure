// ABOUTME: Unified subview controller that adapts SubviewDefinition to existing controllers
// ABOUTME: Routes workflow types to ProcessController, other types to SubgraphController

import type { Core } from 'cytoscape';
import type { SubviewDefinition } from '../data/types';
import type { GraphConfig, GraphNodeInfo, GraphEdgeInfo } from './types';
import type { MainLayoutOptions } from './layout';
import { createProcessController } from './process-controller';
import { createSubgraphController } from './subgraph-controller';

/**
 * Unified subview controller interface
 * Handles all subview types (workflow, intra, inter, cross-jurisdictional)
 */
export type SubviewController = {
  activate: (subview: SubviewDefinition) => Promise<void>;
  deactivate: () => Promise<void>;
  isActive: (id?: string) => boolean;
  getActiveId: () => string | null;
};

type SubviewControllerDeps = {
  cy: Core;
  runMainGraphLayout: (options?: MainLayoutOptions) => Promise<void>;
  nodeInfosById: Map<string, GraphNodeInfo>;
  edgeInfosById: Map<string, GraphEdgeInfo>;
};

/**
 * Creates unified subview controller
 *
 * Pattern: Adapter - provides unified API while delegating to existing controllers
 * - workflow type → ProcessController (ephemeral nodes, dimmed styling)
 * - other types → SubgraphController (permanent nodes, faded/hidden styling)
 */
export const createSubviewController = (deps: SubviewControllerDeps): SubviewController => {
  const { cy, runMainGraphLayout, nodeInfosById } = deps;

  // Create underlying controllers
  const processController = createProcessController({ cy, runMainGraphLayout });
  const subgraphController = createSubgraphController({ cy, runMainGraphLayout });

  let activeSubview: { id: string; type: string } | null = null;

  const activate = async (subview: SubviewDefinition): Promise<void> => {
    // Check if already active
    if (activeSubview?.id === subview.id) {
      return;
    }

    // Deactivate current if any
    await deactivate();

    // Route based on type
    if (subview.type === 'workflow') {
      // Convert to ProcessDefinition and use ProcessController
      const processDefinition = convertToProcessDefinition(subview);
      const nodeInfos = processDefinition.nodes.map(
        (id) => nodeInfosById.get(id) ?? createPlaceholderNode(id)
      );
      const edgeInfos = processDefinition.edges.map((edge, index) => ({
        id: `${processDefinition.id}_edge_${index}`,
        source: edge.source,
        target: edge.target,
        label: '',
        type: 'process',
        process: [processDefinition.id],
      }));

      await processController.show(processDefinition, nodeInfos, edgeInfos);
    } else {
      // Convert to SubgraphConfig and use SubgraphController
      const subgraphConfig = convertToSubgraphConfig(subview, nodeInfosById);

      await subgraphController.activate(subgraphConfig.graph, {
        id: subgraphConfig.meta.id,
        entryNodeId: subgraphConfig.meta.entryNodeId,
      });
    }

    // Store active state
    activeSubview = {
      id: subview.id,
      type: subview.type,
    };
  };

  const deactivate = async (): Promise<void> => {
    if (!activeSubview) {
      return;
    }

    // Clear appropriate controller
    if (activeSubview.type === 'workflow') {
      await processController.clear();
    } else {
      await subgraphController.restore();
    }

    activeSubview = null;
  };

  const isActive = (id?: string): boolean => {
    if (!activeSubview) {
      return false;
    }
    return id ? activeSubview.id === id : true;
  };

  const getActiveId = (): string | null => {
    return activeSubview?.id ?? null;
  };

  return {
    activate,
    deactivate,
    isActive,
    getActiveId,
  };
};

/**
 * Converts SubviewDefinition to ProcessDefinition format
 * Used for workflow-type subviews
 */
function convertToProcessDefinition(subview: SubviewDefinition) {
  return {
    id: subview.id,
    label: subview.label,
    description: subview.description || '',
    nodes: subview.nodes,
    edges: subview.edges.map(edge => ({
      source: edge.source,
      target: edge.target,
    })),
    steps: subview.metadata?.steps,
  };
}

/**
 * Converts SubviewDefinition to SubgraphConfig format
 * Used for intra/inter/cross-jurisdictional subviews
 */
function convertToSubgraphConfig(
  subview: SubviewDefinition,
  nodeInfosById: Map<string, GraphNodeInfo>
): {
  meta: { id: string; entryNodeId: string };
  graph: GraphConfig;
} {
  // Get entry node (anchor)
  const entryNodeId = subview.anchor?.nodeId || subview.anchor?.nodeIds?.[0] || subview.nodes[0];

  // Build node data from nodeInfosById
  const nodeData: GraphNodeInfo[] = subview.nodes
    .map(nodeId => nodeInfosById.get(nodeId))
    .filter((node): node is GraphNodeInfo => node !== undefined);

  // Build edge data from subview edges
  const edgeData: GraphEdgeInfo[] = subview.edges.map((edge, index) => ({
    id: edge.label || `${subview.id}_edge_${index}`,
    source: edge.source,
    target: edge.target,
    label: edge.label || '',
    relation: edge.relation,
    detail: edge.detail,
    type: 'structural' as const,
    process: [],
  }));

  // Convert to Cytoscape element definitions
  const nodeElements = subview.nodes.map(nodeId => ({
    group: 'nodes' as const,
    data: { id: nodeId },
  }));

  const edgeElements = subview.edges.map((edge, index) => ({
    group: 'edges' as const,
    data: {
      id: edge.label || `${subview.id}_edge_${index}`,
      source: edge.source,
      target: edge.target,
      label: edge.label || '',
      relation: edge.relation,
    },
  }));

  // Convert layout config
  const layoutOptions = convertLayoutConfig(subview.layout, subview);

  return {
    meta: {
      id: subview.id,
      entryNodeId,
    },
    graph: {
      nodes: nodeData,  // Actual node data for SubgraphController
      edges: edgeData,  // Actual edge data for SubgraphController
      elements: [...nodeElements, ...edgeElements],
      layout: layoutOptions,
      nodesHavePreset: false,
    },
  };
}

/**
 * Calculate concentric levels based on hierarchical graph traversal from anchor
 * Uses directional BFS: going down hierarchy (-1 level), going up hierarchy (+1 level)
 */
function calculateConcentricLevels(
  nodes: string[],
  edges: SubviewDefinition['edges'],
  anchorNodeId: string
): Map<string, number> {
  const levels = new Map<string, number>();
  const BASE_LEVEL = 100;

  // Build directional adjacency lists
  // children: nodes we point to (going DOWN hierarchy, level decreases)
  // parents: nodes that point to us (going UP hierarchy, level increases)
  const children = new Map<string, Set<string>>();
  const parents = new Map<string, Set<string>>();

  nodes.forEach(nodeId => {
    children.set(nodeId, new Set());
    parents.set(nodeId, new Set());
  });

  edges.forEach(edge => {
    // source -> target: target is a child of source
    children.get(edge.source)?.add(edge.target);
    // target has source as parent
    parents.get(edge.target)?.add(edge.source);
  });

  console.log('[Layout] Building hierarchical concentric levels from anchor:', {
    anchorNodeId,
    totalNodes: nodes.length,
    totalEdges: edges.length,
    childrenSize: children.size,
    parentsSize: parents.size
  });

  // Directional BFS from anchor
  const queue: Array<{ nodeId: string; level: number; direction: 'down' | 'up' | 'anchor' }> = [
    { nodeId: anchorNodeId, level: BASE_LEVEL, direction: 'anchor' }
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
        queue.push({ nodeId: childId, level: childLevel, direction: 'down' });

        console.log('[Layout] Assigned level (going DOWN):', {
          from: current.nodeId,
          to: childId,
          fromLevel: currentLevel,
          toLevel: childLevel,
          direction: 'down'
        });
      }
    });

    // Traverse to parents (UP hierarchy: level + 1)
    const parentNodes = parents.get(current.nodeId) || new Set();
    parentNodes.forEach(parentId => {
      if (!visited.has(parentId)) {
        visited.add(parentId);
        const parentLevel = currentLevel + 1;
        levels.set(parentId, parentLevel);
        queue.push({ nodeId: parentId, level: parentLevel, direction: 'up' });

        console.log('[Layout] Assigned level (going UP):', {
          from: current.nodeId,
          to: parentId,
          fromLevel: currentLevel,
          toLevel: parentLevel,
          direction: 'up'
        });
      }
    });
  }

  // Handle disconnected nodes (assign lowest level)
  nodes.forEach(nodeId => {
    if (!levels.has(nodeId)) {
      console.log('[Layout] Disconnected node, assigning level 1:', nodeId);
      levels.set(nodeId, 1);
    }
  });

  return levels;
}

/**
 * Converts SubviewLayoutConfig to Cytoscape LayoutOptions
 */
function convertLayoutConfig(
  layoutConfig: SubviewDefinition['layout'],
  subview: SubviewDefinition
): any {
  const baseOptions = {
    animate: layoutConfig.animate ?? true,
    fit: layoutConfig.fit ?? true,
    padding: layoutConfig.padding ?? 80,
  };

  switch (layoutConfig.type) {
    case 'concentric':
      const centerOn = layoutConfig.options?.centerOn;
      const anchorNodeId = centerOn || subview.anchor?.nodeId || subview.nodes[0];

      console.log('[Layout] Concentric layout config:', {
        centerOn,
        anchorNodeId,
        hasOptions: !!layoutConfig.options,
        allOptions: layoutConfig.options
      });

      // Calculate levels based on graph structure
      const nodeLevels = calculateConcentricLevels(subview.nodes, subview.edges, anchorNodeId);

      return {
        ...baseOptions,
        name: 'concentric',
        concentric: (node: any) => {
          const nodeId = node.id();
          const level = nodeLevels.get(nodeId) ?? 1;
          console.log('[Layout] Concentric level lookup:', {
            nodeId,
            level
          });
          return level;
        },
        levelWidth: () => 1,
      };

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
      };

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
      };

    case 'elk-radial':
      return {
        ...baseOptions,
        name: 'elk',
        elk: {
          algorithm: 'radial',
          ...layoutConfig.options,
        },
      };

    default:
      return {
        ...baseOptions,
        name: 'preset',
      };
  }
}

/**
 * Creates placeholder node for missing nodes in workflows
 * (Processes may reference nodes that don't exist yet)
 */
function createPlaceholderNode(id: string): GraphNodeInfo {
  console.warn('[SubviewController] Creating placeholder for missing node:', id);
  return {
    id,
    label: id.split(':')[1] || id,
    branch: 'unknown',
    type: 'placeholder',
    process: [],
    factoid: '',
    branchColor: '#cccccc',
    system: '',
    width: 120,
    height: 60,
  };
}
