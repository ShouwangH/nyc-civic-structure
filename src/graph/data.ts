import type { LayoutOptions } from 'cytoscape';
import { branchPalette, NODE_HEIGHT, NODE_WIDTH } from './constants';
import type { GraphConfig, GraphEdgeInfo, GraphNodeInfo } from './types';
import type {
  EdgesData,
  RawEdge,
  StructureData,
  StructureNode,
} from '../data/types';

export type SystemCategory =
  | 'charter'
  | 'process'
  | 'borough';

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

export const buildGraphNode = (node: StructureNode): GraphNodeInfo => ({
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

export const categorizeNodeSystem = categorizeSystem;
