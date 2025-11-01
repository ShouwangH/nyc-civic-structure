// ABOUTME: Node focus controller module
// ABOUTME: Manages node focus animations and highlight state
import type { Core } from 'cytoscape';
import { ANIMATION_DURATION, ANIMATION_EASING } from './animation';

export type NodeFocusController = {
  focus: (nodeIds: string[]) => Promise<void>;
  clear: () => void;
};

type NodeFocusControllerDeps = {
  cy: Core;
};

export const createNodeFocusController = (deps: NodeFocusControllerDeps): NodeFocusController => {
  const { cy } = deps;

  let focusTransitionInProgress = false;

  const focus = async (nodeIds: string[]): Promise<void> => {
    if (focusTransitionInProgress) {
      return;
    }

    const targets = cy.collection();
    nodeIds.forEach((id) => {
      const node = cy.getElementById(id);
      if (node && node.length > 0) {
        targets.merge(node);
      }
    });

    if (targets.length === 0) {
      return;
    }

    focusTransitionInProgress = true;

    const targetEdges = targets.connectedEdges();
    const otherNodes = cy.nodes().not(targets);
    const otherEdges = cy.edges().not(targetEdges);

    cy.batch(() => {
      cy.elements().removeClass('highlighted faded hidden dimmed');
      targets.addClass('highlighted');
      targetEdges.removeClass('faded hidden');
      otherNodes.addClass('faded');
      otherEdges.addClass('faded');
    });

    try {
      await cy
        .animation({
          fit: {
            eles: targets,
            padding: 160,
          },
          duration: ANIMATION_DURATION,
          easing: ANIMATION_EASING,
        })
        .play()
        .promise();
    } catch {
      // ignore animation cancellation
    }

    focusTransitionInProgress = false;
  };

  const clear = (): void => {
    cy.batch(() => {
      cy.elements().removeClass('highlighted faded hidden dimmed');
    });
  };

  return {
    focus,
    clear,
  };
};
