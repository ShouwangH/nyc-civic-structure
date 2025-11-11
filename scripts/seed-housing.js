#!/usr/bin/env node

// ABOUTME: Seed script for housing data - fetches from NYC Open Data and stores in database
// ABOUTME: Replicates processing from housingDataProcessor.ts but at seed time

import { housingBuildings, housingDemolitions } from '../server/lib/schema.ts';
import {
  initDb,
  closeDb,
  fetchNycOpenData,
  batchInsert,
  clearTable,
  timer,
  formatNumber,
} from './lib/seed-utils.js';

// NYC Open Data API endpoints
const HOUSING_NY_API = 'https://data.cityofnewyork.us/resource/hg8x-zxpr.json';
const DOB_API = 'https://data.cityofnewyork.us/resource/ic3t-wcy2.json';
const PLUTO_API = 'https://data.cityofnewyork.us/resource/64uk-42ks.json';

// Borough codes for BBL construction
const BOROUGH_MAP = {
  'MANHATTAN': '1', 'MN': '1',
  'BRONX': '2', 'BX': '2',
  'BROOKLYN': '3', 'BK': '3',
  'QUEENS': '4', 'QN': '4',
  'STATEN ISLAND': '5', 'SI': '5',
};

// Building classification lookup (DOB Job Type)
const BUILDING_CLASS_MAP = {
  'A1': 'one-two-family',      // 1-2 family dwelling
  'A2': 'one-two-family',      // Multiple dwellings (2-family)
  'A3': 'multifamily-walkup',  // Multiple dwellings (walkup)
  'A4': 'multifamily-elevator', // Multiple dwellings (elevator)
  'A5': 'multifamily-elevator', // Multiple dwellings (elevator)
  'B1': 'mixed-use',           // Storage/warehouse
  'B2': 'mixed-use',           // Office/commercial
  'B3': 'mixed-use',           // Mixed use
  'C1': 'mixed-use',           // Commercial
  'NB': 'unknown',             // New building (type TBD from units)
};

/**
 * Normalize BBL to standard 10-digit format
 */
function normalizeBBL(bbl) {
  if (!bbl) return null;

  // Handle PLUTO format with decimals
  const parts = String(bbl).split('.');
  const integerPart = parts[0];

  // Remove all non-numeric characters
  const numeric = integerPart.replace(/[^0-9]/g, '');

  // BBL should be 10 digits: 1 (borough) + 5 (block) + 4 (lot)
  if (numeric.length === 10) return numeric;
  if (numeric.length === 9) return '0' + numeric;

  return null;
}

/**
 * Construct BBL from borough, block, lot
 */
function constructBBL(borough, block, lot) {
  if (!borough || !block || !lot) return null;

  const boroughCode = BOROUGH_MAP[borough.toUpperCase()] || borough;

  // Pad block to 5 digits, lot to 4 digits
  const blockPadded = String(parseInt(block, 10) || 0).padStart(5, '0');
  const lotPadded = String(parseInt(lot, 10) || 0).padStart(4, '0');

  return boroughCode + blockPadded + lotPadded;
}

/**
 * Classify building type from total units and building class
 */
function classifyBuildingType(totalUnits, affordableUnits, buildingClass, constructionType) {
  // If affordable housing project, classify as affordable
  if (affordableUnits > 0 && constructionType) {
    return 'affordable';
  }

  // Renovation/alteration
  if (constructionType && constructionType.toLowerCase().includes('preservation')) {
    return 'renovation';
  }

  // Physical building classification
  if (totalUnits >= 50) return 'multifamily-elevator';
  if (totalUnits >= 10) return 'multifamily-walkup';
  if (totalUnits >= 3) return 'multifamily-walkup';
  if (totalUnits <= 2) return 'one-two-family';

  return 'unknown';
}

/**
 * Process Housing NY records
 */
