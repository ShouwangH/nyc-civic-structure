import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { GraphConfig, GraphNodeInfo } from '../graph/types';
import type { ProcessDefinition } from '../data/types';
import type { SubgraphConfig } from '../graph/subgraphs';
import { GraphOrchestrator } from '../graph/orchestrator';

export type GraphCanvasHandle = {
  highlightProcess: (processId: string) => Promise<void>;
  clearProcessHighlight: () => Promise<void>;
  activateSubgraph: (subgraphId: string) => Promise<void>;
  restoreMainView: () => Promise<void>;
  focusNodes: (nodeIds: string[]) => Promise<void>;
  clearNodeFocus: () => void;
  getController: () => ReturnType<GraphOrchestrator['getController']>;
  getCy: () => ReturnType<GraphOrchestrator['getCy']>;
};

type StoreActions = {
  setSelectedNode: (id: string | null) => void;
  setSelectedEdge: (id: string | null) => void;
  setActiveProcess: (id: string | null) => void;
  setActiveSubgraph: (id: string | null) => void;
  setSidebarHover: (value: boolean) => void;
  clearSelections: () => void;
};

type GraphCanvasProps = {
  mainGraph: GraphConfig;
  subgraphByEntryId: Map<string, SubgraphConfig>;
  subgraphById: Map<string, SubgraphConfig>;
  processes: ProcessDefinition[];
  nodesById: Map<string, GraphNodeInfo>;
  storeActions: StoreActions;
  className?: string;
};

const GraphCanvas = forwardRef<GraphCanvasHandle, GraphCanvasProps>(
  (
    { mainGraph, subgraphByEntryId, subgraphById, processes, nodesById, storeActions, className },
    ref,
  ) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const orchestratorRef = useRef<GraphOrchestrator | null>(null);

    useEffect(() => {
      if (!containerRef.current) {
        return;
      }

      const orchestrator = new GraphOrchestrator({
        container: containerRef.current,
        mainGraph,
        subgraphByEntryId,
        subgraphById,
        data: { processes, nodesById },
        store: storeActions,
      });

      orchestrator.initialize();
      orchestratorRef.current = orchestrator;

      return () => {
        orchestrator.destroy();
        orchestratorRef.current = null;
      };
    }, [mainGraph, processes, nodesById, storeActions, subgraphByEntryId, subgraphById]);

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
      }),
      [],
    );

    return <div ref={containerRef} className={className} role="presentation" />;
  },
);

GraphCanvas.displayName = 'GraphCanvas';

export { GraphCanvas };
