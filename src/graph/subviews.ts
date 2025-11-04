// ABOUTME: Converts SubviewDefinition to SubgraphConfig for orchestrator
// ABOUTME: Builds graph configs from subview node references

import { buildSubgraphGraph } from './data';
import type { SubviewDefinition, StructureNode } from '../data/types';
import type { SubgraphConfig } from './subgraphs';
import type { GovernmentDataset } from '../data/datasets';

/**
 * Convert SubviewDefinition to SubgraphConfig
 * Looks up actual node data and builds SubgraphFile format
 */
function subviewToSubgraphConfig(
  subview: SubviewDefinition,
  allNodes: StructureNode[]
): SubgraphConfig | null {
  // Build node lookup map
  const nodeMap = new Map(allNodes.map(n => [n.id, n]));

  // Get anchor node ID
  const anchorId = subview.anchor?.nodeId;
  if (!anchorId) {
    console.warn(`[subviews] Subview ${subview.id} missing anchor node`);
    return null;
  }

  // Convert SubviewDefinition to SubgraphFile format
  const subgraphFile = {
    id: subview.id,
    label: subview.label,
    description: subview.description,
    entryNodeId: anchorId,
    layoutType: subview.layout.type === 'elk-mrtree' ? 'elk-mrtree' as const :
                subview.layout.type === 'concentric' ? 'concentric' as const :
                'elk-mrtree' as const,
    elements: {
      nodes: subview.nodes.map(nodeId => {
        const node = nodeMap.get(nodeId);
        if (!node) {
          console.warn(`[subviews] Node ${nodeId} not found for subview ${subview.id}`);
          return null;
        }

        return {
          data: {
            id: node.id,
            label: node.label,
            type: node.type,
            branch: node.branch,
            factoid: node.factoid,
            process: node.process,
          }
        };
      }).filter((n): n is NonNullable<typeof n> => n !== null),

      edges: subview.edges.map(edge => ({
        data: {
          id: edge.label || `${edge.source}->${edge.target}`,
          source: edge.source,
          target: edge.target,
          relation: edge.relation,
          label: edge.label,
          detail: edge.detail,
        }
      }))
    }
  };

  // Build graph using existing function
  const graph = buildSubgraphGraph(subgraphFile);

  return {
    meta: subgraphFile,
    graph,
  };
}

/**
 * Build subview configs from all jurisdictions
 */
export function buildSubviewConfigs(datasets: Record<string, GovernmentDataset>): SubgraphConfig[] {
  const configs: SubgraphConfig[] = [];

  // Collect all nodes for lookups
  const allNodes: StructureNode[] = Object.values(datasets).flatMap(d => d.nodes);

  // Convert subviews from each jurisdiction
  for (const dataset of Object.values(datasets)) {
    if (!dataset.subviews) continue;

    for (const subview of dataset.subviews) {
      const config = subviewToSubgraphConfig(subview, allNodes);
      if (config) {
        configs.push(config);
      }
    }
  }

  return configs;
}
