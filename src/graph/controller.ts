import type { Core, LayoutOptions } from 'cytoscape';
import type { GraphConfig, GraphEdgeInfo, GraphNodeInfo } from './types';
import type { ProcessDefinition } from '../data/types';
import { logPositions } from './utils/logging';

type ActiveSubgraph = {
  id: string;
  entryNodeId: string;
  graph: GraphConfig;
};

const copyPosition = (position: { x: number; y: number }) => ({ x: position.x, y: position.y });

const cloneLayoutOptions = (layout: LayoutOptions, overrides: Partial<LayoutOptions> = {}) =>
  ({
    ...layout,
    ...overrides,
  }) as LayoutOptions;

class GraphController {
  private cy: Core;
  private mainGraph: GraphConfig;
  private activeSubgraph: ActiveSubgraph | null = null;
  private transitionInProgress = false;
  private addedNodeIds = new Set<string>();
  private addedEdgeIds = new Set<string>();
  private ignoreZoomUntil = 0;
  private activeProcess: {
    id: string;
    tempNodeIds: Set<string>;
    tempEdgeIds: Set<string>;
    nodeIds: Set<string>;
    edgeIds: Set<string>;
  } | null = null;
  private processTransitionInProgress = false;

  constructor(cy: Core, mainGraph: GraphConfig) {
    this.cy = cy;
    this.mainGraph = mainGraph;
  }

  captureInitialPositions() {
    this.cy.nodes().forEach((node) => {
      node.data('orgPos', copyPosition(node.position()));
    });
  }

  markProgrammaticZoom(delayMs = 650) {
    this.ignoreZoomUntil = performance.now() + delayMs;
  }

  shouldIgnoreZoomReset() {
    return performance.now() <= this.ignoreZoomUntil;
  }

  isSubgraphActive(id?: string) {
    if (!this.activeSubgraph) {
      return false;
    }
    return id ? this.activeSubgraph.id === id : true;
  }

  getActiveSubgraphId() {
    return this.activeSubgraph?.id ?? null;
  }

  isProcessActive(id?: string) {
    if (!this.activeProcess) {
      return false;
    }
    return id ? this.activeProcess.id === id : true;
  }

  async activateSubgraph(subgraph: GraphConfig, meta: { id: string; entryNodeId: string }) {
    if (this.transitionInProgress) {
      return;
    }

    if (this.activeSubgraph?.id === meta.id) {
      return;
    }

    if (this.activeSubgraph) {
      await this.restoreMainView();
    }

    const requestedNodeIds = subgraph.nodes.map((node) => node.id);
    const existingNodeIdsBefore = this.cy.nodes().map((node) => node.id());
    console.log('[Subgraph] Activating', {
      subgraphId: meta.id,
      entryNodeId: meta.entryNodeId,
      requestedNodeIds,
      existingNodeIdsBefore,
    });
    logPositions('Subgraph activating snapshot', this.cy.nodes());

    const entryNode = this.cy.getElementById(meta.entryNodeId);
    const centerPosition =
      entryNode && entryNode.length > 0 ? copyPosition(entryNode.position()) : { x: 0, y: 0 };

    this.transitionInProgress = true;
    this.markProgrammaticZoom();

    console.log('[Subgraph] Restoring main view', {
      activeSubgraphId: this.activeSubgraph ? this.activeSubgraph.id : null,
      nodeIdsBefore: this.cy.nodes().map((node) => node.id()),
    });
    logPositions('Subgraph restoring snapshot', this.cy.nodes());

    const existingNodeIds = new Set(this.cy.nodes().map((node) => node.id()));

    this.cy.batch(() => {
      subgraph.nodes.forEach((node) => {
        if (existingNodeIds.has(node.id)) {
          return;
        }

        this.cy.add({
          group: 'nodes',
          data: node,
          position: centerPosition,
        });
        this.addedNodeIds.add(node.id);
      });

      subgraph.edges.forEach((edge) => {
        const existingEdge = this.cy.getElementById(edge.id);
        if (existingEdge.length > 0) {
          return;
        }

        this.cy.add({
          group: 'edges',
          data: edge,
        });
        this.addedEdgeIds.add(edge.id);
      });
    });

    const subgraphNodeIds = new Set(subgraph.nodes.map((node) => node.id));
    const subNodes = this.cy.nodes().filter((node) => subgraphNodeIds.has(node.id()));
    logPositions('Subgraph post-add pre-style', subNodes, ['mayor', 'departments']);
    const seedOffset = 20;
    subNodes.forEach((node, index) => {
      const position = node.position();
      node.position({
        x: position.x + index * seedOffset,
        y: position.y + index * seedOffset,
      });
    });
    logPositions('Subgraph seeded positions', subNodes, ['mayor', 'departments']);
    const subEdges = subNodes.connectedEdges();
    const others = this.cy.elements().not(subNodes).not(subEdges);

    console.log('[Subgraph] After add', {
      subgraphId: meta.id,
      newlyAddedNodeIds: Array.from(this.addedNodeIds),
      newlyAddedEdgeIds: Array.from(this.addedEdgeIds),
      totalNodeCount: this.cy.nodes().length,
      visibleNodeIds: this.cy.nodes().map((node) => node.id()),
    });
    logPositions('Subgraph after add', subNodes);

    this.cy.batch(() => {
      this.cy.elements().removeClass('highlighted faded hidden dimmed');
      subNodes.addClass('highlighted');
      others.addClass('faded');
    });

    const layoutOptions = cloneLayoutOptions(subgraph.layout, {
      // Temporarily disable animations to debug layout behaviour.
      animate: false,
      fit: false,
      padding: 80,
    });

    console.log('[Subgraph] Layout start request', {
      nodeCount: subNodes.length,
      layoutName: layoutOptions.name,
      subNodeIds: subNodes.map((node) => node.id()),
    });

    logPositions('Subgraph before layout run', subNodes, ['mayor', 'departments']);

    const layout = subNodes.layout(layoutOptions);
    const layoutPromise = layout.promiseOn('layoutstop');
    layout.run();
    await layoutPromise;
    logPositions('Subgraph layout finished', subNodes, ['mayor', 'departments']);

    this.activeSubgraph = {
      id: meta.id,
      entryNodeId: meta.entryNodeId,
      graph: subgraph,
    };

    this.cy.fit(subNodes, 160);

    this.transitionInProgress = false;
  }

