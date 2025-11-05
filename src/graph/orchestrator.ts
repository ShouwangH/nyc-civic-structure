import cytoscape, { type Core } from 'cytoscape';

import { graphStyles } from './styles';
import { createGraphController, type GraphController } from './controller';
import type { GraphEdgeInfo } from './types';
import { createGraphInputHandler } from './inputHandler';
import { createSubviewController, type SubviewController } from './subview-controller';
import { createGraphActionHandlers, type GraphActionHandlers } from './actionHandlers';
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
    subgraphById: _subgraphById,
    subviewByAnchorId,
    subviewById,
    scopeNodeIds,
    data,
    dispatch,
    setState, // NEW: Direct state setter for imperative handlers
  }: GraphRuntimeConfig,
  dependencies: GraphRuntimeDependencies = {},
): GraphRuntime => {

  let cy: Core | null = null;
  let controller: GraphController | null = null;
  let subviewController: SubviewController | null = null;
  let handlers: GraphActionHandlers | null = null;
  let inputBinding: GraphInputBinding | null = null;

  const {
    createController: createControllerImpl = createGraphController,
    createInputHandler: createInputHandlerImpl = createGraphInputHandler,
    createCy = cytoscape,
  } = dependencies;

  const getCy = () => cy;
  const getController = () => controller;

  const clearNodeFocus = () => {
    controller?.clearNodeFocus();
  };

  const focusNodes = async (nodeIds: string[]) => {
    if (!controller) {
      return;
    }

    await controller.focusNodes(nodeIds);
  };

  const handleNodeTap = (nodeId: string) => {
    // NEW: Use imperative handlers if available
    if (handlers) {
      handlers.handleNodeClick(nodeId);
      return;
    }

    // LEGACY: Fallback to dispatch pattern
    const isSubgraphEntry = subgraphByEntryId.has(nodeId);
    dispatch({
      type: 'NODE_CLICKED',
      nodeId,
      isSubgraphEntry,
    });
  };

  const handleEdgeTap = (edgeId: string) => {
    // NEW: Use imperative handlers if available
    if (handlers) {
      handlers.handleEdgeClick(edgeId);
      return;
    }

    // LEGACY: Fallback to dispatch pattern
    dispatch({
      type: 'EDGE_CLICKED',
      edgeId,
    });
  };

  const handleBackgroundTap = () => {
    // NEW: Use imperative handlers if available
    if (handlers) {
      handlers.handleBackgroundClick();
      return;
    }

    // LEGACY: Fallback to dispatch pattern
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
    subviewController = null;
    handlers = null;
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

    // NEW: Create SubviewController if setState is provided
    if (setState) {
      const nodeInfosById = data.nodesById;
      const edgeInfosById = new Map<string, GraphEdgeInfo>();

      // Create SubviewController
      subviewController = createSubviewController({
        cy: cyInstance,
        runMainGraphLayout: async () => {
          const layout = cyInstance.layout(mainGraph.layout);
          const layoutPromise = layout.promiseOn('layoutstop');
          layout.run();
          await layoutPromise;
        },
        nodeInfosById,
        edgeInfosById,
      });

      // Create imperative action handlers with actual data from GRAPH_DATA
      handlers = createGraphActionHandlers({
        subviewController,
        setState,
        subviewByAnchorId,
        subviewById,
        scopeNodeIds,
        focusNodes,
        clearNodeFocus,
      });
    }

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
    focusNodes,
    clearNodeFocus,
    getController,
    getCy,
    handleNodeTap: eventHandlers.handleNodeTap,
    handleEdgeTap: eventHandlers.handleEdgeTap,
    handleBackgroundTap: eventHandlers.handleBackgroundTap,
    handleZoom: eventHandlers.handleZoom,
    get handlers() {
      return handlers;
    },
  };

  return runtime;
};

export { createGraphRuntime };
