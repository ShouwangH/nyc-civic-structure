// ABOUTME: State management for visualization controller
// ABOUTME: Handles state transitions and business rules for VisualizationState

import type { Core } from 'cytoscape';
import type { SubviewDefinition } from '../../data/types';
import type { SankeyData } from '../sankey/types';
import type { SunburstData } from '../sunburst/types';
import type { GovernmentScope } from '../../data/datasets';

export type VisualizationState = {
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  activeSubviewId: string | null;
  activeScope: GovernmentScope | null;
  controlsOpen: boolean;
  sidebarHover: boolean;
  viewMode: 'diagram' | 'financials' | 'maps';
  activeTab: 'details' | 'processes';
  sankeyOverlay?: {
    subview: SubviewDefinition;
    data: SankeyData;
  } | null;
  sunburstOverlay?: {
    subview: SubviewDefinition;
    data: SunburstData;
  } | null;
};

export type SetState = (updater: (prev: VisualizationState) => VisualizationState) => void;

export type StateManagerConfig = {
  cy: Core;
  setState: SetState;
  scopeNodeIds: Record<GovernmentScope, string[]>;
};

/**
 * Applies scope styling to the graph - dims nodes/edges outside the scope.
 */
export function applyScopeStyling(
  cy: Core,
  scope: GovernmentScope,
  scopeNodeIds: Record<GovernmentScope, string[]>
): void {
  const nodeIds = scopeNodeIds[scope];
  if (!nodeIds || nodeIds.length === 0) {
    return;
  }

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
}

/**
 * Central state transition function with business rules enforcement.
 * Single source of truth for how VisualizationState changes are applied.
 */
export function transitionVisualizationState(
  setState: SetState,
  changes: Partial<VisualizationState>
): void {
  setState((prev) => {
    const next = { ...prev, ...changes };

    // Rule: Node and edge selections are mutually exclusive
    if ('selectedNodeId' in changes && changes.selectedNodeId !== undefined) {
      if (changes.selectedNodeId !== null) {
        next.selectedEdgeId = null;
      }
    }
    if ('selectedEdgeId' in changes && changes.selectedEdgeId !== undefined) {
      if (changes.selectedEdgeId !== null) {
        next.selectedNodeId = null;
      }
    }

    // Rule: Sidebar visibility based on selection state
    // Show sidebar when anything is selected, hide when explicitly cleared
    if (next.selectedNodeId || next.selectedEdgeId || next.activeSubviewId) {
      next.sidebarHover = true;
    } else if ('activeSubviewId' in changes && changes.activeSubviewId === null) {
      // Explicitly hide sidebar when clearing subview
      next.sidebarHover = false;
    }

    return next;
  });
}
