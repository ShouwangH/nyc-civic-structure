import type { ElementDefinition, LayoutOptions } from 'cytoscape';

export type GraphNodeInfo = {
  id: string;
  label: string;
  branch: string;
  type: string;
  process: string[];
  factoid: string;
  branchColor: string;
  system: string;
  width: number;
  height: number;
  position?: { x: number; y: number };
};

export type GraphEdgeInfo = {
  id: string;
  source: string;
  target: string;
  label: string;
  type: string;
  process: string[];
};

export type GraphConfig = {
  nodes: GraphNodeInfo[];
  edges: GraphEdgeInfo[];
  elements: ElementDefinition[];
  layout: LayoutOptions;
  nodesHavePreset: boolean;
};
