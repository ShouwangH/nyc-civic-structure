// Three-tier data architecture: main.json + {jurisdiction}-intra.json
import mainData from '../../data/main.json';
import cityIntra from '../../data/city-intra.json';
import stateIntra from '../../data/state-intra.json';
import federalIntra from '../../data/federal-intra.json';

// Processes (unchanged)
import cityProcesses from '../../data/city-processes.json';
import stateProcesses from '../../data/state-processes.json';
import federalProcesses from '../../data/federal-processes.json';

// Subgraphs (old format, kept for compatibility)
import cityDepartments from '../../data/subgraphs/city-departments.json';
import stateAgencies from '../../data/subgraphs/state-agencies.json';
import stateCourts from '../../data/subgraphs/state-courts.json';
import federalAgencies from '../../data/subgraphs/federal-agencies.json';


import type {
  GovernmentScope,
  ProcessDefinition,
  StructureNode,
  RawEdge,
  SubgraphFile,
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
  subgraphs: SubgraphFile[];
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

// Helper: Merge main + intra data for a jurisdiction
const buildDataset = (
  scope: GovernmentScope,
  label: string,
  description: string,
  intraData: { nodes: StructureNode[]; edges?: RawEdge[] },
  processFile: { processes: ProcessDefinition[] },
  subgraphs: SubgraphFile[],
): GovernmentDataset => {
  const mainNodes = extractMainNodes(scope);
  const mainEdges = extractMainEdges(scope);

  return {
    scope,
    label,
    description,
    meta: {
      title: `${label} Government Structure`,
      description,
    },
    nodes: [...mainNodes, ...intraData.nodes],
    edges: [...mainEdges, ...(intraData.edges || [])],
    processes: processFile.processes,
    subgraphs,
  };
};

export const governmentDatasets: Record<GovernmentScope, GovernmentDataset> = {
  city: buildDataset(
    'city',
    'New York City',
    'Complete NYC government including city-wide governance and borough advisory structures.',
    cityIntra,
    cityProcesses,
    [cityDepartments],
  ),
  state: buildDataset(
    'state',
    'New York State',
    'High-level structure of New York State government as defined by the State Constitution and related laws.',
    stateIntra,
    stateProcesses,
    [stateAgencies, stateCourts],
  ),
  federal: buildDataset(
    'federal',
    'United States',
    'High-level structure of the U.S. federal government as defined by the Constitution.',
    federalIntra,
    federalProcesses,
    [federalAgencies],
  ),
};

export const governmentScopes: Array<{ id: GovernmentScope; label: string }> = [
  { id: 'federal', label: 'Federal' },
  { id: 'state', label: 'State' },
  { id: 'city', label: 'City' },
];
