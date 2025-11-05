import cytoscape, { type Core } from 'cytoscape';

import { graphStyles } from './styles';
import { captureInitialPositions } from './layout';
import { createNodeFocusController, type NodeFocusController } from './node-focus-controller';
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
    subgraphById: _subgraphById,
    subviewByAnchorId,
    subviewById,
    scopeNodeIds,
    data,
    setState,
  }: GraphRuntimeConfig,
  dependencies: GraphRuntimeDependencies = {},
): GraphRuntime => {

  let cy: Core | null = null;
  let nodeFocusController: NodeFocusController | null = null;
  let subviewController: SubviewController | null = null;
  let handlers: GraphActionHandlers | null = null;
  let inputBinding: GraphInputBinding | null = null;

  const {
    createInputHandler: createInputHandlerImpl = createGraphInputHandler,
    createCy = cytoscape,
  } = dependencies;

  const getCy = () => cy;

  const clearNodeFocus = () => {
    nodeFocusController?.clear();
  };

  const focusNodes = async (nodeIds: string[]) => {
    if (!nodeFocusController) {
      return;
    }

    await nodeFocusController.focus(nodeIds);
  };

  const handleNodeTap = (nodeId: string) => {
    handlers?.handleNodeClick(nodeId);
  };

  const handleEdgeTap = (edgeId: string) => {
    handlers?.handleEdgeClick(edgeId);
  };

  const handleBackgroundTap = () => {
    handlers?.handleBackgroundClick();
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
    nodeFocusController = null;
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

    // Create node focus controller
    nodeFocusController = createNodeFocusController({ cy: cyInstance });

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
      captureInitialPositions(cyInstance);
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
