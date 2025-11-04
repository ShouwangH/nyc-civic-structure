// ABOUTME: Data loading service for three-tier architecture
// ABOUTME: Loads main.json on init, intra files on-demand, builds node Map for O(1) lookups

import type { StructureNode, RawEdge, SubviewDefinition, GovernmentScope } from './types';

export type DataFile = {
  meta: {
    title?: string;
    description?: string;
    tier?: 'main' | 'intra' | 'detailed';
    jurisdiction?: GovernmentScope;
    version?: string;
  };
  nodes: StructureNode[];
  edges?: RawEdge[];
  subviews?: SubviewDefinition[];
};

// Global node map for instant lookups
export const nodeMap = new Map<string, StructureNode>();

// Track what's been loaded
export const loadedTiers = new Set<string>();

// In-memory cache of all data
let mainData: DataFile | null = null;
const intraDataCache = new Map<GovernmentScope, DataFile>();

/**
 * Loads the main graph (constitutional structure)
 * Called once on app startup
 */
export async function loadMainGraph(): Promise<DataFile> {
  if (mainData) {
    return mainData;
  }

  try {
    const response = await fetch('/data/main.json');
    if (!response.ok) {
      throw new Error(`Failed to load main.json: ${response.statusText}`);
    }

    const data: DataFile = await response.json();

    // Add nodes to map
    data.nodes.forEach(node => {
      nodeMap.set(node.id, node);
    });

    loadedTiers.add('main');
    mainData = data;

    console.log(`[data-loader] Loaded main tier: ${data.nodes.length} nodes`);
    return data;
  } catch (error) {
    console.error('[data-loader] Failed to load main graph:', error);
    throw error;
  }
}

/**
 * Loads intra-agency data for a jurisdiction
 * Called on-demand when user drills into a jurisdiction
 */
export async function loadIntraData(jurisdiction: GovernmentScope): Promise<DataFile> {
  // Return cached if already loaded
  if (intraDataCache.has(jurisdiction)) {
    return intraDataCache.get(jurisdiction)!;
  }

  try {
    const response = await fetch(`/data/${jurisdiction}-intra.json`);
    if (!response.ok) {
      throw new Error(`Failed to load ${jurisdiction}-intra.json: ${response.statusText}`);
    }

    const data: DataFile = await response.json();

    // Add nodes to map
    data.nodes.forEach(node => {
      nodeMap.set(node.id, node);
    });

    loadedTiers.add(`${jurisdiction}-intra`);
    intraDataCache.set(jurisdiction, data);

    console.log(`[data-loader] Loaded ${jurisdiction} intra tier: ${data.nodes.length} nodes, ${data.subviews?.length || 0} subviews`);
    return data;
  } catch (error) {
    console.error(`[data-loader] Failed to load ${jurisdiction} intra data:`, error);
    throw error;
  }
}

/**
 * Loads detailed organizational data for a specific scope
 * Placeholder for future Tier 3 implementation
 */
export async function loadDetailedData(jurisdiction: GovernmentScope, scope: string): Promise<DataFile> {
  throw new Error(`Tier 3 (detailed) not yet implemented: ${jurisdiction}/${scope}`);
}

/**
 * Gets all loaded nodes
 */
export function getAllNodes(): StructureNode[] {
  return Array.from(nodeMap.values());
}

/**
 * Gets all loaded edges
 */
export function getAllEdges(): RawEdge[] {
  const edges: RawEdge[] = [];

  if (mainData?.edges) {
    edges.push(...mainData.edges);
  }

  intraDataCache.forEach(data => {
    if (data.edges) {
      edges.push(...data.edges);
    }
  });

  return edges;
}

/**
 * Gets all loaded subviews
 */
export function getAllSubviews(): SubviewDefinition[] {
  const subviews: SubviewDefinition[] = [];

  intraDataCache.forEach(data => {
    if (data.subviews) {
      subviews.push(...data.subviews);
    }
  });

  return subviews;
}

/**
 * Checks if a tier is loaded
 */
export function isTierLoaded(tier: string): boolean {
  return loadedTiers.has(tier);
}

/**
 * Gets a node by ID from the map (O(1) lookup)
 */
export function getNodeById(nodeId: string): StructureNode | undefined {
  return nodeMap.get(nodeId);
}
