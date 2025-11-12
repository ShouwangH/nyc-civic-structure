// ABOUTME: Subview activation and deactivation operations for cytoscape controller
// ABOUTME: Handles adding/removing nodes, running layouts, and managing subview state

import type { Core } from 'cytoscape';
import type { SubviewDefinition, SubviewType } from '../../data/types';
import type { GraphNodeInfo, GraphEdgeInfo } from './types';
import type { SankeyData } from '../sankey/types';
import type { SunburstData } from '../sunburst/types';
import type { GovernmentScope } from '../../data/datasets';
import { copyPosition, getViewportMetrics } from './layout';
import { ANIMATION_DURATION, ANIMATION_EASING } from './animation';
import {
  applyProcessHighlightClasses,
  resetHighlightClasses,
  resetProcessClasses,
  applyStructuralSubviewClasses,
} from './styles-application';
import { createStructuralLayoutOptions } from './layouts';
import type { VisualizationState, SetState } from './state-manager';
import { transitionVisualizationState, applyScopeStyling } from './state-manager';

export type ActiveSubviewState = {
  id: string;
  type: SubviewType;
  addedNodeIds: Set<string>;
  addedEdgeIds: Set<string>;
  affectedNodeIds: Set<string>;
  affectedEdgeIds: Set<string>;
};

export type SubviewOperationsConfig = {
  cy: Core;
  setState: SetState;
  getState: () => VisualizationState;
  subviewById: Map<string, SubviewDefinition>;
  scopeNodeIds: Record<GovernmentScope, string[]>;
  nodeInfosById: Map<string, GraphNodeInfo>;
};

export type SubviewOperationsContext = {
  activeSubview: ActiveSubviewState | null;
  transitionInProgress: boolean;
};

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

/**
 * Activates a subview by adding nodes/edges, running layout, and updating state.
 * Handles both overlay subviews (Sankey, Sunburst) and cytoscape subviews.
 */
