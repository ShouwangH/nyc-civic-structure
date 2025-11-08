// ABOUTME: Data fetching and transformation utilities for NYC housing data
// ABOUTME: Handles NYC Open Data API calls, caching, and data processing

import type {
  HousingBuildingRecord,
  ProcessedBuilding,
  CachedHousingData,
  HousingDataByYear,
  ZoningColorMap,
} from '../../components/HousingTimelapse/types';

// Cache configuration
const CACHE_KEY = 'nyc_housing_data_cache';
const CACHE_VERSION = '1.0.0';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// NYC Open Data API configuration
const HOUSING_API_BASE = 'https://data.cityofnewyork.us/resource/hg8x-zxpr.json';
const DEFAULT_LIMIT = 50000; // NYC Open Data default limit

/**
 * Check if cached data is still valid
 */
function isCacheValid(timestamp: number): boolean {
  const now = Date.now();
  return now - timestamp < CACHE_TTL_MS;
}

/**
 * Load data from localStorage cache
 */
function loadFromCache(): CachedHousingData | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) {
      return null;
    }

    const data: CachedHousingData = JSON.parse(cached);

    // Check version and TTL
    if (data.meta.version !== CACHE_VERSION || !isCacheValid(data.meta.timestamp)) {
      console.info('[HousingData] Cache expired or version mismatch');
      localStorage.removeItem(CACHE_KEY);
      return null;
    }

    console.info(`[HousingData] Loaded ${data.buildings.length} buildings from cache`);
    return data;
  } catch (error) {
    console.error('[HousingData] Failed to load from cache:', error);
    localStorage.removeItem(CACHE_KEY);
    return null;
  }
}

/**
 * Save data to localStorage cache
 */
function saveToCache(buildings: HousingBuildingRecord[]): void {
  try {
    const data: CachedHousingData = {
      meta: {
        timestamp: Date.now(),
        version: CACHE_VERSION,
        recordCount: buildings.length,
      },
      buildings,
    };

    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    console.info(`[HousingData] Cached ${buildings.length} buildings`);
  } catch (error) {
    console.error('[HousingData] Failed to save to cache:', error);
  }
}

/**
 * Fetch housing data from NYC Open Data API
 */
async function fetchFromAPI(): Promise<HousingBuildingRecord[]> {
  console.info('[HousingData] Fetching from NYC Open Data API...');

  const url = `${HOUSING_API_BASE}?$limit=${DEFAULT_LIMIT}&$order=building_completion_date`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`NYC Open Data API error: ${response.status} ${response.statusText}`);
  }

  const data: HousingBuildingRecord[] = await response.json();
  console.info(`[HousingData] Fetched ${data.length} buildings from API`);

  // Save to cache
  saveToCache(data);

  return data;
}

/**
 * Get housing data (from cache or API)
 */
export async function getHousingData(): Promise<HousingBuildingRecord[]> {
  // Try cache first
  const cached = loadFromCache();
  if (cached) {
    return cached.buildings;
  }

  // Fetch from API
  return fetchFromAPI();
}

/**
 * Parse year from building completion date
 */
function parseCompletionYear(dateString: string): number {
  if (!dateString) {
    return 0;
  }

  // Try parsing ISO date format (YYYY-MM-DD)
  const match = dateString.match(/^(\d{4})/);
  if (match) {
    return parseInt(match[1], 10);
  }

  return 0;
}

/**
 * Calculate number of affordable units
 */
function calculateAffordableUnits(record: HousingBuildingRecord): number {
  const extremely = parseInt(record.extremely_low_income_units || '0', 10);
  const veryLow = parseInt(record.very_low_income_units || '0', 10);
  const low = parseInt(record.low_income_units || '0', 10);
  const moderate = parseInt(record.moderate_income_units || '0', 10);
  const middle = parseInt(record.middle_income_units || '0', 10);

  return extremely + veryLow + low + moderate + middle;
}

/**
 * Process raw building record into visualization format
 */
function processBuilding(record: HousingBuildingRecord): ProcessedBuilding | null {
  // Validate required fields
  const lat = parseFloat(record.latitude || record.latitude_internal);
  const lon = parseFloat(record.longitude || record.longitude_internal);
  const year = parseCompletionYear(record.building_completion_date);
  const totalUnits = parseInt(record.all_counted_units || record.total_units || '0', 10);

  if (!lat || !lon || !year || year < 2010 || year > 2024 || totalUnits === 0) {
    return null;
  }

  const affordableUnits = calculateAffordableUnits(record);

  return {
    id: record.building_id || record.bbl,
    name: record.project_name || 'Unnamed Project',
    coordinates: [lon, lat],
    borough: record.borough || 'Unknown',
    completionYear: year,
    totalUnits,
    affordableUnits,
    affordablePercentage: totalUnits > 0 ? (affordableUnits / totalUnits) * 100 : 0,
    address: `${record.house_number || ''} ${record.street_name || ''}`.trim(),
  };
}

/**
 * Process raw housing data into year-indexed map
 */
export function processHousingData(rawData: HousingBuildingRecord[]): HousingDataByYear {
  const byYear = new Map<number, ProcessedBuilding[]>();

  for (const record of rawData) {
    const building = processBuilding(record);
    if (!building) {
      continue;
    }

    const year = building.completionYear;
    if (!byYear.has(year)) {
      byYear.set(year, []);
    }

    byYear.get(year)!.push(building);
  }

  return byYear;
}

/**
 * Get all buildings up to and including a specific year
 */
export function getBuildingsUpToYear(
  dataByYear: HousingDataByYear,
  targetYear: number
): ProcessedBuilding[] {
  const buildings: ProcessedBuilding[] = [];

  for (let year = 2010; year <= targetYear; year++) {
    const yearBuildings = dataByYear.get(year);
    if (yearBuildings) {
      buildings.push(...yearBuildings);
    }
  }

  return buildings;
}

/**
 * Default zoning color scheme
 * Based on NYC zoning districts: R (Residential), C (Commercial), M (Manufacturing)
 */
export function getDefaultZoningColors(): ZoningColorMap {
  return {
    // Residential zones
    R1: '#4ade80', // Light green
    R2: '#22c55e',
    R3: '#16a34a',
    R4: '#15803d',
    R5: '#166534',
    R6: '#14532d',
    R7: '#052e16',
    R8: '#052e16',
    R9: '#052e16',
    R10: '#052e16',

    // Commercial zones
    C1: '#60a5fa', // Light blue
    C2: '#3b82f6',
    C3: '#2563eb',
    C4: '#1d4ed8',
    C5: '#1e40af',
    C6: '#1e3a8a',
    C7: '#172554',
    C8: '#172554',

    // Manufacturing zones
    M1: '#f97316', // Orange
    M2: '#ea580c',
    M3: '#c2410c',

    // Special districts and overlays
    SP: '#a855f7', // Purple
    MX: '#ec4899', // Pink (mixed-use)

    // Default/unknown
    unknown: '#6b7280', // Gray
  };
}

/**
 * Determine zoning district prefix from full zoning code
 */
export function getZoningPrefix(zoningCode: string | undefined): string {
  if (!zoningCode) {
    return 'unknown';
  }

  // Extract prefix (R1, C2, M1, etc.)
  const match = zoningCode.match(/^([RCM]\d+|SP|MX)/i);
  return match ? match[1].toUpperCase() : 'unknown';
}

/**
 * Clear cached data (useful for development/debugging)
 */
export function clearCache(): void {
  localStorage.removeItem(CACHE_KEY);
  console.info('[HousingData] Cache cleared');
}
