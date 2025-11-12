// ABOUTME: API endpoint for NYC housing data - serves from database with optional cache
// ABOUTME: Replaces NYC Open Data API fetching with database queries for faster response

import { registerRoute } from '../api-middleware';
import { db } from '../lib/db';
import { housingBuildings, housingDemolitions } from '../lib/schema';
import { gte } from 'drizzle-orm';
import { InMemoryCache, shouldForceRefresh } from '../lib/cache';

// Cached housing data (24-hour TTL)
type HousingDataCache = {
  buildings: any[];
  demolitions: any[];
};
const cache = new InMemoryCache<HousingDataCache>();

/**
 * Transform database record to ProcessedBuilding format for frontend
 */
function transformToProcessedBuilding(record: any): any {
  return {
    id: record.id,
    name: record.name,
    coordinates: [record.longitude, record.latitude] as [number, number],
    borough: record.borough,
    completionYear: record.completionYear,
    completionMonth: record.completionDate ? new Date(record.completionDate).getMonth() + 1 : undefined,
    completionDate: record.completionDate || undefined,
    totalUnits: record.totalUnits,
    affordableUnits: record.affordableUnits,
    affordablePercentage: record.affordablePercentage,
    buildingType: record.buildingType,
    physicalBuildingType: record.physicalBuildingType || record.buildingType,
    buildingClass: record.buildingClass || undefined,
    zoningDistrict: record.zoningDistrict1 || undefined,
    address: record.address,
    dataSource: record.hasAffordableOverlay ? 'housing-ny' : 'pluto',
    isRenovation: record.jobType === 'Alteration',
  };
}

/**
 * Transform demolition record to frontend-compatible format
 */
function transformDemolition(record: any): any {
  return {
    ...record,
    // Map DB fields to frontend-expected field names
    existing_dwelling_units: record.estimatedUnits,
    latest_action_date: record.demolitionDate,
    // Keep existing fields for compatibility
    bbl: record.bbl,
    borough: record.borough,
    block: record.bbl?.substring(1, 6),
    lot: record.bbl?.substring(6, 10),
  };
}

/**
 * Fetch housing data from database
 */
async function fetchHousingData() {
  console.log('[Housing Data API] Fetching from database...');

  try {
    // Fetch all buildings (already processed during seed)
    const buildingRecords = await db
      .select()
      .from(housingBuildings)
      .where(gte(housingBuildings.completionYear, 2014))
      .execute();

    // Fetch all demolitions
    const demolitionRecords = await db
      .select()
      .from(housingDemolitions)
      .where(gte(housingDemolitions.demolitionYear, 2014))
      .execute();

    console.log('[Housing Data API] Fetched:', {
      buildings: buildingRecords.length,
      demolitions: demolitionRecords.length,
    });

    // Transform to frontend format
    const buildings = buildingRecords.map(transformToProcessedBuilding);
    const demolitions = demolitionRecords.map(transformDemolition);

    // Store in cache
    const data = { buildings, demolitions };
    cache.set(data);

    return data;
  } catch (error) {
    console.error('[Housing Data API] Error fetching data:', error);
    throw error;
  }
}

/**
 * GET /api/housing-data
 * Returns processed housing data from database with in-memory caching
 */
async function getHousingData(request: Request) {
  try {
    const forceRefresh = shouldForceRefresh(request);

    // Check cache
    const cachedData = cache.get();
    if (!forceRefresh && cachedData) {
      console.log('[Housing Data API] Returning cached data');
      return Response.json({
        success: true,
        cached: true,
        data: cachedData,
      });
    }

    // Fetch fresh data from database
    const data = await fetchHousingData();

    return Response.json({
      success: true,
      cached: false,
      data,
    });
  } catch (error) {
    console.error('[Housing Data API] Error:', error);
    return Response.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// Register route
registerRoute('GET', '/api/housing-data', getHousingData);
