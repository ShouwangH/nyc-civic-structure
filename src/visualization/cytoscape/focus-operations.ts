// ABOUTME: Focus and viewport operations for cytoscape controller
// ABOUTME: Handles node focusing, scope changes, and background click behavior

import type { Core } from 'cytoscape';
import { resetHighlightClasses } from './styles-application';

/**
 * Focuses the viewport on a set of nodes with animation.
 */
export async function focusNodes(
  nodeIds: string[],
  cy: Core
): Promise<void> {
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
}

/**
 * Clears node focus by removing highlight classes.
 */
export function clearNodeFocus(cy: Core): void {
  resetHighlightClasses(cy);
}

/**
 * Captures initial node positions for later restoration.
 */
export function captureInitialPositions(cy: Core): void {
  cy.nodes().forEach((node) => {
    const position = node.position();
    node.data('orgPos', { x: position.x, y: position.y });
  });
}
