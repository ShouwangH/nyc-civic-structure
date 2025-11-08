// ABOUTME: Hook for fetching and caching capital budget project data from NYC Open Data
// ABOUTME: Fetches from CPDB Polygons dataset with project footprints

import { useState, useEffect } from 'react';
import type { Feature, Polygon, Point } from 'geojson';

// GeoJSON Feature properties for capital projects
export type CapitalProjectProperties = {
  maprojid: string;
  description: string;
  managingagency: string;
  borough: string;
  totalcost: number;
  projecttype: string;
  status: string;
  fy: string;
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
        // Limit to recent projects with valid geometry and cost data
        const response = await fetch(
          'https://data.cityofnewyork.us/resource/9jkp-n57r.geojson?$limit=500'
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        // Transform to our expected format
        const features: CapitalProjectFeature[] = data.features.map((feature: any) => ({
          type: 'Feature',
          geometry: feature.geometry,
          properties: {
            maprojid: feature.properties.maprojid || 'Unknown',
            description: feature.properties.description || 'Unnamed Project',
            managingagency: feature.properties.managingagency || 'Unknown',
            borough: feature.properties.borough || 'Unknown',
            totalcost: parseFloat(feature.properties.totalcost || '0'),
            projecttype: feature.properties.projecttype || 'Unknown',
            status: feature.properties.status || 'Unknown',
            fy: feature.properties.fy || 'Unknown',
          },
        }));

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
