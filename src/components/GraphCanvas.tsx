import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { GraphConfig, GraphNodeInfo } from '../graph/types';
import type { ProcessDefinition, SubviewDefinition } from '../data/types';
import type { SubgraphConfig } from '../graph/subgraphs';
import { createGraphRuntime } from '../graph/orchestrator';
import type { GraphRuntime } from '../graph/runtimeTypes';
import type { VisualizationAction } from '../state/actions';
import type { VisualizationState } from '../state/useVisualizationState';
import type { GraphActionHandlers } from '../graph/actionHandlers';
import type { GovernmentScope } from '../data/datasets';

export type GraphCanvasHandle = {
  highlightProcess: GraphRuntime['highlightProcess'];
  clearProcessHighlight: GraphRuntime['clearProcessHighlight'];
  activateSubgraph: GraphRuntime['activateSubgraph'];
  restoreMainView: GraphRuntime['restoreMainView'];
  focusNodes: GraphRuntime['focusNodes'];
  clearNodeFocus: GraphRuntime['clearNodeFocus'];
  getController: GraphRuntime['getController'];
  getCy: GraphRuntime['getCy'];
  getHandlers: () => GraphActionHandlers | null; // NEW: Imperative handlers accessor
  handlers: GraphActionHandlers | null; // NEW: Deprecated, use getHandlers()
};

type GraphCanvasProps = {
  mainGraph: GraphConfig;
  subgraphByEntryId: Map<string, SubgraphConfig>;
  subgraphById: Map<string, SubgraphConfig>;
  subviewByAnchorId: Map<string, SubviewDefinition>;
  subviewById: Map<string, SubviewDefinition>;
  processes: ProcessDefinition[];
  nodesById: Map<string, GraphNodeInfo>;
  scopeNodeIds: Record<GovernmentScope, string[]>;
  dispatch: React.Dispatch<VisualizationAction>;
  setState?: (updater: (prev: VisualizationState) => VisualizationState) => void; // NEW: Direct state setter
  className?: string;
};

const GraphCanvas = forwardRef<GraphCanvasHandle, GraphCanvasProps>(
  (
    { mainGraph, subgraphByEntryId, subgraphById, subviewByAnchorId, subviewById, processes, nodesById, scopeNodeIds, dispatch, setState, className },
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
        subgraphByEntryId,
        subgraphById,
        subviewByAnchorId,
        subviewById,
        scopeNodeIds,
        data: { processes, nodesById },
        dispatch,
        setState, // NEW: Pass setState for imperative handlers
      });

      orchestrator.initialize();
      orchestratorRef.current = orchestrator;

      return () => {
        orchestrator.destroy();
        orchestratorRef.current = null;
      };
    }, [mainGraph, processes, nodesById, dispatch, setState, subgraphByEntryId, subgraphById, subviewByAnchorId, subviewById, scopeNodeIds]);

    useImperativeHandle(
      ref,
      () => ({
        highlightProcess: async (processId: string) => {
          const orchestrator = orchestratorRef.current;
          if (!orchestrator) {
            return;
          }
          await orchestrator.highlightProcess(processId);
        },
        clearProcessHighlight: async () => {
          const orchestrator = orchestratorRef.current;
          if (!orchestrator) {
            return;
          }
          await orchestrator.clearProcessHighlight();
        },
        activateSubgraph: async (subgraphId: string) => {
          const orchestrator = orchestratorRef.current;
          if (!orchestrator) {
            return;
          }
          await orchestrator.activateSubgraph(subgraphId);
        },
        restoreMainView: async () => {
          const orchestrator = orchestratorRef.current;
          if (!orchestrator) {
            return;
          }
          await orchestrator.restoreMainView();
        },
        focusNodes: async (nodeIds: string[]) => {
          const orchestrator = orchestratorRef.current;
          if (!orchestrator) {
            return;
          }
          await orchestrator.focusNodes(nodeIds);
        },
        clearNodeFocus: () => {
          const orchestrator = orchestratorRef.current;
          orchestrator?.clearNodeFocus();
        },
        getController: () => orchestratorRef.current?.getController() ?? null,
        getCy: () => orchestratorRef.current?.getCy() ?? null,
        getHandlers: () => orchestratorRef.current?.handlers ?? null,
        get handlers() {
          return orchestratorRef.current?.handlers ?? null;
        },
      }),
      [],
    );

    return <div ref={containerRef} className={className} role="presentation" />;
  },
);

GraphCanvas.displayName = 'GraphCanvas';

export { GraphCanvas };
