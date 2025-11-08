// ABOUTME: JSON file-based data service implementation
// ABOUTME: Loads civic structure data from JSON files (current default)

import mainData from '../../../data/main.json';
import cityIntra from '../../../data/city-intra.json';
import stateIntra from '../../../data/state-intra.json';
import federalIntra from '../../../data/federal-intra.json';
import cityWorkflows from '../../../data/city-workflows.json';
import stateWorkflows from '../../../data/state-workflows.json';
import federalWorkflows from '../../../data/federal-workflows.json';

import type { DataService, GovernmentDataset } from './types';
import type {
  GovernmentScope,
  StructureNode,
  RawEdge,
  SubviewDefinition,
} from '../../data/types';

/**
 * JSON-based data service (default implementation)
 * Loads data from static JSON files in the data/ directory
 */
export class JsonDataService implements DataService {
  /**
   * Extract nodes for a specific jurisdiction from main.json
   */
  private extractMainNodes(jurisdiction: GovernmentScope): StructureNode[] {
    const prefix = `${jurisdiction}:`;
    return mainData.nodes.filter(node => node.id.startsWith(prefix));
  }

  /**
   * Extract edges for a specific jurisdiction from main.json
   */
  private extractMainEdges(jurisdiction: GovernmentScope): RawEdge[] {
    const prefix = `${jurisdiction}:`;
    return (mainData.edges || []).filter(edge =>
      edge.source.startsWith(prefix) || edge.target.startsWith(prefix)
    );
  }

  /**
   * Extract subviews for a specific jurisdiction from main.json
   */
  private extractMainSubviews(jurisdiction: GovernmentScope): SubviewDefinition[] {
    const prefix = `${jurisdiction}:`;
    return ((mainData.subviews || []) as SubviewDefinition[]).filter(subview =>
      subview.anchor?.nodeId?.startsWith(prefix)
    );
  }

  /**
   * Get intra data for a jurisdiction
   */
  private getIntraData(scope: GovernmentScope) {
    switch (scope) {
      case 'city':
        return cityIntra;
      case 'state':
        return stateIntra;
      case 'federal':
        return federalIntra;
    }
  }

  /**
   * Get workflow data for a jurisdiction
   */
  private getWorkflowData(scope: GovernmentScope) {
    switch (scope) {
      case 'city':
        return cityWorkflows;
      case 'state':
        return stateWorkflows;
      case 'federal':
        return federalWorkflows;
    }
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

  /**
   * Build complete dataset from main + intra + workflow data
   */
  private buildDataset(scope: GovernmentScope): GovernmentDataset {
    const intraData = this.getIntraData(scope);
    const workflowData = this.getWorkflowData(scope);

    const mainNodes = this.extractMainNodes(scope);
    const mainEdges = this.extractMainEdges(scope);

    // Annotate main nodes with tier
    const annotatedMainNodes = mainNodes.map(node => ({
      ...node,
      tier: 'main' as const,
    }));

    // Annotate intra nodes with tier
    const annotatedIntraNodes: StructureNode[] = intraData.nodes.map(node => ({
      ...node,
      tier: (node.tier as 'main' | 'intra' | 'detailed' | undefined) || 'intra',
    }));

    // Merge subviews from main.json, intra files, and workflow files
    const mainSubviews = this.extractMainSubviews(scope);
    const intraSubviews = (intraData.subviews || []) as SubviewDefinition[];
    const workflowSubviews = workflowData.subviews as SubviewDefinition[];
    const allSubviews = [...mainSubviews, ...intraSubviews, ...workflowSubviews];

    return {
      scope,
      label: this.getLabel(scope),
      description: this.getDescription(scope),
      meta: {
        title: `${this.getLabel(scope)} Government Structure`,
        description: this.getDescription(scope),
      },
      nodes: [...annotatedMainNodes, ...annotatedIntraNodes],
      edges: [...mainEdges, ...(intraData.edges || [])],
      subviews: allSubviews.length > 0 ? allSubviews : undefined,
    };
  }

  async getDataset(scope: GovernmentScope): Promise<GovernmentDataset> {
    // Wrap synchronous operation in promise for interface compatibility
    return Promise.resolve(this.buildDataset(scope));
  }

  async getNodes(scope: GovernmentScope): Promise<StructureNode[]> {
    const dataset = await this.getDataset(scope);
    return dataset.nodes;
  }

  async getEdges(scope: GovernmentScope): Promise<RawEdge[]> {
    const dataset = await this.getDataset(scope);
    return dataset.edges;
  }

  async getSubviews(scope: GovernmentScope): Promise<SubviewDefinition[]> {
    const dataset = await this.getDataset(scope);
    return dataset.subviews || [];
  }
}
