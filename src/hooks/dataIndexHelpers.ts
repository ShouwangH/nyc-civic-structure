import type { GovernmentScope } from '../data/datasets';
import type { GraphConfig, GraphEdgeInfo, GraphNodeInfo } from '../graph/types';

/**
 * Builds an index mapping node IDs to their government scope
 */
export const buildNodeScopeIndex = (
  scopeNodeIds: Record<GovernmentScope, string[]>
): Map<string, GovernmentScope> => {
  const map = new Map<string, GovernmentScope>();
  (Object.entries(scopeNodeIds) as Array<[GovernmentScope, string[]]>).forEach(([scope, ids]) => {
    ids.forEach((id) => {
      if (!map.has(id)) {
        map.set(id, scope);
      }
    });
  });
  return map;
};

/**
 * Builds an index of all nodes (dataset nodes + main graph)
 */
export const buildNodesIndex = (
  mainGraph: GraphConfig,
  allNodes: GraphNodeInfo[]
): Map<string, GraphNodeInfo> => {
  const map = new Map<string, GraphNodeInfo>();

  // Index ALL nodes from the dataset first (includes intra-tier nodes)
  allNodes.forEach((node) => map.set(node.id, node));

  // Override with mainGraph versions (may have layout-specific properties)
  mainGraph.nodes.forEach((node) => map.set(node.id, node));

  return map;
};

/**
 * Builds an index of all edges from main graph
 */
export const buildEdgesIndex = (
  mainGraph: GraphConfig
): Map<string, GraphEdgeInfo> => {
  const map = new Map<string, GraphEdgeInfo>();

  mainGraph.edges.forEach((edge) => map.set(edge.id, edge));

  return map;
};

/**
 * Builds an index mapping subview anchor node IDs to their definition
 */
export const buildSubviewByAnchorId = (
  subviews: import('../data/types').SubviewDefinition[]
): Map<string, import('../data/types').SubviewDefinition> => {
  const map = new Map<string, import('../data/types').SubviewDefinition>();
  subviews.forEach((subview) => {
    // Exclude workflow-type subviews from anchor map
    // Workflows (processes) should only be activated via ControlsPanel, not node clicks
    if (subview.type !== 'workflow' && subview.anchor?.nodeId) {
      map.set(subview.anchor.nodeId, subview);
    }
  });
  return map;
};

/**
 * Builds an index mapping subview IDs to their definition
 */
export const buildSubviewById = (
  subviews: import('../data/types').SubviewDefinition[]
): Map<string, import('../data/types').SubviewDefinition> => {
  const map = new Map<string, import('../data/types').SubviewDefinition>();
  subviews.forEach((subview) => {
    map.set(subview.id, subview);
  });
  return map;
};
