import type { Core, CytoscapeOptions } from 'cytoscape';

import type { ProcessDefinition, SubviewDefinition } from '../data/types';
import type { GraphNodeInfo, GraphConfig } from './types';
import type { SubgraphConfig } from './subgraphs';
import type { VisualizationState } from '../state/useVisualizationState';
import type { GraphActionHandlers } from './actionHandlers';
import type { GovernmentScope } from '../data/datasets';

export type GraphRuntimeData = {
  processes: ProcessDefinition[];
  nodesById: Map<string, GraphNodeInfo>;
};

export type GraphRuntimeConfig = {
  container: HTMLDivElement;
  mainGraph: GraphConfig;
  subgraphById: Map<string, SubgraphConfig>;
  subviewByAnchorId: Map<string, SubviewDefinition>;
  subviewById: Map<string, SubviewDefinition>;
  scopeNodeIds: Record<GovernmentScope, string[]>;
  data: GraphRuntimeData;
  setState?: (updater: (prev: VisualizationState) => VisualizationState) => void;
};

export type GraphRuntimeCommands = {
  focusNodes: (nodeIds: string[]) => Promise<void>;
  clearNodeFocus: () => void;
};

export type GraphRuntimeAccessors = {
  getCy: () => Core | null;
};

export type GraphInputBinding = {
  attach: () => void;
  detach: () => void;
};

export type GraphRuntimeDependencies = {
  createInputHandler?: (
    cy: Core,
    runtimeHandlers: GraphRuntimeEventHandlers,
  ) => GraphInputBinding;
  createCy?: (options: CytoscapeOptions) => Core;
};

export type GraphRuntimeEventHandlers = {
  handleNodeTap: (nodeId: string) => void;
  handleEdgeTap: (edgeId: string) => void;
  handleBackgroundTap: () => void;
  handleZoom: () => void;
};

export type GraphRuntime = GraphRuntimeCommands &
  GraphRuntimeAccessors &
  GraphRuntimeEventHandlers & {
    initialize: () => void;
    destroy: () => void;
    handlers: GraphActionHandlers | null; // NEW: Imperative action handlers
  };

export type GraphRuntimeFactory = (
  config: GraphRuntimeConfig,
  dependencies?: GraphRuntimeDependencies,
) => GraphRuntime;
