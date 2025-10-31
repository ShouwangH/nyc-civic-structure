import cytoscape from 'cytoscape';
import cytoscapeElk from 'cytoscape-elk';
import { useCallback, useMemo, useRef } from 'react';

import { ControlsPanel } from './components/ControlsPanel';
import { DetailsSidebar } from './components/DetailsSidebar';
import { GraphCanvas, type GraphCanvasHandle } from './components/GraphCanvas';
import { buildMainGraph, buildSubgraphGraph } from './graph/data';
import type { GraphEdgeInfo, GraphNodeInfo } from './graph/types';
import { governmentDatasets, governmentScopes } from './data/datasets';
import type { GovernmentDataset, GovernmentScope } from './data/datasets';
import type { ProcessDefinition } from './data/types';
import type { SubgraphConfig } from './graph/subgraphs';
import { useVisualizationState } from './state/useVisualizationState';
import { buildUnifiedDataset } from './data/unifiedDataset';

cytoscape.use(cytoscapeElk);

const processesForDataset = (dataset: GovernmentDataset): ProcessDefinition[] =>
  dataset.processes ?? [];

function App() {
  const graphRef = useRef<GraphCanvasHandle | null>(null);

  const {
    state: {
      controlsOpen,
      activeScope,
      selectedNodeId,
      selectedEdgeId,
      activeProcessId,
      activeSubgraphId,
      isSidebarHover,
    },
    actions: {
      toggleControlsOpen,
      setActiveScope,
      setSelectedNode,
      setSelectedEdge,
      setActiveProcess,
      setActiveSubgraph,
      setSidebarHover,
      clearFocus,
      clearSelections,
    },
  } = useVisualizationState();

  const { dataset: combinedDataset, scopeNodeIds } = useMemo(() => buildUnifiedDataset(), []);

  const dataset = combinedDataset;
  const allProcesses = useMemo(() => processesForDataset(dataset), [dataset]);
  const mainGraph = useMemo(() => buildMainGraph(dataset.structure, dataset.edges), [dataset]);

  const processesByScope = useMemo<Record<GovernmentScope, ProcessDefinition[]>>(
    () => ({
      federal: governmentDatasets.federal.processes,
      state: governmentDatasets.state.processes,
      regional: governmentDatasets.regional.processes,
      city: governmentDatasets.city.processes,
    }),
    [],
  );

  const visibleProcesses = useMemo<ProcessDefinition[]>(
    () => (activeScope ? processesByScope[activeScope] ?? [] : []),
    [activeScope, processesByScope],
  );

  const subgraphConfigs = useMemo<SubgraphConfig[]>(() => {
    return (dataset.subgraphs ?? []).map((subgraph) => ({
      meta: subgraph,
      graph: buildSubgraphGraph(subgraph),
    }));
  }, [dataset]);

  const nodeScopeIndex = useMemo(() => {
    const map = new Map<string, GovernmentScope>();
    (Object.entries(scopeNodeIds) as Array<[GovernmentScope, string[]]>).forEach(([scope, ids]) => {
      ids.forEach((id) => {
        if (!map.has(id)) {
          map.set(id, scope);
        }
      });
    });
    return map;
  }, [scopeNodeIds]);

  const scopedSubgraphConfigs = useMemo(
    () =>
      subgraphConfigs.map((config) => ({
        config,
        scope: nodeScopeIndex.get(config.meta.entryNodeId) ?? null,
      })),
    [subgraphConfigs, nodeScopeIndex],
  );

  const visibleSubgraphConfigs = useMemo<SubgraphConfig[]>(() => {
    if (!activeScope) {
      return [];
    }
    return scopedSubgraphConfigs
      .filter((entry) => entry.scope === activeScope)
      .map((entry) => entry.config);
  }, [activeScope, scopedSubgraphConfigs]);

  const subgraphScopeById = useMemo(() => {
    const map = new Map<string, GovernmentScope | null>();
    scopedSubgraphConfigs.forEach(({ config, scope }) => {
      map.set(config.meta.id, scope);
      map.set(config.meta.entryNodeId, scope);
    });
    return map;
  }, [scopedSubgraphConfigs]);

  const subgraphByEntryId = useMemo(() => {
    const map = new Map<string, SubgraphConfig>();
    subgraphConfigs.forEach((config) => {
      map.set(config.meta.entryNodeId, config);
    });
    return map;
  }, [subgraphConfigs]);

  const subgraphById = useMemo(() => {
    const map = new Map<string, SubgraphConfig>();
    subgraphConfigs.forEach((config) => {
      map.set(config.meta.id, config);
    });
    return map;
  }, [subgraphConfigs]);

  const nodesById = useMemo(() => {
    const map = new Map<string, GraphNodeInfo>();
    mainGraph.nodes.forEach((node) => map.set(node.id, node));
    subgraphConfigs.forEach((config) => {
      config.graph.nodes.forEach((node) => {
        if (!map.has(node.id)) {
          map.set(node.id, node);
        }
      });
    });
    return map;
  }, [mainGraph, subgraphConfigs]);

  const edgesById = useMemo(() => {
    const map = new Map<string, GraphEdgeInfo>();
    mainGraph.edges.forEach((edge) => map.set(edge.id, edge));
    subgraphConfigs.forEach((config) => {
      config.graph.edges.forEach((edge) => {
        if (!map.has(edge.id)) {
          map.set(edge.id, edge);
        }
      });
    });
    return map;
  }, [mainGraph, subgraphConfigs]);

  const handleScopeFocus = useCallback(
    async (scope: GovernmentScope) => {
      setActiveScope(scope);
      clearFocus();
      setSidebarHover(false);

      const nodeIds = scopeNodeIds[scope] ?? [];
      const graphHandle = graphRef.current;

      if (!graphHandle || nodeIds.length === 0) {
        return;
      }

      await graphHandle.clearProcessHighlight();
      await graphHandle.restoreMainView();
      graphHandle.clearNodeFocus();
      await graphHandle.focusNodes(nodeIds);
    },
    [clearFocus, scopeNodeIds, setActiveScope, setSidebarHover],
  );

  const handleProcessToggle = useCallback(
    async (processId: string) => {
      const graphHandle = graphRef.current;
      if (!graphHandle) {
        return;
      }

      const isProcessVisible = visibleProcesses.some((process) => process.id === processId);
      if (!isProcessVisible) {
        console.warn('[Process] Not available for active scope', { processId, activeScope });
        return;
      }

      if (activeSubgraphId) {
        await graphHandle.restoreMainView();
      }

      if (activeProcessId === processId) {
        await graphHandle.clearProcessHighlight();
        if (!selectedNodeId && !selectedEdgeId) {
          setSidebarHover(false);
        }
        return;
      }

      if (!allProcesses.find((process) => process.id === processId)) {
        console.warn('[Process] Definition not found for process', processId);
        return;
      }

      await graphHandle.highlightProcess(processId);
      setSidebarHover(true);
    },
    [
      activeProcessId,
      activeScope,
      activeSubgraphId,
      allProcesses,
      selectedEdgeId,
      selectedNodeId,
      setSidebarHover,
      visibleProcesses,
    ],
  );

  const handleSubgraphToggle = useCallback(
    async (subgraphId: string) => {
      const graphHandle = graphRef.current;
      if (!graphHandle) {
        return;
      }

      const scopeForSubgraph = subgraphScopeById.get(subgraphId);
      if (activeScope && scopeForSubgraph && scopeForSubgraph !== activeScope) {
        console.warn('[Subgraph] Not available for active scope', {
          subgraphId,
          activeScope,
          scopeForSubgraph,
        });
        return;
      }

      if (activeProcessId) {
        await graphHandle.clearProcessHighlight();
      }

      const controller = graphHandle.getController();
      if (controller?.isSubgraphActive(subgraphId)) {
        await graphHandle.restoreMainView();
        setSidebarHover(false);
        return;
      }

      if (!subgraphById.has(subgraphId)) {
        console.warn('[Subgraph] Definition not found for subgraph', subgraphId);
        return;
      }

      await graphHandle.activateSubgraph(subgraphId);
      setSidebarHover(true);
    },
    [activeProcessId, activeScope, setSidebarHover, subgraphById, subgraphScopeById],
  );

  const handleClearSelection = useCallback(async () => {
    const graphHandle = graphRef.current;

    if (activeProcessId) {
      if (graphHandle) {
        await graphHandle.clearProcessHighlight();
      }
    }

    if (activeSubgraphId) {
      if (graphHandle) {
        await graphHandle.restoreMainView();
      }
    }
    if (graphHandle) {
      graphHandle.clearNodeFocus();
    }
    clearSelections();
  }, [activeProcessId, activeSubgraphId, clearSelections]);

  const selectionActive =
    Boolean(selectedNodeId) ||
    Boolean(selectedEdgeId) ||
    Boolean(activeProcessId) ||
    Boolean(activeSubgraphId);
  const shouldShowSidebar = selectionActive || isSidebarHover;

  const handleSidebarMouseLeave = () => {
    if (!selectionActive) {
      setSidebarHover(false);
    }
  };

  const handleHotzoneLeave = () => {
    if (!selectionActive) {
      setSidebarHover(false);
    }
  };

  const activeNode = useMemo(
    () => (selectedNodeId ? nodesById.get(selectedNodeId) ?? null : null),
    [nodesById, selectedNodeId],
  );

  const activeEdge = useMemo(
    () => (selectedEdgeId ? edgesById.get(selectedEdgeId) ?? null : null),
    [edgesById, selectedEdgeId],
  );

  const activeProcess = useMemo(
    () => allProcesses.find((process) => process.id === activeProcessId) ?? null,
    [allProcesses, activeProcessId],
  );

  const selectedEdgeSource = activeEdge ? nodesById.get(activeEdge.source) ?? null : null;
  const selectedEdgeTarget = activeEdge ? nodesById.get(activeEdge.target) ?? null : null;
  const subgraphLabel = activeSubgraphId
    ? subgraphById.get(activeSubgraphId)?.meta.label ?? null
    : null;
  const mainLayoutClass = 'flex flex-1 overflow-hidden bg-[#eceae4]';
  const graphSectionClass = shouldShowSidebar
    ? 'relative flex flex-1 flex-col gap-6 px-6 py-6 lg:min-w-0'
    : 'relative flex flex-1 flex-col gap-6 px-6 py-6';

  const graphStoreActions = useMemo(
    () => ({
      setSelectedNode,
      setSelectedEdge,
      setActiveProcess,
      setActiveSubgraph,
      setSidebarHover,
      clearSelections,
    }),
    [setSelectedNode, setSelectedEdge, setActiveProcess, setActiveSubgraph, setSidebarHover, clearSelections],
  );

  return (
    <div className="relative flex min-h-screen flex-col bg-[#eceae4]">
      <header className="border-b border-slate-200 bg-slate-100 px-6 py-5">
        <h1 className="text-2xl font-semibold text-slate-900">
         <span>Maximum New York |</span><span className='text-gray-500 text-lg'> {dataset.structure.meta.title}</span>
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          {dataset.structure.meta.description}
        </p>
      </header>

      <main className={mainLayoutClass}>
        <ControlsPanel
          scopes={governmentScopes}
          activeScope={activeScope}
          onScopeChange={(scope) => {
            void handleScopeFocus(scope);
          }}
          subgraphConfigs={visibleSubgraphConfigs}
          activeSubgraphId={activeSubgraphId}
          onSubgraphToggle={handleSubgraphToggle}
          processes={visibleProcesses}
          activeProcessId={activeProcessId}
          onProcessToggle={handleProcessToggle}
          isOpen={controlsOpen}
          onToggleOpen={toggleControlsOpen}
        />

        <section className={graphSectionClass}>
          <div className="flex flex-1 min-h-[75vh] overflow-hidden rounded-lg border border-slate-200 bg-slate-50 shadow-sm lg:min-h-[82vh]">
            <GraphCanvas
              ref={graphRef}
              className="h-full w-full min-h-[75vh] rounded-lg bg-[#eceae4] lg:min-h-[82vh]"
              mainGraph={mainGraph}
              subgraphByEntryId={subgraphByEntryId}
              subgraphById={subgraphById}
              processes={allProcesses}
              nodesById={nodesById}
              storeActions={graphStoreActions}
            />
          </div>
          <p className="text-xs text-slate-500">
            Zoom with scroll, drag to pan, click a node or edge to inspect. Use the left menu to
            switch scopes, spotlight processes, or explore a subgraph view.
          </p>
        </section>

        {shouldShowSidebar && (
          <DetailsSidebar
            activeNode={activeNode}
            activeEdge={activeEdge}
            edgeSourceNode={selectedEdgeSource}
            edgeTargetNode={selectedEdgeTarget}
            activeProcess={activeProcess}
            subgraphLabel={subgraphLabel}
            hasSelection={selectionActive}
            isSubgraphActive={Boolean(activeSubgraphId)}
            onClear={handleClearSelection}
            onMouseEnter={() => setSidebarHover(true)}
            onMouseLeave={handleSidebarMouseLeave}
          />
        )}
      </main>

      <div
        className="fixed inset-y-0 right-0 w-4 lg:w-6"
        onMouseEnter={() => setSidebarHover(true)}
        onMouseLeave={handleHotzoneLeave}
        aria-hidden="true"
      />
    </div>
  );
}

export default App;
