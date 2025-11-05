// ABOUTME: Translates DOM and cytoscape events to controller actions
// ABOUTME: Simple event wiring layer with no business logic

import type { Core } from 'cytoscape';
import type { Controller } from './controller';
import type { SubviewDefinition } from '../data/types';

export type InputHandlerConfig = {
  cy: Core;
  controller: Controller;
  subviewByAnchorId: Map<string, SubviewDefinition>;
};

export function setupInputHandler(config: InputHandlerConfig): void {
  const { cy, controller, subviewByAnchorId } = config;

  // Node click: select node OR activate subview
  cy.on('tap', 'node', (event) => {
    const nodeId = event.target.id();

    // Check if this node is an anchor for a subview
    const subview = subviewByAnchorId.get(nodeId);

    if (subview) {
      // Node is a subview anchor - check if already active
      const isCurrentlyActive = controller.isSubviewActive(subview.id);

      if (isCurrentlyActive) {
        // Clicking same subview - deactivate
        void controller.deactivateAll();
      } else {
        // Activate subview
        void controller.activateSubview(subview.id);
      }
    } else {
      // Regular node - just select it
      controller.selectNode(nodeId);
    }
  });

  // Edge click: select edge
  cy.on('tap', 'edge', (event) => {
    const edgeId = event.target.id();
    controller.selectEdge(edgeId);
  });

  // Background click: clear selections
  cy.on('tap', (event) => {
    if (event.target === cy) {
      void controller.deactivateAll();
    }
  });
}
