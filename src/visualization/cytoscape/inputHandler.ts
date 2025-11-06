// ABOUTME: Pure event translator - converts DOM events to controller actions
// ABOUTME:  translates events and dispatches actions

import type { Core } from 'cytoscape';
import type { Controller } from './controller';
import { actions } from './actions';

export type InputHandlerConfig = {
  cy: Core;
  controller: Controller;
};

/**
 * Sets up pure event translation from cytoscape to controller actions.
 * converts DOM events to action dispatches.
 */
export function setupInputHandler(config: InputHandlerConfig): void {
  const { cy, controller } = config;

  // Node click: dispatch nodeClick action
  cy.on('tap', 'node', (event) => {
    const nodeId = event.target.id();
    void controller.dispatch(actions.nodeClick(nodeId));
  });

  // Edge click: dispatch edgeClick action
  cy.on('tap', 'edge', (event) => {
    const edgeId = event.target.id();
    void controller.dispatch(actions.edgeClick(edgeId));
  });

  // Background click: dispatch backgroundClick action
  cy.on('tap', (event) => {
    if (event.target === cy) {
      void controller.dispatch(actions.backgroundClick());
    }
  });
}
