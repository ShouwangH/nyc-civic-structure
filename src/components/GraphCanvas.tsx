import { useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';
import type { Core } from 'cytoscape';
import type { GraphConfig, GraphNodeInfo, GraphEdgeInfo } from '../visualization/cytoscape/types';
import type { SubviewDefinition } from '../data/types';
import type { GovernmentScope } from '../data/datasets';
import type { SetState, Controller, VisualizationState } from '../visualization/cytoscape/controller';
import { createController } from '../visualization/cytoscape/controller';
import type { InputHandler } from '../visualization/cytoscape/inputHandler';
import { setupInputHandler } from '../visualization/cytoscape/inputHandler';
import { graphStyles } from '../visualization/cytoscape/styles';

export type GraphRuntime = {
  cy: Core;
  controller: Controller;
  inputHandler: InputHandler;
  destroy: () => void;
};

type GraphCanvasProps = {
  mainGraph: GraphConfig;
  subviewByAnchorId: Map<string, SubviewDefinition>;
  subviewById: Map<string, SubviewDefinition>;
  nodesById: Map<string, GraphNodeInfo>;
  scopeNodeIds: Record<GovernmentScope, string[]>;
  nodeScopeIndex: Map<string, GovernmentScope>;
  state: VisualizationState;
  setState: SetState;
  onRuntimeReady?: (runtime: GraphRuntime) => void;
  className?: string;
};

const GraphCanvas = ({
  mainGraph,
  subviewByAnchorId,
  subviewById,
  nodesById,
  scopeNodeIds,
  nodeScopeIndex,
  state,
  setState,
  onRuntimeReady,
  className,
}: GraphCanvasProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef<VisualizationState>(state);

  // Keep state ref updated
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    // 1. Create cytoscape instance
    const cy = cytoscape({
      container: containerRef.current,
      elements: mainGraph.elements,
      layout: mainGraph.layout,
      style: graphStyles,
    });

    // 2. Create controller with all dependencies
    const edgeInfosById = new Map<string, GraphEdgeInfo>();

    const controller = createController({
      cy,
      setState,
      getState: () => stateRef.current,
      subviewByAnchorId,
      subviewById,
      scopeNodeIds,
      nodeScopeIndex,
      nodeInfosById: nodesById,
      edgeInfosById,
      runMainGraphLayout: async () => {
        const layout = cy.layout(mainGraph.layout);
        const layoutPromise = layout.promiseOn('layoutstop');
        layout.run();
        await layoutPromise;
      },
    });

    // 3. Wire up input handler (pure event translation)
    const inputHandler = setupInputHandler({
      cy,
      controller,
    });

    // 4. Capture initial positions after layout (via controller)
    cy.one('layoutstop', () => {
      controller.captureInitialPositions();
    });

    // 5. Initialize layout
    cy.ready(() => {
      cy.resize();
      const layout = cy.layout(mainGraph.layout);
      layout.run();
    });

    // 6. Return runtime to App
    const runtime: GraphRuntime = {
      cy,
      controller,
      inputHandler,
      destroy: () => {
        cy.destroy();
      },
    };

    onRuntimeReady?.(runtime);

    return () => {
      runtime.destroy();
    };
  }, [mainGraph, nodesById, setState, subviewByAnchorId, subviewById, scopeNodeIds, nodeScopeIndex, onRuntimeReady]);

  return <div ref={containerRef} className={className} role="presentation" />;
};

export { GraphCanvas };
