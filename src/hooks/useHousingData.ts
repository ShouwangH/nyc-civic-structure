// ABOUTME: React hook for loading and managing NYC housing data
// ABOUTME: Handles async data fetching, caching, and state management

import { useState, useEffect } from 'react';
import {
  getHousingData,
  processHousingData,
  getBuildingsUpToYear,
} from '../lib/data/housingDataProcessor';
import type { HousingDataByYear, ProcessedBuilding } from '../components/HousingTimelapse/types';

type UseHousingDataResult = {
  buildings: ProcessedBuilding[];
  dataByYear: HousingDataByYear | null;
  isLoading: boolean;
  error: string | null;
  totalBuildings: number;
  totalUnits: number;
  affordableUnits: number;
};

/**
 * Custom hook to load and manage housing data
 * @param currentYear - The year to filter buildings up to
 */
export function useHousingData(currentYear: number): UseHousingDataResult {
  const [dataByYear, setDataByYear] = useState<HousingDataByYear | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load data on mount
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const rawData = await getHousingData();
        const processed = processHousingData(rawData);

        if (isMounted) {
          setDataByYear(processed);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('[useHousingData] Failed to load data:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load housing data');
          setIsLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Get buildings up to current year
  const buildings = dataByYear ? getBuildingsUpToYear(dataByYear, currentYear) : [];

  // Calculate statistics
  const totalBuildings = buildings.length;
  const totalUnits = buildings.reduce((sum, b) => sum + b.totalUnits, 0);
  const affordableUnits = buildings.reduce((sum, b) => sum + b.affordableUnits, 0);

  return {
    buildings,
    dataByYear,
    isLoading,
    error,
    totalBuildings,
    totalUnits,
    affordableUnits,
  };
}
