import cytoscape, { type Core } from 'cytoscape';

import { graphStyles } from './styles';
import { createGraphController, type GraphController } from './controller';
import type { GraphNodeInfo } from './types';
import type { ProcessDefinition } from '../data/types';
import type { SubgraphConfig } from './subgraphs';
import { createGraphInputHandler } from './inputHandler';
import { createPlaceholderProcessNode, createProcessEdgeInfo } from './processUtils';
import type {
  GraphRuntime,
  GraphRuntimeConfig,
  GraphRuntimeDependencies,
  GraphRuntimeEventHandlers,
  GraphRuntimeFactory,
  GraphInputBinding,
} from './runtimeTypes';

const createGraphRuntime: GraphRuntimeFactory = (
  {
    container,
    mainGraph,
    subgraphByEntryId,
    subgraphById,
    data,
    dispatch,
  }: GraphRuntimeConfig,
  dependencies: GraphRuntimeDependencies = {},
): GraphRuntime => {
  let cy: Core | null = null;
  let controller: GraphController | null = null;
  let inputBinding: GraphInputBinding | null = null;

  const {
    createController: createControllerImpl = createGraphController,
    createInputHandler: createInputHandlerImpl = createGraphInputHandler,
    createCy = cytoscape,
  } = dependencies;

  const nodesById: Map<string, GraphNodeInfo> = data.nodesById;
  const processesById = new Map<string, ProcessDefinition>(
    data.processes.map((process) => [process.id, process]),
  );

  const getCy = () => cy;
  const getController = () => controller;

  async function clearProcessHighlight() {
    if (!controller) {
      return;
    }

    await controller.clearProcessHighlight();
  }

  async function restoreMainView() {
    if (!controller) {
      return;
    }
    if (!controller.isSubgraphActive()) {
      return;
    }

    await controller.restoreMainView();
  }

  const clearNodeFocus = () => {
    controller?.clearNodeFocus();
  };

  async function highlightProcess(processId: string) {
    if (!controller) {
      return;
    }

    const process = processesById.get(processId);
    if (!process) {
      console.warn('[GraphRuntime] Process not found', processId);
      return;
    }

    await restoreMainView();

    const nodeInfos = process.nodes.map(
      (id) => nodesById.get(id) ?? createPlaceholderProcessNode(id),
    );
    const edgeInfos = process.edges.map((edge) => createProcessEdgeInfo(process.id, edge));

    await controller.showProcess(process, nodeInfos, edgeInfos);
  }

  const focusNodes = async (nodeIds: string[]) => {
    if (!controller) {
      return;
    }

    await controller.focusNodes(nodeIds);
  };

  async function activateSubgraphInternal(config: SubgraphConfig) {
    if (!controller) {
      return;
    }

    await clearProcessHighlight();

    await controller.activateSubgraph(config.graph, {
      id: config.meta.id,
      entryNodeId: config.meta.entryNodeId,
    });
  }

  const activateSubgraph = async (subgraphId: string) => {
    const config = subgraphById.get(subgraphId);
    if (!config) {
      console.warn('[GraphRuntime] Subgraph not found', subgraphId);
      return;
    }
    await activateSubgraphInternal(config);
  };

  const handleNodeTap = (nodeId: string) => {
    const isSubgraphEntry = subgraphByEntryId.has(nodeId);
    dispatch({
      type: 'NODE_CLICKED',
      nodeId,
      isSubgraphEntry,
    });
  };

  const handleEdgeTap = (edgeId: string) => {
    dispatch({
      type: 'EDGE_CLICKED',
      edgeId,
    });
  };

  const handleBackgroundTap = () => {
    dispatch({ type: 'BACKGROUND_CLICKED' });
  };

  const handleZoom = () => {
    // Disabled: zoom interactions should no longer clear selections or reset the view.
  };

  const eventHandlers: GraphRuntimeEventHandlers = {
    handleNodeTap,
    handleEdgeTap,
    handleBackgroundTap,
    handleZoom,
  };

  const destroy = () => {
    if (inputBinding) {
      inputBinding.detach();
      inputBinding = null;
    }
    if (cy) {
      cy.destroy();
      cy = null;
    }
    controller = null;
  };

  const initialize = () => {
    destroy();

    const cyInstance = createCy({
      container,
      elements: mainGraph.elements,
      layout: mainGraph.layout,
      style: graphStyles,
    });

    cy = cyInstance;

    const controllerInstance = createControllerImpl(cyInstance, mainGraph);
    controller = controllerInstance;

    cyInstance.one('layoutstop', () => {
      controllerInstance.captureInitialPositions();
    });

    cyInstance.ready(() => {
      cyInstance.resize();
      const layout = cyInstance.layout(mainGraph.layout);
      layout.run();
    });

    inputBinding = createInputHandlerImpl(cyInstance, eventHandlers);
    inputBinding.attach();
  };

  const runtime: GraphRuntime = {
    initialize,
    destroy,
    highlightProcess,
    clearProcessHighlight,
    activateSubgraph,
    restoreMainView,
    focusNodes,
    clearNodeFocus,
    getController,
    getCy,
    handleNodeTap: eventHandlers.handleNodeTap,
    handleEdgeTap: eventHandlers.handleEdgeTap,
    handleBackgroundTap: eventHandlers.handleBackgroundTap,
    handleZoom: eventHandlers.handleZoom,
  };

  return runtime;
};

export { createGraphRuntime };
