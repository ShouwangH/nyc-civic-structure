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

type ActiveProcessState = {
  id: string;
  tempNodeIds: Set<string>;
  tempEdgeIds: Set<string>;
  nodeIds: Set<string>;
  edgeIds: Set<string>;
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

const getViewportMetrics = (cy: Core) => {
  const extent = cy.extent();
  const width = extent.x2 - extent.x1;
  const height = extent.y2 - extent.y1;
  if (Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0) {
    return {
      centerX: extent.x1 + width / 2,
      centerY: extent.y1 + height / 2,
      width,
      height,
    };
  }

  const bbox = cy.nodes().boundingBox();
  const bboxWidth = bbox.x2 - bbox.x1 || 1;
  const bboxHeight = bbox.y2 - bbox.y1 || 1;
  return {
    centerX: (bbox.x1 + bbox.x2) / 2 || 0,
    centerY: (bbox.y1 + bbox.y2) / 2 || 0,
    width: bboxWidth,
    height: bboxHeight,
  };
};

const computeRadialPositions = (cy: Core, nodes: GraphNodeInfo[]) => {
  const { centerX, centerY, width, height } = getViewportMetrics(cy);
  const positions = new Map<string, { x: number; y: number }>();
  const count = nodes.length;

  if (count === 0) {
    return positions;
  }

  const radius = Math.max(Math.min(width, height) * 0.35, 240);

  if (count === 1) {
    positions.set(nodes[0].id, { x: centerX, y: centerY });
    return positions;
  }

  const angleStep = (2 * Math.PI) / count;
  nodes.forEach((node, index) => {
    const angle = -Math.PI / 2 + index * angleStep;
    positions.set(node.id, {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    });
  });

  return positions;
};

export type GraphController = {
  captureInitialPositions: () => void;
  focusNodes: (nodeIds: string[]) => Promise<void>;
  clearNodeFocus: () => void;
  activateSubgraph: (subgraph: GraphConfig, meta: { id: string; entryNodeId: string }) => Promise<void>;
  restoreMainView: () => Promise<void>;
  showProcess: (
    process: ProcessDefinition,
    nodeInfos: GraphNodeInfo[],
    edgeInfos: GraphEdgeInfo[],
  ) => Promise<void>;
  clearProcessHighlight: () => Promise<void>;
  isSubgraphActive: (id?: string) => boolean;
  getActiveSubgraphId: () => string | null;
  isProcessActive: (id?: string) => boolean;
};

const createGraphController = (cy: Core, mainGraph: GraphConfig): GraphController => {
  let activeSubgraph: ActiveSubgraph | null = null;
  let transitionInProgress = false;
  const addedNodeIds = new Set<string>();
  const addedEdgeIds = new Set<string>();
  let activeProcess: ActiveProcessState | null = null;
  let processTransitionInProgress = false;

  const resetHighlightClasses = () => {
    cy.batch(() => {
      cy.elements().removeClass('highlighted faded hidden dimmed');
    });
  };

  const captureInitialPositions = () => {
    cy.nodes().forEach((node) => {
      node.data('orgPos', copyPosition(node.position()));
    });
  };

  const animateFitToCollection = async (collection: CyCollection, padding: number) => {
    if (!collection || collection.length === 0) {
      return;
    }

    try {
      await cy
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
  };

  const runMainGraphLayout = async (options: MainLayoutOptions = {}) => {
    const { animateFit = true, fitPadding = 200 } = options;
    const layoutOptions = cloneLayoutOptions(mainGraph.layout, {
      animate: true,
      animationDuration: ANIMATION_DURATION,
      animationEasing: ANIMATION_EASING,
      fit: false,
    });

    const layout = cy.layout(layoutOptions);
    const layoutPromise = layout.promiseOn('layoutstop');
    layout.run();
    await layoutPromise;

    if (animateFit) {
      await animateFitToCollection(cy.nodes() as unknown as CyCollection, fitPadding);
    }

    captureInitialPositions();
  };

  const focusNodes = async (nodeIds: string[]) => {
    if (transitionInProgress) {
      return;
    }

    const targets = cy.collection();
    nodeIds.forEach((id) => {
      const node = cy.getElementById(id);
      if (node && node.length > 0) {
        targets.merge(node);
      }
    });

    if (targets.length === 0) {
      return;
    }

    transitionInProgress = true;

    const targetEdges = targets.connectedEdges();
    const otherNodes = cy.nodes().not(targets);
    const otherEdges = cy.edges().not(targetEdges);

    cy.batch(() => {
      cy.elements().removeClass('highlighted faded hidden dimmed');
      targets.addClass('highlighted');
      targetEdges.removeClass('faded hidden');
      otherNodes.addClass('faded');
      otherEdges.addClass('faded');
    });

    try {
      await cy
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

    transitionInProgress = false;
  };

  const clearNodeFocus = () => {
    resetHighlightClasses();
  };

  const isSubgraphActive = (id?: string) => {
    if (!activeSubgraph) {
      return false;
    }
    return id ? activeSubgraph.id === id : true;
  };

  const getActiveSubgraphId = () => activeSubgraph?.id ?? null;

  const isProcessActive = (id?: string) => {
    if (!activeProcess) {
      return false;
    }
    return id ? activeProcess.id === id : true;
  };

  const activateSubgraph = async (subgraph: GraphConfig, meta: { id: string; entryNodeId: string }) => {
    if (transitionInProgress) {
      return;
    }

    if (activeSubgraph?.id === meta.id) {
      return;
    }

    if (activeSubgraph) {
      await restoreMainView();
    }

    transitionInProgress = true;

    if (DEBUG_SUBGRAPH_CONCENTRIC) {
      await runSubgraphConcentricDebug(cy, meta, subgraph, {
        duration: ANIMATION_DURATION,
        easing: ANIMATION_EASING,
      });
      transitionInProgress = false;
      return;
    }

    const existingNodeIds = new Set(cy.nodes().map((node) => node.id()));

    cy.batch(() => {
      subgraph.nodes.forEach((node) => {
        if (existingNodeIds.has(node.id)) {
          return;
        }

        const added = cy.add({
          group: 'nodes',
          data: node,
        });
        addedNodeIds.add(node.id);
        added.removeData('orgPos');
        added.removeScratch('_positions');
        added.unlock();
      });

      subgraph.edges.forEach((edge) => {
        const existingEdge = cy.getElementById(edge.id);
        if (existingEdge.length > 0) {
          return;
        }

        cy.add({
          group: 'edges',
          data: edge,
        });
        addedEdgeIds.add(edge.id);
      });
    });

    const subgraphNodeIds = new Set(subgraph.nodes.map((node) => node.id));
    const subNodes = cy.nodes().filter((node) => subgraphNodeIds.has(node.id()));
    const subEdges = cy.collection();
    subgraph.edges.forEach((edge) => {
      const cyEdge = cy.getElementById(edge.id);
      if (cyEdge && cyEdge.length > 0) {
        subEdges.merge(cyEdge);
      }
    });
    const otherNodes = cy.nodes().not(subNodes);
    const otherEdges = cy.edges().not(subEdges);

    cy.batch(() => {
      cy.elements().removeClass('highlighted faded hidden dimmed');
      subNodes.addClass('highlighted');
      subEdges.addClass('highlighted');
      otherNodes.addClass('faded');
      otherEdges.addClass('hidden');
    });

    const entryNode = cy.getElementById(meta.entryNodeId);
    const entryPos = entryNode.position();

    const layoutOptions = cloneLayoutOptions(subgraph.layout, {
      animate: true,
      animationDuration: ANIMATION_DURATION,
      animationEasing: ANIMATION_EASING,
      fit: true,
      padding: 80,
      transform: (_node: any, pos: { x: number; y: number }) => ({
        x: pos.x + entryPos.x,
        y: pos.y + entryPos.y,
      }),
    });
    const layoutElements = subNodes.union(subEdges);

    const layout = layoutElements.layout(layoutOptions);
    const layoutPromise = layout.promiseOn('layoutstop');
    layout.run();
    await layoutPromise;

    await cy
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

    activeSubgraph = {
      id: meta.id,
      entryNodeId: meta.entryNodeId,
      graph: subgraph,
    };

    transitionInProgress = false;
  };

  const restoreMainView = async () => {
    if (!activeSubgraph) {
      return;
    }
    if (transitionInProgress) {
      return;
    }

    transitionInProgress = true;

    const removeAddedElements = () => {
      cy.batch(() => {
        const nodesToRemove = cy.collection();
        addedNodeIds.forEach((id) => {
          const node = cy.getElementById(id);
          if (node.length > 0) {
            nodesToRemove.merge(node);
          }
        });

        const edgesToRemove = cy.collection();
        addedEdgeIds.forEach((id) => {
          const edge = cy.getElementById(id);
          if (edge.length > 0) {
            edgesToRemove.merge(edge);
          }
        });

        edgesToRemove.remove();
        nodesToRemove.remove();
      });

      addedNodeIds.clear();
      addedEdgeIds.clear();
    };

    removeAddedElements();

    cy.nodes().forEach((node) => {
      const orgPos = node.data('orgPos');
      if (!orgPos) {
        return;
      }

      node.position(copyPosition(orgPos));
    });

    resetHighlightClasses();

    await runMainGraphLayout({ animateFit: true, fitPadding: 200 });

    activeSubgraph = null;
    transitionInProgress = false;
  };

  const showProcess = async (
    process: ProcessDefinition,
    nodeInfos: GraphNodeInfo[],
    edgeInfos: GraphEdgeInfo[],
  ) => {
    if (processTransitionInProgress) {
      return;
    }

    if (activeProcess?.id === process.id) {
      return;
    }

    await clearProcessHighlight();

    processTransitionInProgress = true;

    const tempNodeIds = new Set<string>();
    const tempEdgeIds = new Set<string>();

    const nodeIdSet = new Set(nodeInfos.map((node) => node.id));
    const edgeIdSet = new Set(edgeInfos.map((edge) => edge.id));
    const desiredPositions = computeRadialPositions(cy, nodeInfos);

    cy.batch(() => {
      nodeInfos.forEach((nodeInfo) => {
        const existing = cy.getElementById(nodeInfo.id);
        if (existing.length > 0) {
          return;
        }
        cy.add({
          group: 'nodes',
          data: nodeInfo,
          position: desiredPositions.get(nodeInfo.id),
        });
        tempNodeIds.add(nodeInfo.id);
      });

      edgeInfos.forEach((edgeInfo) => {
        const existing = cy.getElementById(edgeInfo.id);
        if (existing.length > 0) {
          return;
        }
        cy.add({
          group: 'edges',
          data: edgeInfo,
        });
        tempEdgeIds.add(edgeInfo.id);
      });
    });

    const processNodes = cy.nodes().filter((node) => nodeIdSet.has(node.id()));
    cy.batch(() => {
      cy.nodes().removeClass('dimmed process-active');
      cy.edges().removeClass('dimmed process-active-edge');

      cy.nodes().forEach((node) => {
        if (nodeIdSet.has(node.id())) {
          node.addClass('process-active');
        } else {
          node.addClass('dimmed');
        }
      });

      cy.edges().forEach((edge) => {
        if (edgeIdSet.has(edge.id())) {
          edge.addClass('process-active-edge');
        } else {
          edge.addClass('dimmed');
        }
      });

      processNodes.forEach((node) => {
        const target = desiredPositions.get(node.id());
        if (target) {
          node.position(copyPosition(target));
        }
      });
    });

    if (processNodes.length > 0) {
      await cy
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

    activeProcess = {
      id: process.id,
      tempNodeIds,
      tempEdgeIds,
      nodeIds: nodeIdSet,
      edgeIds: edgeIdSet,
    };

    processTransitionInProgress = false;
  };

  const clearProcessHighlight = async () => {
    const currentProcess = activeProcess;
    if (!currentProcess || processTransitionInProgress) {
      return;
    }

    processTransitionInProgress = true;

    cy.batch(() => {
      cy.nodes().removeClass('process-active dimmed');
      cy.edges().removeClass('process-active-edge dimmed');
    });

    if (currentProcess.tempEdgeIds.size > 0) {
      const edgesToRemove = cy.collection();
      currentProcess.tempEdgeIds.forEach((id) => {
        const edge = cy.getElementById(id);
        if (edge.length > 0) {
          edgesToRemove.merge(edge);
        }
      });
      edgesToRemove.remove();
    }

    if (currentProcess.tempNodeIds.size > 0) {
      const nodesToRemove = cy.collection();
      currentProcess.tempNodeIds.forEach((id) => {
        const node = cy.getElementById(id);
        if (node.length > 0) {
          nodesToRemove.merge(node);
        }
      });
      nodesToRemove.remove();
    }

    cy.nodes().forEach((node) => {
      const orgPos = node.data('orgPos');
      if (orgPos) {
        node.position(copyPosition(orgPos));
      }
    });

    await runMainGraphLayout({ animateFit: true, fitPadding: 220 });

    activeProcess = null;
    processTransitionInProgress = false;
  };

  return {
    captureInitialPositions,
    focusNodes,
    clearNodeFocus,
    activateSubgraph,
    restoreMainView,
    showProcess,
    clearProcessHighlight,
    isSubgraphActive,
    getActiveSubgraphId,
    isProcessActive,
  };
};

export { createGraphController };
