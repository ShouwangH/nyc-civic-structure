import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { GraphConfig, GraphNodeInfo } from '../graph/types';
import type { ProcessDefinition, SubviewDefinition } from '../data/types';
import type { SubgraphConfig } from '../graph/subgraphs';
import { createGraphRuntime } from '../graph/orchestrator';
import type { GraphRuntime } from '../graph/runtimeTypes';
import type { VisualizationState } from '../state/useVisualizationState';
import type { GovernmentScope } from '../data/datasets';

export type GraphCanvasHandle = GraphRuntime;

type GraphCanvasProps = {
  mainGraph: GraphConfig;
  subgraphById: Map<string, SubgraphConfig>;
  subviewByAnchorId: Map<string, SubviewDefinition>;
  subviewById: Map<string, SubviewDefinition>;
  processes: ProcessDefinition[];
  nodesById: Map<string, GraphNodeInfo>;
  scopeNodeIds: Record<GovernmentScope, string[]>;
  setState?: (updater: (prev: VisualizationState) => VisualizationState) => void;
  className?: string;
};

const GraphCanvas = forwardRef<GraphCanvasHandle, GraphCanvasProps>(
  (
    { mainGraph, subgraphById, subviewByAnchorId, subviewById, processes, nodesById, scopeNodeIds, setState, className },
    ref,
  ) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const orchestratorRef = useRef<GraphRuntime | null>(null);

    useEffect(() => {
      if (!containerRef.current) {
        return;
      }

      const orchestrator = createGraphRuntime({
        container: containerRef.current,
        mainGraph,
        subgraphById,
        subviewByAnchorId,
        subviewById,
        scopeNodeIds,
        data: { processes, nodesById },
        setState,
      });

      orchestrator.initialize();
      orchestratorRef.current = orchestrator;

      return () => {
        orchestrator.destroy();
        orchestratorRef.current = null;
      };
    }, [mainGraph, processes, nodesById, setState, subgraphById, subviewByAnchorId, subviewById, scopeNodeIds]);

    useImperativeHandle(
      ref,
      () => ({
        get handlers() {
          return orchestratorRef.current?.handlers ?? null;
        },
        focusNodes: async (nodeIds: string[]) => {
          await orchestratorRef.current?.focusNodes(nodeIds);
        },
        clearNodeFocus: () => {
          orchestratorRef.current?.clearNodeFocus();
        },
        getCy: () => {
          return orchestratorRef.current?.getCy() ?? null;
        },
        initialize: () => {
          orchestratorRef.current?.initialize();
        },
        destroy: () => {
          orchestratorRef.current?.destroy();
        },
      }),
      [],
    );

    return <div ref={containerRef} className={className} role="presentation" />;
  },
);

GraphCanvas.displayName = 'GraphCanvas';

export { GraphCanvas };
