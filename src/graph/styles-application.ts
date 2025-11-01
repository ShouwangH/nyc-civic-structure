import type { Core } from 'cytoscape';

/**
 * CSS class application module
 * Dynamic styling utilities for graph element highlighting and dimming
 */

/**
 * Resets all highlight-related classes from all elements
 * Removes: highlighted, faded, hidden, dimmed
 */
export const resetHighlightClasses = (cy: Core): void => {
  cy.batch(() => {
    cy.elements().removeClass('highlighted faded hidden dimmed');
  });
};

/**
 * Applies process highlight classes to nodes and edges
 * - Active elements get 'process-active' or 'process-active-edge'
 * - Inactive elements get 'dimmed'
 */
export const applyProcessHighlightClasses = (
  cy: Core,
  nodeIdSet: Set<string>,
  edgeIdSet: Set<string>,
): void => {
  cy.batch(() => {
    cy.nodes().removeClass('dimmed process-active');
    cy.edges().removeClass('dimmed process-active-edge');

    cy.nodes().forEach((node) => {
      if (nodeIdSet.has(node.id())) {
        node.addClass('process-active');
      } else {
        node.addClass('dimmed');
      }
    });

    cy.edges().forEach((edge) => {
      if (edgeIdSet.has(edge.id())) {
        edge.addClass('process-active-edge');
      } else {
        edge.addClass('dimmed');
      }
    });
  });
};
