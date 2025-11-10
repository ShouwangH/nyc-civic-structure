// ABOUTME: Hook for fetching and caching capital budget project data from NYC Open Data
// ABOUTME: Fetches from CPDB Polygons dataset with project footprints

import { useState, useEffect } from 'react';
import type { Feature, Polygon, Point } from 'geojson';

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
};

// GeoJSON Feature type for capital projects
export type CapitalProjectFeature = Feature<Polygon | Point, CapitalProjectProperties>;

type UseCapitalBudgetDataReturn = {
  projects: CapitalProjectFeature[];
  isLoading: boolean;
  error: string | null;
};

/**
 * Fetch capital budget projects from NYC Open Data CPDB Polygons dataset
 */
export function useCapitalBudgetData(): UseCapitalBudgetDataReturn {
  const [projects, setProjects] = useState<CapitalProjectFeature[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch from server API (with 24-hour caching)
        const response = await fetch('/api/capital-budget');

        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.message || 'Failed to fetch capital budget data');
        }

        // Server already transforms the data to our expected format
        setProjects(result.data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMessage);
        console.error('Failed to load capital budget data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchData();
  }, []);

  return { projects, isLoading, error };
}
