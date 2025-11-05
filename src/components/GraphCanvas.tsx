import { useEffect, useRef } from 'react';
import type { GraphConfig, GraphNodeInfo } from '../graph/types';
import type { ProcessDefinition, SubviewDefinition } from '../data/types';
import type { SubgraphConfig } from '../graph/subgraphs';
import { createGraphRuntime } from '../graph/orchestrator';
import type { GraphRuntime } from '../graph/runtimeTypes';
import type { VisualizationState } from '../state/useVisualizationState';
import type { GovernmentScope } from '../data/datasets';

type GraphCanvasProps = {
  mainGraph: GraphConfig;
  subgraphById: Map<string, SubgraphConfig>;
  subviewByAnchorId: Map<string, SubviewDefinition>;
  subviewById: Map<string, SubviewDefinition>;
  processes: ProcessDefinition[];
  nodesById: Map<string, GraphNodeInfo>;
  scopeNodeIds: Record<GovernmentScope, string[]>;
  setState?: (updater: (prev: VisualizationState) => VisualizationState) => void;
  onRuntimeReady?: (runtime: GraphRuntime) => void;
  className?: string;
};

const GraphCanvas = ({
  mainGraph,
  subgraphById,
  subviewByAnchorId,
  subviewById,
  processes,
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

    const runtime = createGraphRuntime({
      container: containerRef.current,
      mainGraph,
      subgraphById,
      subviewByAnchorId,
      subviewById,
      scopeNodeIds,
      data: { processes, nodesById },
      setState,
    });

    runtime.initialize();

    // Call callback when runtime is ready
    onRuntimeReady?.(runtime);

    return () => {
      runtime.destroy();
    };
  }, [mainGraph, processes, nodesById, setState, subgraphById, subviewByAnchorId, subviewById, scopeNodeIds, onRuntimeReady]);

  return <div ref={containerRef} className={className} role="presentation" />;
};

export { GraphCanvas };
