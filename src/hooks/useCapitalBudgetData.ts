// ABOUTME: Hook for fetching capital budget project data from database
// ABOUTME: Retrieves capital projects with GeoJSON geometry from database-backed API

import { useState, useEffect } from 'react';
import type { Feature, Polygon, Point } from 'geojson';
import { mapDataCache, CACHE_KEYS } from '../lib/mapDataCache';

// GeoJSON Feature properties for capital projects
export type CapitalProjectProperties = {
  maprojid: string;
  description: string;
  magencyname: string;
  magencyacro: string;
  typecategory: string;
  mindate: string;
  maxdate: string;
  allocate_total: number;
  commit_total: number;
  spent_total: number;
  plannedcommit_total: number;
  fiscalYear?: number; // Derived from mindate
  completionYear?: number; // Derived from maxdate
  // Pre-computed centroid from database (Phase 2.1 optimization)
  centroid_lon?: number | null;
  centroid_lat?: number | null;
};

// GeoJSON Feature type for capital projects
export type CapitalProjectFeature = Feature<Polygon | Point, CapitalProjectProperties>;

type UseCapitalBudgetDataReturn = {
  projects: CapitalProjectFeature[];
  isLoading: boolean;
  error: string | null;
};

/**
 * Fetch capital budget data from API
 */
async function fetchCapitalBudgetData(): Promise<CapitalProjectFeature[]> {
  const response = await fetch('/api/capital-budget');

  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.message || 'Failed to fetch capital budget data');
  }

  return result.data;
}

/**
 * Fetch capital budget projects from database via API endpoint
 * Uses client-side cache to avoid re-fetching on navigation
 */
export function useCapitalBudgetData(): UseCapitalBudgetDataReturn {
  const [projects, setProjects] = useState<CapitalProjectFeature[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Use cache to avoid re-fetching on navigation
        const data = await mapDataCache.fetchWithCache(
          CACHE_KEYS.CAPITAL_BUDGET,
          fetchCapitalBudgetData
        );

        setProjects(data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMessage);
        console.error('Failed to load capital budget data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    void loadData();
  }, []);

  return { projects, isLoading, error };
}

/**
 * Preload capital budget data into cache
 * Call this when user hovers over map navigation
 */
export function preloadCapitalBudgetData(): void {
  mapDataCache.preload(CACHE_KEYS.CAPITAL_BUDGET, fetchCapitalBudgetData);
}
