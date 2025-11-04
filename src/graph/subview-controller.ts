// ABOUTME: Unified subview controller that adapts SubviewDefinition to existing controllers
// ABOUTME: Routes workflow types to ProcessController, other types to SubgraphController

import type { Core } from 'cytoscape';
import type { SubviewDefinition } from '../data/types';
import type { GraphConfig, GraphNodeInfo, GraphEdgeInfo } from './types';
import type { MainLayoutOptions } from './layout';
import { createProcessController, type ProcessController } from './process-controller';
import { createSubgraphController, type SubgraphController } from './subgraph-controller';

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
  const { cy, runMainGraphLayout, nodeInfosById, edgeInfosById } = deps;

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
      const subgraphConfig = convertToSubgraphConfig(subview);
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
function convertToSubgraphConfig(subview: SubviewDefinition): {
  meta: { id: string; entryNodeId: string };
  graph: GraphConfig;
} {
  // Get entry node (anchor)
  const entryNodeId = subview.anchor?.nodeId || subview.anchor?.nodeIds?.[0] || subview.nodes[0];

  // Convert to Cytoscape element definitions
  const nodeElements = subview.nodes.map(nodeId => ({
    group: 'nodes' as const,
    data: { id: nodeId },
  }));

  const edgeElements = subview.edges.map((edge, index) => ({
    group: 'edges' as const,
    data: {
      id: `${subview.id}_edge_${index}`,
      source: edge.source,
      target: edge.target,
      label: edge.label || '',
      relation: edge.relation,
    },
  }));

  // Convert layout config
  const layoutOptions = convertLayoutConfig(subview.layout);

  return {
    meta: {
      id: subview.id,
      entryNodeId,
    },
    graph: {
      nodes: [],  // SubgraphController will fetch from main graph
      edges: [],
      elements: [...nodeElements, ...edgeElements],
      layout: layoutOptions,
      nodesHavePreset: false,
    },
  };
}

/**
 * Converts SubviewLayoutConfig to Cytoscape LayoutOptions
 */
function convertLayoutConfig(layoutConfig: SubviewDefinition['layout']): any {
  const baseOptions = {
    animate: layoutConfig.animate ?? true,
    fit: layoutConfig.fit ?? true,
    padding: layoutConfig.padding ?? 80,
  };

  switch (layoutConfig.type) {
    case 'concentric':
      return {
        ...baseOptions,
        name: 'concentric',
        concentric: (node: any) => {
          const centerOn = layoutConfig.options?.centerOn;
          return node.id() === centerOn ? 2 : 1;
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
