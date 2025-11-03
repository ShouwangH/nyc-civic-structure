import city from '../../data/city.json';
import cityProcesses from '../../data/city-processes.json';
import cityDepartments from '../../data/subgraphs/city-departments.json';

import state from '../../data/state.json';
import stateProcesses from '../../data/state-processes.json';
import stateAgencies from '../../data/subgraphs/state-agencies.json';
import stateCourts from '../../data/subgraphs/state-courts.json';

import federal from '../../data/federal.json';
import federalProcesses from '../../data/federal-processes.json';
import federalAgencies from '../../data/subgraphs/federal-agencies.json';


import type {
  GovernmentScope,
  ProcessDefinition,
  ScopeData,
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

const normalizeDataset = (
  scope: GovernmentScope,
  label: string,
  scopeData: ScopeData,
  processFile: { processes: ProcessDefinition[] },
  subgraphs: SubgraphFile[],
): GovernmentDataset => ({
  scope,
  label,
  description: scopeData.meta.description,
  meta: scopeData.meta,
  nodes: scopeData.nodes,
  edges: scopeData.edges,
  processes: processFile.processes,
  subgraphs,
});

export const governmentDatasets: Record<GovernmentScope, GovernmentDataset> = {
  city: normalizeDataset(
    'city',
    'New York City',
    city,
    cityProcesses,
    [cityDepartments],
  ),
  state: normalizeDataset(
    'state',
    'New York State',
    state,
    stateProcesses,
    [stateAgencies, stateCourts],
  ),
  federal: normalizeDataset(
    'federal',
    'United States',
    federal,
    federalProcesses,
    [federalAgencies],
  ),
};

export const governmentScopes: Array<{ id: GovernmentScope; label: string }> = [
  { id: 'federal', label: 'Federal' },
  { id: 'state', label: 'State' },
  { id: 'city', label: 'City' },
];
