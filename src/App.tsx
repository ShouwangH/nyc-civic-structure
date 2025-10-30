import cytoscape from 'cytoscape';
import type { Core, LayoutOptions } from 'cytoscape';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import structureData from '../data/structure.json';
import edgesData from '../data/edges.json';
import ulurpData from '../data/processes/ulurp.json';

type StructureNode = (typeof structureData.nodes)[number];
type ProcessDefinition = {
  id: string;
  label: string;
  description: string;
  nodes: string[];
  edges: Array<{ source: string; target: string }>;
  steps?: Array<{ id: string; title: string; description: string }>;
};

const processes: ProcessDefinition[] = [ulurpData as ProcessDefinition];

const branchPalette: Record<string, string> = {
  law: '#1d4ed8',
  administrative: '#7c3aed',
  executive: '#0369a1',
  legislative: '',
  community: '#f97316',
  planning: '#9333ea',
  financial: '#16a34a',
};

type SystemCategory = 'charter' | 'process' | 'borough';

const categorizeSystem = (node: StructureNode): SystemCategory => {
  if (node.branch === 'community') {
    return 'borough';
  }
  if (node.type === 'process' || node.branch === 'planning' || node.branch === 'financial') {
    return 'process';
  }
  return 'charter';
};

const NODE_WIDTH = 120;
const NODE_HEIGHT = 80;

const nodes = structureData.nodes;

type RawEdge = {
  source: string;
  target: string;
  id?: string;
  label?: string;
  type?: string;
  process?: string[];
};

type EdgeRecord = {
  id: string;
  source: string;
  target: string;
  label: string;
  type: string;
  process: string[];
};

const rawEdges = edgesData.edges as RawEdge[];

const edges: EdgeRecord[] = rawEdges.map((edge) => ({
  id: edge.id ?? `${edge.source}->${edge.target}`,
  source: edge.source,
  target: edge.target,
  label: edge.label ?? '',
  type: edge.type ?? 'relationship',
  process: edge.process ?? [],
}));

const nodesHavePreset = nodes.every((node) => Boolean(node.position));

