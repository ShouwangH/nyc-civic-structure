// ABOUTME: Unified subview controller handling all subview types
// ABOUTME: Manages activation, styling, layout, and cleanup for workflow and structural views

import type { Core } from 'cytoscape';
import type { SubviewDefinition, SubviewType } from '../data/types';
import type { GraphNodeInfo, GraphEdgeInfo } from './types';
import type { MainLayoutOptions } from './layout';
import {
  copyPosition,
  getViewportMetrics,
  createProcessLayoutOptions,
} from './layout';
import { ANIMATION_DURATION, ANIMATION_EASING } from './animation';
import { applyProcessHighlightClasses, resetHighlightClasses } from './styles-application';
import { createStructuralLayoutOptions } from './layouts';

/**
 * State changes returned by controller operations
 */
export type SubviewStateChanges = {
  activeSubviewId: string | null;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  isSidebarHover: boolean;
};

/**
 * Unified subview controller interface
 */
export type SubviewController = {
  activate: (subview: SubviewDefinition) => Promise<SubviewStateChanges>;
  deactivate: () => Promise<SubviewStateChanges>;
  isActive: (id?: string) => boolean;
  getActiveId: () => string | null;
};

type SubviewControllerDeps = {
  cy: Core;
  runMainGraphLayout: (options?: MainLayoutOptions) => Promise<void>;
  nodeInfosById: Map<string, GraphNodeInfo>;
  edgeInfosById: Map<string, GraphEdgeInfo>;
};

/**
 * Active subview state
 * Tracks what was added and what was affected during activation
 */
type ActiveSubviewState = {
  id: string;
  type: SubviewType;
  addedNodeIds: Set<string>;
  addedEdgeIds: Set<string>;
  affectedNodeIds: Set<string>;
  affectedEdgeIds: Set<string>;
};

/**
 * Creates unified subview controller
 * Handles all subview types (workflow, intra, inter, cross-jurisdictional)
 */
