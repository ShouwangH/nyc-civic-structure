import cityStructure from '../../data/city/structure.json';
import cityEdges from '../../data/city/edges.json';
import cityProcesses from '../../data/city/processes.json';
import cityDepartments from '../../data/city/subgraphs/departments.json';

import stateStructure from '../../data/state/structure.json';
import stateEdges from '../../data/state/edges.json';
import stateProcesses from '../../data/state/processes.json';
import stateAgencies from '../../data/state/subgraphs/agencies.json';

import federalStructure from '../../data/federal/structure.json';
import federalEdges from '../../data/federal/edges.json';
import federalProcesses from '../../data/federal/processes.json';
import federalAgencies from '../../data/federal/subgraphs/agencies.json';

import regionalStructure from '../../data/regional/structure.json';
import regionalEdges from '../../data/regional/edges.json';

import type {
  EdgesData,
  GovernmentScope,
  ProcessDefinition,
  StructureData,
  SubgraphFile,
} from './types';

export type { GovernmentScope } from './types';

export type GovernmentDataset = {
  scope: GovernmentScope;
  label: string;
  description: string;
  structure: StructureData;
  edges: EdgesData;
  processes: ProcessDefinition[];
  subgraphs: SubgraphFile[];
};

const emptyProcesses: { processes: ProcessDefinition[] } = { processes: [] };

const normalizeDataset = (
  scope: GovernmentScope,
  label: string,
  structure: StructureData,
  edges: EdgesData,
  processFile: { processes: ProcessDefinition[] },
  subgraphs: SubgraphFile[],
): GovernmentDataset => ({
  scope,
  label,
  description: structure.meta.description,
  structure,
  edges,
  processes: processFile.processes,
  subgraphs,
});

export const governmentDatasets: Record<GovernmentScope, GovernmentDataset> = {
  city: normalizeDataset(
    'city',
    'New York City',
    cityStructure,
    cityEdges,
    cityProcesses,
    [cityDepartments],
  ),
  state: normalizeDataset(
    'state',
    'New York State',
    stateStructure,
    stateEdges,
    stateProcesses,
    [stateAgencies],
  ),
  regional: normalizeDataset(
    'regional',
    'Regional Authorities',
    regionalStructure,
    regionalEdges,
    emptyProcesses,
    [],
  ),
  federal: normalizeDataset(
    'federal',
    'United States',
    federalStructure,
    federalEdges,
    federalProcesses,
    [federalAgencies],
  ),
};

export const governmentScopes: Array<{ id: GovernmentScope; label: string }> = [
  { id: 'federal', label: 'Federal' },
  { id: 'state', label: 'State' },
  { id: 'regional', label: 'Regional' },
  { id: 'city', label: 'City' },
];
