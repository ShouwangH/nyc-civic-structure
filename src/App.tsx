import cytoscape from 'cytoscape';
import type { Core } from 'cytoscape';
import cytoscapeElk from 'cytoscape-elk';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { buildMainGraph, buildSubgraphGraph } from './graph/data';
import { graphStyles } from './graph/styles';
import { GraphController } from './graph/controller';
import type { GraphEdgeInfo, GraphNodeInfo } from './graph/types';
import { governmentDatasets, governmentScopes } from './data/datasets';
import type { GovernmentDataset, GovernmentScope } from './data/datasets';
import type { ProcessDefinition, SubgraphFile } from './data/types';
import { NODE_HEIGHT, NODE_WIDTH } from './graph/constants';

cytoscape.use(cytoscapeElk);

type SubgraphConfig = {
  meta: SubgraphFile;
  graph: ReturnType<typeof buildSubgraphGraph>;
};

const processesForDataset = (dataset: GovernmentDataset): ProcessDefinition[] =>
  dataset.processes ?? [];

const DEFAULT_PROCESS_COLOR = '#2563eb';

const toTitleCase = (value: string) => {
  return value
    .replace(/[_-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const buildPlaceholderProcessNode = (id: string): GraphNodeInfo => ({
  id,
  label: toTitleCase(id),
  branch: 'process',
  type: 'process',
  process: [],
  factoid: 'Process participant highlighted for this view.',
  branchColor: DEFAULT_PROCESS_COLOR,
  system: 'process',
  width: NODE_WIDTH,
  height: NODE_HEIGHT,
});

const buildProcessEdgeInfo = (
  processId: string,
  edge: ProcessDefinition['edges'][number],
): GraphEdgeInfo => ({
  id: `${edge.source}->${edge.target}`,
  source: edge.source,
  target: edge.target,
  label: '',
  type: 'relationship',
  process: [processId],
});

function App() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cyRef = useRef<Core | null>(null);
  const controllerRef = useRef<GraphController | null>(null);

  const [controlsOpen, setControlsOpen] = useState(true);
  const [activeScope, setActiveScope] = useState<GovernmentScope>('city');

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [activeProcessId, setActiveProcessId] = useState<string | null>(null);
  const [activeSubgraphId, setActiveSubgraphId] = useState<string | null>(null);
  const [isSidebarHover, setIsSidebarHover] = useState(false);

  const dataset = useMemo<GovernmentDataset>(() => governmentDatasets[activeScope], [activeScope]);

  const mainGraph = useMemo(() => buildMainGraph(dataset.structure, dataset.edges), [dataset]);

  const subgraphConfigs = useMemo<SubgraphConfig[]>(() => {
    return (dataset.subgraphs ?? []).map((subgraph) => ({
      meta: subgraph,
      graph: buildSubgraphGraph(subgraph),
    }));
  }, [dataset]);

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

  const processes = useMemo(() => processesForDataset(dataset), [dataset]);

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

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setActiveProcessId(null);
    setActiveSubgraphId(null);
    setIsSidebarHover(false);

    const cy = cytoscape({
      container: containerRef.current,
      elements: mainGraph.elements,
      layout: mainGraph.layout,
      style: graphStyles,
    });

    cyRef.current = cy;

    const controller = new GraphController(cy, mainGraph);
    controllerRef.current = controller;

    cy.one('layoutstop', () => {
      controller.captureInitialPositions();
    });

    cy.ready(() => {
      cy.resize();
      const layout = cy.layout(mainGraph.layout);
      layout.run();
    });

    const handleNodeTap = (event: cytoscape.EventObject) => {
      const nodeId = event.target.id();
      const node = event.target;
      const controller = controllerRef.current;

      if (!controller) {
        return;
      }

      const subgraphConfig = subgraphByEntryId.get(nodeId);
      if (subgraphConfig) {
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
        setActiveProcessId(null);

        void controller
          .activateSubgraph(subgraphConfig.graph, {
            id: subgraphConfig.meta.id,
            entryNodeId: subgraphConfig.meta.entryNodeId,
          })
          .then(() => {
            setActiveSubgraphId(subgraphConfig.meta.id);
            setIsSidebarHover(true);
          });

        return;
      }

      if (node && node.length > 0) {
        setSelectedEdgeId(null);
        setSelectedNodeId(nodeId);
        setIsSidebarHover(true);
      }
    };

    const handleEdgeTap = (event: cytoscape.EventObject) => {
      const edgeId = event.target.id();
      setSelectedNodeId(null);
      setSelectedEdgeId(edgeId);
      setIsSidebarHover(true);
    };

    const handleBackgroundTap = (event: cytoscape.EventObject) => {
      if (event.target !== cy) {
        return;
      }

      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      setIsSidebarHover(false);

      const controller = controllerRef.current;
      if (controller?.isProcessActive()) {
        void controller.clearProcessHighlight().then(() => {
          setActiveProcessId(null);
        });
      } else {
        setActiveProcessId(null);
      }
      if (controller?.isSubgraphActive()) {
        void controller.restoreMainView().then(() => {
          setActiveSubgraphId(null);
        });
      }
    };

    const handleZoom = () => {
      const controller = controllerRef.current;
      if (!controller) {
        return;
      }

      const processActive = controller.isProcessActive();
      const subgraphActive = controller.isSubgraphActive();

      if (!processActive && !subgraphActive) {
        return;
      }

      if (controller.shouldIgnoreZoomReset()) {
        return;
      }

      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      setIsSidebarHover(false);

      if (processActive) {
        void controller.clearProcessHighlight().then(() => {
          setActiveProcessId(null);
        });
      } else {
        setActiveProcessId(null);
      }

      if (subgraphActive) {
        void controller.restoreMainView().then(() => {
          setActiveSubgraphId(null);
        });
      }
    };

    cy.on('tap', 'node', handleNodeTap);
    cy.on('tap', 'edge', handleEdgeTap);
    cy.on('tap', handleBackgroundTap);
    cy.on('zoom', handleZoom);

    return () => {
      cy.removeListener('tap', 'node', handleNodeTap);
      cy.removeListener('tap', 'edge', handleEdgeTap);
      cy.removeListener('tap', handleBackgroundTap);
      cy.removeListener('zoom', handleZoom);
      cy.destroy();
      cyRef.current = null;
      controllerRef.current = null;
    };
  }, [mainGraph, subgraphByEntryId]);

  const activeNode = useMemo(() => {
    return selectedNodeId ? nodesById.get(selectedNodeId) ?? null : null;
  }, [nodesById, selectedNodeId]);

  const activeEdge = useMemo(() => {
    return selectedEdgeId ? edgesById.get(selectedEdgeId) ?? null : null;
  }, [edgesById, selectedEdgeId]);

  const activeProcess = useMemo(() => {
    return processes.find((process) => process.id === activeProcessId) ?? null;
  }, [processes, activeProcessId]);

  const isSubgraphActive = Boolean(activeSubgraphId);

  const handleProcessToggle = useCallback(
    async (processId: string) => {
      const controller = controllerRef.current;
      if (!controller) {
        return;
      }

      if (activeSubgraphId) {
        await controller.restoreMainView();
        setActiveSubgraphId(null);
      }

      if (activeProcessId === processId) {
        await controller.clearProcessHighlight();
        setActiveProcessId(null);
        if (!selectedNodeId && !selectedEdgeId) {
          setIsSidebarHover(false);
        }
        return;
      }

      const process = processes.find((item) => item.id === processId);
      if (!process) {
        return;
      }

      const targetNodeIds = process.nodes;
      const targetEdgeIds = process.edges.map((edge) => `${edge.source}->${edge.target}`);
      const currentNodeIds = cyRef.current ? cyRef.current.nodes().map((node) => node.id()) : [];
      const currentEdgeIds = cyRef.current ? cyRef.current.edges().map((edge) => edge.id()) : [];
      console.log('[Process] Toggle request', {
        processId,
        targetNodeIds,
        targetEdgeIds,
        currentNodeIds,
        currentEdgeIds,
      });

      const nodeInfos = process.nodes.map((nodeId) => nodesById.get(nodeId) ?? buildPlaceholderProcessNode(nodeId));
      const edgeInfos = process.edges.map((edge) => buildProcessEdgeInfo(process.id, edge));

      setSelectedNodeId(null);
      setSelectedEdgeId(null);

      await controller.showProcess(process, nodeInfos, edgeInfos);
      setActiveProcessId(processId);
      setIsSidebarHover(true);
    },
    [activeProcessId, activeSubgraphId, nodesById, processes],
  );

  const handleSubgraphToggle = useCallback(
    async (subgraphId: string) => {
      const controller = controllerRef.current;
      if (!controller) {
        return;
      }

      if (activeProcessId) {
        await controller.clearProcessHighlight();
        setActiveProcessId(null);
      }

      if (controller.isSubgraphActive(subgraphId)) {
        await controller.restoreMainView();
        setActiveSubgraphId(null);
        setIsSidebarHover(false);
        return;
      }

      const config = subgraphById.get(subgraphId);
      if (!config) {
        return;
      }

      const targetNodeIds = config.graph.nodes.map((node) => node.id);
      const currentNodeIds = cyRef.current ? cyRef.current.nodes().map((node) => node.id()) : [];
      console.log('[Subgraph] Toggle request', {
        subgraphId,
        entryNodeId: config.meta.entryNodeId,
        targetNodeIds,
        currentNodeIds,
      });

      setSelectedNodeId(null);
      setSelectedEdgeId(null);

      await controller.activateSubgraph(config.graph, {
        id: config.meta.id,
        entryNodeId: config.meta.entryNodeId,
      });
      setActiveSubgraphId(config.meta.id);
      setIsSidebarHover(true);
    },
    [activeProcessId, subgraphById],
  );

  const selectionActive =
    Boolean(selectedNodeId) ||
    Boolean(selectedEdgeId) ||
    Boolean(activeProcessId) ||
    isSubgraphActive;
  const shouldShowSidebar = selectionActive || isSidebarHover;

  const handleSidebarMouseLeave = () => {
    if (!selectionActive) {
      setIsSidebarHover(false);
    }
  };

  const handleHotzoneLeave = () => {
    if (!selectionActive) {
      setIsSidebarHover(false);
    }
  };

  const selectedEdgeSource = activeEdge ? nodesById.get(activeEdge.source) : null;
  const selectedEdgeTarget = activeEdge ? nodesById.get(activeEdge.target) : null;
  const graphOffsetClass = shouldShowSidebar ? 'lg:pr-[380px]' : '';

  const controlsWidthClass = controlsOpen ? 'w-72' : 'w-16';

  return (
    <div className="relative flex min-h-screen flex-col bg-white">
      <header className="border-b border-slate-200 bg-slate-50 px-6 py-5">
        <h1 className="text-2xl font-semibold text-slate-900">
          {dataset.structure.meta.title}
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          {dataset.structure.meta.description}
        </p>
      </header>

      <main className="flex flex-1 overflow-hidden bg-white">
        <aside
          className={`relative flex flex-shrink-0 flex-col border-r border-slate-200 bg-slate-50 transition-all duration-200 ${controlsWidthClass}`}
          aria-label="Controls menu"
        >
          <button
            type="button"
            onClick={() => setControlsOpen((open) => !open)}
            aria-expanded={controlsOpen}
            className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
          >
            <span>{controlsOpen ? 'Hide Menu' : 'Show Menu'}</span>
            <span>{controlsOpen ? '⟨' : '⟩'}</span>
          </button>

          {controlsOpen ? (
            <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 py-5 text-sm text-slate-700">
              <section className="space-y-3">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Scope
                </h2>
                <div className="space-y-2">
                  {governmentScopes.map((scope) => (
                    <label
                      key={scope.id}
                      className="flex cursor-pointer items-center justify-between rounded-md border border-transparent px-3 py-2 transition hover:border-slate-300 hover:bg-white"
                    >
                      <span className="font-medium text-slate-800">{scope.label}</span>
                      <input
                        type="radio"
                        name="scope"
                        value={scope.id}
                        checked={activeScope === scope.id}
                        onChange={() => setActiveScope(scope.id)}
                        className="h-4 w-4 accent-blue-600"
                      />
                    </label>
                  ))}
                </div>
              </section>

              <section className="space-y-3">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Subgraphs
                </h2>
                {subgraphConfigs.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    No focused subgraphs available yet for this scope.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {subgraphConfigs.map((config) => {
                      const isActive = activeSubgraphId === config.meta.id;
                      return (
                        <button
                          key={config.meta.id}
                          type="button"
                          onClick={() => {
                            void handleSubgraphToggle(config.meta.id);
                          }}
                          className={`w-full rounded-md px-3 py-2 text-left text-sm font-medium transition ${
                            isActive
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                          }`}
                        >
                          {config.meta.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="space-y-3">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Processes
                </h2>
                {processes.length === 0 ? (
                  <p className="text-xs text-slate-500">No spotlight processes yet.</p>
                ) : (
                  <div className="space-y-2">
                    {processes.map((process) => {
                      const isActive = process.id === activeProcessId;
                      return (
                        <button
                          key={process.id}
                          type="button"
                          onClick={() => {
                            void handleProcessToggle(process.id);
                          }}
                          className={`w-full rounded-md px-3 py-2 text-left text-sm font-semibold transition ${
                            isActive
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                          }`}
                        >
                          {process.label}
                        </button>
                      );
                    })}
                  </div>
                )}
                {activeProcess && (
                  <div className="rounded-md bg-slate-100 px-3 py-2 text-xs text-slate-600">
                    <p className="font-semibold text-slate-700">{activeProcess.label}</p>
                    <p className="mt-1">{activeProcess.description}</p>
                  </div>
                )}
              </section>
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center text-xs font-semibold uppercase tracking-wide text-slate-500">
              Menu
            </div>
          )}
        </aside>

        <section
          className={`relative flex flex-1 flex-col gap-6 px-6 py-6 ${graphOffsetClass}`}
        >
          <div className="flex flex-1 min-h-[75vh] lg:min-h-[82vh] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div
              ref={containerRef}
              className="h-full w-full min-h-[75vh] lg:min-h-[82vh] rounded-lg bg-slate-50"
              role="presentation"
            />
          </div>
          <p className="text-xs text-slate-500">
            Zoom with scroll, drag to pan, click a node or edge to inspect. Use the left menu to
            switch scopes, spotlight processes, or explode a subgraph view.
          </p>
        </section>

        {shouldShowSidebar && (
          <aside
            className="pointer-events-auto z-30 hidden h-full flex-col overflow-y-auto border-l border-slate-200 bg-white px-6 py-6 text-sm text-slate-600 shadow-xl lg:flex lg:w-[320px]"
            onMouseEnter={() => setIsSidebarHover(true)}
            onMouseLeave={handleSidebarMouseLeave}
          >
            <div className="flex items-start justify-between">
              <h2 className="text-lg font-medium text-slate-900">
                {activeNode
                  ? activeNode.label
                  : activeEdge
                    ? `${selectedEdgeSource?.label ?? activeEdge.source} → ${selectedEdgeTarget?.label ?? activeEdge.target}`
                    : activeProcess
                      ? `${activeProcess.label} process`
                      : activeSubgraphId
                        ? subgraphById.get(activeSubgraphId)?.meta.label ?? 'Details'
                        : 'Details'}
              </h2>
              {(selectedNodeId || selectedEdgeId || activeProcessId || isSubgraphActive) && (
                <button
                  type="button"
                  onClick={() => {
                    const controller = controllerRef.current;
                    setSelectedNodeId(null);
                    setSelectedEdgeId(null);
                    setIsSidebarHover(false);
                    if (activeProcessId) {
                      if (controller) {
                        void controller.clearProcessHighlight().then(() => {
                          setActiveProcessId(null);
                        });
                      } else {
                        setActiveProcessId(null);
                      }
                    } else {
                      setActiveProcessId(null);
                    }
                    if (isSubgraphActive) {
                      if (controller) {
                        void controller.restoreMainView().then(() => {
                          setActiveSubgraphId(null);
                        });
                      } else {
                        setActiveSubgraphId(null);
                      }
                    }
                  }}
                  className="text-xs font-medium text-slate-500 transition hover:text-slate-700"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="mt-4 space-y-4 text-sm text-slate-600">
              {activeNode ? (
                <>
                  <p>{activeNode.factoid}</p>
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Branch</dt>
                      <dd className="font-semibold text-slate-900">
                        {activeNode.branch}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Type</dt>
                      <dd className="font-semibold text-slate-900">
                        {activeNode.type}
                      </dd>
                    </div>
                    {activeNode.process && activeNode.process.length > 0 && (
                      <div className="space-y-1">
                        <dt className="text-slate-500">Processes</dt>
                        <dd className="flex flex-wrap gap-2">
                          {activeNode.process.map((processName) => (
                            <span
                              key={processName}
                              className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium capitalize text-slate-700"
                            >
                              {processName}
                            </span>
                          ))}
                        </dd>
                      </div>
                    )}
                  </dl>
                </>
              ) : activeEdge ? (
                <dl className="space-y-2">
                  <div>
                    <dt className="text-slate-500">From</dt>
                    <dd className="font-semibold text-slate-900">
                      {selectedEdgeSource?.label ?? activeEdge.source}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">To</dt>
                    <dd className="font-semibold text-slate-900">
                      {selectedEdgeTarget?.label ?? activeEdge.target}
                    </dd>
                  </div>
                  {activeEdge.label && (
                    <div>
                      <dt className="text-slate-500">Relationship</dt>
                      <dd className="text-slate-700">{activeEdge.label}</dd>
                    </div>
                  )}
                </dl>
              ) : activeProcess ? (
                <div className="space-y-3">
                  <p>{activeProcess.description}</p>
                  {activeProcess.steps && (
                    <ul className="space-y-2 text-xs text-slate-500">
                      {activeProcess.steps.map((step) => (
                        <li key={step.id}>
                          <span className="font-semibold text-slate-700">{step.title}:</span>{' '}
                          {step.description}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : isSubgraphActive ? (
                <p className="text-slate-500">
                  Use the left menu or click the highlighted hub node to collapse this focused
                  subgraph and return to the full structure.
                </p>
              ) : (
                <p className="text-slate-500">
                  Select a civic entity, relationship, or process to see focused details.
                </p>
              )}
            </div>
          </aside>
        )}
      </main>

      <div
        className="fixed inset-y-0 right-0 w-4 lg:w-6"
        onMouseEnter={() => setIsSidebarHover(true)}
        onMouseLeave={handleHotzoneLeave}
        aria-hidden="true"
      />
    </div>
  );
}

export default App;
