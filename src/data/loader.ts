// ABOUTME: Single-pass data loader for graph visualization
// ABOUTME: Combines datasets, transforms nodes, and builds indexes efficiently

import type { LayoutOptions } from 'cytoscape';
import { governmentDatasets } from './datasets';
import type { GovernmentScope, GovernmentDataset } from './datasets';
import type { SubviewDefinition, StructureNode, RawEdge } from './types';
import type { GraphConfig, GraphEdgeInfo, GraphNodeInfo } from '../visualization/cytoscape/types';
import { branchPalette, NODE_HEIGHT, NODE_WIDTH } from '../visualization/cytoscape/constants';

export type GraphData = {
  // Core data
  dataset: GovernmentDataset;
  scopeNodeIds: Record<GovernmentScope, string[]>;
  mainGraph: GraphConfig;

  // Indexes (built during transformation, not separately)
  indexes: {
    nodesById: Map<string, GraphNodeInfo>;
    edgesById: Map<string, GraphEdgeInfo>;
    nodeScopeIndex: Map<string, GovernmentScope>;
  };

  // Maps
  maps: {
    subviewByAnchorId: Map<string, SubviewDefinition>;
    subviewById: Map<string, SubviewDefinition>;
  };
};

type SystemCategory = 'charter' | 'process' | 'borough';

const categorizeSystem = (node: StructureNode): SystemCategory => {
  if (node.branch === 'community') return 'borough';
  if (node.type === 'process' || node.branch === 'planning' || node.branch === 'financial') {
    return 'process';
  }
  return 'charter';
};

const transformNode = (node: StructureNode): GraphNodeInfo => ({
  id: node.id,
  label: node.label,
  branch: node.branch,
  type: node.type,
  process: node.process ?? [],
  factoid: node.factoid ?? 'No details available yet.',
  branchColor: branchPalette[node.branch ?? 'administrative'] ?? '#0f172a',
  system: categorizeSystem(node),
  width: ["city:nyc_charter","state:ny_state_constitution",'federal:us_constitution'].includes(node.id) ? NODE_WIDTH * 3 : NODE_WIDTH,
  height: NODE_HEIGHT,
  tier: node.tier,
  position: node.position,
});

const transformEdge = (edge: RawEdge): GraphEdgeInfo => ({
  id: edge.id ?? `${edge.source}->${edge.target}`,
  source: edge.source,
  target: edge.target,
  label: edge.label ?? '',
  type: edge.type ?? 'relationship',
  process: edge.process ?? [],
});

const createElkLayout = (nodesHavePreset: boolean): LayoutOptions =>
  nodesHavePreset
    ? ({ name: 'preset', fit: false } as LayoutOptions)
    : ({
        name: 'elk',
        fit: true,
        padding: 80,
        animate: false,
        nodeDimensionsIncludeLabels: true,
        elk: {
          algorithm: 'mrtree',
          'elk.direction': 'DOWN',
          'elk.spacing.nodeNode': 80,
          'elk.layered.spacing.nodeNodeBetweenLayers': 80,
        },
      } as LayoutOptions);

/**
 * Loads and transforms all graph data in a single efficient pass.
 * Combines datasets, creates anchors, transforms nodes, and builds indexes.
 */
