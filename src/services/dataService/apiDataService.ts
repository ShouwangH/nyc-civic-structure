// ABOUTME: API/database-based data service implementation
// ABOUTME: Loads civic structure data from server API (backed by database)

import type { DataService, GovernmentDataset } from './types';
import type {
  GovernmentScope,
  StructureNode,
  RawEdge,
  SubviewDefinition,
} from '../../data/types';

/**
 * API-based data service
 * Loads data from server endpoints which query the database
 */
export class ApiDataService implements DataService {
  private baseUrl: string;

  constructor(baseUrl = '') {
    // Empty string uses same origin (no CORS issues)
    this.baseUrl = baseUrl;
  }

  /**
   * Fetch data from API
   */
  private async fetchApi<T>(path: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`);

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const json = await response.json();

    if (!json.success) {
      throw new Error(json.error || 'API returned error');
    }

    return json.data as T;
  }

  /**
   * Get label for a jurisdiction
   */
  private getLabel(scope: GovernmentScope): string {
    switch (scope) {
      case 'city':
        return 'New York City';
      case 'state':
        return 'New York State';
      case 'federal':
        return 'United States';
    }
  }

  /**
   * Get description for a jurisdiction
   */
  private getDescription(scope: GovernmentScope): string {
    switch (scope) {
      case 'city':
        return 'Complete NYC government including city-wide governance and borough advisory structures.';
      case 'state':
        return 'High-level structure of New York State government as defined by the State Constitution and related laws.';
      case 'federal':
        return 'High-level structure of the U.S. federal government as defined by the Constitution.';
    }
  }

  async getDataset(scope: GovernmentScope): Promise<GovernmentDataset> {
    const data = await this.fetchApi<{
      meta: { title: string; description: string };
      nodes: StructureNode[];
      edges: RawEdge[];
      subviews?: SubviewDefinition[];
    }>(`/api/scopes/${scope}/dataset`);

    return {
      scope,
      label: this.getLabel(scope),
      description: this.getDescription(scope),
      ...data,
    };
  }

  async getNodes(scope: GovernmentScope): Promise<StructureNode[]> {
    return this.fetchApi<StructureNode[]>(`/api/scopes/${scope}/nodes`);
  }

  async getEdges(scope: GovernmentScope): Promise<RawEdge[]> {
    return this.fetchApi<RawEdge[]>(`/api/scopes/${scope}/edges`);
  }

  async getSubviews(scope: GovernmentScope): Promise<SubviewDefinition[]> {
    return this.fetchApi<SubviewDefinition[]>(`/api/scopes/${scope}/subviews`);
  }
}
