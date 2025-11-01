import type { Core } from 'cytoscape';
import type { GraphConfig } from './types';
import { runSubgraphConcentricDebug } from './utils/debugHarness';
import {
  copyPosition,
  cloneLayoutOptions,
  type MainLayoutOptions,
} from './layout';
import {
  ANIMATION_DURATION,
  ANIMATION_EASING,
} from './animation';
import { resetHighlightClasses } from './styles-application';

/**
 * Subgraph controller module
 * Manages subgraph activation, restoration, and state
 */

type ActiveSubgraph = {
  id: string;
  entryNodeId: string;
  graph: GraphConfig;
};

const DEBUG_SUBGRAPH_CONCENTRIC = false;

export type SubgraphController = {
  activate: (subgraph: GraphConfig, meta: { id: string; entryNodeId: string }) => Promise<void>;
  restore: () => Promise<void>;
  isActive: (id?: string) => boolean;
  getActiveId: () => string | null;
};

type SubgraphControllerDeps = {
  cy: Core;
  runMainGraphLayout: (options?: MainLayoutOptions) => Promise<void>;
};

export const createSubgraphController = (deps: SubgraphControllerDeps): SubgraphController => {
  const { cy, runMainGraphLayout } = deps;

  let activeSubgraph: ActiveSubgraph | null = null;
  let transitionInProgress = false;
  const addedNodeIds = new Set<string>();
  const addedEdgeIds = new Set<string>();

  const isActive = (id?: string): boolean => {
    if (!activeSubgraph) {
      return false;
    }
    return id ? activeSubgraph.id === id : true;
  };

  const getActiveId = (): string | null => activeSubgraph?.id ?? null;

  const activate = async (
    subgraph: GraphConfig,
    meta: { id: string; entryNodeId: string },
  ): Promise<void> => {
    if (transitionInProgress) {
      return;
    }

    if (activeSubgraph?.id === meta.id) {
      return;
    }

    if (activeSubgraph) {
      await restore();
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

  const restore = async (): Promise<void> => {
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

    resetHighlightClasses(cy);

    await runMainGraphLayout({ animateFit: true, fitPadding: 200 });

    activeSubgraph = null;
    transitionInProgress = false;
  };

  return {
    activate,
    restore,
    isActive,
    getActiveId,
  };
};
