// ABOUTME: Data fetching and transformation utilities for NYC housing data
// ABOUTME: Handles NYC Open Data API calls, caching, and data processing

import type {
  HousingBuildingRecord,
  ProcessedBuilding,
  CachedProcessedData,
  HousingDataByYear,
  ZoningColorMap,
} from '../../components/HousingTimelapse/types';

// Cache configuration
const CACHE_KEY = 'nyc_housing_processed_v6';
const CACHE_VERSION = '6.0.0';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// NYC Open Data API configuration
const HOUSING_NY_API = 'https://data.cityofnewyork.us/resource/hg8x-zxpr.json'; // Affordable housing
const DOB_API = 'https://data.cityofnewyork.us/resource/ic3t-wcy2.json'; // DOB Job Applications
const PLUTO_API = 'https://data.cityofnewyork.us/resource/64uk-42ks.json'; // PLUTO data (fallback)
const HOUSING_NY_LIMIT = 20000;
const DOB_LIMIT = 50000;
const PLUTO_LIMIT = 20000; // Reduced - only fallback for missing DOB records
const ENABLE_CACHE = false; // Disabled: localStorage quota exceeded

/**
 * Check if cached data is still valid
 */
function isCacheValid(timestamp: number): boolean {
  const now = Date.now();
  return now - timestamp < CACHE_TTL_MS;
}

/**
 * Load processed data from localStorage cache
 */
function loadProcessedFromCache(): HousingDataByYear | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) {
      return null;
    }

    const data: CachedProcessedData = JSON.parse(cached);

    // Check version and TTL
    if (data.meta.version !== CACHE_VERSION || !isCacheValid(data.meta.timestamp)) {
      console.info('[HousingData] Cache expired or version mismatch');
      localStorage.removeItem(CACHE_KEY);
      return null;
    }

    // Convert plain object back to Map
    const buildingsByYear = new Map<number, ProcessedBuilding[]>();
    for (const [year, buildings] of Object.entries(data.buildingsByYear)) {
      buildingsByYear.set(parseInt(year, 10), buildings);
    }

    console.info(`[HousingData] Loaded ${data.meta.recordCount} processed buildings from cache`);
    return buildingsByYear;
  } catch (error) {
    console.error('[HousingData] Failed to load from cache:', error);
    localStorage.removeItem(CACHE_KEY);
    return null;
  }
}

/**
 * Save processed data to localStorage cache
 */
function saveProcessedToCache(dataByYear: HousingDataByYear): void {
  if (!ENABLE_CACHE) {
    return; // Caching disabled
  }

  try {
    // Convert Map to plain object for JSON serialization
    const buildingsByYear: Record<number, ProcessedBuilding[]> = {};
    let totalCount = 0;

    for (const [year, buildings] of dataByYear.entries()) {
      buildingsByYear[year] = buildings;
      totalCount += buildings.length;
    }

    const data: CachedProcessedData = {
      meta: {
        timestamp: Date.now(),
        version: CACHE_VERSION,
        recordCount: totalCount,
      },
      buildingsByYear,
    };

    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    console.info(`[HousingData] Cached ${totalCount} processed buildings`);
  } catch (error) {
    console.error('[HousingData] Failed to save to cache:', error);
  }
}

/**
 * Normalize BBL to standard format (removes hyphens, decimals, ensures 10 digits)
 */
function normalizeBBL(bbl: string | undefined): string | null {
  if (!bbl) return null;

  // Handle PLUTO format with decimals (e.g., "4118580011.00000000")
  // Split on decimal and take only the integer part
  const parts = String(bbl).split('.');
  const integerPart = parts[0];

  // Remove all non-numeric characters from integer part
  const numeric = integerPart.replace(/[^0-9]/g, '');

  // BBL should be 10 digits: 1 (borough) + 5 (block) + 4 (lot)
  if (numeric.length === 10) {
    return numeric;
  }

  // Pad if slightly short (some datasets drop leading zeros)
  if (numeric.length === 9) {
    return '0' + numeric;
  }

  return null;
}

/**
 * Construct BBL from borough, block, lot (DOB format)
 */
function constructBBL(borough: string, block: string, lot: string): string | null {
  if (!borough || !block || !lot) return null;

  // Borough codes: Manhattan=1, Bronx=2, Brooklyn=3, Queens=4, Staten Island=5
  const boroughMap: Record<string, string> = {
    'MANHATTAN': '1', 'MN': '1',
    'BRONX': '2', 'BX': '2',
    'BROOKLYN': '3', 'BK': '3',
    'QUEENS': '4', 'QN': '4',
    'STATEN ISLAND': '5', 'SI': '5'
  };

  const boroughCode = boroughMap[borough.toUpperCase()] || borough;

  // Pad block to 5 digits, lot to 4 digits
  const paddedBlock = block.padStart(5, '0');
  const paddedLot = lot.padStart(4, '0');

  return boroughCode + paddedBlock + paddedLot;
}

/**
 * Fetch housing data from NYC Open Data APIs - DOB primary, PLUTO fallback, Housing NY overlay
 */
