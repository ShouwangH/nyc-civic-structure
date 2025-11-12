// ABOUTME: Data fetching and transformation utilities for NYC housing data
// ABOUTME: Handles NYC Open Data API calls and data organization

import type {
  ProcessedBuilding,
  HousingDataByYear,
  ZoningColorMap,
  DemolitionStats,
} from '../../components/HousingTimelapse/types';

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
  // Parse as integers first to handle already-padded values from DOB
  const blockInt = parseInt(block, 10);
  const lotInt = parseInt(lot, 10);

  if (isNaN(blockInt) || isNaN(lotInt)) return null;

  const paddedBlock = String(blockInt).padStart(5, '0');
  const paddedLot = String(lotInt).padStart(4, '0');

  return boroughCode + paddedBlock + paddedLot;
}

/**
 * Process demolition records and calculate statistics
 */
function processDemolitionStats(demolitions: any[], newConstructionBBLs: Set<string>): DemolitionStats {
  console.info(`[HousingData] Processing ${demolitions.length} demolition records`);

  // Debug: Check structure of first few demolition records
  if (demolitions.length > 0) {
    console.info('[HousingData] Sample demolition record fields:', Object.keys(demolitions[0]));
    console.info('[HousingData] First 3 demolition records:', demolitions.slice(0, 3));
  }

  let totalDemolishedUnits = 0;
  let standaloneDemolishedUnits = 0;
  const byYear = new Map<number, number>();
  let recordsWithBBL = 0;
  let recordsWithUnits = 0;
  let recordsWithDate = 0;
  let standaloneCount = 0;

  for (const record of demolitions) {
    // Parse existing dwelling units
    const existingUnitsStr = record.existing_dwelling_units || record.existingdwellingunits || '0';
    const existingUnits = parseInt(String(existingUnitsStr).replace(/[^0-9]/g, ''), 10) || 0;

    if (existingUnits > 0) recordsWithUnits++;

    if (existingUnits === 0) continue;

    totalDemolishedUnits += existingUnits;

    // Check if this BBL had new construction
    const bbl = normalizeBBL(record.bbl) || constructBBL(record.borough, record.block, record.lot);
    if (bbl) recordsWithBBL++;

    const isStandalone = bbl ? !newConstructionBBLs.has(bbl) : true;

    if (isStandalone) {
      standaloneDemolishedUnits += existingUnits;
      standaloneCount++;
    }

    // Try to extract year from latest_action_date
    const dateStr = record.latest_action_date || record.issuance_date || '';
    if (dateStr) {
      recordsWithDate++;

      // Try multiple date formats:
      // 1. YYYY-MM-DD or YYYY/MM/DD (ISO format, year at start)
      // 2. MM/DD/YYYY or MM-DD-YYYY (US format, year at end)
      let year: number | null = null;

      const isoMatch = String(dateStr).match(/^(\d{4})/);
      if (isoMatch) {
        year = parseInt(isoMatch[1], 10);
      } else {
        const usMatch = String(dateStr).match(/\/(\d{4})$/);
        if (usMatch) {
          year = parseInt(usMatch[1], 10);
        }
      }

      if (year !== null) {
        // Debug: Log first few date extractions
        if (recordsWithDate <= 5) {
          console.info(`[HousingData] Date extraction sample ${recordsWithDate}:`, {
            dateStr,
            year,
            inRange: year >= 2014 && year <= 2024,
            isStandalone,
            existingUnits
          });
        }

        if (year >= 2014 && year <= 2024 && isStandalone) {
          byYear.set(year, (byYear.get(year) || 0) + existingUnits);
        }
      } else {
        // Debug: Log first few failed extractions
        if (recordsWithDate <= 5) {
          console.warn(`[HousingData] Failed to extract year from date:`, dateStr);
        }
      }
    }
  }

  console.info(`[HousingData] Demolition processing summary:`, {
    totalRecords: demolitions.length,
    recordsWithUnits,
    recordsWithBBL,
    recordsWithDate,
    standaloneCount,
    totalDemolishedUnits,
    standaloneDemolishedUnits,
    yearBreakdownSize: byYear.size
  });

  return {
    totalDemolishedUnits,
    standaloneDemolishedUnits,
    byYear,
  };
}

