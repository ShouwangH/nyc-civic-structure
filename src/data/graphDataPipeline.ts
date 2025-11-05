import type { GovernmentScope, GovernmentDataset } from './datasets';
import type { ProcessDefinition, SubviewDefinition } from './types';
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

/**
 * Converts a ProcessDefinition to a workflow-type SubviewDefinition
 * This enables processes to flow through the unified subview system
 */
function convertProcessToSubview(
  process: ProcessDefinition,
  jurisdiction: GovernmentScope
): SubviewDefinition {
  return {
    id: process.id,
    label: process.label,
    description: process.description,
    type: 'workflow',
    jurisdiction,
    anchor: process.nodes.length > 0
      ? { nodeId: process.nodes[0] }
      : undefined,
    nodes: process.nodes,
    edges: process.edges.map(edge => ({
      source: edge.source,
      target: edge.target,
    })),
    layout: {
      type: 'elk-layered',
      options: {
        direction: 'DOWN',
        spacing: 50,
      },
      fit: true,
      padding: 50,
      animate: true,
    },
    metadata: {
      steps: process.steps,
    },
  };
}

export type GraphData = {
  // Core data
  dataset: GovernmentDataset;
  scopeNodeIds: Record<GovernmentScope, string[]>;
  mainGraph: GraphConfig;
  allProcesses: ProcessDefinition[];

  // Processes organized by scope
  processesByScope: Record<GovernmentScope, ProcessDefinition[]>;

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

  // Step 4b: Convert processes to workflow-type subviews
  const processSubviews: SubviewDefinition[] = [];
  for (const [scope, processes] of Object.entries(processesByScope)) {
    const scopeProcessSubviews = processes.map(process =>
      convertProcessToSubview(process, scope as GovernmentScope)
    );
    processSubviews.push(...scopeProcessSubviews);
  }

  // Merge process subviews with existing subviews
  const allSubviewsWithProcesses = [...allSubviews, ...processSubviews];

  console.log('[GraphData] Converted processes to subviews', {
    originalProcessCount: allProcesses.length,
    processSubviewsCreated: processSubviews.length,
    totalSubviews: allSubviewsWithProcesses.length,
  });

  // Step 4c: Build node scope index
  const nodeScopeIndex = buildNodeScopeIndex(scopeNodeIds);

  // Step 5: Build all indexes
  const allGraphNodes = dataset.nodes.map(buildGraphNode);
  const indexes = {
    nodesById: buildNodesIndex(mainGraph, [], allGraphNodes),
    edgesById: buildEdgesIndex(mainGraph, []),
    nodeScopeIndex,
  };

  // Step 6: Build subview lookup maps
  const maps = {
    subviewByAnchorId: buildSubviewByAnchorId(allSubviewsWithProcesses),
    subviewById: buildSubviewById(allSubviewsWithProcesses),
  };

  // Test specific intra-tier nodes
  const testNodes = ['city:vendors', 'city:MOCS', 'city:city_council_member', 'federal:oira'];
  const nodeTests = testNodes.map(id => ({
    id,
    exists: indexes.nodesById.has(id),
    label: indexes.nodesById.get(id)?.label,
  }));

  console.log('[GraphData] Built graph data at module load', {
    totalSubviews: allSubviewsWithProcesses.length,
    processSubviews: processSubviews.length,
    regularSubviews: allSubviews.length,
    subviewByAnchorIdSize: maps.subviewByAnchorId.size,
    subviewByIdSize: maps.subviewById.size,
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
    indexes,
    maps,
  };
};

/**
 * Static graph data - computed once at module load.
 * Import this directly in components instead of using a hook.
 */
export const GRAPH_DATA = buildGraphData();
