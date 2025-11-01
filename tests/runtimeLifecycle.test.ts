import { beforeEach, describe, expect, it } from 'bun:test';
import type { Core } from 'cytoscape';

import { createGraphRuntime } from '../src/graph/orchestrator';
import type { GraphConfig, GraphEdgeInfo, GraphNodeInfo } from '../src/graph/types';
import type { ProcessDefinition } from '../src/data/types';
import type {
  GraphInputBinding,
  GraphRuntimeDependencies,
  GraphRuntimeStore,
} from '../src/graph/runtimeTypes';
import type { SubgraphConfig } from '../src/graph/subgraphs';

const flushMicrotasks = async () => {
  await new Promise<void>((resolve) => queueMicrotask(resolve));
  await new Promise<void>((resolve) => queueMicrotask(resolve));
};

type StoreCallTracker = {
  setSelectedNode: Array<string | null>;
  setSelectedEdge: Array<string | null>;
  setActiveProcess: Array<string | null>;
  setActiveSubgraph: Array<string | null>;
  setSidebarHover: boolean[];
  clearSelections: number;
};

const createStoreMock = () => {
  const calls: StoreCallTracker = {
    setSelectedNode: [],
    setSelectedEdge: [],
    setActiveProcess: [],
    setActiveSubgraph: [],
    setSidebarHover: [],
    clearSelections: 0,
  };

  const store: GraphRuntimeStore = {
    setSelectedNode: (id) => {
      calls.setSelectedNode.push(id);
    },
    setSelectedEdge: (id) => {
      calls.setSelectedEdge.push(id);
    },
    setActiveProcess: (id) => {
      calls.setActiveProcess.push(id);
    },
    setActiveSubgraph: (id) => {
      calls.setActiveSubgraph.push(id);
    },
    setSidebarHover: (value) => {
      calls.setSidebarHover.push(value);
    },
    clearSelections: () => {
      calls.clearSelections += 1;
    },
  };

  return { store, calls };
};

const createControllerFactory = () => {
  const state = {
    instances: 0,
    captureInitialPositions: 0,
    focusNodes: 0,
    clearNodeFocus: 0,
    activateSubgraph: 0,
    restoreMainView: 0,
    showProcess: 0,
    clearProcessHighlight: 0,
    subgraphActive: false,
    processActive: false,
  };

  const factory: GraphRuntimeDependencies['createController'] = (_cy, _mainGraph) => {
    state.instances += 1;

    return {
      captureInitialPositions: () => {
        state.captureInitialPositions += 1;
      },
      focusNodes: async () => {
        state.focusNodes += 1;
      },
      clearNodeFocus: () => {
        state.clearNodeFocus += 1;
      },
      activateSubgraph: async () => {
        state.activateSubgraph += 1;
        state.subgraphActive = true;
      },
      restoreMainView: async () => {
        state.restoreMainView += 1;
        state.subgraphActive = false;
      },
      showProcess: async () => {
        state.showProcess += 1;
        state.processActive = true;
      },
      clearProcessHighlight: async () => {
        state.clearProcessHighlight += 1;
        state.processActive = false;
      },
      isSubgraphActive: (id?: string) => {
        if (!state.subgraphActive) {
          return false;
        }
        return id ? id === 'subgraph:test' : true;
      },
      getActiveSubgraphId: () => (state.subgraphActive ? 'subgraph:test' : null),
      isProcessActive: (id?: string) => {
        if (!state.processActive) {
          return false;
        }
        return id ? id === 'process:test' : true;
      },
    };
  };

  return { factory, state };
};

type CyInstanceState = {
  destroyCalls: number;
  readyCalls: number;
  layoutRuns: number;
};

const createCyFactory = () => {
  const instances: CyInstanceState[] = [];

  const factory: GraphRuntimeDependencies['createCy'] = (_options) => {
    const state: CyInstanceState = {
      destroyCalls: 0,
      readyCalls: 0,
      layoutRuns: 0,
    };

    const core = {
      destroy: () => {
        state.destroyCalls += 1;
      },
      one: (_event: string, handler: () => void) => {
        handler();
      },
      ready: (handler: () => void) => {
        state.readyCalls += 1;
        handler();
      },
      resize: () => {},
      layout: () => ({
        run: () => {
          state.layoutRuns += 1;
        },
      }),
      elements: [],
    } as unknown as Core;

    instances.push(state);
    return core;
  };

  return { factory, instances };
};