function processHousingNY(records) {
  console.log('[Process] Processing Housing NY records...');

  const buildings = [];

  for (const record of records) {
    const lat = parseFloat(record.latitude);
    const lon = parseFloat(record.longitude);

    // Skip if invalid coordinates
    if (isNaN(lat) || isNaN(lon)) continue;

    // Parse completion date
    const completionDate = record.building_completion_date;
    if (!completionDate) continue;

    const date = new Date(completionDate);
    const completionYear = date.getFullYear();

    // Filter to 2014-2025 range
    if (completionYear < 2014 || completionYear > 2025) continue;

    const totalUnits = parseInt(record.all_counted_units || record.total_units || 0, 10);
    if (totalUnits === 0) continue;

    // Calculate affordable units
    const affordableUnits = [
      'extremely_low_income_units',
      'very_low_income_units',
      'low_income_units',
      'moderate_income_units',
      'middle_income_units',
    ].reduce((sum, field) => sum + parseInt(record[field] || 0, 10), 0);

    const building = {
      id: record.building_id,
      name: record.project_name || 'Unnamed Building',
      longitude: lon,
      latitude: lat,
      address: `${record.house_number || ''} ${record.street_name || ''}`.trim(),
      borough: record.borough || 'Unknown',
      bbl: normalizeBBL(record.bbl),
      bin: record.bin,
      postcode: record.postcode,
      communityBoard: record.community_board,
      councilDistrict: record.council_district,
      censusTract: record.census_tract,
      nta: record.nta_neighborhood_tabulation_area,

      completionYear,
      completionMonth: date.getMonth() + 1,
      completionDate: completionDate,

      totalUnits,
      affordableUnits,
      affordablePercentage: totalUnits > 0 ? (affordableUnits / totalUnits) * 100 : 0,

      // Income-restricted units
      extremeLowIncomeUnits: parseInt(record.extremely_low_income_units || 0, 10),
      veryLowIncomeUnits: parseInt(record.very_low_income_units || 0, 10),
      lowIncomeUnits: parseInt(record.low_income_units || 0, 10),
      moderateIncomeUnits: parseInt(record.moderate_income_units || 0, 10),
      middleIncomeUnits: parseInt(record.middle_income_units || 0, 10),
      otherIncomeUnits: parseInt(record.other_income_units || 0, 10),

      // Bedroom breakdown
      studioUnits: parseInt(record.studio_units || 0, 10),
      oneBrUnits: parseInt(record['1_br_units'] || 0, 10),
      twoBrUnits: parseInt(record['2_br_units'] || 0, 10),
      threeBrUnits: parseInt(record['3_br_units'] || 0, 10),
      fourBrUnits: parseInt(record['4_br_units'] || 0, 10),
      fiveBrUnits: parseInt(record['5_br_units'] || 0, 10),
      sixBrUnits: parseInt(record['6_br_units'] || 0, 10),
      unknownBrUnits: parseInt(record.unknown_br_units || 0, 10),

      buildingType: classifyBuildingType(
        totalUnits,
        affordableUnits,
        null,
        record.reporting_construction_type
      ),
      physicalBuildingType: null,
      buildingClass: null,
      zoningDistrict: null,

      dataSource: 'housing-ny',
      isRenovation: record.reporting_construction_type?.toLowerCase().includes('preservation'),

      // Housing NY specific
      projectId: record.project_id,
      projectName: record.project_name,
      constructionType: record.reporting_construction_type,
      extendedAffordabilityOnly: record.extended_affordability_only === 'Yes',
      prevailingWageStatus: record.prevailing_wage_status,

      lastSyncedAt: new Date(),
    };

    buildings.push(building);
  }

  console.log(`[Process] Processed ${formatNumber(buildings.length)} Housing NY buildings\n`);
  return buildings;
}

/**
 * Process DOB demolition records
 */
