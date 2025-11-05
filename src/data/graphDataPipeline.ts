import type { GovernmentScope, GovernmentDataset } from './datasets';
import type { SubviewDefinition } from './types';
import type { GraphConfig, GraphEdgeInfo, GraphNodeInfo } from '../graph/types';
import { buildMainGraph, buildGraphNode } from '../graph/data';
import { buildUnifiedDataset } from './unifiedDataset';
import { governmentDatasets } from './datasets';
import {
  buildNodeScopeIndex,
  buildNodesIndex,
  buildEdgesIndex,
  buildSubviewByAnchorId,
  buildSubviewById,
} from '../hooks/dataIndexHelpers';

export type GraphData = {
  // Core data
  dataset: GovernmentDataset;
  scopeNodeIds: Record<GovernmentScope, string[]>;
  mainGraph: GraphConfig;

  // Indexes
  indexes: {
    nodesById: Map<string, GraphNodeInfo>;
    edgesById: Map<string, GraphEdgeInfo>;
    nodeScopeIndex: Map<string, GovernmentScope>;
  };

  // Maps for quick lookups
  maps: {
    subviewByAnchorId: Map<string, SubviewDefinition>;
    subviewById: Map<string, SubviewDefinition>;
  };
};

/**
 * Pure function that builds all graph data, indexes, and maps.
 * This runs once at module initialization and contains no React dependencies.
 *
 * Data flow:
 *   1. Build unified dataset from all government scopes
 *   2. Build main graph from main-tier nodes
 *   3. Collect all subviews from all datasets
 *   4. Create node scope index
 *   5. Build all element indexes
 *   6. Build subview lookup maps
 */
export const buildGraphData = (): GraphData => {
  // Step 1: Build unified dataset
  const { dataset, scopeNodeIds } = buildUnifiedDataset();

  // Step 2: Filter to only main tier nodes (default view)
  const mainTierNodes = dataset.nodes.filter(node =>
    node.tier === 'main' || node.tier === undefined
  );

  const mainGraph = buildMainGraph(
    { meta: dataset.meta, nodes: mainTierNodes },
    { edges: dataset.edges }
  );

  // Step 3: Collect all subviews from all datasets (includes workflows)
  const allSubviews: SubviewDefinition[] = Object.values(governmentDatasets).flatMap(
    (dataset) => dataset.subviews ?? []
  );

  // Step 4: Build node scope index
  const nodeScopeIndex = buildNodeScopeIndex(scopeNodeIds);

  // Step 5: Build all indexes
  const allGraphNodes = dataset.nodes.map(buildGraphNode);
  const indexes = {
    nodesById: buildNodesIndex(mainGraph, allGraphNodes),
    edgesById: buildEdgesIndex(mainGraph),
    nodeScopeIndex,
  };

  // Step 6: Build subview lookup maps
  const maps = {
    subviewByAnchorId: buildSubviewByAnchorId(allSubviews),
    subviewById: buildSubviewById(allSubviews),
  };

  return {
    dataset,
    scopeNodeIds,
    mainGraph,
    indexes,
    maps,
  };
};

/**
 * Static graph data - computed once at module load.
 * Import this directly in components instead of using a hook.
 */
export const GRAPH_DATA = buildGraphData();