  async restoreMainView() {
    if (!this.activeSubgraph) {
      return;
    }
    if (this.transitionInProgress) {
      return;
    }

    this.transitionInProgress = true;
    this.markProgrammaticZoom();

    const removeAddedElements = () => {
      this.cy.batch(() => {
        const nodesToRemove = this.cy.collection();
        this.addedNodeIds.forEach((id) => {
          const node = this.cy.getElementById(id);
          if (node.length > 0) {
            nodesToRemove.merge(node);
          }
        });

        const edgesToRemove = this.cy.collection();
        this.addedEdgeIds.forEach((id) => {
          const edge = this.cy.getElementById(id);
          if (edge.length > 0) {
            edgesToRemove.merge(edge);
          }
        });

        edgesToRemove.remove();
        nodesToRemove.remove();
      });

      this.addedNodeIds.clear();
      this.addedEdgeIds.clear();
    };

    removeAddedElements();

    this.cy.nodes().forEach((node) => {
      const orgPos = node.data('orgPos');
      if (!orgPos) {
        return;
      }

      node.position(copyPosition(orgPos));
    });

    this.cy.batch(() => {
      this.cy.elements().removeClass('highlighted faded hidden dimmed');
    });

    const layoutOptions = cloneLayoutOptions(this.mainGraph.layout, {
      // Temporarily disable animations to debug layout behaviour.
      animate: false,
      fit: true,
      padding: 80,
    });

    const layout = this.cy.layout(layoutOptions);
    const layoutPromise = layout.promiseOn('layoutstop');
    layout.run();
    await layoutPromise;

    this.captureInitialPositions();

    console.log('[Subgraph] Main view restored', {
      totalNodeCount: this.cy.nodes().length,
      nodeIds: this.cy.nodes().map((node) => node.id()),
    });
    logPositions('Subgraph main view restored', this.cy.nodes());

    this.activeSubgraph = null;
    this.transitionInProgress = false;
  }

