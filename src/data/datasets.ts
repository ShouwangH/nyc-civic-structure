// Three-tier data architecture: main.json + {jurisdiction}-intra.json
import mainData from '../../data/main.json';
import cityIntra from '../../data/city-intra.json';
import stateIntra from '../../data/state-intra.json';
import federalIntra from '../../data/federal-intra.json';

// Processes (unchanged)
import cityProcesses from '../../data/city-processes.json';
import stateProcesses from '../../data/state-processes.json';
import federalProcesses from '../../data/federal-processes.json';

import type {
  GovernmentScope,
  ProcessDefinition,
  StructureNode,
  RawEdge,
  SubviewDefinition,
} from './types';

export type { GovernmentScope } from './types';

export type GovernmentDataset = {
  scope: GovernmentScope;
  label: string;
  description: string;
  meta: {
    title: string;
    description: string;
  };
  nodes: StructureNode[];
  edges: RawEdge[];
  processes: ProcessDefinition[];
  subviews?: SubviewDefinition[];
};

// Helper: Extract nodes for a specific jurisdiction from main.json
const extractMainNodes = (jurisdiction: GovernmentScope): StructureNode[] => {
  const prefix = `${jurisdiction}:`;
  return mainData.nodes.filter(node => node.id.startsWith(prefix));
};

// Helper: Extract edges for a specific jurisdiction from main.json
const extractMainEdges = (jurisdiction: GovernmentScope): RawEdge[] => {
  const prefix = `${jurisdiction}:`;
  return (mainData.edges || []).filter(edge =>
    edge.source.startsWith(prefix) || edge.target.startsWith(prefix)
  );
};

// Helper: Extract subviews for a specific jurisdiction from main.json
const extractMainSubviews = (jurisdiction: GovernmentScope): SubviewDefinition[] => {
  const prefix = `${jurisdiction}:`;
  return ((mainData.subviews || []) as SubviewDefinition[]).filter(subview =>
    subview.anchor?.nodeId?.startsWith(prefix)
  );
};

// Helper: Merge main + intra data for a jurisdiction
const buildDataset = (
  scope: GovernmentScope,
  label: string,
  description: string,
  intraData: { nodes: StructureNode[]; edges?: RawEdge[]; subviews?: unknown[] },
  processFile: { processes: ProcessDefinition[] },
): GovernmentDataset => {
  const mainNodes = extractMainNodes(scope);
  const mainEdges = extractMainEdges(scope);

  // Annotate main nodes with tier
  const annotatedMainNodes = mainNodes.map(node => ({
    ...node,
    tier: 'main' as const,
  }));

  // Annotate intra nodes with tier
  const annotatedIntraNodes = intraData.nodes.map(node => ({
    ...node,
    tier: 'intra' as const,
  }));

  // Merge subviews from main.json and intra files
  const mainSubviews = extractMainSubviews(scope);
  const intraSubviews = (intraData.subviews || []) as SubviewDefinition[];
  const allSubviews = [...mainSubviews, ...intraSubviews];

  return {
    scope,
    label,
    description,
    meta: {
      title: `${label} Government Structure`,
      description,
    },
    nodes: [...annotatedMainNodes, ...annotatedIntraNodes],
    edges: [...mainEdges, ...(intraData.edges || [])],
    processes: processFile.processes,
    subviews: allSubviews.length > 0 ? allSubviews : undefined,
  };
};

export const governmentDatasets: Record<GovernmentScope, GovernmentDataset> = {
  city: buildDataset(
    'city',
    'New York City',
    'Complete NYC government including city-wide governance and borough advisory structures.',
    cityIntra,
    cityProcesses,
  ),
  state: buildDataset(
    'state',
    'New York State',
    'High-level structure of New York State government as defined by the State Constitution and related laws.',
    stateIntra,
    stateProcesses,
  ),
  federal: buildDataset(
    'federal',
    'United States',
    'High-level structure of the U.S. federal government as defined by the Constitution.',
    federalIntra,
    federalProcesses,
  ),
};

export const governmentScopes: Array<{ id: GovernmentScope; label: string }> = [
  { id: 'federal', label: 'Federal' },
  { id: 'state', label: 'State' },
  { id: 'city', label: 'City' },
];
