// ABOUTME: Data fetching and transformation utilities for NYC housing data
// ABOUTME: Handles NYC Open Data API calls, caching, and data processing

import type {
  HousingBuildingRecord,
  ProcessedBuilding,
  BuildingSegment,
  BuildingType,
  CachedProcessedData,
  HousingDataByYear,
  ZoningColorMap,
  DemolitionStats,
} from '../../components/HousingTimelapse/types';

// Cache configuration
const CACHE_KEY = 'nyc_housing_processed_v6';
const CACHE_VERSION = '6.0.0';

const ENABLE_CACHE = false; // Disabled: localStorage quota exceeded

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
  // Parse as integers first to handle already-padded values from DOB
  const paddedBlock = parseInt(block, 10).toString().padStart(5, '0');
  const paddedLot = parseInt(lot, 10).toString().padStart(4, '0');

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
 * Fetch housing data from NYC Open Data APIs - DOB primary, PLUTO fallback, Housing NY overlay
 */
async function fetchFromAPI(): Promise<{ joinedData: HousingBuildingRecord[]; demolitionData: any[] }> {
  console.info('[HousingData] Fetching from server API (with 24-hour caching)...');

  // Fetch from server API
  const response = await fetch('/api/housing-data');

  if (!response.ok) {
    throw new Error(`Server API error: ${response.status}`);
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.message || 'Failed to fetch housing data');
  }

  // Extract data from server response
  const housingNYData: any[] = result.data.housingNyData;
  const dobData: any[] = result.data.dobData;
  const plutoData: any[] = result.data.plutoData;
  const demolitionData: any[] = result.data.demolitionData;

  console.info(`[HousingData] Fetched ${housingNYData.length} Housing NY records`);
  console.info(`[HousingData] Fetched ${dobData.length} DOB records (approved/completed only)`);
  if (dobData.length > 0) {
    console.info('[HousingData] Sample DOB record:', dobData[0]);
    console.info('[HousingData] DOB fields:', Object.keys(dobData[0]));
  }
  console.info(`[HousingData] Fetched ${plutoData.length} PLUTO records (fallback)`)
  console.info(`[HousingData] Fetched ${demolitionData.length} demolition records`)

  // Build BBL index from Housing NY data for O(1) lookup
  const housingByBBL = new Map<string, any>();
  for (const record of housingNYData) {
    const bbl = normalizeBBL(record.bbl);
    if (bbl) {
      housingByBBL.set(bbl, record);
    }
  }
  console.info(`[HousingData] Indexed ${housingByBBL.size} Housing NY records by BBL`);

  // Group DOB records by BBL to aggregate multiple jobs
  const dobByBBL = new Map<string, any[]>();
  for (const dobRecord of dobData) {
    const bbl = constructBBL(dobRecord.borough, dobRecord.block, dobRecord.lot);
    if (!bbl) continue;

    if (!dobByBBL.has(bbl)) {
      dobByBBL.set(bbl, []);
    }
    dobByBBL.get(bbl)!.push(dobRecord);
  }

  // Track which BBLs are covered by DOB
  const dobBBLs = new Set<string>();
  const joinedData: any[] = [];
  let dobAffordableMatches = 0;
  let dobProcessed = 0;
  let dobSkipped = 0;

  // Process each BBL (aggregating all jobs)
  for (const [bbl, jobs] of dobByBBL.entries()) {
    const housingRecord = housingByBBL.get(bbl);

    // Aggregate units from all jobs
    let newConstructionUnits = 0; // From NB jobs
    let renovationUnits = 0; // From A1/A2/A3 jobs
    let latestSignoffDate: string | null = null;
    let latestJob: any = null;

    for (const job of jobs) {
      const jobType = (job.job_type || '').toUpperCase();
      const existingUnits = parseInt(job.existing_dwelling_units || '0', 10);
      const proposedUnits = parseInt(job.proposed_dwelling_units || '0', 10);
      const netUnits = proposedUnits - existingUnits;

      // Track latest job (for metadata)
      const signoffDate = job.signoff_date || job.latest_action_date;
      if (!latestSignoffDate || (signoffDate && signoffDate > latestSignoffDate)) {
        latestSignoffDate = signoffDate;
        latestJob = job;
      }

      // Aggregate units by job type
      if (jobType === 'NB') {
        // New building: add net new units
        newConstructionUnits += Math.max(0, netUnits);
      } else if (['A1', 'A2', 'A3'].includes(jobType)) {
        // Renovation: add net change (can be 0 or positive)
        renovationUnits += Math.max(0, netUnits);
      }
    }

    // Determine total units and classification
    let unitsForVisualization;
    let isRenovation;

    if (housingRecord) {
      // Has affordable housing data - use that for units
      unitsForVisualization = parseInt(
        housingRecord.all_counted_units || housingRecord.total_units || '0',
        10
      );
      // Classify as renovation if renovation units >= new construction units
      isRenovation = renovationUnits >= newConstructionUnits;
    } else {
      // No affordable data - use aggregated DOB units
      const totalUnits = newConstructionUnits + renovationUnits;
      unitsForVisualization = totalUnits;
      // Classify as renovation if renovation contributed more units
      isRenovation = renovationUnits > newConstructionUnits;
    }

    // Include if we have units OR any renovation work was done
    const hasRenovationWork = jobs.some(j => ['A1', 'A2', 'A3'].includes((j.job_type || '').toUpperCase()));
    const shouldInclude = unitsForVisualization > 0 || hasRenovationWork;

    if (!shouldInclude) {
      dobSkipped++;
      continue;
    }

    dobBBLs.add(bbl);
    dobProcessed++;

    if (housingRecord) {
      dobAffordableMatches++;
    }

    // Use latest job for metadata
    joinedData.push({
      ...latestJob,
      _netUnits: unitsForVisualization,
      _affordableData: housingRecord || null,
      _hasAffordable: Boolean(housingRecord),
      _isRenovation: isRenovation,
      _newConstructionUnits: newConstructionUnits,
      _renovationUnits: renovationUnits,
      _dataSource: 'dob',
    });
  }

  console.info(`[HousingData] DOB: ${dobProcessed} valid (net+ units + renovations), ${dobSkipped} skipped (invalid)`);
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

  return { joinedData, demolitionData };
}

