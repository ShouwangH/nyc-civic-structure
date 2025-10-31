import type { Core, EventObject } from 'cytoscape';
import type { GraphOrchestrator } from './orchestrator';

class GraphInputHandler {
  private cy: Core;
  private orchestrator: GraphOrchestrator;

  private handleNodeTapBound: ((event: EventObject) => void) | null = null;
  private handleEdgeTapBound: ((event: EventObject) => void) | null = null;
  private handleBackgroundTapBound: ((event: EventObject) => void) | null = null;
  private handleZoomBound: (() => void) | null = null;

  constructor(cy: Core, orchestrator: GraphOrchestrator) {
    this.cy = cy;
    this.orchestrator = orchestrator;
  }

  attach() {
    this.handleNodeTapBound = (event: EventObject) => {
      this.orchestrator.handleNodeTap(event.target.id());
    };
    this.handleEdgeTapBound = (event: EventObject) => {
      this.orchestrator.handleEdgeTap(event.target.id());
    };
    this.handleBackgroundTapBound = (event: EventObject) => {
      if (event.target === this.cy) {
        this.orchestrator.handleBackgroundTap();
      }
    };
    this.handleZoomBound = () => {
      this.orchestrator.handleZoom();
    };

    this.cy.on('tap', 'node', this.handleNodeTapBound);
    this.cy.on('tap', 'edge', this.handleEdgeTapBound);
    this.cy.on('tap', this.handleBackgroundTapBound);
    this.cy.on('zoom', this.handleZoomBound);
  }

  detach() {
    if (this.handleNodeTapBound) {
      this.cy.removeListener('tap', 'node', this.handleNodeTapBound);
    }
    if (this.handleEdgeTapBound) {
      this.cy.removeListener('tap', 'edge', this.handleEdgeTapBound);
    }
    if (this.handleBackgroundTapBound) {
      this.cy.removeListener('tap', this.handleBackgroundTapBound);
    }
    if (this.handleZoomBound) {
      this.cy.removeListener('zoom', this.handleZoomBound);
    }
  }
}

export { GraphInputHandler };
