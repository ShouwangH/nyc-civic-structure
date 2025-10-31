import type { NodeCollection } from 'cytoscape';

export const captureNodePositions = (collection: NodeCollection) =>
  collection.map((node) => ({ id: node.id(), position: node.position() }));

const DEFAULT_WATCH_IDS = ['mayor', 'departments'];

export const logPositions = (
  stage: string,
  collection: NodeCollection,
  watchIds: string[] = [],
) => {
  const positions = captureNodePositions(collection);
  const uniquePositions = new Set(positions.map((item) => `${item.position.x},${item.position.y}`));
  const allSame = uniquePositions.size <= 1;
  const effectiveWatchIds = Array.from(new Set([...DEFAULT_WATCH_IDS, ...watchIds]));
  const watched = effectiveWatchIds.map((id) => {
    const match = positions.find((item) => item.id === id);
    return { id, position: match?.position ?? null };
  });

  const cyInstance = collection.length > 0 ? collection[0].cy() : null;
  let rendererAvailable = false;

  if (cyInstance && typeof (cyInstance as { renderer?: () => unknown }).renderer === 'function') {
    try {
      const renderer = (cyInstance as { renderer?: () => unknown }).renderer;
      rendererAvailable = Boolean(renderer?.());
    } catch {
      rendererAvailable = false;
    }
  }

  const boundingBoxes = rendererAvailable
    ? collection.map((node) => {
        let renderedBoundingBox: ReturnType<typeof node.renderedBoundingBox> | null = null;
        let boundingBox: ReturnType<typeof node.boundingBox> | null = null;

        try {
          boundingBox = node.boundingBox();
        } catch {
          boundingBox = null;
        }

        try {
          renderedBoundingBox = node.renderedBoundingBox();
        } catch {
          renderedBoundingBox = null;
        }

        return {
          id: node.id(),
          renderedBoundingBox,
          boundingBox,
        };
      })
    : [];

  console.log(`[Layout] ${stage}`, {
    positions,
    uniquePositions: Array.from(uniquePositions),
    allSame,
    watched,
    boundingBoxes,
    rendererAvailable,
  });

  return { positions, uniquePositions, allSame, watched, boundingBoxes };
};