type BindingState = {
  attachCalls: number;
  detachCalls: number;
};

const createInputBindingFactory = () => {
  const instances: BindingState[] = [];

  const factory: GraphRuntimeDependencies['createInputHandler'] = (_cy, _handlers) => {
    const state: BindingState = {
      attachCalls: 0,
      detachCalls: 0,
    };

    const binding: GraphInputBinding = {
      attach: () => {
        state.attachCalls += 1;
      },
      detach: () => {
        state.detachCalls += 1;
      },
    };

    instances.push(state);
    return binding;
  };

  return { factory, instances };
};

type TestHarness = {
  runtime: ReturnType<typeof createGraphRuntime>;
  controllerState: ReturnType<typeof createControllerFactory>['state'];
  storeCalls: StoreCallTracker;
  cyInstances: CyInstanceState[];
  bindingInstances: BindingState[];
};

const nodeA: GraphNodeInfo = {
  id: 'node:a',
  label: 'Node A',
  branch: 'executive',
  type: 'agency',
  process: [],
  factoid: 'Node A fact',
  branchColor: '#000000',
  system: 'city',
  width: 220,
  height: 120,
};

const nodeB: GraphNodeInfo = {
  id: 'node:b',
  label: 'Node B',
  branch: 'legislative',
  type: 'agency',
  process: [],
  factoid: 'Node B fact',
  branchColor: '#222222',
  system: 'city',
  width: 220,
  height: 120,
};

const edgeAB: GraphEdgeInfo = {
  id: 'edge:ab',
  source: 'node:a',
  target: 'node:b',
  label: 'links',
  type: 'reports_to',
  process: [],
};

const baseGraph: GraphConfig = {
  nodes: [nodeA, nodeB],
  edges: [edgeAB],
  elements: [
    { data: { id: nodeA.id, label: nodeA.label } },
    { data: { id: nodeB.id, label: nodeB.label } },
    { data: { id: edgeAB.id, source: edgeAB.source, target: edgeAB.target } },
  ],
  layout: { name: 'preset', animate: false } as any,
  nodesHavePreset: true,
};

const processDef: ProcessDefinition = {
  id: 'process:test',
  label: 'Test Process',
  description: 'Test process description',
  nodes: [nodeA.id],
  edges: [{ source: nodeA.id, target: nodeB.id }],
};

const subgraphConfig: SubgraphConfig = {
  meta: {
    id: 'subgraph:test',
    label: 'Test Subgraph',
    entryNodeId: nodeA.id,
    description: 'Subgraph for testing',
    elements: {
      nodes: [{ data: { id: nodeA.id } }],
      edges: [],
    },
  },
  graph: baseGraph,
};

const buildHarness = (): TestHarness => {
  const container = {} as HTMLDivElement;
  const storeMock = createStoreMock();
  const controllerFactory = createControllerFactory();
  const inputBindingFactory = createInputBindingFactory();
  const cyFactory = createCyFactory();

  const runtime = createGraphRuntime(
    {
      container,
      mainGraph: baseGraph,
      subgraphByEntryId: new Map([[nodeA.id, subgraphConfig]]),
      subgraphById: new Map([[subgraphConfig.meta.id, subgraphConfig]]),
      data: {
        processes: [processDef],
        nodesById: new Map([
          [nodeA.id, nodeA],
          [nodeB.id, nodeB],
        ]),
      },
      store: storeMock.store,
    },
    {
      createController: controllerFactory.factory,
      createInputHandler: inputBindingFactory.factory,
      createCy: cyFactory.factory,
    },
  );

  return {
    runtime,
    controllerState: controllerFactory.state,
    storeCalls: storeMock.calls,
    cyInstances: cyFactory.instances,
    bindingInstances: inputBindingFactory.instances,
  };
};

