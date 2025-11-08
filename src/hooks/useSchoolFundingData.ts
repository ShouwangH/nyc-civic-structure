// ABOUTME: Hook for fetching and caching school funding data from NYC Open Data
// ABOUTME: Fetches from School Budgets FY2025 dataset with derived per-student metrics

import { useState, useEffect } from 'react';
import type { Feature, Point } from 'geojson';

// GeoJSON Feature properties for school budgets
export type SchoolBudgetProperties = {
  dbn: string;
  school_name: string;
  total_budget: number;
  enrollment: number;
  funding_per_student: number;
  normalized_funding: number; // 0-1 normalized for coloring
};

// GeoJSON Feature type for schools
export type SchoolBudgetFeature = Feature<Point, SchoolBudgetProperties>;

type UseSchoolFundingDataReturn = {
  schools: SchoolBudgetFeature[];
  isLoading: boolean;
  error: string | null;
};

/**
 * Calculate the 95th percentile of an array
 */
function percentile95(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.floor(sorted.length * 0.95);
  return sorted[index];
}

/**
 * Normalize values to 0-1 range
 */
function normalize(value: number, min: number, max: number): number {
  if (max === min) return 0.5;
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

/**
 * Fetch school funding data from NYC Open Data School Budgets FY2025 dataset
 */
export function useSchoolFundingData(): UseSchoolFundingDataReturn {
  const [schools, setSchools] = useState<SchoolBudgetFeature[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch from School Budgets FY2025 dataset (uq7m-95z8)
        // Filter to schools with valid budget and enrollment data
        const response = await fetch(
          'https://data.cityofnewyork.us/resource/uq7m-95z8.geojson?$where=total_budget>0 AND enrollment>0&$limit=2000'
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        // Calculate funding per student for all schools
        const schoolsWithFunding = data.features
          .map((feature: any) => {
            const totalBudget = parseFloat(feature.properties.total_budget || '0');
            const enrollment = parseFloat(feature.properties.enrollment || '0');

            if (enrollment === 0) return null;

            return {
              feature,
              fundingPerStudent: totalBudget / enrollment,
            };
          })
          .filter((item: any) => item !== null);

        // Calculate 95th percentile to sanitize outliers
        const fundingValues = schoolsWithFunding.map((item: any) => item.fundingPerStudent);
        const p95 = percentile95(fundingValues);

        // Filter out outliers above 95th percentile
        const sanitized = schoolsWithFunding.filter(
          (item: any) => item.fundingPerStudent <= p95
        );

        // Find min/max for normalization
        const sanitizedValues = sanitized.map((item: any) => item.fundingPerStudent);
        const minFunding = Math.min(...sanitizedValues);
        const maxFunding = Math.max(...sanitizedValues);

        // Transform to our expected format with normalized values
        const features: SchoolBudgetFeature[] = sanitized.map((item: any) => {
          const { feature, fundingPerStudent } = item;

          return {
            type: 'Feature',
            geometry: feature.geometry,
            properties: {
              dbn: feature.properties.dbn || 'Unknown',
              school_name: feature.properties.school_name || 'Unnamed School',
              total_budget: parseFloat(feature.properties.total_budget || '0'),
              enrollment: parseFloat(feature.properties.enrollment || '0'),
              funding_per_student: fundingPerStudent,
              normalized_funding: normalize(fundingPerStudent, minFunding, maxFunding),
            },
          };
        });

        setSchools(features);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMessage);
        console.error('Failed to load school funding data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchData();
  }, []);

  return { schools, isLoading, error };
}
