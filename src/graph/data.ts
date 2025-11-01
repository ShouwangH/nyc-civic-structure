import type { LayoutOptions } from 'cytoscape';
import { branchPalette, NODE_HEIGHT, NODE_WIDTH } from './constants';
import type { GraphConfig, GraphEdgeInfo, GraphNodeInfo } from './types';
import type {
  EdgesData,
  RawEdge,
  StructureData,
  StructureNode,
  SubgraphFile,
} from '../data/types';

export type SystemCategory =
  | 'charter'
  | 'process'
  | 'borough'
  | 'subgraph-node'
  | 'subgraph-hub';

const categorizeSystem = (node: StructureNode): SystemCategory => {
  if (node.branch === 'community') {
    return 'borough';
  }

  if (node.type === 'process' || node.branch === 'planning' || node.branch === 'financial') {
    return 'process';
  }

  return 'charter';
};

const normalizeBranch = (branch?: string, fallback: string = 'administrative') =>
  branch ?? fallback;

const buildGraphNode = (node: StructureNode): GraphNodeInfo => ({
  id: node.id,
  label: node.label,
  branch: node.branch,
  type: node.type,
  process: node.process ?? [],
  factoid: node.factoid ?? 'No details available yet.',
  branchColor: branchPalette[normalizeBranch(node.branch)] ?? '#0f172a',
  system: categorizeSystem(node),
  width: NODE_WIDTH,
  height: NODE_HEIGHT,
  position: node.position,
});

const buildGraphEdge = (edge: RawEdge): GraphEdgeInfo => ({
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

export const buildMainGraph = (structure: StructureData, edges: EdgesData): GraphConfig => {
  const nodes = structure.nodes.map(buildGraphNode);
  const edgeInfos = edges.edges.map((edge) => buildGraphEdge(edge));

  const nodeElements = nodes.map(({ position, ...data }) =>
    position ? { data, position } : { data },
  );
  const edgeElements = edgeInfos.map((edge) => ({ data: edge }));

  const nodesHavePreset = nodes.every((node) => Boolean(node.position));

  return {
    nodes,
    edges: edgeInfos,
    elements: [...nodeElements, ...edgeElements],
    layout: createElkLayout(nodesHavePreset),
    nodesHavePreset,
  };
};

const deriveSubgraphBranch = (rawType: string, declaredBranch?: string) => {
  if (declaredBranch) {
    return declaredBranch;
  }

  if (rawType === 'office') {
    return 'executive';
  }

  if (rawType === 'category') {
    return 'administrative';
  }

  return 'administrative';
};

const toTitle = (label: string) => label;

export const buildSubgraphGraph = (subgraph: SubgraphFile): GraphConfig => {
  const nodes: GraphNodeInfo[] = subgraph.elements.nodes.map((nodeWrapper) => {
    const raw = nodeWrapper.data ?? {};
    const id = String(raw.id);
    const label = toTitle(String(raw.label ?? raw.id));
    const rawType = String(raw.type ?? 'agency').toLowerCase();
    const branch = deriveSubgraphBranch(rawType, typeof raw.branch === 'string' ? raw.branch : undefined);

    const system: SystemCategory =
      id === subgraph.entryNodeId
        ? 'subgraph-hub'
        : rawType === 'office'
          ? 'charter'
          : 'subgraph-node';

    return {
      id,
      label,
      branch,
      type: rawType,
      process: Array.isArray(raw.process) ? (raw.process as string[]) : [],
      factoid:
        typeof raw.factoid === 'string'
          ? raw.factoid
          : rawType === 'agency'
            ? `${label} is overseen by the executive branch.`
            : label,
      branchColor:
        system === 'subgraph-hub'
          ? '#0ea5e9'
          : branchPalette[normalizeBranch(branch)] ?? '#0f172a',
      system,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    };
  });

  const edges: GraphEdgeInfo[] = subgraph.elements.edges.map((edgeWrapper) => {
    const raw = edgeWrapper.data ?? {};
    const source = typeof raw.source === 'string' ? raw.source : String(raw.source ?? '');
    const target = typeof raw.target === 'string' ? raw.target : String(raw.target ?? '');
    const label = '';
    const type = 'relationship';

    return {
      id: raw.id ? String(raw.id) : `${source}->${target}`,
      source,
      target,
      label,
      type,
      process: [],
    };
  });

  const nodeElements = nodes.map((node) => ({ data: node }));
  const edgeElements = edges.map((edge) => ({ data: edge }));

  const layout: LayoutOptions =
    subgraph.layoutType === 'elk-mrtree'
      ? ({
          name: 'elk',
          fit: true,
          padding: 80,
          animate: false,
          elk: {
          algorithm: 'mrtree',
          'elk.direction': 'DOWN',
          'elk.spacing.nodeNode': 80,
          'elk.layered.spacing.nodeNodeBetweenLayers': 80,
          },
        } as LayoutOptions)
      : ({
          name: 'concentric',
          fit: true,
          padding: 80,
          animate: false,
          minNodeSpacing: 60,
          avoidOverlap: true,
          concentric: (node) => {
            if (node.id() === subgraph.entryNodeId) {
              return 3;
            }
            if (String(node.data('type')).toLowerCase() === 'office') {
              return 2;
            }
            return 1;
          },
          levelWidth: () => 1,
        } as LayoutOptions);

  return {
    nodes,
    edges,
    elements: [...nodeElements, ...edgeElements],
    layout,
    nodesHavePreset: false,
  };
};

export const categorizeNodeSystem = categorizeSystem;
