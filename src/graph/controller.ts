import type { Core, LayoutOptions } from 'cytoscape';
import type cytoscape from 'cytoscape';
import type { GraphConfig, GraphEdgeInfo, GraphNodeInfo } from './types';
import type { ProcessDefinition } from '../data/types';
import { NODE_HEIGHT, NODE_WIDTH } from './constants';
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

const ANIMATION_DURATION = 550;
const ANIMATION_EASING: cytoscape.AnimationOptions['easing'] = 'ease';
const DEBUG_SUBGRAPH_CONCENTRIC = false;

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

  private resetHighlightClasses() {
    this.cy.batch(() => {
      this.cy.elements().removeClass('highlighted faded hidden dimmed');
    });
  }

  async focusNodes(nodeIds: string[]) {
    if (this.transitionInProgress) {
      return;
    }

    const targets = this.cy.collection();
    nodeIds.forEach((id) => {
      const node = this.cy.getElementById(id);
      if (node && node.length > 0) {
        targets.merge(node);
      }
    });

    if (targets.length === 0) {
      return;
    }

    this.transitionInProgress = true;
    this.markProgrammaticZoom();

    const targetEdges = targets.connectedEdges();
    const otherNodes = this.cy.nodes().not(targets);
    const otherEdges = this.cy.edges().not(targetEdges);

    this.cy.batch(() => {
      this.cy.elements().removeClass('highlighted faded hidden dimmed');
      targets.addClass('highlighted');
      targetEdges.removeClass('faded hidden');
      otherNodes.addClass('faded');
      otherEdges.addClass('faded');
    });

    try {
      await this.cy
        .animation({
          fit: {
            eles: targets,
            padding: 160,
          },
          duration: ANIMATION_DURATION,
          easing: ANIMATION_EASING,
        })
        .play()
        .promise();
    } catch {
      // ignore animation cancellation
    }

    this.transitionInProgress = false;
  }

  clearNodeFocus() {
    this.resetHighlightClasses();
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

    logPositions('Subgraph activating snapshot', this.cy.nodes());


    this.transitionInProgress = true;
    this.markProgrammaticZoom();

    if (DEBUG_SUBGRAPH_CONCENTRIC) {
      await this.runDebugConcentricTest(meta, subgraph);
      this.transitionInProgress = false;
      return;
    }

    logPositions('Subgraph restoring snapshot', this.cy.nodes());

    const existingNodeIds = new Set(this.cy.nodes().map((node) => node.id()));

    this.cy.batch(() => {
      subgraph.nodes.forEach((node) => {
        if (existingNodeIds.has(node.id)) {
          return;
        }

        const added = this.cy.add({
          group: 'nodes',
          data: node,
        });
        this.addedNodeIds.add(node.id);
        added.removeData('orgPos');
        added.removeScratch('_positions');
        added.unlock();
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

    const subEdges = this.cy.collection();
    subgraph.edges.forEach((edge) => {
      const cyEdge = this.cy.getElementById(edge.id);
      if (cyEdge && cyEdge.length > 0) {
        subEdges.merge(cyEdge);
      }
    });
    const otherNodes = this.cy.nodes().not(subNodes);
    const otherEdges = this.cy.edges().not(subEdges);

    logPositions('Subgraph after add', subNodes);

    this.cy.batch(() => {
      this.cy.elements().removeClass('highlighted faded hidden dimmed');
      subNodes.addClass('highlighted');
      subEdges.addClass('highlighted');
      otherNodes.addClass('faded');
      otherEdges.addClass('hidden');
    });

    const layoutOptions = cloneLayoutOptions(subgraph.layout, {
      animate: true,
      animationDuration: ANIMATION_DURATION,
      animationEasing: ANIMATION_EASING,
      fit: false,
      padding: 80,
    });
    logPositions('Subgraph before layout run', subNodes, ['mayor', 'departments']);
    const layoutElements = subNodes.union(subEdges);

    const layout = this.cy.layout({
      ...layoutOptions,
      eles: layoutElements,
    });
    const layoutPromise = layout.promiseOn('layoutstop');
    layout.run();
    await layoutPromise;
    logPositions('Subgraph layout finished', subNodes, ['mayor', 'departments']);

    this.activeSubgraph = {
      id: meta.id,
      entryNodeId: meta.entryNodeId,
      graph: subgraph,
    };

    await this.cy
      .animation({
        fit: {
          eles: subNodes,
          padding: 160,
        },
        duration: ANIMATION_DURATION,
        easing: ANIMATION_EASING,
      })
      .play()
      .promise()
      .catch(() => {});

    this.transitionInProgress = false;
  }

  private async runDebugConcentricTest(
    meta: { id: string; entryNodeId: string },
    subgraph: GraphConfig,
  ) {

    const debugNodes = subgraph.nodes.map((node) => ({
      original: node,
      debugId: node.id,
    }));

    this.cy.batch(() => {
      debugNodes.forEach((debugNode) => {
        const { original, debugId } = debugNode;
        const existing = this.cy.getElementById(debugId);
        if (existing.length === 0) {
          this.cy.add({
            group: 'nodes',
            data: {
              id: debugId,
              originalId: original.id,
              label: original.label,
              branch: original.branch ?? 'debug',
              type: original.type ?? 'debug',
              process: original.process ?? [],
              factoid: original.factoid ?? 'Debug node for concentric layout test.',
              branchColor: original.branchColor ?? '#a855f7',
              system: original.system ?? 'subgraph-node',
              width: NODE_WIDTH,
              height: NODE_HEIGHT,
            }
          });
        }

        const edgeId = `debug_concentric_edge_${debugId}`;
        const existingEdge = this.cy.getElementById(edgeId);
        if (existingEdge.length === 0) {
          this.cy.add({
            group: 'edges',
            data: {
              id: edgeId,
              source: meta.entryNodeId,
              target: debugId,
              label: '',
              type: 'relationship',
              process: [],
            },
          });
        }
      });
    });

    const debugCollection = this.cy.collection();
    debugNodes.forEach((debugNode) => {
      debugCollection.merge(this.cy.getElementById(debugNode.debugId));
    });
    debugCollection.merge(this.cy.getElementById(meta.entryNodeId));
    const debugEdges = debugCollection.connectedEdges();

    const anchorIds = new Set([meta.entryNodeId, 'mayor']);

    const layoutOptions = {
      name: 'concentric',
      animate: true,
      animationDuration: ANIMATION_DURATION,
      animationEasing: ANIMATION_EASING,
      fit: false,
      padding: 80,
      minNodeSpacing: 60,
      avoidOverlap: true,
      concentric: (node: cytoscape.NodeSingular) => {
        const nodeId = node.id();
        const originalId = String(node.data('originalId') ?? '');
        if (anchorIds.has(nodeId) || anchorIds.has(originalId)) {
          return 2;
        }
        return 1;
      },
      levelWidth: () => 1,
    } as LayoutOptions;

    const layout = this.cy.layout({
      ...layoutOptions,
      eles: debugCollection.union(debugEdges),
    });
    const layoutPromise = layout.promiseOn('layoutstop');
    layout.run();
    await layoutPromise;

    await this.cy
      .animation({
        fit: {
          eles: debugCollection,
          padding: 160,
        },
        duration: ANIMATION_DURATION,
        easing: ANIMATION_EASING,
      })
      .play()
      .promise()
      .catch(() => {});

    /*this.cy.batch(() => {
      debugNodes.forEach((debugNode) => {
        const debugId = debugNode.debugId;
        this.cy.getElementById(debugId).remove();
        this.cy.getElementById(`debug_concentric_edge_${debugId}`).remove();
      });
    })*/;
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

    this.resetHighlightClasses();

    const layoutOptions = cloneLayoutOptions(this.mainGraph.layout, {
      animate: true,
      animationDuration: ANIMATION_DURATION,
      animationEasing: ANIMATION_EASING,
      fit: true,
      padding: 80,
    });

    const layout = this.cy.layout(layoutOptions);
    const layoutPromise = layout.promiseOn('layoutstop');
    layout.run();
    await layoutPromise;

    this.captureInitialPositions();

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
    const processSeedOffset = 120;
    processNodes.forEach((node, index) => {
      const position = node.position();
      node.position({
        x: position.x,
        y: position.y + index * processSeedOffset,
      });
    });
    logPositions('Process seeded positions', processNodes, ['mayor', 'departments']);



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
      const processEdges = this.cy.edges().filter((edge) => edgeIdSet.has(edge.id()));
      const layoutOptions: LayoutOptions = {
        name: 'elk',
        fit: false,
        animate: true,
        animationDuration: ANIMATION_DURATION,
        animationEasing: ANIMATION_EASING,
        nodeDimensionsIncludeLabels: true,
        elk: {
          algorithm: 'layered',
          'elk.direction': 'RIGHT',
          'elk.spacing.nodeNode': 80,
          'elk.layered.spacing.nodeNodeBetweenLayers': 120,
        },
      } as LayoutOptions;

      logPositions('Process before layout run', processNodes, ['mayor', 'departments']);

      const layout = this.cy.layout({
        ...layoutOptions,
        eles: processNodes.union(processEdges),
      });
      const layoutPromise = layout.promiseOn('layoutstop');
      layout.run();
      await layoutPromise;
      logPositions('Process layout finished', processNodes, ['mayor', 'departments']);
      await this.cy
        .animation({
          fit: {
            eles: processNodes,
            padding: 140,
          },
          duration: ANIMATION_DURATION,
          easing: ANIMATION_EASING,
        })
        .play()
        .promise()
        .catch(() => {});
    }

    this.activeProcess = {
      id: process.id,
      tempNodeIds,
      tempEdgeIds,
      nodeIds: nodeIdSet,
      edgeIds: edgeIdSet,
    };

    logPositions('Process show complete', this.cy.nodes());

    this.processTransitionInProgress = false;
  }

  async clearProcessHighlight() {
    const currentProcess = this.activeProcess;
    if (!currentProcess || this.processTransitionInProgress) {
      return;
    }

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

    if (this.mainGraph.nodesHavePreset) {
      this.cy.nodes().forEach((node) => {
        const orgPos = node.data('orgPos');
        if (orgPos) {
          node.position(copyPosition(orgPos));
        }
      });
    }

    const layout = this.cy.layout({
      ...this.mainGraph.layout,
      animate: true,
      animationDuration: ANIMATION_DURATION,
      animationEasing: ANIMATION_EASING,
    } as LayoutOptions);
    const layoutPromise = layout.promiseOn('layoutstop');
    layout.run();
    await layoutPromise;

    await this.cy
      .animation({
        fit: {
          eles: this.cy.nodes(),
          padding: 200,
        },
        duration: ANIMATION_DURATION,
        easing: ANIMATION_EASING,
      })
      .play()
      .promise()
      .catch(() => {});

    this.captureInitialPositions();

    logPositions('Process highlight cleared', this.cy.nodes());

    this.activeProcess = null;
    this.processTransitionInProgress = false;
  }
}

export { GraphController };
