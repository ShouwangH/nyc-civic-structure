import type { GovernmentScope } from '../data/datasets';
import type { GraphConfig, GraphEdgeInfo, GraphNodeInfo } from '../graph/types';
import type { SubgraphConfig } from '../graph/subgraphs';

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
 * Builds an index mapping subgraph IDs and entry node IDs to their scope
 */
export const buildSubgraphScopeIndex = (
  scopedSubgraphs: Array<{ config: SubgraphConfig; scope: GovernmentScope | null }>
): Map<string, GovernmentScope | null> => {
  const map = new Map<string, GovernmentScope | null>();
  scopedSubgraphs.forEach(({ config, scope }) => {
    map.set(config.meta.id, scope);
    map.set(config.meta.entryNodeId, scope);
  });
  return map;
};

/**
 * Builds an index mapping subgraph entry node IDs to their config
 */
export const buildSubgraphByEntryId = (
  subgraphConfigs: SubgraphConfig[]
): Map<string, SubgraphConfig> => {
  // Temporarily hide overwhelming category views (will be accessible via sidebar in future)
  const hiddenSubviewIds = new Set([
    'city:departments',
    'state:state_agencies',
    'state:state_judiciary',
    'federal:federal_agencies',
  ]);

  const map = new Map<string, SubgraphConfig>();
  subgraphConfigs.forEach((config) => {
    if (!hiddenSubviewIds.has(config.meta.id)) {
      map.set(config.meta.entryNodeId, config);
    }
  });
  return map;
};

/**
 * Builds an index mapping subgraph IDs to their config
 */
export const buildSubgraphById = (
  subgraphConfigs: SubgraphConfig[]
): Map<string, SubgraphConfig> => {
  const map = new Map<string, SubgraphConfig>();
  subgraphConfigs.forEach((config) => {
    map.set(config.meta.id, config);
  });
  return map;
};

/**
 * Builds an index of all nodes (main graph + subgraphs)
 */
export const buildNodesIndex = (
  mainGraph: GraphConfig,
  subgraphConfigs: SubgraphConfig[]
): Map<string, GraphNodeInfo> => {
  const map = new Map<string, GraphNodeInfo>();

  mainGraph.nodes.forEach((node) => map.set(node.id, node));

  subgraphConfigs.forEach((config) => {
    config.graph.nodes.forEach((node) => {
      if (!map.has(node.id)) {
        map.set(node.id, node);
      }
    });
  });

  return map;
};

/**
 * Builds an index of all edges (main graph + subgraphs)
 */
export const buildEdgesIndex = (
  mainGraph: GraphConfig,
  subgraphConfigs: SubgraphConfig[]
): Map<string, GraphEdgeInfo> => {
  const map = new Map<string, GraphEdgeInfo>();

  mainGraph.edges.forEach((edge) => map.set(edge.id, edge));

  subgraphConfigs.forEach((config) => {
    config.graph.edges.forEach((edge) => {
      if (!map.has(edge.id)) {
        map.set(edge.id, edge);
      }
    });
  });

  return map;
};
