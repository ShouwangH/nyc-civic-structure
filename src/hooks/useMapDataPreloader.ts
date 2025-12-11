// ABOUTME: Hook for preloading map data when user lands on the site
// ABOUTME: Starts background fetch of map data to reduce perceived load time

import { useEffect, useRef } from 'react';
import { preloadCapitalBudgetData } from './useCapitalBudgetData';
import { preloadHousingData } from '../lib/data/housingDataProcessor';

/**
 * Preload map data in the background when component mounts
 * This hook should be called once at the app level to start preloading
 * map data as soon as the user lands on the site
 */
export function useMapDataPreloader(): void {
  const hasPreloaded = useRef(false);

  useEffect(() => {
    // Only preload once
    if (hasPreloaded.current) return;
    hasPreloaded.current = true;

    // Start preloading map data in the background
    // These are fire-and-forget - they don't block rendering
    console.info('[MapDataPreloader] Starting background preload of map data...');

    // Stagger the preloads slightly to avoid overwhelming the network
    // Capital budget is smaller (~1MB compressed), so load it first
    preloadCapitalBudgetData();

    // Housing data is larger (~3MB compressed), preload after a short delay
    setTimeout(() => {
      preloadHousingData();
    }, 100);
  }, []);
}

/**
 * Manually trigger preload of all map data
 * Useful for triggering on user interaction (e.g., hovering over maps nav)
 */
export function preloadAllMapData(): void {
  preloadCapitalBudgetData();
  preloadHousingData();
}