export async function activateSubview(
  subviewId: string,
  config: SubviewOperationsConfig,
  context: SubviewOperationsContext,
  focusNodes: (nodeIds: string[]) => Promise<void>
): Promise<void> {
  const { cy, setState, subviewById, scopeNodeIds, nodeInfosById } = config;

  console.log('[Controller] activateSubview START:', subviewId, {
    transitionInProgress: context.transitionInProgress,
    activeSubviewId: context.activeSubview?.id,
  });

  const subview = subviewById.get(subviewId);
  if (!subview) {
    console.log('[Controller] activateSubview ABORT: subview not found');
    return;
  }

  // Guard: check transition lock
  if (context.transitionInProgress) {
    console.log('[Controller] activateSubview ABORT: transition in progress');
    return;
  }

  // Guard: check duplicate activation
  if (context.activeSubview?.id === subview.id) {
    console.log('[Controller] activateSubview ABORT: already active');
    return;
  }

  console.log('[Controller] activateSubview PROCEED:', {
    subviewType: subview.type,
    renderTarget: subview.renderTarget,
  });

  // Special handling for overlay renderTarget (e.g., Sankey, Sunburst)
  // Overlays are additive - they don't replace node selection or manipulate Cytoscape
  if (subview.renderTarget === 'overlay') {
    if (subview.type === 'sankey' && subview.sankeyData) {
      // Determine scope - use subview jurisdiction if it's a valid scope (not 'multi')
      const subviewScope = subview.jurisdiction !== 'multi' ? subview.jurisdiction : null;

      // Apply scope styling for overlays since they don't manipulate the graph
      if (subviewScope) {
        applyScopeStyling(cy, subviewScope, scopeNodeIds);
      }

      // Set activeSubviewId and scope IMMEDIATELY so ControlPanel syncs before async operation
      transitionVisualizationState(setState, {
        activeSubviewId: subview.id,
        ...(subviewScope ? { activeScope: subviewScope } : {}),
      });

      // Load Sankey data from API or file
      try {
        let dataUrl: string;
        if (subview.sankeyData.type === 'api') {
          dataUrl = `/api/financial-data/sankey/${subview.sankeyData.id}`;
        } else {
          dataUrl = subview.sankeyData.path.endsWith('.json')
            ? subview.sankeyData.path
            : `${subview.sankeyData.path}.json`;
        }

        const response = await fetch(dataUrl);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const json = await response.json();
        const sankeyData: SankeyData = json.success ? json.data : json;

        // Update state to add Sankey overlay (preserves selectedNodeId and activeSubviewId)
        transitionVisualizationState(setState, {
          sankeyOverlay: {
            subview,
            data: sankeyData,
          },
        });
      } catch (error) {
        console.error('Failed to load Sankey data:', error);
        // Clear activeSubviewId on error
        transitionVisualizationState(setState, {
          activeSubviewId: null,
        });
      }
    } else if (subview.type === 'sunburst' && subview.sunburstData) {
      // Determine scope - use subview jurisdiction if it's a valid scope (not 'multi')
      const subviewScope = subview.jurisdiction !== 'multi' ? subview.jurisdiction : null;

      // Apply scope styling for overlays since they don't manipulate the graph
      if (subviewScope) {
        applyScopeStyling(cy, subviewScope, scopeNodeIds);
      }

      // Set activeSubviewId and scope IMMEDIATELY so ControlPanel syncs before async operation
      transitionVisualizationState(setState, {
        activeSubviewId: subview.id,
        ...(subviewScope ? { activeScope: subviewScope } : {}),
      });

      // Load Sunburst data from API or file
      try {
        let dataUrl: string;
        if (subview.sunburstData.type === 'api') {
          dataUrl = `/api/financial-data/sunburst/${subview.sunburstData.id}`;
        } else {
          dataUrl = subview.sunburstData.path.endsWith('.json')
            ? subview.sunburstData.path
            : `${subview.sunburstData.path}.json`;
        }

        const response = await fetch(dataUrl);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const json = await response.json();
        const sunburstData: SunburstData = json.success ? json.data : json;

        // Update state to add Sunburst overlay (preserves selectedNodeId and activeSubviewId)
        transitionVisualizationState(setState, {
          sunburstOverlay: {
            subview,
            data: sunburstData,
          },
        });
      } catch (error) {
        console.error('Failed to load Sunburst data:', error);
        // Clear activeSubviewId on error
        transitionVisualizationState(setState, {
          activeSubviewId: null,
        });
      }
    }
    return; // Don't proceed with Cytoscape manipulation
  }

  // Deactivate current if any (note: this requires the deactivateSubview function)
  if (context.activeSubview) {
    await deactivateSubview(config, context, focusNodes);
  }

  context.transitionInProgress = true;

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

  // Get viewport center for workflow positioning (anchor nodes may not exist yet)
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
    applyStructuralSubviewClasses(cy, subviewNodes, subviewEdges);
  }

  // Run layout (workflows: viewport center, structural: entry node)
  const viewportCenter = subview.type === 'workflow' ? { x: centerX, y: centerY } : undefined;
  const layoutOptions = createStructuralLayoutOptions(subview, cy, viewportCenter);

  const layoutElements = subviewNodes.union(subviewEdges);
  const layout = layoutElements.layout(layoutOptions);
  const layoutPromise = layout.promiseOn('layoutstop');
  layout.run();
  await layoutPromise;

  console.log('[Controller] activateSubview: layout complete, checking if cancelled');

  // Check if we should abort (deactivateSubview was called during layout)
  // If nodes were removed, they won't exist in the graph anymore
  const firstAddedNode = addedNodeIds.values().next().value;
  const firstNodeExists = firstAddedNode ? cy.getElementById(firstAddedNode).length > 0 : false;
  console.log('[Controller] activateSubview: cancellation check after layout', {
    firstAddedNode,
    firstNodeExists,
    addedNodeIdsSize: addedNodeIds.size,
  });

  if (firstAddedNode && cy.getElementById(firstAddedNode).length === 0) {
    // Nodes were removed - activation was cancelled, abort
    console.log('[Controller] activateSubview ABORT: nodes removed during layout');
    context.transitionInProgress = false;
    return;
  }

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

  console.log('[Controller] activateSubview: animation complete, final cancellation check');

  // Final check: if nodes were removed during animation, abort
  const finalNodeExists = firstAddedNode ? cy.getElementById(firstAddedNode).length > 0 : false;
  console.log('[Controller] activateSubview: final check', {
    firstAddedNode,
    finalNodeExists,
  });

  if (firstAddedNode && cy.getElementById(firstAddedNode).length === 0) {
    console.log('[Controller] activateSubview ABORT: nodes removed during animation');
    context.transitionInProgress = false;
    return;
  }

  console.log('[Controller] activateSubview: storing active state');

  // Store active state
  context.activeSubview = {
    id: subview.id,
    type: subview.type,
    addedNodeIds,
    addedEdgeIds,
    affectedNodeIds: nodeIdSet,
    affectedEdgeIds: edgeIdSet,
  };

  context.transitionInProgress = false;
  console.log('[Controller] activateSubview COMPLETE:', subview.id);

  // Determine scope - use subview jurisdiction if it's a valid scope (not 'multi')
  const subviewScope = subview.jurisdiction !== 'multi' ? subview.jurisdiction : null;

  // NOTE: Don't call applyScopeStyling here - subview styling already handles all dimming.
  // The applyProcessHighlightClasses/applyStructuralSubviewClasses functions dim everything
  // outside the subview, which is more specific than scope-level dimming.

  // Update React state
  transitionVisualizationState(setState, {
    activeSubviewId: subview.id,
    selectedNodeId: null,
    selectedEdgeId: null,
    ...(subviewScope ? { activeScope: subviewScope } : {}),
  });
}

