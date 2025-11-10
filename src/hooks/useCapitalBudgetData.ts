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

        // Fetch from CPDB Polygons dataset (9jkp-n57r)
        // Filter to 2025 active projects with allocated budgets
        const response = await fetch(
          'https://data.cityofnewyork.us/resource/9jkp-n57r.geojson?$where=mindate<=\'2025-12-31\' AND maxdate>=\'2025-01-01\' AND allocate_total>0&$limit=1200'
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        // Transform to our expected format
        const features: CapitalProjectFeature[] = data.features.map((feature: any) => {
          // Extract fiscal year from mindate (format: "2024-06-20T00:00:00.000")
          const fiscalYear = feature.properties.mindate
            ? parseInt(feature.properties.mindate.substring(0, 4), 10)
            : undefined;

          // Extract completion year from maxdate
          const completionYear = feature.properties.maxdate
            ? parseInt(feature.properties.maxdate.substring(0, 4), 10)
            : undefined;

          return {
            type: 'Feature',
            geometry: feature.geometry,
            properties: {
              maprojid: feature.properties.maprojid || 'Unknown',
              description: feature.properties.description || 'Unnamed Project',
              magencyname: feature.properties.magencyname || 'Unknown Agency',
              magencyacro: feature.properties.magencyacro || 'N/A',
              typecategory: feature.properties.typecategory || 'Unknown',
              mindate: feature.properties.mindate || '',
              maxdate: feature.properties.maxdate || '',
              allocate_total: parseFloat(feature.properties.allocate_total || '0'),
              commit_total: parseFloat(feature.properties.commit_total || '0'),
              spent_total: parseFloat(feature.properties.spent_total || '0'),
              plannedcommit_total: parseFloat(feature.properties.plannedcommit_total || '0'),
              fiscalYear,
              completionYear,
            },
          };
        });

        setProjects(features);
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
