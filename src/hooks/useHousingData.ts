// ABOUTME: React hook for loading and managing NYC housing data
// ABOUTME: Handles async data fetching, caching, and state management

import { useState, useEffect } from 'react';
import {
  getHousingData,
  getBuildingsUpToYear,
} from '../lib/data/housingDataProcessor';
import type { HousingDataByYear, ProcessedBuilding, DemolitionStats } from '../components/HousingTimelapse/types';

type UseHousingDataResult = {
  buildings: ProcessedBuilding[];
  dataByYear: HousingDataByYear | null;
  demolitionStats: DemolitionStats | null;
  isLoading: boolean;
  error: string | null;
  totalBuildings: number;
  totalUnits: number;
  affordableUnits: number;
  netNewUnits: number;
};

/**
 * Custom hook to load and manage housing data
 * @param currentYear - The year to filter buildings up to
 */
export function useHousingData(currentYear: number): UseHousingDataResult {
  const [dataByYear, setDataByYear] = useState<HousingDataByYear | null>(null);
  const [demolitionStats, setDemolitionStats] = useState<DemolitionStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load data on mount
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // getHousingData now returns both dataByYear and demolitionStats
        const { dataByYear: processedData, demolitionStats: demoStats } = await getHousingData();

        if (isMounted) {
          setDataByYear(processedData);
          setDemolitionStats(demoStats);
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

  // Get ALL buildings (don't filter by year - deck.gl needs stable data array)
  const allBuildings = dataByYear ? getBuildingsUpToYear(dataByYear, 2025) : [];

  // Get buildings up to current year for statistics only
  const buildingsUpToYear = dataByYear ? getBuildingsUpToYear(dataByYear, currentYear) : [];

  // Calculate statistics based on visible buildings
  const totalBuildings = buildingsUpToYear.length;
  const totalUnits = buildingsUpToYear.reduce((sum, b) => sum + b.totalUnits, 0);
  const affordableUnits = buildingsUpToYear.reduce((sum, b) => sum + b.affordableUnits, 0);

  // Calculate standalone demolitions up to current year
  const standaloneDemolishedUpToYear = demolitionStats?.byYear
    ? Array.from(demolitionStats.byYear.entries())
        .filter(([year]) => year <= currentYear)
        .reduce((sum, [, units]) => sum + units, 0)
    : 0;

  // Net new units = gross new units - standalone demolitions
  const netNewUnits = totalUnits - standaloneDemolishedUpToYear;

  return {
    buildings: allBuildings, // Pass ALL buildings for stable deck.gl data array
    dataByYear,
    demolitionStats,
    isLoading,
    error,
    totalBuildings,
    totalUnits,
    affordableUnits,
    netNewUnits,
  };
}
