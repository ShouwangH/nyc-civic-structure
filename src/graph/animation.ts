import type { Core, CollectionReturnValue } from 'cytoscape';
import type cytoscape from 'cytoscape';

/**
 * Animation utility module
 * Animation orchestration and timing constants for graph transitions
 */

export const ANIMATION_DURATION = 550;
export const ANIMATION_EASING: cytoscape.AnimationOptions['easing'] = 'ease';

export type CyCollection = CollectionReturnValue;

/**
 * Animates the viewport to fit a collection of elements
 * Ignores cancelled animations (which can happen during rapid interactions)
 */
export const animateFitToCollection = async (
  cy: Core,
  collection: CyCollection,
  padding: number,
): Promise<void> => {
  if (!collection || collection.length === 0) {
    return;
  }

  try {
    await cy
      .animation({
        fit: {
          eles: collection,
          padding,
        },
        duration: ANIMATION_DURATION,
        easing: ANIMATION_EASING,
      })
      .play()
      .promise();
  } catch {
    // ignore cancelled animations
  }
};
