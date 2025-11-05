// ABOUTME: Unified subview controller handling all subview types
// ABOUTME: Manages activation, styling, layout, and cleanup for workflow and structural views

import type { Core, LayoutOptions, NodeSingular, Position } from 'cytoscape';
import type { SubviewDefinition, SubviewType } from '../data/types';
import type { GraphNodeInfo, GraphEdgeInfo } from './types';
import type { MainLayoutOptions } from './layout';
import {
  copyPosition,
  getViewportMetrics,
  createProcessLayoutOptions,
} from './layout';
import { ANIMATION_DURATION, ANIMATION_EASING } from './animation';
import { applyProcessHighlightClasses, resetHighlightClasses } from './styles-application';

/**
 * Unified subview controller interface
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
 * Active subview state
 * Tracks what was added and what was affected during activation
 */
type ActiveSubviewState = {
  id: string;
  type: SubviewType;
  addedNodeIds: Set<string>;
  addedEdgeIds: Set<string>;
  affectedNodeIds: Set<string>;
  affectedEdgeIds: Set<string>;
};

/**
 * Creates unified subview controller
 * Handles all subview types (workflow, intra, inter, cross-jurisdictional)
 */
export const createSubviewController = (deps: SubviewControllerDeps): SubviewController => {
  const { cy, runMainGraphLayout, nodeInfosById } = deps;

  let activeSubview: ActiveSubviewState | null = null;
  let transitionInProgress = false;

  const isActive = (id?: string): boolean => {
    if (!activeSubview) {
      return false;
    }
    return id ? activeSubview.id === id : true;
  };

  const getActiveId = (): string | null => {
    return activeSubview?.id ?? null;
  };

  const activate = async (subview: SubviewDefinition): Promise<void> => {
    // Guard: check transition lock
    if (transitionInProgress) {
      return;
    }

    // Guard: check duplicate activation
    if (activeSubview?.id === subview.id) {
      return;
    }

    // Deactivate current if any
    if (activeSubview) {
      await deactivate();
    }

    transitionInProgress = true;

    const addedNodeIds = new Set<string>();
    const addedEdgeIds = new Set<string>();

    // Build node infos from subview node IDs
    const nodeInfos: GraphNodeInfo[] = subview.nodes
      .map(nodeId => nodeInfosById.get(nodeId) ?? createPlaceholderNode(nodeId))
      .filter(Boolean);

    // Build edge infos from subview edges
    const edgeInfos: GraphEdgeInfo[] = subview.edges.map((edge, index) => ({
      id: edge.label || `${subview.id}_edge_${index}`,
      source: edge.source,
      target: edge.target,
      label: edge.label || '',
      relation: edge.relation,
      detail: edge.detail,
      type: subview.type === 'workflow' ? 'process' : 'structural',
      process: subview.type === 'workflow' ? [subview.id] : [],
    }));

    const nodeIdSet = new Set(nodeInfos.map(node => node.id));
    const edgeIdSet = new Set(edgeInfos.map(edge => edge.id));

    // For workflows: get viewport center for initial positioning
    const { centerX, centerY } = subview.type === 'workflow'
      ? getViewportMetrics(cy)
      : { centerX: 0, centerY: 0 };

    // Add nodes and edges to cytoscape
    cy.batch(() => {
      nodeInfos.forEach(nodeInfo => {
        const existing = cy.getElementById(nodeInfo.id);
        if (existing.length > 0) {
          return;
        }

        const added = cy.add({
          group: 'nodes',
          data: nodeInfo,
          ...(subview.type === 'workflow' && { position: { x: centerX, y: centerY } }),
        });
        addedNodeIds.add(nodeInfo.id);
        added.removeData('orgPos');
        added.removeScratch('_positions');
        added.unlock();
      });

      edgeInfos.forEach(edgeInfo => {
        const existing = cy.getElementById(edgeInfo.id);
        if (existing.length > 0) {
          return;
        }

        cy.add({
          group: 'edges',
          data: edgeInfo,
        });
        addedEdgeIds.add(edgeInfo.id);
      });
    });

    // Collect cytoscape elements
    const subviewNodes = cy.nodes().filter(node => nodeIdSet.has(node.id()));
    const subviewEdges = cy.collection();
    edgeInfos.forEach(edge => {
      const cyEdge = cy.getElementById(edge.id);
      if (cyEdge && cyEdge.length > 0) {
        subviewEdges.merge(cyEdge);
      }
    });

    // Apply CSS classes based on subview type
    if (subview.type === 'workflow') {
      // Workflow: dimmed background, active process elements
      applyProcessHighlightClasses(cy, nodeIdSet, edgeIdSet);
    } else {
      // Structural: highlighted subview, faded/hidden background
      const otherNodes = cy.nodes().not(subviewNodes);
      const otherEdges = cy.edges().not(subviewEdges);

      cy.batch(() => {
        cy.elements().removeClass('highlighted faded hidden dimmed');
        subviewNodes.addClass('highlighted');
        subviewEdges.addClass('highlighted');
        otherNodes.addClass('faded');
        otherEdges.addClass('hidden');
      });
    }

    // Run layout
    const layoutOptions = subview.type === 'workflow'
      ? createProcessLayoutOptions(centerX, centerY, ANIMATION_DURATION, ANIMATION_EASING)
      : createStructuralLayoutOptions(subview, cy);

    const layoutElements = subviewNodes.union(subviewEdges);
    const layout = layoutElements.layout(layoutOptions);
    const layoutPromise = layout.promiseOn('layoutstop');
    layout.run();
    await layoutPromise;

    // Fit viewport to new elements
    const fitPadding = subview.type === 'workflow' ? 140 : 200;
    if (subviewNodes.length > 0) {
      await cy
        .animation({
          fit: {
            eles: subviewNodes,
            padding: fitPadding,
          },
          duration: ANIMATION_DURATION,
          easing: ANIMATION_EASING,
        })
        .play()
        .promise()
        .catch(() => {});
    }

    // Store active state
    activeSubview = {
      id: subview.id,
      type: subview.type,
      addedNodeIds,
      addedEdgeIds,
      affectedNodeIds: nodeIdSet,
      affectedEdgeIds: edgeIdSet,
    };

    transitionInProgress = false;
  };

  const deactivate = async (): Promise<void> => {
    const currentSubview = activeSubview;
    if (!currentSubview || transitionInProgress) {
      return;
    }

    transitionInProgress = true;

    // Remove CSS classes
    if (currentSubview.type === 'workflow') {
      cy.batch(() => {
        cy.nodes().removeClass('process-active dimmed');
        cy.edges().removeClass('process-active-edge dimmed');
      });
    } else {
      resetHighlightClasses(cy);
    }

    // Remove added elements
    cy.batch(() => {
      const edgesToRemove = cy.collection();
      currentSubview.addedEdgeIds.forEach(id => {
        const edge = cy.getElementById(id);
        if (edge.length > 0) {
          edgesToRemove.merge(edge);
        }
      });
      edgesToRemove.remove();

      const nodesToRemove = cy.collection();
      currentSubview.addedNodeIds.forEach(id => {
        const node = cy.getElementById(id);
        if (node.length > 0) {
          nodesToRemove.merge(node);
        }
      });
      nodesToRemove.remove();
    });

    // Restore original positions
    cy.nodes().forEach(node => {
      const orgPos = node.data('orgPos');
      if (orgPos) {
        node.position(copyPosition(orgPos));
      }
    });

    // Re-run main layout
    const fitPadding = currentSubview.type === 'workflow' ? 220 : 200;
    await runMainGraphLayout({ animateFit: true, fitPadding });

    // Clear state
    activeSubview = null;
    transitionInProgress = false;
  };

  return {
    activate,
    deactivate,
    isActive,
    getActiveId,
  };
};

/**
 * Creates layout options for structural subviews (non-workflow)
 * Uses SubviewDefinition.layout config, positioned relative to entry node
 */
function createStructuralLayoutOptions(subview: SubviewDefinition, cy: Core): LayoutOptions {
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

  // Clone and transform layout config
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

/**
 * Creates concentric layout with hierarchical level calculation
 */
function createConcentricLayout(
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
 * Creates placeholder node for missing nodes in workflows
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
