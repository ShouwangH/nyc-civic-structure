// ABOUTME: Dataset loading abstraction - loads from JSON or API based on config
// ABOUTME: Uses data service layer to support multiple data sources

import { dataService } from '../services/dataService';
import type { GovernmentDataset } from '../services/dataService';
import type { GovernmentScope } from './types';

export type { GovernmentScope } from './types';
export type { GovernmentDataset };

/**
 * Load all government datasets
 * Returns a promise that resolves to datasets for all scopes
 */
export async function loadGovernmentDatasets(): Promise<Record<GovernmentScope, GovernmentDataset>> {
  // Load all scopes in parallel
  const [city, state, federal] = await Promise.all([
    dataService.getDataset('city'),
    dataService.getDataset('state'),
    dataService.getDataset('federal'),
  ]);

  return {
    city,
    state,
    federal,
  };
}

/**
 * Load a single government dataset
 */
export async function loadGovernmentDataset(scope: GovernmentScope): Promise<GovernmentDataset> {
  return dataService.getDataset(scope);
}

/**
 * Available government scopes
 */
export const governmentScopes: Array<{ id: GovernmentScope; label: string }> = [
  { id: 'federal', label: 'Federal' },
  { id: 'state', label: 'State' },
  { id: 'city', label: 'City' },
];