export const createSubviewController = (deps: SubviewControllerDeps): SubviewController => {
  const { cy, runMainGraphLayout, nodeInfosById } = deps;

  let activeSubview: ActiveSubviewState | null = null;
  let transitionInProgress = false;

  const isActive = (id?: string): boolean => {
    if (!activeSubview) {
      return false;
    }
    return id ? activeSubview.id === id : true;
  };

  const getActiveId = (): string | null => {
    return activeSubview?.id ?? null;
  };

  const activate = async (subview: SubviewDefinition): Promise<SubviewStateChanges> => {
    // Guard: check transition lock
    if (transitionInProgress) {
      return {
        activeSubviewId: activeSubview?.id ?? null,
        selectedNodeId: null,
        selectedEdgeId: null,
        isSidebarHover: activeSubview ? true : false,
      };
    }

    // Guard: check duplicate activation
    if (activeSubview?.id === subview.id) {
      return {
        activeSubviewId: subview.id,
        selectedNodeId: null,
        selectedEdgeId: null,
        isSidebarHover: true,
      };
    }

    // Deactivate current if any
    if (activeSubview) {
      await deactivate();
    }

    transitionInProgress = true;

    const addedNodeIds = new Set<string>();
    const addedEdgeIds = new Set<string>();

    // Build node infos from subview node IDs
    const nodeInfos: GraphNodeInfo[] = subview.nodes
      .map(nodeId => nodeInfosById.get(nodeId) ?? createPlaceholderNode(nodeId))
      .filter(Boolean);

    // Build edge infos from subview edges
    const edgeInfos: GraphEdgeInfo[] = subview.edges.map((edge, index) => ({
      id: edge.label || `${subview.id}_edge_${index}`,
      source: edge.source,
      target: edge.target,
      label: edge.label || '',
      relation: edge.relation,
      detail: edge.detail,
      type: subview.type === 'workflow' ? 'process' : 'structural',
      process: subview.type === 'workflow' ? [subview.id] : [],
    }));

    const nodeIdSet = new Set(nodeInfos.map(node => node.id));
    const edgeIdSet = new Set(edgeInfos.map(edge => edge.id));

    // For workflows: get viewport center for initial positioning
    const { centerX, centerY } = subview.type === 'workflow'
      ? getViewportMetrics(cy)
      : { centerX: 0, centerY: 0 };

    // Add nodes and edges to cytoscape
    cy.batch(() => {
      nodeInfos.forEach(nodeInfo => {
        const existing = cy.getElementById(nodeInfo.id);
        if (existing.length > 0) {
          return;
        }

        const added = cy.add({
          group: 'nodes',
          data: nodeInfo,
          ...(subview.type === 'workflow' && { position: { x: centerX, y: centerY } }),
        });
        addedNodeIds.add(nodeInfo.id);
        added.removeData('orgPos');
        added.removeScratch('_positions');
        added.unlock();
      });

      edgeInfos.forEach(edgeInfo => {
        const existing = cy.getElementById(edgeInfo.id);
        if (existing.length > 0) {
          return;
        }

        cy.add({
          group: 'edges',
          data: edgeInfo,
        });
        addedEdgeIds.add(edgeInfo.id);
      });
    });

    // Collect cytoscape elements
    const subviewNodes = cy.nodes().filter(node => nodeIdSet.has(node.id()));
    const subviewEdges = cy.collection();
    edgeInfos.forEach(edge => {
      const cyEdge = cy.getElementById(edge.id);
      if (cyEdge && cyEdge.length > 0) {
        subviewEdges.merge(cyEdge);
      }
    });

    // Apply CSS classes based on subview type
    if (subview.type === 'workflow') {
      // Workflow: dimmed background, active process elements
      applyProcessHighlightClasses(cy, nodeIdSet, edgeIdSet);
    } else {
      // Structural: highlighted subview, faded/hidden background
      const otherNodes = cy.nodes().not(subviewNodes);
      const otherEdges = cy.edges().not(subviewEdges);

      cy.batch(() => {
        cy.elements().removeClass('highlighted faded hidden dimmed');
        subviewNodes.addClass('highlighted');
        subviewEdges.addClass('highlighted');
        otherNodes.addClass('faded');
        otherEdges.addClass('hidden');
      });
    }

    // Run layout
    const layoutOptions = subview.type === 'workflow'
      ? createProcessLayoutOptions(centerX, centerY, ANIMATION_DURATION, ANIMATION_EASING)
      : createStructuralLayoutOptions(subview, cy);

    const layoutElements = subviewNodes.union(subviewEdges);
    const layout = layoutElements.layout(layoutOptions);
    const layoutPromise = layout.promiseOn('layoutstop');
    layout.run();
    await layoutPromise;

    // Fit viewport to new elements
    const fitPadding = subview.type === 'workflow' ? 140 : 200;
    if (subviewNodes.length > 0) {
      await cy
        .animation({
          fit: {
            eles: subviewNodes,
            padding: fitPadding,
          },
          duration: ANIMATION_DURATION,
          easing: ANIMATION_EASING,
        })
        .play()
        .promise()
        .catch(() => {});
    }

    // Store active state
    activeSubview = {
      id: subview.id,
      type: subview.type,
      addedNodeIds,
      addedEdgeIds,
      affectedNodeIds: nodeIdSet,
      affectedEdgeIds: edgeIdSet,
    };

    transitionInProgress = false;

    // Return state changes for React state
    return {
      activeSubviewId: subview.id,
      selectedNodeId: null,
      selectedEdgeId: null,
      isSidebarHover: true,
    };
  };

  const deactivate = async (): Promise<SubviewStateChanges> => {
    const currentSubview = activeSubview;
    if (!currentSubview || transitionInProgress) {
      return {
        activeSubviewId: null,
        selectedNodeId: null,
        selectedEdgeId: null,
        isSidebarHover: false,
      };
    }

    transitionInProgress = true;

    // Remove CSS classes
    if (currentSubview.type === 'workflow') {
      cy.batch(() => {
        cy.nodes().removeClass('process-active dimmed');
        cy.edges().removeClass('process-active-edge dimmed');
      });
    } else {
      resetHighlightClasses(cy);
    }

    // Remove added elements
    cy.batch(() => {
      const edgesToRemove = cy.collection();
      currentSubview.addedEdgeIds.forEach(id => {
        const edge = cy.getElementById(id);
        if (edge.length > 0) {
          edgesToRemove.merge(edge);
        }
      });
      edgesToRemove.remove();

      const nodesToRemove = cy.collection();
      currentSubview.addedNodeIds.forEach(id => {
        const node = cy.getElementById(id);
        if (node.length > 0) {
          nodesToRemove.merge(node);
        }
      });
      nodesToRemove.remove();
    });

    // Restore original positions
    cy.nodes().forEach(node => {
      const orgPos = node.data('orgPos');
      if (orgPos) {
        node.position(copyPosition(orgPos));
      }
    });

    // Re-run main layout
    const fitPadding = currentSubview.type === 'workflow' ? 220 : 200;
    await runMainGraphLayout({ animateFit: true, fitPadding });

    // Clear state
    activeSubview = null;
    transitionInProgress = false;

    // Return state changes for React state
    return {
      activeSubviewId: null,
      selectedNodeId: null,
      selectedEdgeId: null,
      isSidebarHover: false,
    };
  };

  return {
    activate,
    deactivate,
    isActive,
    getActiveId,
  };
};

/**
 * Creates placeholder node for missing nodes in workflows
 */
function createPlaceholderNode(id: string): GraphNodeInfo {
  return {
    id,
    label: id.split(':')[1] || id,
    branch: 'unknown',
    type: 'placeholder',
    process: [],
    factoid: '',
    branchColor: '#cccccc',
    system: '',
    width: 120,
    height: 60,
  };
}