function processDemolitions(records) {
  console.log('[Process] Processing DOB demolition records...');

  const demolitions = [];

  for (const record of records) {
    const latestActionDate = record.latest_action_date;
    if (!latestActionDate) continue;

    const date = new Date(latestActionDate);
    const demolitionYear = date.getFullYear();

    // Filter to 2014-2025 range
    if (demolitionYear < 2014 || demolitionYear > 2025) continue;

    // Construct BBL from borough, block, lot
    const bbl = constructBBL(record.borough, record.block, record.lot);

    // Estimate units from building class (rough heuristic)
    const buildingClass = record.existing_dwelling_units || '0';
    const estimatedUnits = parseInt(buildingClass, 10) || 0;

    const demolition = {
      id: `${record.job_}` || `DM-${bbl}-${demolitionYear}`,
      bbl,
      borough: record.borough || 'Unknown',
      address: `${record.house || ''} ${record.street_name || ''}`.trim(),
      latitude: parseFloat(record.latitude) || null,
      longitude: parseFloat(record.longitude) || null,

      demolitionYear,
      demolitionMonth: date.getMonth() + 1,
      demolitionDate: latestActionDate,

      estimatedUnits,
      buildingClass: record.existing_dwelling_units,

      jobNumber: record.job_,
      jobType: record.job_type,
      jobStatus: record.job_status_descrp,

      hasNewConstruction: false, // Will be updated in matching step

      lastSyncedAt: new Date(),
    };

    demolitions.push(demolition);
  }

  console.log(`[Process] Processed ${formatNumber(demolitions.length)} demolition records\n`);
  return demolitions;
}

/**
 * Main seed function
 */
async function main() {
  const t = timer();

  console.log('===================================');
  console.log('   NYC HOUSING DATA SEED SCRIPT   ');
  console.log('===================================\n');

  // Initialize database
  const { db, client } = initDb();

  try {
    // Step 1: Clear existing data
    await clearTable(db, housingBuildings, 'housing_buildings');
    await clearTable(db, housingDemolitions, 'housing_demolitions');

    // Step 2: Fetch Housing NY data
    console.log('--- STEP 1: Fetch Housing NY Data ---\n');
    const housingNyRecords = await fetchNycOpenData(HOUSING_NY_API, {
      limit: 20000,
      order: 'reporting_construction_type DESC',
    });

    // Step 3: Fetch DOB demolition data
    console.log('--- STEP 2: Fetch DOB Demolition Data ---\n');
    const demolitionRecords = await fetchNycOpenData(DOB_API, {
      limit: 50000,
      where: "job_type='DM' AND (job_status_descrp='SIGNED OFF' OR job_status_descrp='PERMIT ISSUED - ENTIRE JOB/WORK' OR job_status_descrp='COMPLETED')",
      order: 'latest_action_date DESC',
    });

    // Step 4: Process Housing NY buildings
    console.log('--- STEP 3: Process Housing NY Buildings ---\n');
    const buildings = processHousingNY(housingNyRecords);

    // Step 5: Process demolitions
    console.log('--- STEP 4: Process Demolitions ---\n');
    const demolitions = processDemolitions(demolitionRecords);

    // Step 6: Match demolitions with new construction
    console.log('--- STEP 5: Match Demolitions with New Construction ---\n');
    const buildingBBLs = new Set(buildings.map(b => b.bbl).filter(Boolean));

    for (const demolition of demolitions) {
      if (demolition.bbl && buildingBBLs.has(demolition.bbl)) {
        demolition.hasNewConstruction = true;
      }
    }

    const standaloneDemolitions = demolitions.filter(d => !d.hasNewConstruction);
    console.log(`[Match] ${formatNumber(demolitions.length)} total demolitions`);
    console.log(`[Match] ${formatNumber(standaloneDemolitions.length)} standalone (no new construction)\n`);

    // Step 7: Insert into database
    console.log('--- STEP 6: Insert into Database ---\n');
    await batchInsert(db, housingBuildings, buildings, {
      batchSize: 500,
      label: 'housing buildings',
    });

    await batchInsert(db, housingDemolitions, demolitions, {
      batchSize: 500,
      label: 'demolitions',
    });

    // Summary
    console.log('===================================');
    console.log('           SEED SUMMARY            ');
    console.log('===================================');
    console.log(`Housing Buildings: ${formatNumber(buildings.length)}`);
    console.log(`Demolitions: ${formatNumber(demolitions.length)}`);
    console.log(`Standalone Demolitions: ${formatNumber(standaloneDemolitions.length)}`);
    console.log(`Total Time: ${t.stop()}`);
    console.log('===================================\n');

  } catch (error) {
    console.error('\n[ERROR] Seed failed:', error);
    process.exit(1);
  } finally {
    await closeDb(client);
  }
}

// Run the seed script
main();
