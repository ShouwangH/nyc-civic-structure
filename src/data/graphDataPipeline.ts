import type { GovernmentScope, GovernmentDataset } from './datasets';
import type { ProcessDefinition, SubviewDefinition } from './types';
import type { GraphConfig, GraphEdgeInfo, GraphNodeInfo } from '../graph/types';
import type { SubgraphConfig } from '../graph/subgraphs';
import { buildMainGraph, buildSubgraphGraph, buildGraphNode } from '../graph/data';
import { buildUnifiedDataset } from './unifiedDataset';
import { governmentDatasets } from './datasets';
import { buildSubviewConfigs } from '../graph/subviews';
import {
  buildNodeScopeIndex,
  buildSubgraphScopeIndex,
  buildSubgraphByEntryId,
  buildSubgraphById,
  buildNodesIndex,
  buildEdgesIndex,
  buildSubviewByAnchorId,
  buildSubviewById,
} from '../hooks/dataIndexHelpers';

type ScopedSubgraphConfig = {
  config: SubgraphConfig;
  scope: GovernmentScope | null;
};

export type GraphData = {
  // Core data
  dataset: GovernmentDataset;
  scopeNodeIds: Record<GovernmentScope, string[]>;
  mainGraph: GraphConfig;
  allProcesses: ProcessDefinition[];

  // Processes organized by scope
  processesByScope: Record<GovernmentScope, ProcessDefinition[]>;

  // Subgraph configurations
  subgraphConfigs: SubgraphConfig[];
  scopedSubgraphConfigs: ScopedSubgraphConfig[];

  // Indexes
  indexes: {
    nodesById: Map<string, GraphNodeInfo>;
    edgesById: Map<string, GraphEdgeInfo>;
    nodeScopeIndex: Map<string, GovernmentScope>;
    subgraphScopeById: Map<string, GovernmentScope | null>;
  };

  // Maps for quick lookups
  maps: {
    subgraphByEntryId: Map<string, SubgraphConfig>;
    subgraphById: Map<string, SubgraphConfig>;
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
 *   2. Extract processes and build main graph
 *   3. Organize processes by scope
 *   4. Build subgraph configurations
 *   5. Create node scope index
 *   6. Associate subgraphs with scopes
 *   7. Build all element indexes
 *   8. Build subgraph lookup maps
 */
export const buildGraphData = (): GraphData => {
  // Step 1: Build unified dataset
  const { dataset, scopeNodeIds } = buildUnifiedDataset();

  // Step 2: Extract processes and build main graph
  const allProcesses = dataset.processes ?? [];

  // Filter to only main tier nodes (default view)
  const mainTierNodes = dataset.nodes.filter(node =>
    node.tier === 'main' || node.tier === undefined
  );

  const mainGraph = buildMainGraph(
    { meta: dataset.meta, nodes: mainTierNodes },
    { edges: dataset.edges }
  );

  // Step 3: Organize processes by scope (static reference)
  const processesByScope: Record<GovernmentScope, ProcessDefinition[]> = {
    federal: governmentDatasets.federal.processes,
    state: governmentDatasets.state.processes,
    city: governmentDatasets.city.processes,
  };

  // Step 4a: Collect all subviews from all datasets
  const allSubviews: SubviewDefinition[] = Object.values(governmentDatasets).flatMap(
    (dataset) => dataset.subviews ?? []
  );

  // Step 4b: Build subgraph configurations
  // Old format subgraphs (from subgraphs/ directory)
  const oldSubgraphConfigs: SubgraphConfig[] = (dataset.subgraphs ?? []).map((subgraph) => ({
    meta: subgraph,
    graph: buildSubgraphGraph(subgraph),
  }));

  // New format subviews (from intra JSON files)
  const subviewConfigs = buildSubviewConfigs(governmentDatasets);

  // Merge old and new configs
  const subgraphConfigs: SubgraphConfig[] = [...oldSubgraphConfigs, ...subviewConfigs];

  // Step 5: Build node scope index
  const nodeScopeIndex = buildNodeScopeIndex(scopeNodeIds);

  // Step 6: Associate subgraphs with their scopes
  const scopedSubgraphConfigs: ScopedSubgraphConfig[] = subgraphConfigs.map((config) => ({
    config,
    scope: nodeScopeIndex.get(config.meta.entryNodeId) ?? null,
  }));

  // Step 7: Build all indexes
  const allGraphNodes = dataset.nodes.map(buildGraphNode);
  const indexes = {
    nodesById: buildNodesIndex(mainGraph, subgraphConfigs, allGraphNodes),
    edgesById: buildEdgesIndex(mainGraph, subgraphConfigs),
    nodeScopeIndex,
    subgraphScopeById: buildSubgraphScopeIndex(scopedSubgraphConfigs),
  };

  // Step 8: Build subgraph and subview lookup maps
  const maps = {
    subgraphByEntryId: buildSubgraphByEntryId(subgraphConfigs),
    subgraphById: buildSubgraphById(subgraphConfigs),
    subviewByAnchorId: buildSubviewByAnchorId(allSubviews),
    subviewById: buildSubviewById(allSubviews),
  };

  // Test specific intra-tier nodes
  const testNodes = ['city:vendors', 'city:MOCS', 'city:city_council_member', 'federal:oira'];
  const nodeTests = testNodes.map(id => ({
    id,
    exists: indexes.nodesById.has(id),
    label: indexes.nodesById.get(id)?.label,
  }));

  console.log('[GraphData] Built graph data at module load', {
    totalSubviews: allSubviews.length,
    subviewByAnchorIdSize: maps.subviewByAnchorId.size,
    subviewByIdSize: maps.subviewById.size,
    subgraphConfigsCount: subgraphConfigs.length,
    nodeIndexSize: indexes.nodesById.size,
    mainGraphNodeCount: mainGraph.nodes.length,
    scopeNodeIds: {
      city: scopeNodeIds.city.length,
      state: scopeNodeIds.state.length,
      federal: scopeNodeIds.federal.length
    },
    testIntraNodes: nodeTests,
  });

  return {
    dataset,
    scopeNodeIds,
    mainGraph,
    allProcesses,
    processesByScope,
    subgraphConfigs,
    scopedSubgraphConfigs,
    indexes,
    maps,
  };
};

/**
 * Static graph data - computed once at module load.
 * Import this directly in components instead of using a hook.
 */
export const GRAPH_DATA = buildGraphData();
