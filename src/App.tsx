import cytoscape from 'cytoscape';
import cytoscapeElk from 'cytoscape-elk';
import { useCallback, useRef } from 'react';
import clsx from 'clsx';

import { ControlsPanel } from './components/ControlsPanel';
import { DetailsSidebar } from './components/DetailsSidebar';
import { GraphCanvas, type GraphCanvasHandle } from './components/GraphCanvas';
import { governmentScopes } from './data/datasets';
import type { GovernmentScope } from './data/datasets';
import { useVisualizationState } from './state/useVisualizationState';
import { GRAPH_DATA } from './data/graphDataPipeline';
import { focusScope, toggleProcess, toggleSubgraph, clearSelection } from './app/userActions';

cytoscape.use(cytoscapeElk);

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
    derived: {
      visibleProcesses,
      visibleSubgraphConfigs,
      activeNode,
      activeEdge,
      activeProcess,
      selectedEdgeSource,
      selectedEdgeTarget,
      subgraphLabel,
      selectionActive,
      shouldShowSidebar,
    },
  } = useVisualizationState();

  // Static graph data - computed once at module load
  const { dataset, scopeNodeIds, mainGraph, allProcesses, indexes, maps } = GRAPH_DATA;
  const { nodesById, subgraphScopeById } = indexes;
  const { subgraphByEntryId, subgraphById } = maps;

  const handleScopeFocus = useCallback(
    async (scope: GovernmentScope) => {
      await focusScope({
        scope,
        graphHandle: graphRef.current,
        scopeNodeIds,
        actions: { setActiveScope, clearFocus, setSidebarHover },
      });
    },
    [scopeNodeIds, setActiveScope, clearFocus, setSidebarHover],
  );

  const handleProcessToggle = useCallback(
    async (processId: string) => {
      await toggleProcess({
        processId,
        graphHandle: graphRef.current,
        state: {
          activeProcessId,
          activeScope,
          activeSubgraphId,
          selectedNodeId,
          selectedEdgeId,
        },
        visibleProcesses,
        allProcesses,
        actions: { setSidebarHover },
      });
    },
    [
      activeProcessId,
      activeScope,
      activeSubgraphId,
      selectedNodeId,
      selectedEdgeId,
      visibleProcesses,
      allProcesses,
      setSidebarHover,
    ],
  );

  const handleSubgraphToggle = useCallback(
    async (subgraphId: string) => {
      await toggleSubgraph({
        subgraphId,
        graphHandle: graphRef.current,
        state: {
          activeProcessId,
          activeScope,
        },
        subgraphScopeById,
        subgraphById,
        actions: { setSidebarHover },
      });
    },
    [activeProcessId, activeScope, subgraphScopeById, subgraphById, setSidebarHover],
  );

  const handleClearSelection = useCallback(async () => {
    await clearSelection({
      graphHandle: graphRef.current,
      state: {
        activeProcessId,
        activeSubgraphId,
      },
      actions: { clearSelections },
    });
  }, [activeProcessId, activeSubgraphId, clearSelections]);

  const handleConditionalHoverOff = useCallback(() => {
    if (!selectionActive) {
      setSidebarHover(false);
    }
  }, [selectionActive, setSidebarHover]);

  return (
    <div className="relative flex min-h-screen flex-col bg-[#eceae4]">
      <header className="border-b border-slate-200 bg-slate-100 px-6 py-5">
        <h1 className="text-2xl font-semibold text-slate-900">
          <span>Maximum New York |</span>
          <span className="text-gray-500 text-lg"> {dataset.structure.meta.title}</span>
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          {dataset.structure.meta.description}
        </p>
      </header>

      <main className="flex flex-1 overflow-hidden bg-[#eceae4]">
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

        <section
          className={clsx(
            'relative flex flex-1 flex-col gap-6 px-6 py-6',
            shouldShowSidebar && 'lg:min-w-0'
          )}
        >
          <div className="flex flex-1 min-h-[75vh] overflow-hidden rounded-lg border border-slate-200 bg-slate-50 shadow-sm lg:min-h-[82vh]">
            <GraphCanvas
              ref={graphRef}
              className="h-full w-full min-h-[75vh] rounded-lg bg-[#eceae4] lg:min-h-[82vh]"
              mainGraph={mainGraph}
              subgraphByEntryId={subgraphByEntryId}
              subgraphById={subgraphById}
              processes={allProcesses}
              nodesById={nodesById}
              storeActions={{
                setSelectedNode,
                setSelectedEdge,
                setActiveProcess,
                setActiveSubgraph,
                setSidebarHover,
                clearSelections,
              }}
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
            onMouseLeave={handleConditionalHoverOff}
          />
        )}
      </main>

      <div
        className="fixed inset-y-0 right-0 w-4 lg:w-6"
        onMouseEnter={() => setSidebarHover(true)}
        onMouseLeave={handleConditionalHoverOff}
        aria-hidden="true"
      />
    </div>
  );
}

export default App;
