import type { Core, CytoscapeOptions } from 'cytoscape';

import type { ProcessDefinition } from '../data/types';
import type { GraphNodeInfo, GraphConfig } from './types';
import type { SubgraphConfig } from './subgraphs';
import type { GraphController } from './controller';
import type { VisualizationAction } from '../state/actions';
import type { VisualizationState } from '../state/useVisualizationState';
import type { GraphActionHandlers } from './actionHandlers';

export type GraphRuntimeData = {
  processes: ProcessDefinition[];
  nodesById: Map<string, GraphNodeInfo>;
};

export type GraphRuntimeConfig = {
  container: HTMLDivElement;
  mainGraph: GraphConfig;
  subgraphByEntryId: Map<string, SubgraphConfig>;
  subgraphById: Map<string, SubgraphConfig>;
  data: GraphRuntimeData;
  dispatch: React.Dispatch<VisualizationAction>; // Legacy - will be removed
  setState?: (updater: (prev: VisualizationState) => VisualizationState) => void; // NEW: Direct state setter
};

export type GraphRuntimeCommands = {
  highlightProcess: (processId: string) => Promise<void>;
  clearProcessHighlight: () => Promise<void>;
  activateSubgraph: (subgraphId: string) => Promise<void>;
  restoreMainView: () => Promise<void>;
  focusNodes: (nodeIds: string[]) => Promise<void>;
  clearNodeFocus: () => void;
};

export type GraphRuntimeAccessors = {
  getController: () => GraphController | null;
  getCy: () => Core | null;
};

export type GraphInputBinding = {
  attach: () => void;
  detach: () => void;
};

export type GraphRuntimeDependencies = {
  createController?: (cy: Core, mainGraph: GraphConfig) => GraphController;
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
