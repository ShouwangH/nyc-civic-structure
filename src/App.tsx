import cytoscape from 'cytoscape';
import cytoscapeElk from 'cytoscape-elk';
import { useState, useEffect } from 'react';

import { ControlsPanel } from './components/ControlsPanel';
import { DiagramViewToggle } from './components/DiagramViewToggle';
import { GraphCanvas, type GraphRuntime } from './components/GraphCanvas';
import { OverlayWrapper } from './components/OverlayWrapper';
import { MapsOverlay } from './components/MapsOverlay';
import { governmentScopes } from './data/datasets';
import type { VisualizationState } from './visualization/cytoscape/controller';
import { initializeGraphData, type GraphData } from './data/loader';
import { actions } from './visualization/cytoscape/actions';

cytoscape.use(cytoscapeElk);

function App() {
  const [runtime, setRuntime] = useState<GraphRuntime | null>(null);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Single state object
  const [state, setState] = useState<VisualizationState>({
    selectedNodeId: null,
    selectedEdgeId: null,
    activeSubviewId: null,
    activeScope: null,
    controlsOpen: true,
    sidebarHover: false,
    viewMode: 'diagram',
    activeTab: 'details',
  });

  // Load graph data on mount
  useEffect(() => {
    initializeGraphData()
      .then((data) => {
        setGraphData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load graph data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
        setLoading(false);
      });
  }, []);

  const { selectedNodeId, selectedEdgeId, activeSubviewId, activeScope, viewMode, activeTab } = state;

  // Show loading state
  if (loading || !graphData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#eceae4]">
        <div className="text-center">
          <div className="text-2xl font-semibold text-slate-900 mb-2">
            Loading Maximum New York...
          </div>
          {loading && (
            <div className="text-slate-600">Initializing civic structure data</div>
          )}
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#eceae4]">
        <div className="text-center max-w-md">
          <div className="text-2xl font-semibold text-red-600 mb-2">
            Error Loading Data
          </div>
          <div className="text-slate-700">{error}</div>
        </div>
      </div>
    );
  }

  // Extract graph data
  const { dataset, mainGraph, indexes, maps, scopeNodeIds } = graphData;
  const { nodesById, edgesById, nodeScopeIndex } = indexes;
  const { subviewByAnchorId, subviewById } = maps;

  // Filter workflow subviews (for processes tab)
  const workflowSubviews = Array.from(subviewById.values()).filter(
    subview => subview.type === 'workflow'
  );

  // Filter overlay visualizations (sankey and sunburst)
  const overlaySubviews = Array.from(subviewById.values()).filter(
    subview => subview.type === 'sankey' || subview.type === 'sunburst'
  );

  // Entity lookups
  const activeNode = selectedNodeId ? nodesById.get(selectedNodeId) ?? null : null;
  const activeEdge = selectedEdgeId ? edgesById.get(selectedEdgeId) ?? null : null;
  const activeProcess = activeSubviewId ? subviewById.get(activeSubviewId) ?? null : null;
  const selectedEdgeSource = activeEdge ? nodesById.get(activeEdge.source) ?? null : null;
  const selectedEdgeTarget = activeEdge ? nodesById.get(activeEdge.target) ?? null : null;

  return (
    <div className="relative flex h-screen bg-[#eceae4] p-3 gap-3">
      <div className="flex flex-col w-1/4 gap-3 h-full overflow-hidden">
        <header className="rounded-xl border border-slate-200 bg-slate-50 px-6 py-3 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">
            <span>Maximum New York |</span>
            <span className="text-gray-500 text-lg"> {dataset.meta.title}</span>
          </h1>
        </header>

        <ControlsPanel
          scopes={governmentScopes}
          activeScope={activeScope}
          workflows={workflowSubviews}
          activeSubviewId={activeSubviewId}
          inputHandler={runtime?.inputHandler ?? null}
          activeNode={activeNode}
          activeEdge={activeEdge}
          edgeSourceNode={selectedEdgeSource}
          edgeTargetNode={selectedEdgeTarget}
          activeProcess={activeProcess}
          isSubviewActive={Boolean(activeSubviewId)}
          activeTab={activeTab}
        />
      </div>

      <div className="flex flex-1 flex-col gap-3">
        <div className="px-6 py-3 shadow-sm">
          <DiagramViewToggle
            mode={viewMode}
            inputHandler={runtime?.inputHandler ?? null}
          />
        </div>

        <main className="flex flex-1 overflow-hidden bg-[#eceae4]">
          <div className="flex flex-1 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm">
            <GraphCanvas
              className="h-full w-full rounded-xl bg-[#eceae4]"
              mainGraph={mainGraph}
              subviewByAnchorId={subviewByAnchorId}
              subviewById={subviewById}
              nodesById={nodesById}
              scopeNodeIds={scopeNodeIds}
              nodeScopeIndex={nodeScopeIndex}
              state={state}
              setState={setState}
              onRuntimeReady={setRuntime}
            />
          </div>
        </main>
      </div>

      {viewMode === 'financials' && (
        <OverlayWrapper
          overlaySubviews={overlaySubviews}
          inputHandler={runtime?.inputHandler ?? null}
        />
      )}

      {viewMode === 'maps' && (
        <MapsOverlay
          onClose={() => {
            if (!runtime?.inputHandler) return;
            void runtime.inputHandler.enqueue(actions.changeViewMode('diagram'));
          }}
        />
      )}
    </div>
  );
}

export default App;
