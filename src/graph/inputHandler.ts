import type { Core, EventObject } from 'cytoscape';
import type { GraphInputBinding, GraphRuntimeEventHandlers } from './runtimeTypes';

const createGraphInputHandler = (
  cy: Core,
  runtime: GraphRuntimeEventHandlers,
): GraphInputBinding => {
  let handleNodeTapBound: ((event: EventObject) => void) | null = null;
  let handleEdgeTapBound: ((event: EventObject) => void) | null = null;
  let handleBackgroundTapBound: ((event: EventObject) => void) | null = null;
  let handleZoomBound: (() => void) | null = null;

  const detach = () => {
    if (handleNodeTapBound) {
      cy.removeListener('tap', 'node', handleNodeTapBound);
      handleNodeTapBound = null;
    }
    if (handleEdgeTapBound) {
      cy.removeListener('tap', 'edge', handleEdgeTapBound);
      handleEdgeTapBound = null;
    }
    if (handleBackgroundTapBound) {
      cy.removeListener('tap', handleBackgroundTapBound);
      handleBackgroundTapBound = null;
    }
    if (handleZoomBound) {
      cy.removeListener('zoom', handleZoomBound);
      handleZoomBound = null;
    }
  };

  const attach = () => {
    detach();

    handleNodeTapBound = (event: EventObject) => {
      runtime.handleNodeTap(event.target.id());
    };
    handleEdgeTapBound = (event: EventObject) => {
      runtime.handleEdgeTap(event.target.id());
    };
    handleBackgroundTapBound = (event: EventObject) => {
      if (event.target === cy) {
        runtime.handleBackgroundTap();
      }
    };
    handleZoomBound = () => {
      runtime.handleZoom();
    };

    cy.on('tap', 'node', handleNodeTapBound);
    cy.on('tap', 'edge', handleEdgeTapBound);
    cy.on('tap', handleBackgroundTapBound);
    cy.on('zoom', handleZoomBound);
  };

  return { attach, detach };
};

export { createGraphInputHandler };
