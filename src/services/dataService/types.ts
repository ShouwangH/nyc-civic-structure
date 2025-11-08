// ABOUTME: Data service interface for loading civic structure data
// ABOUTME: Abstracts data source (JSON files vs API/database)

import type {
  GovernmentScope,
  StructureNode,
  RawEdge,
  SubviewDefinition,
} from '../../data/types';

/**
 * Complete dataset for a government scope
 */
export type GovernmentDataset = {
  scope: GovernmentScope;
  label: string;
  description: string;
  meta: {
    title: string;
    description: string;
  };
  nodes: StructureNode[];
  edges: RawEdge[];
  subviews?: SubviewDefinition[];
};

/**
 * Data service interface
 * Implementations can load from JSON files, API, or other sources
 */
export interface DataService {
  /**
   * Get complete dataset for a government scope
   */
  getDataset(scope: GovernmentScope): Promise<GovernmentDataset>;

  /**
   * Get nodes only for a government scope
   */
  getNodes(scope: GovernmentScope): Promise<StructureNode[]>;

  /**
   * Get edges only for a government scope
   */
  getEdges(scope: GovernmentScope): Promise<RawEdge[]>;

  /**
   * Get subviews/processes only for a government scope
   */
  getSubviews(scope: GovernmentScope): Promise<SubviewDefinition[]>;
}
