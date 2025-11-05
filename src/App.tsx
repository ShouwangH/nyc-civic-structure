import cytoscape from 'cytoscape';
import cytoscapeElk from 'cytoscape-elk';
import { useCallback, useState } from 'react';
import clsx from 'clsx';

import { ControlsPanel } from './components/ControlsPanel';
import { DetailsSidebar } from './components/DetailsSidebar';
import { GraphCanvas } from './components/GraphCanvas';
import type { GraphRuntime } from './graph/runtimeTypes';
import { governmentScopes } from './data/datasets';
import type { GovernmentScope } from './data/datasets';
import { useVisualizationState } from './state/useVisualizationState';
import { GRAPH_DATA } from './data/graphDataPipeline';

cytoscape.use(cytoscapeElk);

function App() {
  const [runtime, setRuntime] = useState<GraphRuntime | null>(null);

  const {
    state,
    actions: {
      toggleControlsOpen,
      setSidebarHover,
      clearSelections,
    },
    derived: {
      visibleProcesses, // Used by ControlsPanel
      visibleSubgraphConfigs, // Used by ControlsPanel
      activeNode,
      activeEdge,
      activeProcess,
      selectedEdgeSource,
      selectedEdgeTarget,
      subgraphLabel,
      selectionActive,
      shouldShowSidebar,
    },
    setState, // For imperative handlers
  } = useVisualizationState();

  const { controlsOpen, activeScope, activeSubviewId } = state;

  // Static graph data - computed once at module load
  const { dataset, mainGraph, allProcesses, indexes, maps, scopeNodeIds } = GRAPH_DATA;
  const { nodesById } = indexes;
  const { subviewByAnchorId, subviewById } = maps;

  const handleScopeFocus = useCallback(
    (scope: GovernmentScope) => {
      const handlers = runtime?.handlers;
      if (handlers) {
        void handlers.handleScopeChange(scope);
      }
    },
    [runtime],
  );

  return (
    <div className="relative flex min-h-screen flex-col bg-[#eceae4]">
      <header className="border-b border-slate-200 bg-slate-100 px-6 py-5">
        <h1 className="text-2xl font-semibold text-slate-900">
          <span>Maximum New York |</span>
          <span className="text-gray-500 text-lg"> {dataset.meta.title}</span>
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          {dataset.meta.description}
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
          processes={visibleProcesses}
          activeSubviewId={activeSubviewId}
          isOpen={controlsOpen}
          onToggleOpen={toggleControlsOpen}
          handlers={runtime?.handlers ?? null}
        />

        <section
          className={clsx(
            'relative flex flex-1 flex-col gap-6 px-6 py-6',
            shouldShowSidebar && 'lg:min-w-0'
          )}
        >
          <div className="flex flex-1 min-h-[75vh] overflow-hidden rounded-lg border border-slate-200 bg-slate-50 shadow-sm lg:min-h-[82vh]">
            <GraphCanvas
              className="h-full w-full min-h-[75vh] rounded-lg bg-[#eceae4] lg:min-h-[82vh]"
              mainGraph={mainGraph}
              subviewByAnchorId={subviewByAnchorId}
              subviewById={subviewById}
              processes={allProcesses}
              nodesById={nodesById}
              scopeNodeIds={scopeNodeIds}
              setState={setState}
              onRuntimeReady={setRuntime}
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
            isSubgraphActive={Boolean(activeSubviewId)}
            onClear={clearSelections}
            onMouseEnter={() => setSidebarHover(true)}
            onMouseLeave={() => {
              if (!selectionActive) {
                setSidebarHover(false);
              }
            }}
          />
        )}
      </main>

      <div
        className="fixed inset-y-0 right-0 w-4 lg:w-6"
        onMouseEnter={() => setSidebarHover(true)}
        onMouseLeave={() => {
          if (!selectionActive) {
            setSidebarHover(false);
          }
        }}
        aria-hidden="true"
      />
    </div>
  );
}

export default App;