export function loadGraphData(): GraphData {
  const scopes: GovernmentScope[] = ['federal', 'state', 'city'];

  // Anchor node/edge definitions
  const anchorDefs = [
    { scope: 'federal' as const, anchorId: 'federal-group-anchor' },
    { scope: 'state' as const, anchorId: 'state-group-anchor' },
    { scope: 'city' as const, anchorId: 'city-group-anchor' },
  ];

  // Pass 1: Collect and transform all nodes + build indexes simultaneously
  const nodesById = new Map<string, GraphNodeInfo>();
  const nodeScopeIndex = new Map<string, GovernmentScope>();
  const scopeNodeIds: Record<GovernmentScope, string[]> = {
    federal: [],
    state: [],
    city: [],
  };
  const allNodes: GraphNodeInfo[] = [];
  const mainTierNodes: GraphNodeInfo[] = [];

  // Add anchor nodes
  anchorDefs.forEach(({ anchorId, scope }) => {
    const anchorNode: GraphNodeInfo = {
      id: anchorId,
      label: '',
      type: 'anchor',
      branch: 'grouping',
      factoid: '',
      process: [],
      branchColor: branchPalette.grouping,
      system: 'charter',
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    };
    allNodes.push(anchorNode);
    mainTierNodes.push(anchorNode); // Anchors are part of main tier
    nodesById.set(anchorId, anchorNode);
    scopeNodeIds[scope].push(anchorId);
    nodeScopeIndex.set(anchorId, scope);
  });

  // Add dataset nodes
  scopes.forEach((scope) => {
    const dataset = governmentDatasets[scope];
    dataset.nodes.forEach((rawNode) => {
      const node = transformNode(rawNode);
      allNodes.push(node);
      nodesById.set(node.id, node);
      scopeNodeIds[scope].push(node.id);
      nodeScopeIndex.set(node.id, scope);

      // Collect main tier nodes for the graph
      if (rawNode.tier === 'main' || rawNode.tier === undefined) {
        mainTierNodes.push(node);
      }
    });
  });

  // Pass 2: Combine and transform edges + build index simultaneously
  const edgesById = new Map<string, GraphEdgeInfo>();
  const allEdges: GraphEdgeInfo[] = [];

  // Add dataset edges
  scopes.forEach((scope) => {
    governmentDatasets[scope].edges.forEach((rawEdge) => {
      const edge = transformEdge(rawEdge);
      allEdges.push(edge);
      edgesById.set(edge.id, edge);
    });
  });

  // Add anchor edges (connect anchors to their nodes and to next anchor)
  anchorDefs.forEach(({ scope, anchorId }, index) => {
    const dataset = governmentDatasets[scope];

    // Attach anchor to main tier nodes in its scope
    dataset.nodes
      .filter((node) => node.tier === 'main' || node.tier === undefined)
      .forEach((node) => {
        const edge: GraphEdgeInfo = {
          source: anchorId,
          target: node.id,
          id: `${anchorId}-${node.id}`,
          type: 'relationship',
          label: '',
          process: [],
        };
        allEdges.push(edge);
        edgesById.set(edge.id, edge);
      });

    // Connect to next anchor
    if (index < anchorDefs.length - 1) {
      const nextAnchorId = anchorDefs[index + 1].anchorId;
      const edge: GraphEdgeInfo = {
        source: anchorId,
        target: nextAnchorId,
        id: `${anchorId}-to-${nextAnchorId}`,
        type: 'relationship',
        label: '',
        process: [],
      };
      allEdges.push(edge);
      edgesById.set(edge.id, edge);
    }
  });

  // Pass 3: Build main graph elements
  const mainTierElements = mainTierNodes.map((node) => {
    const { position, ...data } = node;
    return position ? { data, position } : { data };
  });

  const mainTierEdges = allEdges.filter((edge) => {
    const sourceInMain = mainTierNodes.some((n) => n.id === edge.source);
    const targetInMain = mainTierNodes.some((n) => n.id === edge.target);
    return sourceInMain && targetInMain;
  });

  const edgeElements = mainTierEdges.map((edge) => ({ data: edge }));

  const nodesHavePreset = mainTierNodes.every((node) => Boolean(node.position));

  const mainGraph: GraphConfig = {
    nodes: mainTierNodes,
    edges: mainTierEdges,
    elements: [...mainTierElements, ...edgeElements],
    layout: createElkLayout(nodesHavePreset),
    nodesHavePreset,
  };

  // Pass 4: Collect subviews and build maps simultaneously
  const subviewByAnchorId = new Map<string, SubviewDefinition>();
  const subviewById = new Map<string, SubviewDefinition>();
  const allSubviews: SubviewDefinition[] = [];

  scopes.forEach((scope) => {
    const subviews = governmentDatasets[scope].subviews ?? [];
    subviews.forEach((subview) => {
      allSubviews.push(subview);
      subviewById.set(subview.id, subview);

      // Only non-workflow subviews are activated by clicking anchor nodes
      if (subview.type !== 'workflow' && subview.anchor?.nodeId) {
        subviewByAnchorId.set(subview.anchor.nodeId, subview);
      }
    });
  });

  // Build unified dataset for metadata
  const dataset: GovernmentDataset = {
    scope: 'city',
    label: 'Federal • State • Regional • City',
    description: 'Diagram showing U.S. federal, New York State, and New York City governance.',
    meta: {
      title: 'Government Overview',
      description: 'Diagram showing U.S. federal, New York State, and New York City governance.',
    },
    nodes: allNodes.map((node) => ({
      id: node.id,
      label: node.label,
      branch: node.branch,
      type: node.type,
      process: node.process,
      factoid: node.factoid,
      position: node.position,
    })),
    edges: allEdges.map((edge) => ({
      source: edge.source,
      target: edge.target,
      id: edge.id,
      type: edge.type,
      label: edge.label,
      process: edge.process,
    })),
    subviews: allSubviews.length > 0 ? allSubviews : undefined,
  };

  return {
    dataset,
    scopeNodeIds,
    mainGraph,
    indexes: {
      nodesById,
      edgesById,
      nodeScopeIndex,
    },
    maps: {
      subviewByAnchorId,
      subviewById,
    },
  };
}

/**
 * Static graph data - computed once at module load.
 */
export const GRAPH_DATA = loadGraphData();
