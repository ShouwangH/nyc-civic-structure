import { useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';
import type { Core } from 'cytoscape';
import type { GraphConfig, GraphNodeInfo, GraphEdgeInfo } from '../graph/types';
import type { SubviewDefinition } from '../data/types';
import type { GovernmentScope } from '../data/datasets';
import type { SetState, Controller } from '../graph/controller';
import { createController } from '../graph/controller';
import { setupInputHandler } from '../graph/inputHandler';
import { graphStyles } from '../graph/styles';

export type GraphRuntime = {
  cy: Core;
  controller: Controller;
  destroy: () => void;
};

type GraphCanvasProps = {
  mainGraph: GraphConfig;
  subviewByAnchorId: Map<string, SubviewDefinition>;
  subviewById: Map<string, SubviewDefinition>;
  nodesById: Map<string, GraphNodeInfo>;
  scopeNodeIds: Record<GovernmentScope, string[]>;
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
  setState,
  onRuntimeReady,
  className,
}: GraphCanvasProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

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
      subviewByAnchorId,
      subviewById,
      scopeNodeIds,
      nodeInfosById: nodesById,
      edgeInfosById,
      runMainGraphLayout: async () => {
        const layout = cy.layout(mainGraph.layout);
        const layoutPromise = layout.promiseOn('layoutstop');
        layout.run();
        await layoutPromise;
      },
    });

    // 3. Wire up input handler
    setupInputHandler({
      cy,
      controller,
      subviewByAnchorId,
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
      destroy: () => {
        cy.destroy();
      },
    };

    onRuntimeReady?.(runtime);

    return () => {
      runtime.destroy();
    };
  }, [mainGraph, nodesById, setState, subviewByAnchorId, subviewById, scopeNodeIds, onRuntimeReady]);

  return <div ref={containerRef} className={className} role="presentation" />;
};

export { GraphCanvas };
