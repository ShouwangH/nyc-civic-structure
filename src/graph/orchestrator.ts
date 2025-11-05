import cytoscape, { type Core } from 'cytoscape';

import { graphStyles } from './styles';
import { captureInitialPositions } from './layout';
import { createNodeFocusController, type NodeFocusController } from './node-focus-controller';
import type { GraphEdgeInfo } from './types';
import { createSubviewController, type SubviewController } from './subview-controller';
import { createGraphActionHandlers, type GraphActionHandlers } from './actionHandlers';
import type {
  GraphRuntime,
  GraphRuntimeConfig,
  GraphRuntimeDependencies,
  GraphRuntimeFactory,
} from './runtimeTypes';

const createGraphRuntime: GraphRuntimeFactory = (
  {
    container,
    mainGraph,
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

  const {
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

  const destroy = () => {
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

    // Create SubviewController for interactive features if setState is provided
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

      // Bind Cytoscape events directly to handlers
      cyInstance.on('tap', 'node', (event) => {
        handlers?.handleNodeClick(event.target.id());
      });

      cyInstance.on('tap', 'edge', (event) => {
        handlers?.handleEdgeClick(event.target.id());
      });

      cyInstance.on('tap', (event) => {
        if (event.target === cyInstance) {
          void handlers?.handleBackgroundClick();
        }
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
  };

  const runtime: GraphRuntime = {
    initialize,
    destroy,
    focusNodes,
    clearNodeFocus,
    getCy,
    get handlers() {
      return handlers;
    },
  };

  return runtime;
};

export { createGraphRuntime };
