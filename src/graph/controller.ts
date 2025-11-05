// ABOUTME: Unified controller for ALL cytoscape graph operations
// ABOUTME: Only place that directly mutates cytoscape instance and calls setState

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
import type { GovernmentScope } from '../data/datasets';

export type VisualizationState = {
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  activeSubviewId: string | null;
  activeScope: GovernmentScope | null;
  controlsOpen: boolean;
  sidebarHover: boolean;
};

export type SetState = (updater: (prev: VisualizationState) => VisualizationState) => void;

export type Controller = {
  // Subview operations
  activateSubview: (subviewId: string) => Promise<void>;
  deactivateAll: () => Promise<void>;
  isSubviewActive: (id?: string) => boolean;

  // Node/Edge selection
  selectNode: (nodeId: string) => void;
  selectEdge: (edgeId: string) => void;
  clearSelections: () => void;

  // Scope operations
  handleScopeChange: (scope: GovernmentScope) => Promise<void>;

  // Focus operations
  focusNodes: (nodeIds: string[]) => Promise<void>;
  clearNodeFocus: () => void;

  // Initialization
  captureInitialPositions: () => void;
};

export type ControllerConfig = {
  cy: Core;
  setState: SetState;
  subviewByAnchorId: Map<string, SubviewDefinition>;
  subviewById: Map<string, SubviewDefinition>;
  scopeNodeIds: Record<GovernmentScope, string[]>;
  nodeInfosById: Map<string, GraphNodeInfo>;
  edgeInfosById: Map<string, GraphEdgeInfo>;
  runMainGraphLayout: (options?: MainLayoutOptions) => Promise<void>;
};

type ActiveSubviewState = {
  id: string;
  type: SubviewType;
  addedNodeIds: Set<string>;
  addedEdgeIds: Set<string>;
  affectedNodeIds: Set<string>;
  affectedEdgeIds: Set<string>;
};

export function createController(config: ControllerConfig): Controller {
  const {
    cy,
    setState,
    subviewById,
    scopeNodeIds,
    nodeInfosById,
    runMainGraphLayout,
  } = config;

  let activeSubview: ActiveSubviewState | null = null;
  let transitionInProgress = false;

  // ============================================================================
  // SUBVIEW OPERATIONS
  // ============================================================================

  const isSubviewActive = (id?: string): boolean => {
    if (!activeSubview) {
      return false;
    }
    return id ? activeSubview.id === id : true;
  };

  const activateSubview = async (subviewId: string): Promise<void> => {
    const subview = subviewById.get(subviewId);
    if (!subview) {
      return;
    }

    // Guard: check transition lock
    if (transitionInProgress) {
      return;
    }

    // Guard: check duplicate activation
    if (activeSubview?.id === subview.id) {
      return;
    }

    // Deactivate current if any
    if (activeSubview) {
      await deactivateAll();
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
      applyProcessHighlightClasses(cy, nodeIdSet, edgeIdSet);
    } else {
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

    // Update React state
    setState((prev) => ({
      ...prev,
      activeSubviewId: subview.id,
      selectedNodeId: null,
      selectedEdgeId: null,
      sidebarHover: true,
    }));
  };

  const deactivateAll = async (): Promise<void> => {
    const currentSubview = activeSubview;
    if (!currentSubview || transitionInProgress) {
      setState((prev) => ({
        ...prev,
        activeScope: null,
        activeSubviewId: null,
        selectedNodeId: null,
        selectedEdgeId: null,
        sidebarHover: false,
      }));
      return;
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

    // Clear node focus styling
    clearNodeFocus();

    // Update React state
    setState((prev) => ({
      ...prev,
      activeScope: null,
      activeSubviewId: null,
      selectedNodeId: null,
      selectedEdgeId: null,
      sidebarHover: false,
    }));
  };

  // ============================================================================
  // NODE/EDGE SELECTION
  // ============================================================================

  const selectNode = (nodeId: string): void => {
    // Cytoscape operations
    cy.elements().removeClass('highlighted');
    const node = cy.getElementById(nodeId);
    if (!node.empty()) {
      node.addClass('highlighted');
    }

    // Update React state
    setState((prev) => ({
      ...prev,
      selectedNodeId: nodeId,
      selectedEdgeId: null,
      sidebarHover: true,
    }));
  };

  const selectEdge = (edgeId: string): void => {
    // Cytoscape operations
    cy.elements().removeClass('highlighted');
    const edge = cy.getElementById(edgeId);
    if (!edge.empty()) {
      edge.addClass('highlighted');
    }

    // Update React state
    setState((prev) => ({
      ...prev,
      selectedEdgeId: edgeId,
      selectedNodeId: null,
      sidebarHover: true,
    }));
  };

  const clearSelections = (): void => {
    // Cytoscape operations
    cy.elements().removeClass('highlighted');

    // Update React state
    setState((prev) => ({
      ...prev,
      selectedNodeId: null,
      selectedEdgeId: null,
    }));
  };

  // ============================================================================
  // SCOPE OPERATIONS
  // ============================================================================

  const handleScopeChange = async (scope: GovernmentScope): Promise<void> => {
    // Deactivate any active subview first
    if (activeSubview) {
      await deactivateAll();
    }

    const nodeIds = scopeNodeIds[scope];
    if (!nodeIds || nodeIds.length === 0) {
      return;
    }

    // Apply dimmed/faded styling
    const scopeNodeSet = new Set(nodeIds);
    cy.batch(() => {
      cy.elements().removeClass('dimmed faded highlighted');

      cy.nodes().forEach((node) => {
        if (!scopeNodeSet.has(node.id())) {
          node.addClass('dimmed');
        }
      });

      cy.edges().forEach((edge) => {
        const source = edge.source().id();
        const target = edge.target().id();
        if (!scopeNodeSet.has(source) || !scopeNodeSet.has(target)) {
          edge.addClass('faded');
        }
      });
    });

    // Focus on scope nodes
    await focusNodes(nodeIds);

    // Update React state
    setState((prev) => ({
      ...prev,
      activeScope: scope,
      activeSubviewId: null,
      selectedNodeId: null,
      selectedEdgeId: null,
    }));
  };

  // ============================================================================
  // FOCUS OPERATIONS
  // ============================================================================

  const focusNodes = async (nodeIds: string[]): Promise<void> => {
    const nodes = cy.nodes().filter((node) => nodeIds.includes(node.id()));
    if (nodes.empty()) {
      return;
    }

    await cy
      .animation({
        fit: { eles: nodes, padding: 100 },
        duration: 500,
      })
      .play()
      .promise();
  };

  const clearNodeFocus = (): void => {
    cy.elements().removeClass('dimmed faded highlighted');
  };

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  const captureInitialPositions = (): void => {
    cy.nodes().forEach((node) => {
      node.data('orgPos', copyPosition(node.position()));
    });
  };

  return {
    activateSubview,
    deactivateAll,
    isSubviewActive,
    selectNode,
    selectEdge,
    clearSelections,
    handleScopeChange,
    focusNodes,
    clearNodeFocus,
    captureInitialPositions,
  };
}

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
