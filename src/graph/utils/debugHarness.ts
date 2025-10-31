import type cytoscape from 'cytoscape';
import type { GraphConfig } from '../types';
import { NODE_HEIGHT, NODE_WIDTH } from '../constants';

type DebugMeta = {
  id: string;
  entryNodeId: string;
};

export const runSubgraphConcentricDebug = async (
  cy: cytoscape.Core,
  meta: DebugMeta,
  subgraph: GraphConfig,
  animation: { duration: number; easing: cytoscape.AnimationOptions['easing'] },
) => {
  const debugNodes = subgraph.nodes.map((node) => ({
    original: node,
    debugId: node.id,
  }));

  cy.batch(() => {
    debugNodes.forEach((debugNode) => {
      const { original, debugId } = debugNode;
      const existing = cy.getElementById(debugId);
      if (existing.length === 0) {
        cy.add({
          group: 'nodes',
          data: {
            id: debugId,
            originalId: original.id,
            label: original.label,
            branch: original.branch ?? 'debug',
            type: original.type ?? 'debug',
            process: original.process ?? [],
            factoid: original.factoid ?? 'Debug node for concentric layout test.',
            branchColor: original.branchColor ?? '#a855f7',
            system: original.system ?? 'subgraph-node',
            width: NODE_WIDTH,
            height: NODE_HEIGHT,
          },
        });
      }

      const edgeId = `debug_concentric_edge_${debugId}`;
      const existingEdge = cy.getElementById(edgeId);
      if (existingEdge.length === 0) {
        cy.add({
          group: 'edges',
          data: {
            id: edgeId,
            source: meta.entryNodeId,
            target: debugId,
            label: '',
            type: 'relationship',
            process: [],
          },
        });
      }
    });
  });

  const debugCollection = cy.collection();
  debugNodes.forEach((debugNode) => {
    debugCollection.merge(cy.getElementById(debugNode.debugId));
  });
  debugCollection.merge(cy.getElementById(meta.entryNodeId));
  const debugEdges = debugCollection.connectedEdges();

  const anchorIds = new Set([meta.entryNodeId, 'mayor']);

  const layoutOptions = {
    name: 'concentric',
    animate: true,
    animationDuration: animation.duration,
    animationEasing: animation.easing,
    fit: false,
    padding: 80,
    minNodeSpacing: 60,
    avoidOverlap: true,
    concentric: (node: cytoscape.NodeSingular) => {
      const nodeId = node.id();
      const originalId = String(node.data('originalId') ?? '');
      if (anchorIds.has(nodeId) || anchorIds.has(originalId)) {
        return 2;
      }
      return 1;
    },
    levelWidth: () => 1,
  } as cytoscape.LayoutOptions;

  const layoutCollection = debugCollection.union(debugEdges);
  const layout = layoutCollection.layout(layoutOptions);
  const layoutPromise = layout.promiseOn('layoutstop');
  layout.run();
  await layoutPromise;

  await cy
    .animation({
      fit: {
        eles: debugCollection,
        padding: 160,
      },
      duration: animation.duration,
      easing: animation.easing,
    })
    .play()
    .promise()
    .catch(() => {});
};