/**
 * Fetch housing data from server (already processed in database)
 */
async function fetchFromAPI(): Promise<{ buildings: ProcessedBuilding[]; demolitionData: any[] }> {
  console.info('[HousingData] Fetching from server API (with 24-hour caching)...');

  // Fetch from server API (data already processed in database)
  const response = await fetch('/api/housing-data');

  if (!response.ok) {
    throw new Error(`Server API error: ${response.status}`);
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.message || 'Failed to fetch housing data');
  }

  // Extract data from server response (already in ProcessedBuilding format)
  const buildings: ProcessedBuilding[] = result.data.buildings;
  const demolitionData: any[] = result.data.demolitions;

  console.info(`[HousingData] Fetched ${buildings.length} buildings (already processed by server)`);
  console.info(`[HousingData] Fetched ${demolitionData.length} demolition records`);

  return { buildings, demolitionData };
}

/**
 * Get housing data (from cache or API), returns processed data by year and demolition stats
 */
export async function getHousingData(): Promise<{ dataByYear: HousingDataByYear; demolitionStats: DemolitionStats }> {
  // Fetch from API (data already processed by server)
  const { buildings, demolitionData } = await fetchFromAPI();

  // Organize buildings by year
  const dataByYear: HousingDataByYear = new Map();
  for (const building of buildings) {
    const year = building.completionYear;
    if (!dataByYear.has(year)) {
      dataByYear.set(year, []);
    }
    dataByYear.get(year)!.push(building);
  }

  console.info(`[HousingData] Organized ${buildings.length} buildings across ${dataByYear.size} years`);

  // Extract BBLs from buildings for demolition matching
  const newConstructionBBLs = new Set<string>();
  for (const building of buildings) {
    const bbl = building.id.split('-')[0]; // Extract BBL from building ID
    if (bbl) newConstructionBBLs.add(bbl);
  }

  // Process demolition statistics from server data
  console.info(`[HousingData] Processing demolitions for ${newConstructionBBLs.size} new construction BBLs`);
  const demolitionStats = processDemolitionStats(demolitionData, newConstructionBBLs);
  console.info(`[HousingData] Demolition stats calculated:`, {
    totalDemolished: demolitionStats.totalDemolishedUnits,
    standaloneDemolished: demolitionStats.standaloneDemolishedUnits,
    yearCount: demolitionStats.byYear.size,
    yearBreakdown: Array.from(demolitionStats.byYear.entries()).sort((a, b) => a[0] - b[0])
  });

  return { dataByYear, demolitionStats };
}

/**
 * Get all buildings from start year up to and including end year
 */
export function getBuildingsUpToYear(
  dataByYear: HousingDataByYear,
  endYear: number,
  startYear = 2014
): ProcessedBuilding[] {
  const buildings: ProcessedBuilding[] = [];

  for (let year = startYear; year <= endYear; year++) {
    const yearBuildings = dataByYear.get(year);
    if (yearBuildings) {
      buildings.push(...yearBuildings);
    }
  }

  return buildings;
}

/**
 * Get default zoning color mapping for NYC zoning districts
 */
export function getDefaultZoningColors(): ZoningColorMap {
  return {
    'R': '#ffeb3b',    // Yellow - Residential
    'C': '#ff5722',     // Orange - Commercial
    'M': '#9c27b0',    // Purple - Manufacturing
    'BPC': '#2196f3',  // Blue - Battery Park City
    'PARK': '#4caf50',  // Green - Parks
    'default': '#9e9e9e', // Gray - Others
  };
}

/**
 * Extract zoning prefix from full zoning code (e.g., "R7A" -> "R")
 */
export function getZoningPrefix(zoningCode: string | undefined): string {
  if (!zoningCode) return 'default';

  const upperZoning = zoningCode.toUpperCase();

  // Check known prefixes
  if (upperZoning.startsWith('R')) return 'R';
  if (upperZoning.startsWith('C')) return 'C';
  if (upperZoning.startsWith('M')) return 'M';
  if (upperZoning.startsWith('BPC')) return 'BPC';
  if (upperZoning.startsWith('PARK')) return 'PARK';

  return 'default';
}
