import cytoscape from 'cytoscape';
import cytoscapeElk from 'cytoscape-elk';
import { useState } from 'react';

import { ControlsPanel } from './components/ControlsPanel';
import { DiagramViewToggle } from './components/DiagramViewToggle';
import { GraphCanvas, type GraphRuntime } from './components/GraphCanvas';
import { OverlayWrapper } from './components/OverlayWrapper';
import { governmentScopes } from './data/datasets';
import type { VisualizationState } from './visualization/cytoscape/controller';
import { GRAPH_DATA } from './data/loader';

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
    viewMode: 'diagram',
  });

  const { selectedNodeId, selectedEdgeId, activeSubviewId, activeScope, viewMode } = state;

  // Static graph data - computed once at module load
  const { dataset, mainGraph, indexes, maps, scopeNodeIds } = GRAPH_DATA;
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
    <div className="relative flex min-h-screen bg-[#eceae4] p-3 gap-3">
      <div className="flex flex-col w-1/4 gap-3">
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

      {viewMode === 'views' && (
        <OverlayWrapper
          overlaySubviews={overlaySubviews}
          inputHandler={runtime?.inputHandler ?? null}
          controlPanelWidth={window.innerWidth * 0.25}
        />
      )}
    </div>
  );
}

export default App;
