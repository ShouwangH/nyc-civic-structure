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
const CACHE_KEY = 'nyc_housing_data_cache_v2';
const CACHE_VERSION = '2.0.0';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// NYC Open Data API configuration
const HOUSING_NY_API = 'https://data.cityofnewyork.us/resource/hg8x-zxpr.json'; // Affordable housing
const PLUTO_API = 'https://data.cityofnewyork.us/resource/64uk-42ks.json'; // PLUTO data
const HOUSING_NY_LIMIT = 20000; // Limit for Housing NY API
const PLUTO_LIMIT = 5000; // Smaller limit for PLUTO
const ENABLE_CACHE = false; // Disabled due to localStorage quota limits

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
  if (!ENABLE_CACHE) {
    return; // Caching disabled
  }

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
 * Fetch housing data from NYC Open Data API - combines both sources
 */
async function fetchFromAPI(): Promise<HousingBuildingRecord[]> {
  console.info('[HousingData] Fetching from NYC Open Data APIs...');

  // Fetch from both sources in parallel
  const [housingNYResponse, plutoResponse] = await Promise.all([
    fetch(`${HOUSING_NY_API}?$limit=${HOUSING_NY_LIMIT}&$order=building_completion_date`),
    fetch(`${PLUTO_API}?$limit=${PLUTO_LIMIT}&$where=yearbuilt>=2014`)
  ]);

  if (!housingNYResponse.ok) {
    throw new Error(`Housing NY API error: ${housingNYResponse.status} ${housingNYResponse.statusText}`);
  }

  if (!plutoResponse.ok) {
    console.warn(`PLUTO API error: ${plutoResponse.status} ${plutoResponse.statusText}. Continuing with Housing NY data only.`);
  }

  const housingNYData: any[] = await housingNYResponse.json();
  console.info(`[HousingData] Fetched ${housingNYData.length} records from Housing NY API`);

  let plutoData: any[] = [];
  if (plutoResponse.ok) {
    plutoData = await plutoResponse.json();
    console.info(`[HousingData] Fetched ${plutoData.length} records from PLUTO API`);

    // Log first PLUTO record to understand structure
    if (plutoData.length > 0) {
      console.info('[HousingData] Sample PLUTO record:', plutoData[0]);
    }
  }

  // Combine both datasets
  const combinedData = [...housingNYData, ...plutoData];
  console.info(`[HousingData] Total combined records: ${combinedData.length}`);

  // Save to cache
  saveToCache(combinedData);

  return combinedData;
}

/**
 * Get housing data (from cache or API)
 */
export async function getHousingData(): Promise<HousingBuildingRecord[]> {
  if (!ENABLE_CACHE) {
    // Caching disabled - always fetch fresh data
    return fetchFromAPI();
  }

  // Try cache first
  const cached = loadFromCache();
  if (cached) {
    return cached.buildings;
  }

  // Fetch from API
  return fetchFromAPI();
}

/**
 * Parse date information from completion date string
 */
function parseCompletionDate(dateString: string): { year: number; month?: number; dateStr?: string } {
  if (!dateString) {
    return { year: 0 };
  }

  // Try parsing ISO date format (YYYY-MM-DD) or timestamp
  const isoMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return {
      year: parseInt(isoMatch[1], 10),
      month: parseInt(isoMatch[2], 10),
      dateStr: dateString,
    };
  }

  // Try just year
  const yearMatch = dateString.match(/^(\d{4})/);
  if (yearMatch) {
    return { year: parseInt(yearMatch[1], 10) };
  }

  return { year: 0 };
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
 * Determine building type from PLUTO building class
 */
function getBuildingType(buildingClass: string | undefined, isAffordable: boolean): any {
  if (isAffordable) {
    return 'affordable';
  }

  if (!buildingClass) {
    return 'unknown';
  }

  const classPrefix = buildingClass.charAt(0).toUpperCase();

  switch (classPrefix) {
    case 'A': return 'one-two-family';
    case 'B': return 'multifamily-walkup';
    case 'C': return 'multifamily-elevator';
    case 'D': return 'mixed-use';
    default: return 'unknown';
  }
}

/**
 * Process raw building record into visualization format
 */
function processBuilding(record: any): ProcessedBuilding | null {
  // Detect data source
  const isHousingNY = Boolean(record.building_id || record.project_name);
  const isPLUTO = Boolean(record.yearbuilt || record.bldgclass);

  // Try to extract coordinates
  const lat = parseFloat(
    record.latitude ||
    record.latitude_internal ||
    (record.location?.coordinates?.[1]) ||
    '0'
  );
  const lon = parseFloat(
    record.longitude ||
    record.longitude_internal ||
    (record.location?.coordinates?.[0]) ||
    '0'
  );

  // Parse date
  let dateInfo;
  if (isHousingNY) {
    dateInfo = parseCompletionDate(
      record.building_completion_date ||
      record.completion_date ||
      ''
    );
  } else if (isPLUTO) {
    // PLUTO uses yearbuilt
    const yearBuilt = parseInt(record.yearbuilt || '0', 10);
    dateInfo = { year: yearBuilt };
  } else {
    dateInfo = { year: 0 };
  }

  // Extract units
  let totalUnits;
  if (isHousingNY) {
    totalUnits = parseInt(
      record.all_counted_units ||
      record.total_units ||
      '0',
      10
    );
  } else if (isPLUTO) {
    totalUnits = parseInt(record.unitsres || record.unitstotal || '0', 10);
  } else {
    totalUnits = 0;
  }

  // Validate required fields
  if (!lat || !lon || !dateInfo.year || dateInfo.year < 2014 || dateInfo.year > 2025 || totalUnits === 0) {
    return null;
  }

  const affordableUnits = isHousingNY ? calculateAffordableUnits(record) : 0;
  const buildingClass = record.bldgclass || record.bldgclass;
  const buildingType = getBuildingType(buildingClass, affordableUnits > 0);

  return {
    id: record.building_id || record.bbl || String(Math.random()),
    name: record.project_name || record.address || 'Building',
    coordinates: [lon, lat],
    borough: record.borough || 'Unknown',
    completionYear: dateInfo.year,
    completionMonth: dateInfo.month,
    completionDate: dateInfo.dateStr,
    totalUnits,
    affordableUnits,
    affordablePercentage: totalUnits > 0 ? (affordableUnits / totalUnits) * 100 : 0,
    buildingType,
    buildingClass,
    zoningDistrict: record.zonedist1,
    address: record.address || `${record.house_number || ''} ${record.street_name || ''}`.trim(),
    dataSource: isHousingNY ? 'housing-ny' : 'pluto',
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

  for (let year = 2014; year <= targetYear; year++) {
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
