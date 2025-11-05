import type { Core, LayoutOptions, NodeSingular, Position } from 'cytoscape';
import type cytoscape from 'cytoscape';

/**
 * Layout utility module
 * Pure functions for layout configuration, viewport calculations, and position management
 */

export type MainLayoutOptions = {
  animateFit?: boolean;
  fitPadding?: number;
};

/**
 * Creates a shallow copy of a position object
 */
export const copyPosition = (position: { x: number; y: number }) => ({
  x: position.x,
  y: position.y,
});

/**
 * Clones layout options with optional overrides
 */
export const cloneLayoutOptions = (
  layout: LayoutOptions,
  overrides: Partial<LayoutOptions> = {},
) =>
  ({
    ...layout,
    ...overrides,
  }) as LayoutOptions;

/**
 * Calculates viewport metrics (center and dimensions)
 * Falls back to bounding box if extent is invalid
 */
export const getViewportMetrics = (cy: Core) => {
  const extent = cy.extent();
  const width = extent.x2 - extent.x1;
  const height = extent.y2 - extent.y1;

  if (Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0) {
    return {
      centerX: extent.x1 + width / 2,
      centerY: extent.y1 + height / 2,
      width,
      height,
    };
  }

  const bbox = cy.nodes().boundingBox();
  const bboxWidth = bbox.x2 - bbox.x1 || 1;
  const bboxHeight = bbox.y2 - bbox.y1 || 1;

  return {
    centerX: (bbox.x1 + bbox.x2) / 2 || 0,
    centerY: (bbox.y1 + bbox.y2) / 2 || 0,
    width: bboxWidth,
    height: bboxHeight,
  };
};

/**
 * Creates ELK layout options for process visualization
 * Positions the layout relative to a center point
 */
export const createProcessLayoutOptions = (
  centerX: number,
  centerY: number,
  animationDuration: number,
  animationEasing: cytoscape.AnimationOptions['easing'],
): LayoutOptions =>
  cloneLayoutOptions(
    {
      name: 'elk',
      fit: false,
      nodeDimensionsIncludeLabels: true,
      elk: {
        algorithm: 'layered',
        'elk.direction': 'RIGHT',
        'elk.spacing.nodeNode': 80,
        'elk.layered.spacing.nodeNodeBetweenLayers': 100,
      },
    } as LayoutOptions,
    {
      animate: true,
      animationDuration,
      animationEasing,
      transform: (_node: NodeSingular, pos: Position): Position => ({
        x: pos.x + centerX,
        y: pos.y + centerY,
      }),
    },
  );

/**
 * Captures initial positions of all nodes
 * Stores positions in node data as 'orgPos' for later restoration
 */
export const captureInitialPositions = (cy: Core) => {
  cy.nodes().forEach((node) => {
    node.data('orgPos', copyPosition(node.position()));
  });
};
