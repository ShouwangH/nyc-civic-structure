import type { Core, LayoutOptions, CollectionReturnValue } from 'cytoscape';
import type cytoscape from 'cytoscape';
import type { GraphConfig, GraphEdgeInfo, GraphNodeInfo } from './types';
import type { ProcessDefinition } from '../data/types';
import { runSubgraphConcentricDebug } from './utils/debugHarness';

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
type CyCollection = CollectionReturnValue;

type MainLayoutOptions = {
  animateFit?: boolean;
  fitPadding?: number;
};

class GraphController {
  private cy: Core;
  private mainGraph: GraphConfig;
  private activeSubgraph: ActiveSubgraph | null = null;
  private transitionInProgress = false;
  private addedNodeIds = new Set<string>();
  private addedEdgeIds = new Set<string>();
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

  private async animateFitToCollection(collection: CyCollection, padding: number) {
    if (!collection || collection.length === 0) {
      return;
    }

    try {
      await this.cy
        .animation({
          fit: {
            eles: collection,
            padding,
          },
          duration: ANIMATION_DURATION,
          easing: ANIMATION_EASING,
        })
        .play()
        .promise();
    } catch {
      // ignore cancelled animations
    }
  }

  private async runMainGraphLayout(options: MainLayoutOptions = {}) {
    const { animateFit = true, fitPadding = 200 } = options;
    const layoutOptions = cloneLayoutOptions(this.mainGraph.layout, {
      animate: true,
      animationDuration: ANIMATION_DURATION,
      animationEasing: ANIMATION_EASING,
      fit: false,
    });

    const layout = this.cy.layout(layoutOptions);
    const layoutPromise = layout.promiseOn('layoutstop');
    layout.run();
    await layoutPromise;

    if (animateFit) {
      await this.animateFitToCollection(this.cy.nodes() as unknown as CyCollection, fitPadding);
    }

    this.captureInitialPositions();
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

    this.transitionInProgress = true;

    if (DEBUG_SUBGRAPH_CONCENTRIC) {
      await runSubgraphConcentricDebug(this.cy, meta, subgraph, {
        duration: ANIMATION_DURATION,
        easing: ANIMATION_EASING,
      });
      this.transitionInProgress = false;
      return;
    }

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
    const subEdges = this.cy.collection();
    subgraph.edges.forEach((edge) => {
      const cyEdge = this.cy.getElementById(edge.id);
      if (cyEdge && cyEdge.length > 0) {
        subEdges.merge(cyEdge);
      }
    });
    const otherNodes = this.cy.nodes().not(subNodes);
    const otherEdges = this.cy.edges().not(subEdges);

    this.cy.batch(() => {
      this.cy.elements().removeClass('highlighted faded hidden dimmed');
      subNodes.addClass('highlighted');
      subEdges.addClass('highlighted');
      otherNodes.addClass('faded');
      otherEdges.addClass('hidden');
    });

    // Get entry node position to center layout around it
    const entryNode = this.cy.getElementById(meta.entryNodeId);
    const entryPos = entryNode.position();

    // Use transform to translate layout to entry node position
    const layoutOptions = cloneLayoutOptions(subgraph.layout, {
      animate: true,
      animationDuration: ANIMATION_DURATION,
      animationEasing: ANIMATION_EASING,
      fit: true,
      padding: 80,
      transform: (_node: any, pos: { x: number; y: number }) => {
        // Layout calculates in "neutral" space starting from (0,0)
        // Transform translates entire layout to entry node position
        return {
          x: pos.x + entryPos.x,
          y: pos.y + entryPos.y,
        };
      },
    });
    const layoutElements = subNodes.union(subEdges);

    const layout = layoutElements.layout(layoutOptions);
    const layoutPromise = layout.promiseOn('layoutstop');
    layout.run();
    await layoutPromise;

    // Fit viewport to the translated subgraph positions
    await this.cy
      .animation({
        fit: {
          eles: subNodes,
          padding: 200,
        },
        duration: ANIMATION_DURATION,
        easing: ANIMATION_EASING,
      })
      .play()
      .promise()
      .catch(() => {});

    this.activeSubgraph = {
      id: meta.id,
      entryNodeId: meta.entryNodeId,
      graph: subgraph,
    };

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

    await this.runMainGraphLayout({ animateFit: true, fitPadding: 200 });

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

    this.processTransitionInProgress = true;

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


      const layoutCollection = processNodes.union(processEdges);
      const layout = layoutCollection.layout(layoutOptions);
      const layoutPromise = layout.promiseOn('layoutstop');
      layout.run();
      await layoutPromise;
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

    this.processTransitionInProgress = false;
  }

  async clearProcessHighlight() {
    const currentProcess = this.activeProcess;
    if (!currentProcess || this.processTransitionInProgress) {
      return;
    }

    this.processTransitionInProgress = true;

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

    this.cy.nodes().forEach((node) => {
      const orgPos = node.data('orgPos');
      if (orgPos) {
        node.position(copyPosition(orgPos));
      }
    });

    await this.runMainGraphLayout({ animateFit: true, fitPadding: 220 });

    this.activeProcess = null;
    this.processTransitionInProgress = false;
  }
}

export { GraphController };
