import cytoscape from 'cytoscape';
import cytoscapeElk from 'cytoscape-elk';
import { useCallback, useMemo, useState } from 'react';
import clsx from 'clsx';

import { ControlsPanel } from './components/ControlsPanel';
import { DetailsSidebar } from './components/DetailsSidebar';
import { GraphCanvas, type GraphRuntime } from './components/GraphCanvas';
import { governmentScopes } from './data/datasets';
import type { VisualizationState } from './graph/controller';
import { GRAPH_DATA } from './data/loader';
import { actions } from './graph/actions';

cytoscape.use(cytoscapeElk);

function App() {
  const [runtime, setRuntime] = useState<GraphRuntime | null>(null);

  // Single state object
  const [state, setState] = useState<VisualizationState>({
    selectedNodeId: null,
    selectedEdgeId: null,
    activeSubviewId: null,
    activeScope: null,
    controlsOpen: true,
    sidebarHover: false,
  });

  const { selectedNodeId, selectedEdgeId, activeSubviewId, activeScope, controlsOpen, sidebarHover } = state;

  // Static graph data - computed once at module load
  const { dataset, mainGraph, indexes, maps, scopeNodeIds } = GRAPH_DATA;
  const { nodesById, edgesById } = indexes;
  const { subviewByAnchorId, subviewById } = maps;

  // Derived values (simple lookups and filters)
  const derived = useMemo(() => {
    // Filter workflow subviews by scope
    const visibleProcesses = activeScope
      ? Array.from(subviewById.values()).filter(subview => {
          return subview.jurisdiction === activeScope && subview.type === 'workflow';
        })
      : [];

    // Filter non-workflow subviews by scope and anchor node visibility
    const visibleSubviews = activeScope
      ? Array.from(subviewById.values()).filter(subview => {
          const matchesScope = subview.jurisdiction === activeScope && subview.type !== 'workflow';
          if (!matchesScope) return false;

          // Get the anchor node for this subview
          const anchorNodeId = subview.anchor?.nodeId;
          if (!anchorNodeId) return false;

          // Get the anchor node info
          const anchorNode = nodesById.get(anchorNodeId);
          if (!anchorNode) return false;

          if (activeSubviewId) {
            // If a subview is active, show only subviews whose anchor is in the active subview
            const activeSubview = subviewById.get(activeSubviewId);
            const visibleNodeIds = activeSubview?.nodes || [];
            return visibleNodeIds.includes(anchorNodeId);
          } else {
            // If only scope is active, show only subviews with main-tier anchor nodes
            return anchorNode.tier === 'main';
          }
        })
      : [];

    // Entity lookups
    const activeNode = selectedNodeId ? nodesById.get(selectedNodeId) ?? null : null;
    const activeEdge = selectedEdgeId ? edgesById.get(selectedEdgeId) ?? null : null;
    const activeProcess = activeSubviewId ? subviewById.get(activeSubviewId) ?? null : null;
    const selectedEdgeSource = activeEdge ? nodesById.get(activeEdge.source) ?? null : null;
    const selectedEdgeTarget = activeEdge ? nodesById.get(activeEdge.target) ?? null : null;
    const subviewLabel = activeProcess?.label ?? null;

    // Computed flags
    const selectionActive = Boolean(selectedNodeId || selectedEdgeId || activeSubviewId);
    const shouldShowSidebar = selectionActive || sidebarHover;

    return {
      visibleProcesses,
      visibleSubviews,
      activeNode,
      activeEdge,
      activeProcess,
      selectedEdgeSource,
      selectedEdgeTarget,
      subviewLabel,
      selectionActive,
      shouldShowSidebar,
    };
  }, [
    activeScope,
    selectedNodeId,
    selectedEdgeId,
    activeSubviewId,
    sidebarHover,
    nodesById,
    edgesById,
    subviewById,
  ]);

  // Simple action handlers
  const toggleControlsOpen = useCallback(() => {
    setState((prev) => ({ ...prev, controlsOpen: !prev.controlsOpen }));
  }, []);

  const setSidebarHover = useCallback((hover: boolean) => {
    setState((prev) => ({ ...prev, sidebarHover: hover }));
  }, []);

  const clearSelections = useCallback(() => {
    if (runtime?.controller) {
      void runtime.controller.dispatch(actions.clearSelections());
    }
  }, [runtime]);

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
          subviews={derived.visibleSubviews}
          processes={derived.visibleProcesses}
          activeSubviewId={activeSubviewId}
          isOpen={controlsOpen}
          onToggleOpen={toggleControlsOpen}
          controller={runtime?.controller ?? null}
        />

        <section
          className={clsx(
            'relative flex flex-1 flex-col gap-6 px-6 py-6',
            derived.shouldShowSidebar && 'lg:min-w-0'
          )}
        >
          <div className="flex flex-1 min-h-[75vh] overflow-hidden rounded-lg border border-slate-200 bg-slate-50 shadow-sm lg:min-h-[82vh]">
            <GraphCanvas
              className="h-full w-full min-h-[75vh] rounded-lg bg-[#eceae4] lg:min-h-[82vh]"
              mainGraph={mainGraph}
              subviewByAnchorId={subviewByAnchorId}
              subviewById={subviewById}
              nodesById={nodesById}
              scopeNodeIds={scopeNodeIds}
              state={state}
              setState={setState}
              onRuntimeReady={setRuntime}
            />
          </div>
          <p className="text-xs text-slate-500">
            Zoom with scroll, drag to pan, click a node or edge to inspect. Use the left menu to
            switch scopes, spotlight processes, or explore a subview.
          </p>
        </section>

        {derived.shouldShowSidebar && (
          <DetailsSidebar
            activeNode={derived.activeNode}
            activeEdge={derived.activeEdge}
            edgeSourceNode={derived.selectedEdgeSource}
            edgeTargetNode={derived.selectedEdgeTarget}
            activeProcess={derived.activeProcess}
            subviewLabel={derived.subviewLabel}
            hasSelection={derived.selectionActive}
            isSubviewActive={Boolean(activeSubviewId)}
            onClear={clearSelections}
            onMouseEnter={() => setSidebarHover(true)}
            onMouseLeave={() => {
              if (!derived.selectionActive) {
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
          if (!derived.selectionActive) {
            setSidebarHover(false);
          }
        }}
        aria-hidden="true"
      />
    </div>
  );
}

export default App;
