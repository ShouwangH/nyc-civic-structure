import type cytoscape from 'cytoscape';
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
 * - Removes scope filtering classes (hidden, faded) from active process elements
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
        // Remove scope filtering classes to ensure process nodes are visible
        node.removeClass('hidden faded highlighted');
        node.addClass('process-active');
      } else {
        node.addClass('dimmed');
      }
    });

    cy.edges().forEach((edge) => {
      if (edgeIdSet.has(edge.id())) {
        // Remove scope filtering classes to ensure process edges are visible
        edge.removeClass('hidden faded highlighted');
        edge.addClass('process-active-edge');
      } else {
        edge.addClass('dimmed');
      }
    });
  });
};

/**
 * Removes process-related classes from all elements
 * Removes: process-active, process-active-edge, dimmed
 */
export const resetProcessClasses = (cy: Core): void => {
  cy.batch(() => {
    cy.nodes().removeClass('process-active dimmed');
    cy.edges().removeClass('process-active-edge dimmed');
  });
};

/**
 * Applies structural subview highlight classes
 * - Subview elements get 'highlighted'
 * - Other nodes get 'faded'
 * - Other edges get 'hidden'
 */
export const applyStructuralSubviewClasses = (
  cy: Core,
  subviewNodes: cytoscape.NodeCollection,
  subviewEdges: cytoscape.EdgeCollection,
): void => {
  const otherNodes = cy.nodes().not(subviewNodes);
  const otherEdges = cy.edges().not(subviewEdges);

  cy.batch(() => {
    cy.elements().removeClass('highlighted faded hidden dimmed');
    subviewNodes.addClass('highlighted');
    subviewEdges.addClass('highlighted');
    otherNodes.addClass('faded');
    otherEdges.addClass('hidden');
  });
};