  async showProcess(
    process: ProcessDefinition,
    nodeInfos: GraphNodeInfo[],
    edgeInfos: GraphEdgeInfo[],
  ) {
    if (this.processTransitionInProgress) {
      return;
    }

    if (this.activeProcess?.id === process.id) {
      return;
    }

    await this.clearProcessHighlight();

    const requestedNodeIds = nodeInfos.map((node) => node.id);
    const requestedEdgeIds = edgeInfos.map((edge) => edge.id);
    const currentNodeIdsBefore = this.cy.nodes().map((node) => node.id());
    const missingNodeIds = requestedNodeIds.filter(
      (id) => this.cy.getElementById(id).length === 0,
    );
    console.log('[Process] Showing', {
      processId: process.id,
      requestedNodeIds,
      requestedEdgeIds,
      missingNodeIds,
      currentNodeIdsBefore,
    });
    logPositions('Process showing snapshot', this.cy.nodes());

    this.processTransitionInProgress = true;
    this.markProgrammaticZoom();

    const tempNodeIds = new Set<string>();
    const tempEdgeIds = new Set<string>();

    const nodeIdSet = new Set(nodeInfos.map((node) => node.id));
    const edgeIdSet = new Set(edgeInfos.map((edge) => edge.id));

    this.cy.batch(() => {
      nodeInfos.forEach((nodeInfo) => {
        const existing = this.cy.getElementById(nodeInfo.id);
        if (existing.length > 0) {
          return;
        }
        this.cy.add({
          group: 'nodes',
          data: nodeInfo,
        });
        tempNodeIds.add(nodeInfo.id);
      });

      edgeInfos.forEach((edgeInfo) => {
        const existing = this.cy.getElementById(edgeInfo.id);
        if (existing.length > 0) {
          return;
        }
        this.cy.add({
          group: 'edges',
          data: edgeInfo,
        });
        tempEdgeIds.add(edgeInfo.id);
      });
    });

    const processNodes = this.cy.nodes().filter((node) => nodeIdSet.has(node.id()));
    logPositions('Process post-add pre-style', processNodes, ['mayor', 'departments']);
    const processSeedOffset = 20;
    processNodes.forEach((node, index) => {
      const position = node.position();
      node.position({
        x: position.x + index * processSeedOffset,
        y: position.y + index * processSeedOffset,
      });
    });
    logPositions('Process seeded positions', processNodes, ['mayor', 'departments']);

    console.log('[Process] After add', {
      processId: process.id,
      tempNodeIds: Array.from(tempNodeIds),
      tempEdgeIds: Array.from(tempEdgeIds),
      processNodeIds: processNodes.map((node) => node.id()),
      totalNodeCount: this.cy.nodes().length,
    });

    this.cy.batch(() => {
      this.cy.nodes().removeClass('dimmed process-active');
      this.cy.edges().removeClass('dimmed process-active-edge');

      this.cy.nodes().forEach((node) => {
        if (nodeIdSet.has(node.id())) {
          node.addClass('process-active');
        } else {
          node.addClass('dimmed');
        }
      });

      this.cy.edges().forEach((edge) => {
        if (edgeIdSet.has(edge.id())) {
          edge.addClass('process-active-edge');
        } else {
          edge.addClass('dimmed');
        }
      });
    });

    if (processNodes.length > 0) {
      const layoutOptions: LayoutOptions = {
        name: 'elk',
        fit: false,
        // Temporarily disable animations to debug layout behaviour.
        animate: false,
        nodeDimensionsIncludeLabels: true,
        elk: {
          algorithm: 'layered',
          'elk.direction': 'RIGHT',
          'elk.spacing.nodeNode': 80,
          'elk.layered.spacing.nodeNodeBetweenLayers': 120,
        },
      } as LayoutOptions;

      logPositions('Process before layout run', processNodes, ['mayor', 'departments']);

      const layout = processNodes.layout(layoutOptions);
      const layoutPromise = layout.promiseOn('layoutstop');
      layout.run();
      await layoutPromise;
      logPositions('Process layout finished', processNodes, ['mayor', 'departments']);

      this.cy.fit(processNodes, 140);
    }

    this.activeProcess = {
      id: process.id,
      tempNodeIds,
      tempEdgeIds,
      nodeIds: nodeIdSet,
      edgeIds: edgeIdSet,
    };

    console.log('[Process] Show complete', {
      processId: process.id,
      nodeIds: Array.from(nodeIdSet),
      edgeIds: Array.from(edgeIdSet),
    });
    logPositions('Process show complete', this.cy.nodes());

    this.processTransitionInProgress = false;
  }

  async clearProcessHighlight() {
    const currentProcess = this.activeProcess;
    if (!currentProcess || this.processTransitionInProgress) {
      return;
    }

    console.log('[Process] Clearing highlight', {
      processId: currentProcess.id,
      tempNodeIds: Array.from(currentProcess.tempNodeIds),
      tempEdgeIds: Array.from(currentProcess.tempEdgeIds),
    });
    logPositions('Process clearing highlight snapshot', this.cy.nodes());

    this.processTransitionInProgress = true;
    this.markProgrammaticZoom();

    this.cy.batch(() => {
      this.cy.nodes().removeClass('process-active dimmed');
      this.cy.edges().removeClass('process-active-edge dimmed');
    });

    if (currentProcess.tempEdgeIds.size > 0) {
      const edgesToRemove = this.cy.collection();
      currentProcess.tempEdgeIds.forEach((id) => {
        const edge = this.cy.getElementById(id);
        if (edge.length > 0) {
          edgesToRemove.merge(edge);
        }
      });
      edgesToRemove.remove();
    }

    if (currentProcess.tempNodeIds.size > 0) {
      const nodesToRemove = this.cy.collection();
      currentProcess.tempNodeIds.forEach((id) => {
        const node = this.cy.getElementById(id);
        if (node.length > 0) {
          nodesToRemove.merge(node);
        }
      });
      nodesToRemove.remove();
    }

    const layout = this.cy.layout({
      ...this.mainGraph.layout,
      // Temporarily disable animations to debug layout behaviour.
      animate: false,
    } as LayoutOptions);
    const layoutPromise = layout.promiseOn('layoutstop');
    layout.run();
    await layoutPromise;

    this.cy.fit(this.cy.nodes(), 200);

    this.captureInitialPositions();

    console.log('[Process] Highlight cleared', {
      processId: currentProcess.id,
      remainingNodeIds: this.cy.nodes().map((node) => node.id()),
    });
    logPositions('Process highlight cleared', this.cy.nodes());

    this.activeProcess = null;
    this.processTransitionInProgress = false;
  }
}

export { GraphController };
