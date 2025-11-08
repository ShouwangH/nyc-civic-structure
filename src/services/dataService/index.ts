// ABOUTME: Data service factory - selects implementation based on configuration
// ABOUTME: Exports configured data service instance for application use

import { JsonDataService } from './jsonDataService';
import { ApiDataService } from './apiDataService';
import type { DataService } from './types';

/**
 * Create data service based on environment configuration
 */
function createDataService(): DataService {
  // Check if we should use API data loading
  const useApiData = import.meta.env.VITE_USE_API_DATA === 'true';

  if (useApiData) {
    console.info('[DataService] Using API/database data source');
    return new ApiDataService();
  } else {
    console.info('[DataService] Using JSON file data source (default)');
    return new JsonDataService();
  }
}

// Export singleton instance
export const dataService = createDataService();

// Re-export types
export type { DataService, GovernmentDataset } from './types';
