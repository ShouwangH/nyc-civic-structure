import type { Core } from 'cytoscape';
import type { GraphEdgeInfo, GraphNodeInfo } from './types';
import type { ProcessDefinition } from '../data/types';
import {
  copyPosition,
  getViewportMetrics,
  createProcessLayoutOptions,
  type MainLayoutOptions,
} from './layout';
import { ANIMATION_DURATION, ANIMATION_EASING } from './animation';
import { applyProcessHighlightClasses } from './styles-application';

/**
 * Process controller module
 * Manages process highlighting, ephemeral nodes, and state
 */

type ActiveProcessState = {
  id: string;
  tempNodeIds: Set<string>;
  tempEdgeIds: Set<string>;
  nodeIds: Set<string>;
  edgeIds: Set<string>;
};

export type ProcessController = {
  show: (
    process: ProcessDefinition,
    nodeInfos: GraphNodeInfo[],
    edgeInfos: GraphEdgeInfo[],
  ) => Promise<void>;
  clear: () => Promise<void>;
  isActive: (id?: string) => boolean;
};

type ProcessControllerDeps = {
  cy: Core;
  runMainGraphLayout: (options?: MainLayoutOptions) => Promise<void>;
};

export const createProcessController = (deps: ProcessControllerDeps): ProcessController => {
  const { cy, runMainGraphLayout } = deps;

  let activeProcess: ActiveProcessState | null = null;
  let processTransitionInProgress = false;

  const isActive = (id?: string): boolean => {
    if (!activeProcess) {
      return false;
    }
    return id ? activeProcess.id === id : true;
  };

  const show = async (
    process: ProcessDefinition,
    nodeInfos: GraphNodeInfo[],
    edgeInfos: GraphEdgeInfo[],
  ): Promise<void> => {
    if (processTransitionInProgress) {
      return;
    }

    if (activeProcess?.id === process.id) {
      return;
    }

    await clear();

    processTransitionInProgress = true;

    const tempNodeIds = new Set<string>();
    const tempEdgeIds = new Set<string>();

    const nodeIdSet = new Set(nodeInfos.map((node) => node.id));
    const edgeIdSet = new Set(edgeInfos.map((edge) => edge.id));
    const { centerX, centerY } = getViewportMetrics(cy);

    cy.batch(() => {
      nodeInfos.forEach((nodeInfo) => {
        const existing = cy.getElementById(nodeInfo.id);
        if (existing.length > 0) {
          return;
        }
        const added = cy.add({
          group: 'nodes',
          data: nodeInfo,
          position: { x: centerX, y: centerY },
        });
        tempNodeIds.add(nodeInfo.id);
        added.removeData('orgPos');
        added.removeScratch('_positions');
        added.unlock();
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
    const processEdges = cy.collection();
    edgeInfos.forEach((edge) => {
      const cyEdge = cy.getElementById(edge.id);
      if (cyEdge && cyEdge.length > 0) {
        processEdges.merge(cyEdge);
      }
    });

    applyProcessHighlightClasses(cy, nodeIdSet, edgeIdSet);

    const layoutOptions = createProcessLayoutOptions(centerX, centerY, ANIMATION_DURATION, ANIMATION_EASING);

    const layoutElements = processNodes.union(processEdges);
    const layout = layoutElements.layout(layoutOptions);
    const layoutPromise = layout.promiseOn('layoutstop');
    layout.run();
    await layoutPromise;

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

  const clear = async (): Promise<void> => {
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
    show,
    clear,
    isActive,
  };
};