async function fetchFromAPI(): Promise<HousingBuildingRecord[]> {
  console.info('[HousingData] Fetching from NYC Open Data APIs (DOB primary + PLUTO fallback + Housing NY)...');

  // Fetch from all three sources in parallel
  const [housingNYResponse, dobResponse, plutoResponse] = await Promise.all([
    fetch(`${HOUSING_NY_API}?$limit=${HOUSING_NY_LIMIT}&$order=building_completion_date`),
    fetch(`${DOB_API}?$limit=${DOB_LIMIT}&$where=latest_action_date>='2014-01-01' AND (job_status_descrp='APPROVED' OR job_status_descrp='COMPLETED')`),
    fetch(`${PLUTO_API}?$limit=${PLUTO_LIMIT}&$where=yearbuilt>=2014`)
  ]);

  if (!housingNYResponse.ok) {
    throw new Error(`Housing NY API error: ${housingNYResponse.status}`);
  }

  const housingNYData: any[] = await housingNYResponse.json();
  console.info(`[HousingData] Fetched ${housingNYData.length} Housing NY records`);

  let dobData: any[] = [];
  if (dobResponse.ok) {
    dobData = await dobResponse.json();
    console.info(`[HousingData] Fetched ${dobData.length} DOB records (approved/completed only)`);
    if (dobData.length > 0) {
      console.info('[HousingData] Sample DOB record:', dobData[0]);
      console.info('[HousingData] DOB fields:', Object.keys(dobData[0]));
    }
  } else {
    console.warn(`[HousingData] DOB API error: ${dobResponse.status}. Will use PLUTO only.`);
  }

  let plutoData: any[] = [];
  if (plutoResponse.ok) {
    plutoData = await plutoResponse.json();
    console.info(`[HousingData] Fetched ${plutoData.length} PLUTO records (fallback)`);
  }

  // Build BBL index from Housing NY data for O(1) lookup
  const housingByBBL = new Map<string, any>();
  for (const record of housingNYData) {
    const bbl = normalizeBBL(record.bbl);
    if (bbl) {
      housingByBBL.set(bbl, record);
    }
  }
  console.info(`[HousingData] Indexed ${housingByBBL.size} Housing NY records by BBL`);

  // Track which BBLs are covered by DOB
  const dobBBLs = new Set<string>();
  const joinedData: any[] = [];
  let dobAffordableMatches = 0;
  let dobProcessed = 0;
  let dobSkipped = 0;

  // Process DOB records (primary source)
  for (const dobRecord of dobData) {
    const bbl = constructBBL(dobRecord.borough, dobRecord.block, dobRecord.lot);
    if (!bbl) continue;

    // Calculate net new units (proposed - existing)
    const existingUnits = parseInt(dobRecord.existing_dwelling_units || '0', 10);
    const proposedUnits = parseInt(dobRecord.proposed_dwelling_units || '0', 10);
    const netUnits = proposedUnits - existingUnits;

    // Skip if negative (exclude renovations that remove units)
    if (netUnits <= 0) {
      dobSkipped++;
      continue;
    }

    dobBBLs.add(bbl);
    dobProcessed++;

    const housingRecord = housingByBBL.get(bbl);
    if (housingRecord) {
      dobAffordableMatches++;
    }

    joinedData.push({
      ...dobRecord,
      _netUnits: netUnits,
      _affordableData: housingRecord || null,
      _hasAffordable: Boolean(housingRecord),
      _dataSource: 'dob',
    });
  }

  console.info(`[HousingData] DOB: ${dobProcessed} valid (net+ units), ${dobSkipped} skipped (net zero/negative)`);
  console.info(`[HousingData] DOB affordable matches: ${dobAffordableMatches}`);

  // Add PLUTO records as fallback (only for BBLs not in DOB)
  let plutoFallback = 0;
  for (const plutoRecord of plutoData) {
    const bbl = normalizeBBL(plutoRecord.bbl);
    if (!bbl || dobBBLs.has(bbl)) continue; // Skip if in DOB

    plutoFallback++;
    const housingRecord = housingByBBL.get(bbl);

    joinedData.push({
      ...plutoRecord,
      _affordableData: housingRecord || null,
      _hasAffordable: Boolean(housingRecord),
      _dataSource: 'pluto',
    });
  }

  console.info(`[HousingData] PLUTO fallback: ${plutoFallback} records (BBLs not in DOB)`);
  console.info(`[HousingData] Total joined records: ${joinedData.length}`);

  return joinedData;
}

/**
 * Get housing data (from cache or API), returns processed data by year
 */
