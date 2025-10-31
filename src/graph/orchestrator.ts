import cytoscape, { type Core } from 'cytoscape';

import { graphStyles } from './styles';
import { GraphController } from './controller';
import type { GraphConfig, GraphEdgeInfo, GraphNodeInfo } from './types';
import type { ProcessDefinition } from '../data/types';
import type { SubgraphConfig } from './subgraphs';
import { GraphInputHandler } from './inputHandler';
import { createPlaceholderProcessNode, createProcessEdgeInfo } from './processUtils';

type StoreActions = {
  setSelectedNode: (id: string | null) => void;
  setSelectedEdge: (id: string | null) => void;
  setActiveProcess: (id: string | null) => void;
  setActiveSubgraph: (id: string | null) => void;
  setSidebarHover: (value: boolean) => void;
  clearSelections: () => void;
};

type ProcessData = {
  processes: ProcessDefinition[];
  nodesById: Map<string, GraphNodeInfo>;
};

type GraphOrchestratorOptions = {
  container: HTMLDivElement;
  mainGraph: GraphConfig;
  subgraphByEntryId: Map<string, SubgraphConfig>;
  subgraphById: Map<string, SubgraphConfig>;
  data: ProcessData;
  store: StoreActions;
};

class GraphOrchestrator {
  private cy: Core | null = null;
  private controller: GraphController | null = null;
  private inputHandler: GraphInputHandler | null = null;

  private container: HTMLDivElement;
  private mainGraph: GraphConfig;
  private subgraphByEntryId: Map<string, SubgraphConfig>;
  private subgraphById: Map<string, SubgraphConfig>;
  private processesById: Map<string, ProcessDefinition>;
  private nodesById: Map<string, GraphNodeInfo>;
  private store: StoreActions;

  constructor({
    container,
    mainGraph,
    subgraphByEntryId,
    subgraphById,
    data,
    store,
  }: GraphOrchestratorOptions) {
    this.container = container;
    this.mainGraph = mainGraph;
    this.subgraphByEntryId = subgraphByEntryId;
    this.subgraphById = subgraphById;
    this.store = store;
    this.nodesById = data.nodesById;
    this.processesById = new Map(data.processes.map((process) => [process.id, process]));
  }

  initialize() {
    this.destroy();

    const cyInstance = cytoscape({
      container: this.container,
      elements: this.mainGraph.elements,
      layout: this.mainGraph.layout,
      style: graphStyles,
    });

    this.cy = cyInstance;

    const controller = new GraphController(cyInstance, this.mainGraph);
    this.controller = controller;

    cyInstance.one('layoutstop', () => {
      controller.captureInitialPositions();
    });

    cyInstance.ready(() => {
      cyInstance.resize();
      const layout = cyInstance.layout(this.mainGraph.layout);
      layout.run();
    });

    this.inputHandler = new GraphInputHandler(cyInstance, this);
    this.inputHandler.attach();
  }

  destroy() {
    if (this.inputHandler) {
      this.inputHandler.detach();
      this.inputHandler = null;
    }
    if (this.cy) {
      this.cy.destroy();
      this.cy = null;
    }
    this.controller = null;
  }

  getCy() {
    return this.cy;
  }

  getController() {
    return this.controller;
  }

  async highlightProcess(processId: string) {
    const controller = this.controller;
    if (!controller) {
      return;
    }

    const process = this.processesById.get(processId);
    if (!process) {
      console.warn('[GraphOrchestrator] Process not found', processId);
      return;
    }

    await this.restoreMainView();

    const nodeInfos = process.nodes.map((id) => this.nodesById.get(id) ?? createPlaceholderProcessNode(id));
    const edgeInfos = process.edges.map((edge) => this.createProcessEdge(process.id, edge));

    this.store.setSelectedNode(null);
    this.store.setSelectedEdge(null);

    await controller.showProcess(process, nodeInfos, edgeInfos);
    this.store.setActiveProcess(processId);
    this.store.setSidebarHover(true);
  }

  async clearProcessHighlight() {
    const controller = this.controller;
    if (!controller) {
      return;
    }

    await controller.clearProcessHighlight();
    this.store.setActiveProcess(null);
  }

  async activateSubgraphByEntry(entryNodeId: string) {
    const config = this.subgraphByEntryId.get(entryNodeId);
    if (!config) {
      return;
    }
    await this.activateSubgraphInternal(config);
  }

  async activateSubgraph(subgraphId: string) {
    const config = this.subgraphById.get(subgraphId);
    if (!config) {
      console.warn('[GraphOrchestrator] Subgraph not found', subgraphId);
      return;
    }
    await this.activateSubgraphInternal(config);
  }

  private async activateSubgraphInternal(config: SubgraphConfig) {
    const controller = this.controller;
    if (!controller) {
      return;
    }

    await this.clearProcessHighlight();

    this.store.setSelectedNode(null);
    this.store.setSelectedEdge(null);

    await controller.activateSubgraph(config.graph, {
      id: config.meta.id,
      entryNodeId: config.meta.entryNodeId,
    });

    this.store.setActiveSubgraph(config.meta.id);
    this.store.setSidebarHover(true);
  }

  async restoreMainView() {
    const controller = this.controller;
    if (!controller) {
      return;
    }
    if (!controller.isSubgraphActive()) {
      return;
    }

    await controller.restoreMainView();
    this.store.setActiveSubgraph(null);
  }

  handleNodeTap(nodeId: string) {
    if (this.subgraphByEntryId.has(nodeId)) {
      void this.activateSubgraphByEntry(nodeId);
      return;
    }

    this.store.setSelectedEdge(null);
    this.store.setSelectedNode(nodeId);
    this.store.setSidebarHover(true);
  }

  handleEdgeTap(edgeId: string) {
    this.store.setSelectedNode(null);
    this.store.setSelectedEdge(edgeId);
    this.store.setSidebarHover(true);
  }

  handleBackgroundTap() {
    void this.resetView();
  }

  handleZoom() {
    const controller = this.controller;
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

    void this.resetView();
  }

  private async resetView() {
    this.store.clearSelections();

    await this.clearProcessHighlight();
    await this.restoreMainView();
  }

  private createProcessEdge(processId: string, edge: ProcessDefinition['edges'][number]): GraphEdgeInfo {
    return createProcessEdgeInfo(processId, edge);
  }
}

export { GraphOrchestrator };