/**
 * Get housing data (from cache or API), returns processed data by year and demolition stats
 */
export async function getHousingData(): Promise<{ dataByYear: HousingDataByYear; demolitionStats: DemolitionStats }> {
  // Fetch from API and process
  const { joinedData, demolitionData } = await fetchFromAPI();
  const processed = processHousingData(joinedData);

  // Extract BBLs from processed buildings for demolition matching
  const newConstructionBBLs = new Set<string>();
  for (const buildings of processed.values()) {
    for (const building of buildings) {
      const bbl = building.id.split('-')[0]; // Extract BBL from building ID (format: BBL-jobNumber)
      if (bbl) newConstructionBBLs.add(bbl);
    }
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

  // Save processed data to cache
  saveProcessedToCache(processed);

  return { dataByYear: processed, demolitionStats };
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
 * Get physical building type from building class alone (no affordability/renovation overlay)
 * NYC PLUTO building class codes: https://www1.nyc.gov/assets/planning/download/pdf/data-maps/open-data/bldg_class_code_101.pdf
 */
function getPhysicalBuildingType(buildingClass: string | undefined): BuildingType {
  if (buildingClass) {
    const classPrefix = buildingClass.charAt(0).toUpperCase();
    switch (classPrefix) {
      case 'A': return 'one-two-family';  // One and two family
      case 'B': return 'multifamily-walkup';  // Multifamily walk-up
      case 'C': return 'multifamily-elevator';  // Multifamily elevator
      case 'D': return 'mixed-use';  // Mixed residential/commercial
      case 'R': return 'multifamily-elevator';  // Condos/co-ops (typically elevator buildings)
      case 'S': return 'mixed-use';  // Mixed residential
      case 'L': return 'multifamily-elevator';  // Lofts (converted industrial, typically elevator)
      // Non-residential but may have housing units:
      case 'H': return 'mixed-use';  // Hotels (some have residential)
      case 'O': return 'mixed-use';  // Office (some have residential conversion)
      case 'K': return 'mixed-use';  // Retail (some have residential above)
      case 'E': case 'F': case 'G':  // Warehouses, factories, garages
      case 'I': case 'J': case 'M':  // Hospitals, theaters, churches
      case 'N': case 'P': case 'Q':  // Institutions, assembly, recreation
      case 'T': case 'U': case 'V':  // Transport, misc, vacant
      case 'W': case 'Y': case 'Z':  // Education, government, misc
        return 'mixed-use';  // Catch-all for unusual residential conversions
    }
  }
  // Default to mixed-use for buildings without building class data
  return 'mixed-use';
}

/**
 * Determine building type from PLUTO building class or DOB job type
 */
function getBuildingType(
  buildingClass: string | undefined,
  _jobType: string | undefined,
  affordablePercentage: number,
  isRenovation: boolean
): any {
  // Priority 1: Predominantly affordable housing (>50% affordable)
  if (affordablePercentage > 50) {
    return 'affordable';
  }

  // Priority 2: Renovation (DOB A1/A2/A3 types)
  if (isRenovation) {
    return 'renovation';
  }

  // Priority 3: PLUTO/DOB building class
  return getPhysicalBuildingType(buildingClass);
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
  const lat = parseFloat(
    record.gis_latitude ||
    record.latitude ||
    affordableData?.latitude ||
    affordableData?.latitude_internal ||
    (record.location?.coordinates?.[1]) ||
    (affordableData?.location?.coordinates?.[1]) ||
    '0'
  );
  const lon = parseFloat(
    record.gis_longitude ||
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

  // Determine if renovation (needed for validation)
  const jobType = record.job_type || '';
  const isRenovation = isDOB && ['A1', 'A2', 'A3'].includes(jobType.toUpperCase());

  // Validate required fields
  // Renovations are allowed to have 0 units since they represent significant housing work
  if (!lat || !lon || !dateInfo.year || dateInfo.year < 2014 || dateInfo.year > 2025 || (totalUnits === 0 && !isRenovation)) {
    return null;
  }

  // Calculate affordable units
  const affordableUnits = affordableData ? calculateAffordableUnits(affordableData) : 0;

  // Calculate affordable percentage for classification
  const affordablePercentage = totalUnits > 0 ? (affordableUnits / totalUnits) * 100 : 0;

  // Classify building type
  // DOB uses 'building_class', PLUTO uses 'bldgclass'
  const buildingClass = record.building_class || record.bldgclass;
  const buildingType = getBuildingType(buildingClass, jobType, affordablePercentage, isRenovation);
  const physicalBuildingType = getPhysicalBuildingType(buildingClass);

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
    affordablePercentage,
    buildingType,
    physicalBuildingType,
    buildingClass,
    zoningDistrict: record.zonedist1,
    address: record.address || affordableData?.address || `${record.house_number || ''} ${record.street_name || ''}`.trim(),
    dataSource: (isDOB ? 'dob' : isPLUTO ? 'pluto' : 'housing-ny') as any,
    isRenovation,
  };
}

/**
 * Get RGBA color for a building type
 */
function getBuildingTypeColor(buildingType: BuildingType): [number, number, number, number] {
  switch (buildingType) {
    case 'affordable':
      return [34, 197, 94, 200]; // Green
    case 'renovation':
      return [249, 115, 22, 200]; // Orange
    case 'multifamily-elevator':
      return [59, 130, 246, 200]; // Blue
    case 'multifamily-walkup':
      return [147, 51, 234, 200]; // Purple
    case 'mixed-use':
      return [251, 191, 36, 200]; // Yellow
    case 'one-two-family':
      return [239, 68, 68, 200]; // Red
    default:
      return [156, 163, 175, 200]; // Gray
  }
}

/**
 * Transform buildings into segments for stacked visualization
 * Buildings with both affordable and market-rate units are split into two segments
 */
export function createBuildingSegments(buildings: ProcessedBuilding[]): BuildingSegment[] {
  const segments: BuildingSegment[] = [];

  for (const building of buildings) {
    const hasAffordable = building.affordableUnits > 0;
    const hasMarket = building.totalUnits > building.affordableUnits;

    if (hasAffordable && hasMarket) {
      // Mixed building - create two segments
      // Bottom segment: affordable units (green)
      segments.push({
        buildingId: building.id,
        segmentType: 'affordable',
        baseElevation: 0,
        segmentHeight: building.affordableUnits,
        color: [34, 197, 94, 200], // Green
        parentBuilding: building,
      });

      // Top segment: market-rate units (colored by physical building type)
      segments.push({
        buildingId: building.id,
        segmentType: 'market-rate',
        baseElevation: building.affordableUnits,
        segmentHeight: building.totalUnits - building.affordableUnits,
        color: getBuildingTypeColor(building.physicalBuildingType),
        parentBuilding: building,
      });
    } else {
      // Single-type building - create one segment
      segments.push({
        buildingId: building.id,
        segmentType: hasAffordable ? 'affordable' : 'market-rate',
        baseElevation: 0,
        segmentHeight: building.totalUnits,
        color: hasAffordable ? [34, 197, 94, 200] : getBuildingTypeColor(building.physicalBuildingType),
        parentBuilding: building,
      });
    }
  }

  return segments;
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
