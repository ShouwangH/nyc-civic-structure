import cytoscape from 'cytoscape';
import type { Core, LayoutOptions } from 'cytoscape';
import { useEffect, useMemo, useRef, useState } from 'react';
import governmentData from '../data/government.json';

type GovernmentDataset = {
  meta: {
    title: string;
    description: string;
  };
  nodes: Array<{
    id: string;
    label: string;
    type: string;
    branch: string;
    process?: string[];
    factoid?: string;
    position?: {
      x: number;
      y: number;
    };
  }>;
  edges: Array<{
    id?: string;
    source: string;
    target: string;
    label?: string;
    type?: string;
    process?: string[];
  }>;
};

const branchPalette: Record<string, string> = {
  constitutional: '#1d4ed8',
  administrative: '#7c3aed',
  executive: '#0369a1',
  legislative: '#1d4ed8',
  community: '#f97316',
  planning: '#9333ea',
  financial: '#16a34a',
};

const NODE_WIDTH = 120;
const NODE_HEIGHT = 80;

const dataset = governmentData as GovernmentDataset;

function App() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const nodesHavePreset = useMemo(
    () => dataset.nodes.every((node) => Boolean(node.position)),
    [],
  );

  const elements = useMemo(() => {
    const nodes = dataset.nodes.map((node) => ({
      data: {
        id: node.id,
        label: node.label,
        branch: node.branch,
        type: node.type,
        process: node.process ?? [],
        factoid: node.factoid ?? 'No details available yet.',
        branchColor: branchPalette[node.branch] ?? '#0f172a',
        system: node.branch === 'community' ? 'borough' : 'charter',
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
      },
      position: node.position,
    }));

    const edges = dataset.edges.map((edge) => ({
      data: {
        id: edge.id ?? `${edge.source}-${edge.target}`,
        source: edge.source,
        target: edge.target,
        label: edge.label ?? '',
        type: edge.type ?? 'relationship',
        process: edge.process ?? [],
      },
    }));

    return [...nodes, ...edges];
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
  }, [nodesHavePreset]);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const cy: Core = cytoscape({
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
          selector: 'node:selected',
          style: {
            'border-color': '#0f172a',
            'border-width': '3px',
          },
        },
      ],
    });

    cy.ready(() => {
      cy.resize();
      cy.fit(undefined, 40);
      if (nodesHavePreset) {
        cy.nodes().lock();
      }
    });

    cy.on('tap', 'node', (event) => {
      const nodeId = event.target.id();
      setSelectedNode(nodeId);
    });

    cy.on('tap', (event) => {
      if (event.target === cy) {
        setSelectedNode(null);
      }
    });

    return () => {
      cy.destroy();
    };
  }, [elements, layoutOptions, nodesHavePreset]);

  const activeNode = useMemo(() => {
    return dataset.nodes.find((node) => node.id === selectedNode) ?? null;
  }, [selectedNode]);

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="border-b border-slate-200 bg-slate-50 px-6 py-5">
        <h1 className="text-2xl font-semibold text-slate-900">
          {dataset.meta.title}
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          {dataset.meta.description}
        </p>
      </header>

      <main className="flex flex-1 flex-col gap-6 p-6 lg:flex-row">
        <section className="flex w-full flex-1 flex-col gap-4">
          <div className="flex h-[70vh] min-h-[480px] flex-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div
              ref={containerRef}
              className="h-full w-full rounded-lg bg-slate-50"
              role="presentation"
            />
          </div>
          <p className="text-xs text-slate-500">
            Zoom with scroll, drag to pan, click a node to inspect. Tap empty
            space to reset.
          </p>
        </section>

        <aside className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-medium text-slate-900">
            {activeNode ? activeNode.label : 'Dataset Snapshot'}
          </h2>

          {activeNode ? (
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <p>{activeNode.factoid}</p>
              <dl className="space-y-2">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Branch</dt>
                  <dd className="font-semibold text-slate-900">
                    {activeNode.branch}
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
            </div>
          ) : (
            <div className="mt-4 space-y-4 text-sm text-slate-600">
              <dl className="space-y-2">
                <div className="flex justify-between">
                  <dt>Total civic entities</dt>
                  <dd className="font-semibold text-slate-900">
                    {dataset.nodes.length}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt>Relationships mapped</dt>
                  <dd className="font-semibold text-slate-900">
                    {dataset.edges.length}
                  </dd>
                </div>
              </dl>
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-900">
                  Core processes
                </h3>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-legislative" />
                    Legislative flow
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-budget" />
                    Budget cycle
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-ulurp" />
                    ULURP review
                  </li>
                </ul>
              </div>
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}

export default App;
