// ABOUTME: Action queue and event translator - serializes all actions to prevent race conditions
// ABOUTME: Exposes enqueue() method for all components to dispatch actions through queue

import type { Core } from 'cytoscape';
import type { Controller } from './controller';
import type { GraphAction } from './actions';
import { actions } from './actions';

export type InputHandlerConfig = {
  cy: Core;
  controller: Controller;
};

export type InputHandler = {
  enqueue: (action: GraphAction) => Promise<void>;
};

/**
 * Creates an action queue that serializes all dispatches to the controller.
 * All user interactions (clicks, buttons, callbacks) should go through enqueue().
 * This prevents race conditions where async operations interleave and read stale state.
 */
/**
 * Check if two actions are equivalent (same type and payload)
 */
function areActionsEquivalent(a: GraphAction, b: GraphAction): boolean {
  if (a.type !== b.type) {
    return false;
  }

  // For actions with payloads, compare them
  if ('payload' in a && 'payload' in b) {
    return JSON.stringify(a.payload) === JSON.stringify(b.payload);
  }

  // For actions without payloads, type match is enough
  return !('payload' in a) && !('payload' in b);
}

export function setupInputHandler(config: InputHandlerConfig): InputHandler {
  const { cy, controller } = config;

  const queue: GraphAction[] = [];
  let isProcessing = false;

  /**
   * Enqueue an action to be processed sequentially.
   * All components should call this instead of controller.dispatch() directly.
   */
  const enqueue = async (action: GraphAction): Promise<void> => {
    // Deduplicate: Don't queue consecutive identical actions
    // This prevents rapid clicking from toggling states repeatedly
    const lastAction = queue[queue.length - 1];
    if (lastAction && areActionsEquivalent(lastAction, action)) {
      return;
    }

    queue.push(action);

    // Start processing if not already running
    if (!isProcessing) {
      await processQueue();
    }
  };

  /**
   * Process actions sequentially, waiting for each to complete before starting the next.
   * This ensures state consistency by preventing concurrent async operations.
   */
  const processQueue = async (): Promise<void> => {
    isProcessing = true;

    while (queue.length > 0) {
      const action = queue.shift()!;
      await controller.dispatch(action); // Wait for async operations to complete
    }

    isProcessing = false;
  };

  // Wire up Cytoscape DOM events to enqueue actions
  cy.on('tap', 'node', (event) => {
    const nodeId = event.target.id();
    void enqueue(actions.nodeClick(nodeId));
  });

  cy.on('tap', 'edge', (event) => {
    const edgeId = event.target.id();
    void enqueue(actions.edgeClick(edgeId));
  });

  cy.on('tap', (event) => {
    if (event.target === cy) {
      void enqueue(actions.backgroundClick());
    }
  });

  // Hover events for visual feedback
  cy.on('mouseover', 'node', (event) => {
    const nodeId = event.target.id();
    void enqueue(actions.nodeHover(nodeId));
  });

  cy.on('mouseout', 'node', () => {
    void enqueue(actions.nodeUnhover());
  });

  return { enqueue };
}
