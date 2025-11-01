import { governmentDatasets } from './datasets';
import type { GovernmentDataset, GovernmentScope } from './datasets';

type ScopeGroup = {
  scope: GovernmentScope;
  groupId: string;
  anchorId: string;
  label: string;
};

type UnifiedDatasetResult = {
  dataset: GovernmentDataset;
  scopeGroups: ScopeGroup[];
  scopeNodeIds: Record<GovernmentScope, string[]>;
};

const scopeGroups: ScopeGroup[] = [
  {
    scope: 'federal',
    groupId: 'federal-group',
    anchorId: 'federal-group-anchor',
    label: 'Federal Anchor',
  },
  {
    scope: 'state',
    groupId: 'state-group',
    anchorId: 'state-group-anchor',
    label: 'State Anchor',
  },
  {
    scope: 'regional',
    groupId: 'regional-group',
    anchorId: 'regional-group-anchor',
    label: 'Regional Anchor',
  },
  {
    scope: 'city',
    groupId: 'city-group',
    anchorId: 'city-group-anchor',
    label: 'City Anchor',
  },
];

const createAnchorNodes = () =>
  scopeGroups.map(({ anchorId }) => ({
    id: anchorId,
    label: '',
    type: 'anchor',
    branch: 'grouping',
    factoid: '',
    process: [],
  }));

const createScopedNodes = () =>
  scopeGroups.flatMap(({ scope }) => {
    const source = governmentDatasets[scope].structure.nodes;
    return source.map((node) => ({
      ...node,
      parent: undefined,
    }));
  });

const createAnchorEdges = () =>
  scopeGroups.flatMap((group, index) => {
    const nextGroup = scopeGroups[index + 1];
    const dataset = governmentDatasets[group.scope];

    const attachEdges = dataset.structure.nodes.map((node) => ({
      source: group.anchorId,
      target: node.id,
      id: `${group.anchorId}-${node.id}`,
      type: 'relationship',
      label: '',
      process: [],
      isAnchorEdge: true,
    }));

    if (nextGroup) {
      attachEdges.push({
        source: group.anchorId,
        target: nextGroup.anchorId,
        id: `${group.anchorId}-to-${nextGroup.anchorId}`,
        type: 'relationship',
        label: '',
        process: [],
        isAnchorEdge: true,
      });
    }

    return attachEdges;
  });

export const buildUnifiedDataset = (): UnifiedDatasetResult => {
  const anchorNodes = createAnchorNodes();
  const scopedNodes = createScopedNodes();
  const anchorEdges = createAnchorEdges();

  const structureNodes = [...anchorNodes, ...scopedNodes];

  const combinedStructure: GovernmentDataset['structure'] = {
    meta: {
      title: 'Government Overview',
      description:
        'Diagram showing U.S. federal, New York State, regional authorities, and New York City governance.',
    },
    nodes: structureNodes,
  };

  const combinedEdges: GovernmentDataset['edges'] = {
    edges: [
      ...governmentDatasets.federal.edges.edges,
      ...governmentDatasets.state.edges.edges,
      ...governmentDatasets.regional.edges.edges,
      ...governmentDatasets.city.edges.edges,
      ...anchorEdges,
    ],
  };

  const combinedProcesses = [
    ...governmentDatasets.federal.processes,
    ...governmentDatasets.state.processes,
    ...governmentDatasets.regional.processes,
    ...governmentDatasets.city.processes,
  ];

  const combinedSubgraphs = [
    ...(governmentDatasets.federal.subgraphs ?? []),
    ...(governmentDatasets.state.subgraphs ?? []),
    ...(governmentDatasets.regional.subgraphs ?? []),
    ...(governmentDatasets.city.subgraphs ?? []),
  ];

  const dataset: GovernmentDataset = {
    scope: 'city',
    label: 'Federal • State • Regional • City',
    description: combinedStructure.meta.description,
    structure: combinedStructure,
    edges: combinedEdges,
    processes: combinedProcesses,
    subgraphs: combinedSubgraphs,
  };

  const scopeNodeIds: Record<GovernmentScope, string[]> = scopeGroups.reduce(
    (acc, group) => {
      const datasetNodes = governmentDatasets[group.scope].structure.nodes.map((node) => node.id);
      acc[group.scope] = [group.anchorId, ...datasetNodes];
      return acc;
    },
    {
      federal: [] as string[],
      state: [] as string[],
      regional: [] as string[],
      city: [] as string[],
    },
  );

  return {
    dataset,
    scopeGroups,
    scopeNodeIds,
  };
};

export type { ScopeGroup, UnifiedDatasetResult };