function App() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cyRef = useRef<Core | null>(null);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [activeProcessId, setActiveProcessId] = useState<string | null>(null);
  const [isSidebarHover, setIsSidebarHover] = useState(false);

  const nodesById = useMemo(() => {
    const map = new Map<string, StructureNode>();
    nodes.forEach((node) => map.set(node.id, node));
    return map;
  }, []);

  const elements = useMemo(() => {
    const nodeElements = nodes.map((node) => ({
      data: {
        id: node.id,
        label: node.label,
        branch: node.branch,
        type: node.type,
        process: node.process ?? [],
        factoid: node.factoid ?? 'No details available yet.',
        branchColor: branchPalette[node.branch] ?? '#0f172a',
        system: categorizeSystem(node),
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
      },
      position: node.position,
    }));

    const edgeElements = edges.map((edge) => ({
      data: {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.label,
        type: edge.type,
        process: edge.process,
      },
    }));

    return [...nodeElements, ...edgeElements];
  }, []);

  const layoutOptions = useMemo<LayoutOptions>(() => {
    if (nodesHavePreset) {
      return {
        name: 'preset',
        fit: false,
      };
    }

    return {
      name: 'breadthfirst',
      directed: true,
      padding: 50,
      spacingFactor: 1.4,
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      layout: layoutOptions,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': 'data(branchColor)',
            'border-color': 'rgba(15, 23, 42, 0.18)',
            'border-width': '2px',
            'width': 'data(width)',
            'height': 'data(height)',
            label: 'data(label)',
            color: '#0f172a',
            'font-size': '12px',
            'font-weight': 600,
            'text-wrap': 'wrap',
            'text-max-width': '96px',
            'text-valign': 'center',
            'text-halign': 'center',
            'padding': '8px',
            'shape': 'round-rectangle',
          },
        },
        {
          selector: 'node[system = "borough"]',
          style: {
            'background-color': '#fb923c',
            color: '#7f1d1d',
            'border-color': '#ea580c',
            'border-width': '4px',
          },
        },
        {
          selector: 'node[system = "charter"]',
          style: {
            color: '#0f172a',
          },
        },
        {
          selector: 'edge',
          style: {
            'curve-style': 'bezier',
            'width': '2px',
            'line-color': '#334155',
            'line-opacity': 0.9,
            'target-arrow-color': '#334155',
            'target-arrow-shape': 'triangle',
            'target-arrow-fill': 'filled',
            'opacity': 0.9,
            'arrow-scale': 1.1,
            label: 'data(label)',
            'font-size': '10px',
            color: '#334155',
            'text-background-color': '#f8fafc',
            'text-background-opacity': 0.9,
            'text-background-padding': '2px',
            'text-rotation': 'autorotate',
          },
        },
        {
          selector: 'edge[label = ""]',
          style: {
            'text-opacity': 0,
          },
        },
        {
          selector: '.dimmed',
          style: {
            opacity: 0.18,
            'text-opacity': 0.18,
          },
        },
        {
          selector: 'edge.dimmed',
          style: {
            'line-color': '#cbd5f5',
            'target-arrow-color': '#cbd5f5',
            opacity: 0.18,
          },
        },
        {
          selector: '.process-active',
          style: {
            'background-color': '#bfdbfe',
            'border-color': '#2563eb',
            'border-width': '3px',
          },
        },
        {
          selector: '.process-active-edge',
          style: {
            'line-color': '#2563eb',
            'target-arrow-color': '#2563eb',
            'width': '3px',
            opacity: 0.95,
          },
        },
        {
          selector: 'node:selected',
          style: {
            'border-color': '#0f172a',
            'border-width': '3px',
          },
        },
      ],
    });

    cyRef.current = cy;

    cy.ready(() => {
      cy.resize();
      cy.fit(undefined, 40);
      if (nodesHavePreset) {
        cy.nodes().lock();
      }
    });

    cy.on('tap', 'node', (event) => {
      const nodeId = event.target.id();
      setSelectedEdgeId(null);
      setSelectedNodeId(nodeId);
      setIsSidebarHover(true);
    });

    cy.on('tap', 'edge', (event) => {
      const edgeId = event.target.id();
      setSelectedNodeId(null);
      setSelectedEdgeId(edgeId);
      setIsSidebarHover(true);
    });

    cy.on('tap', (event) => {
      if (event.target === cy) {
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
        setActiveProcessId(null);
        setIsSidebarHover(false);
      }
    });

    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, [elements, layoutOptions]);

  const activeNode = useMemo(() => {
    return nodes.find((node) => node.id === selectedNodeId) ?? null;
  }, [selectedNodeId]);

  const activeEdge = useMemo(() => {
    return edges.find((edge) => edge.id === selectedEdgeId) ?? null;
  }, [selectedEdgeId]);

  const activeProcess = useMemo(() => {
    return processes.find((process) => process.id === activeProcessId) ?? null;
  }, [activeProcessId]);

  const applyProcessHighlight = useCallback(
    (process: ProcessDefinition | null) => {
      const cy = cyRef.current;
      if (!cy) {
        return;
      }

      cy.batch(() => {
        cy.nodes().removeClass('dimmed process-active');
        cy.edges().removeClass('dimmed process-active-edge');

        if (!process) {
          return;
        }

        const processNodes = new Set(process.nodes);
        const processEdgeKeys = new Set(
          process.edges.map((edge) => `${edge.source}->${edge.target}`),
        );

        cy.nodes().forEach((node) => {
          if (processNodes.has(node.id())) {
            node.addClass('process-active');
          } else {
            node.addClass('dimmed');
          }
        });

        cy.edges().forEach((edge) => {
          const key = `${edge.data('source')}->${edge.data('target')}`;
          if (processEdgeKeys.has(key)) {
            edge.addClass('process-active-edge');
          } else {
            edge.addClass('dimmed');
          }
        });
      });
    },
    [],
  );

  useEffect(() => {
    applyProcessHighlight(activeProcess ?? null);
  }, [activeProcess, applyProcessHighlight]);

  const handleProcessToggle = useCallback(
    (processId: string) => {
      setActiveProcessId((current) => {
        const next = current === processId ? null : processId;
        if (next) {
          setIsSidebarHover(true);
        } else if (!selectedNodeId && !selectedEdgeId) {
          setIsSidebarHover(false);
        }
        return next;
      });
    },
    [selectedEdgeId, selectedNodeId],
  );

  const selectionActive =
    Boolean(selectedNodeId) || Boolean(selectedEdgeId) || Boolean(activeProcessId);
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

  return (
    <div className="relative flex min-h-screen flex-col bg-white">
      <header className="border-b border-slate-200 bg-slate-50 px-6 py-5">
        <h1 className="text-2xl font-semibold text-slate-900">
          {structureData.meta.title}
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          {structureData.meta.description}
        </p>
      </header>

      <main className="relative flex flex-1 flex-col gap-6 p-6">
        <section className={`relative flex w-full flex-1 flex-col gap-4 ${graphOffsetClass}`}>
          <div className="flex flex-1 min-h-[75vh] lg:min-h-[82vh] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div
              ref={containerRef}
              className="h-full w-full min-h-[75vh] lg:min-h-[82vh] rounded-lg bg-slate-50"
              role="presentation"
            />
          </div>
          <p className="text-xs text-slate-500">
            Zoom with scroll, drag to pan, click a node or edge to inspect. Tap empty space to
            reset selections.
          </p>
        </section>

        {shouldShowSidebar && (
          <aside
            className="pointer-events-auto z-30 mt-6 flex w-full flex-col rounded-lg border border-slate-200 bg-white p-6 shadow-xl transition-all duration-200 lg:absolute lg:inset-y-6 lg:right-6 lg:mt-0 lg:max-w-md"
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
                      : 'Details'}
              </h2>
              {(selectedNodeId || selectedEdgeId || activeProcessId) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedNodeId(null);
                    setSelectedEdgeId(null);
                    setActiveProcessId(null);
                    setIsSidebarHover(false);
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
                <p>{activeProcess.description}</p>
              ) : (
                <p className="text-slate-500">
                  Select a civic entity, relationship, or process to see focused details.
                </p>
              )}

              <div className="border-t border-slate-200 pt-4">
                <h3 className="text-sm font-semibold text-slate-900">Processes</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {processes.map((process) => {
                    const isActive = process.id === activeProcessId;
                    return (
                      <button
                        key={process.id}
                        type="button"
                        onClick={() => handleProcessToggle(process.id)}
                        className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                          isActive
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {process.label}
                      </button>
                    );
                  })}
                </div>
                {activeProcess && (
                  <ul className="mt-3 space-y-2 text-xs text-slate-500">
                    {activeProcess.steps?.map((step) => (
                      <li key={step.id}>
                        <span className="font-semibold text-slate-700">{step.title}:</span>{' '}
                        {step.description}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
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