/**
 * Deactivates the current subview by removing added nodes/edges and restoring state.
 */
export async function deactivateSubview(
  config: SubviewOperationsConfig,
  context: SubviewOperationsContext,
  focusNodes: (nodeIds: string[]) => Promise<void>
): Promise<void> {
  const { cy, setState, getState, scopeNodeIds } = config;

  console.log('[Controller] deactivateSubview START:', {
    transitionInProgress: context.transitionInProgress,
    activeSubviewId: context.activeSubview?.id,
  });

  const currentState = getState();

  // Handle overlay subviews (Sankey, Sunburst, etc.) - they don't have activeSubview state
  if (currentState.sankeyOverlay) {
    console.log('[Controller] deactivateSubview: clearing sankeyOverlay');
    transitionVisualizationState(setState, {
      sankeyOverlay: null,
      activeSubviewId: null,
      viewMode: 'diagram',
      // Preserve selectedNodeId - return to the node that was selected
    });
    return;
  }

  if (currentState.sunburstOverlay) {
    console.log('[Controller] deactivateSubview: clearing sunburstOverlay');
    transitionVisualizationState(setState, {
      sunburstOverlay: null,
      activeSubviewId: null,
      viewMode: 'diagram',
      // Preserve selectedNodeId - return to the node that was selected
    });
    return;
  }

  const currentSubview = context.activeSubview;
  if (!currentSubview) {
    console.log('[Controller] deactivateSubview: no active subview, clearing state');
    transitionVisualizationState(setState, {
      // Keep activeScope - only clear subview state
      activeSubviewId: null,
      selectedNodeId: null,
      selectedEdgeId: null,
    });
    return;
  }

  console.log('[Controller] deactivateSubview: removing subview elements', {
    subviewId: currentSubview.id,
    addedNodeCount: currentSubview.addedNodeIds.size,
    addedEdgeCount: currentSubview.addedEdgeIds.size,
  });

  // If already transitioning, we still need to clean up
  // Setting this flag will cancel ongoing animations and prevent new actions
  context.transitionInProgress = true;

  // Remove CSS classes
  if (currentSubview.type === 'workflow') {
    resetProcessClasses(cy);
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

  // Check if we should preserve scope
  const currentScope = getState().activeScope;

  if (currentScope) {
    // Re-apply scope styling after removing subview
    applyScopeStyling(cy, currentScope, scopeNodeIds);

    // Fit to scope nodes
    const nodeIds = scopeNodeIds[currentScope];
    await focusNodes(nodeIds);
  } else {
    // No scope - clear all styling and refit to entire graph
    // Don't run layout since we just restored positions - just fit viewport
    resetHighlightClasses(cy);
    const fitPadding = currentSubview.type === 'workflow' ? 220 : 200;
    await cy
      .animation({
        fit: { eles: cy.elements(), padding: fitPadding },
        duration: ANIMATION_DURATION,
        easing: ANIMATION_EASING,
      })
      .play()
      .promise()
      .catch(() => {}); // Ignore cancelled animations
  }

  // Clear state
  context.activeSubview = null;
  context.transitionInProgress = false;

  console.log('[Controller] deactivateSubview COMPLETE: cleaned up subview');

  // Update React state
  transitionVisualizationState(setState, {
    // Keep activeScope - only clear subview state
    activeSubviewId: null,
    selectedNodeId: null,
    selectedEdgeId: null,
  });
}