export async function getHousingData(): Promise<HousingDataByYear> {
  // Try cache first
  if (ENABLE_CACHE) {
    const cached = loadProcessedFromCache();
    if (cached) {
      return cached;
    }
  }

  // Fetch from API and process
  const rawData = await fetchFromAPI();
  const processed = processHousingData(rawData);

  // Save processed data to cache
  saveProcessedToCache(processed);

  return processed;
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
 * Determine building type from PLUTO building class or DOB job type
 */
function getBuildingType(
  buildingClass: string | undefined,
  _jobType: string | undefined,
  isAffordable: boolean,
  isRenovation: boolean
): any {
  // Priority 1: Affordable housing
  if (isAffordable) {
    return 'affordable';
  }

  // Priority 2: Renovation (DOB A1/A2/A3 types)
  if (isRenovation) {
    return 'renovation';
  }

  // Priority 3: PLUTO building class
  if (buildingClass) {
    const classPrefix = buildingClass.charAt(0).toUpperCase();
    switch (classPrefix) {
      case 'A': return 'one-two-family';
      case 'B': return 'multifamily-walkup';
      case 'C': return 'multifamily-elevator';
      case 'D': return 'mixed-use';
    }
  }

  return 'unknown';
}

/**
 * Process raw building record into visualization format
 */
function processBuilding(record: any): ProcessedBuilding | null {
  const affordableData = record._affordableData;
  const dataSource = record._dataSource; // 'dob' or 'pluto'
  const isDOB = dataSource === 'dob';
  const isPLUTO = dataSource === 'pluto';

  // Extract coordinates
  // DOB doesn't have direct coords, PLUTO and Housing NY do
  const lat = parseFloat(
    record.latitude ||
    affordableData?.latitude ||
    affordableData?.latitude_internal ||
    (record.location?.coordinates?.[1]) ||
    (affordableData?.location?.coordinates?.[1]) ||
    '0'
  );
  const lon = parseFloat(
    record.longitude ||
    affordableData?.longitude ||
    affordableData?.longitude_internal ||
    (record.location?.coordinates?.[0]) ||
    (affordableData?.location?.coordinates?.[0]) ||
    '0'
  );

  // Parse date
  let dateInfo;
  if (isDOB) {
    // DOB: use latest_action_date or pre_filing_date
    const dateStr = record.latest_action_date || record.pre_filing_date;
    if (dateStr) {
      const year = parseInt(dateStr.substring(0, 4), 10);
      dateInfo = { year };
    } else {
      dateInfo = { year: 0 };
    }
  } else if (affordableData && (affordableData.building_completion_date || affordableData.completion_date)) {
    dateInfo = parseCompletionDate(
      affordableData.building_completion_date ||
      affordableData.completion_date ||
      ''
    );
  } else if (isPLUTO) {
    const yearBuilt = parseInt(record.yearbuilt || '0', 10);
    dateInfo = { year: yearBuilt };
  } else {
    dateInfo = { year: 0 };
  }

  // Extract units
  let totalUnits;
  if (isDOB) {
    // DOB: use net units (already calculated)
    totalUnits = record._netUnits || 0;
  } else if (isPLUTO) {
    totalUnits = parseInt(record.unitsres || record.unitstotal || '0', 10);
  } else if (affordableData) {
    totalUnits = parseInt(
      affordableData.all_counted_units ||
      affordableData.total_units ||
      '0',
      10
    );
  } else {
    totalUnits = 0;
  }

  // Validate required fields
  if (!lat || !lon || !dateInfo.year || dateInfo.year < 2014 || dateInfo.year > 2025 || totalUnits === 0) {
    return null;
  }

  // Calculate affordable units
  const affordableUnits = affordableData ? calculateAffordableUnits(affordableData) : 0;

  // Determine if renovation
  const jobType = record.job_type || '';
  const isRenovation = isDOB && ['A1', 'A2', 'A3'].includes(jobType.toUpperCase());

  // Classify building type
  const buildingClass = record.bldgclass;
  const buildingType = getBuildingType(buildingClass, jobType, affordableUnits > 0, isRenovation);

  return {
    id: record.bbl || record.job || affordableData?.building_id || String(Math.random()),
    name: affordableData?.project_name || record.address || record.street_name || 'Building',
    coordinates: [lon, lat],
    borough: record.borough || affordableData?.borough || 'Unknown',
    completionYear: dateInfo.year,
    completionMonth: dateInfo.month,
    completionDate: dateInfo.dateStr,
    totalUnits,
    affordableUnits,
    affordablePercentage: totalUnits > 0 ? (affordableUnits / totalUnits) * 100 : 0,
    buildingType,
    buildingClass,
    zoningDistrict: record.zonedist1,
    address: record.address || affordableData?.address || `${record.house_number || ''} ${record.street_name || ''}`.trim(),
    dataSource: (isDOB ? 'dob' : isPLUTO ? 'pluto' : 'housing-ny') as any,
  };
}

/**
 * Process raw housing data into year-indexed map
 */
export function processHousingData(rawData: HousingBuildingRecord[]): HousingDataByYear {
  const byYear = new Map<number, ProcessedBuilding[]>();
  let validCount = 0;
  let invalidCount = 0;

  for (const record of rawData) {
    const building = processBuilding(record);
    if (!building) {
      invalidCount++;
      continue;
    }

    validCount++;
    const year = building.completionYear;
    if (!byYear.has(year)) {
      byYear.set(year, []);
    }

    byYear.get(year)!.push(building);
  }

  console.info(`[HousingData] Processed ${validCount} valid buildings, ${invalidCount} invalid/filtered`);
  console.info(`[HousingData] Year distribution:`,
    Array.from(byYear.entries()).map(([year, buildings]) => `${year}: ${buildings.length}`).join(', ')
  );

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
