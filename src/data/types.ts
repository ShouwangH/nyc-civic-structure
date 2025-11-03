export type StructureNode = {
  id: string;
  label: string;
  type: string;
  branch: string;
  factoid: string;
  process?: string[];
  position?: { x: number; y: number };
  parent?: string;
};

export type StructureData = {
  meta: {
    title: string;
    description: string;
  };
  nodes: StructureNode[];
};

export type RawEdge = {
  source: string;
  target: string;
  id?: string;
  label?: string;
  type?: string;
  process?: string[];
};

export type EdgesData = {
  edges: RawEdge[];
};

export type ScopeData = {
  meta: {
    title: string;
    description: string;
  };
  nodes: StructureNode[];
  edges: RawEdge[];
};

export type ProcessStep = {
  id: string;
  title: string;
  description: string;
};

export type ProcessDefinition = {
  id: string;
  label: string;
  description: string;
  nodes: string[];
  edges: Array<{ source: string; target: string }>;
  steps?: ProcessStep[];
};

export type ProcessesFile = {
  processes: ProcessDefinition[];
};

export type SubgraphElements = {
  nodes: Array<{ data: Record<string, unknown> }>;
  edges: Array<{ data: Record<string, unknown> }>;
};

export type SubgraphFile = {
  id: string;
  label: string;
  entryNodeId: string;
  description?: string;
  layoutType?: 'concentric' | 'elk-mrtree' | 'elk-layered';
  elements: SubgraphElements;
};

export type GovernmentScope = 'city' | 'state' | 'federal';