describe('createGraphRuntime lifecycle', () => {
  let harness: TestHarness;

  beforeEach(() => {
    harness = buildHarness();
  });

  it('attaches and detaches input bindings during lifecycle', () => {
    harness.runtime.initialize();

    expect(harness.bindingInstances[0]?.attachCalls).toBe(1);
    expect(harness.controllerState.captureInitialPositions).toBe(1);
    expect(harness.cyInstances[0]?.readyCalls).toBe(1);

    harness.runtime.destroy();

    expect(harness.bindingInstances[0]?.detachCalls).toBe(1);
    expect(harness.cyInstances[0]?.destroyCalls).toBe(1);
    expect(harness.runtime.getCy()).toBeNull();
    expect(harness.runtime.getController()).toBeNull();
  });

  it('re-initializes cleanly after destroy', () => {
    harness.runtime.initialize();
    harness.runtime.destroy();
    harness.runtime.initialize();

    expect(harness.bindingInstances.length).toBe(2);
    expect(harness.bindingInstances[1]?.attachCalls).toBe(1);
    expect(harness.controllerState.instances).toBe(2);
  });
});

describe('createGraphRuntime commands', () => {
  let harness: TestHarness;

  beforeEach(() => {
    harness = buildHarness();
    harness.runtime.initialize();
  });

  it('highlights processes and records store intent', async () => {
    await harness.runtime.highlightProcess(processDef.id);

    expect(harness.controllerState.showProcess).toBe(1);
    expect(harness.storeCalls.setActiveProcess).toEqual([processDef.id]);
    expect(harness.storeCalls.setSidebarHover).toEqual([true]);
  });

  it('clears process highlight and releases store state', async () => {
    await harness.runtime.highlightProcess(processDef.id);
    await harness.runtime.clearProcessHighlight();

    expect(harness.controllerState.clearProcessHighlight).toBe(1);
    expect(harness.storeCalls.setActiveProcess).toEqual([processDef.id, null]);
  });

  it('activates and restores subgraphs', async () => {
    await harness.runtime.activateSubgraph(subgraphConfig.meta.id);
    expect(harness.controllerState.activateSubgraph).toBe(1);
    expect(harness.storeCalls.setActiveSubgraph).toEqual([subgraphConfig.meta.id]);

    await harness.runtime.restoreMainView();
    expect(harness.controllerState.restoreMainView).toBeGreaterThan(0);
    expect(harness.storeCalls.setActiveSubgraph.at(-1)).toBeNull();
  });

  it('handles entry node taps by delegating to subgraph activation', async () => {
    harness.runtime.handleNodeTap(nodeA.id);
    await flushMicrotasks();

    expect(harness.controllerState.activateSubgraph).toBe(1);
    expect(harness.storeCalls.setActiveSubgraph.at(-1)).toBe(subgraphConfig.meta.id);
  });

  it('handles edge taps by updating store selection', () => {
    harness.runtime.handleEdgeTap(edgeAB.id);

    expect(harness.storeCalls.setSelectedNode.at(-1)).toBeNull();
    expect(harness.storeCalls.setSelectedEdge.at(-1)).toBe(edgeAB.id);
    expect(harness.storeCalls.setSidebarHover.at(-1)).toBe(true);
  });

  it('focuses nodes and clears competing selections', async () => {
    await harness.runtime.focusNodes([nodeA.id]);

    expect(harness.controllerState.focusNodes).toBe(1);
    expect(harness.storeCalls.setSelectedNode.at(-1)).toBeNull();
    expect(harness.storeCalls.setSelectedEdge.at(-1)).toBeNull();
    expect(harness.storeCalls.setActiveProcess.at(-1)).toBeNull();
  });

  it('handles background taps by resetting selections and controller state', async () => {
    await harness.runtime.highlightProcess(processDef.id);

    const previousRestoreCount = harness.controllerState.restoreMainView;

    harness.runtime.handleBackgroundTap();
    await flushMicrotasks();

    expect(harness.storeCalls.clearSelections).toBeGreaterThan(0);
    expect(harness.controllerState.clearProcessHighlight).toBeGreaterThan(0);
    expect(harness.controllerState.restoreMainView).toBeGreaterThanOrEqual(
      previousRestoreCount,
    );
    expect(harness.controllerState.clearNodeFocus).toBeGreaterThan(0);
  });
});
