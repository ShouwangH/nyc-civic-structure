// ABOUTME: API endpoint for fetching and caching NYC housing data
// ABOUTME: Combines Housing NY, DOB, and PLUTO sources with server-side caching

import { registerRoute } from '../api-middleware';

// Cache configuration
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
let cachedData: {
  timestamp: number;
  housingNyData: any[];
  dobData: any[];
  plutoData: any[];
} | null = null;

// NYC Open Data API configuration
const HOUSING_NY_API = 'https://data.cityofnewyork.us/resource/hg8x-zxpr.json';
const DOB_API = 'https://data.cityofnewyork.us/resource/ic3t-wcy2.json';
const PLUTO_API = 'https://data.cityofnewyork.us/resource/64uk-42ks.json';
const HOUSING_NY_LIMIT = 20000;
const DOB_LIMIT = 50000;
const PLUTO_LIMIT = 20000;

/**
 * Check if cached data is still valid
 */
function isCacheValid(): boolean {
  if (!cachedData) return false;
  const now = Date.now();
  return now - cachedData.timestamp < CACHE_TTL_MS;
}

/**
 * Fetch data from NYC Open Data APIs and process
 */
async function fetchAndProcessHousingData() {
  console.log('[Housing Data API] Fetching from NYC Open Data...');

  try {
    // Fetch all three data sources in parallel
    const [housingNyResponse, dobResponse, plutoResponse] = await Promise.all([
      fetch(`${HOUSING_NY_API}?$limit=${HOUSING_NY_LIMIT}&$order=reporting_construction_type DESC`),
      fetch(`${DOB_API}?$limit=${DOB_LIMIT}&$where=(job_status_descrp='SIGNED OFF' OR job_status_descrp='PERMIT ISSUED - ENTIRE JOB/WORK' OR job_status_descrp='PLAN EXAM - APPROVED' OR job_status_descrp='COMPLETED')&$order=latest_action_date DESC`),
      fetch(`${PLUTO_API}?$limit=${PLUTO_LIMIT}&$where=yearbuilt>=2014&$order=yearbuilt DESC`)
    ]);

    if (!housingNyResponse.ok || !dobResponse.ok || !plutoResponse.ok) {
      throw new Error('Failed to fetch from one or more NYC Open Data APIs');
    }

    const [housingNyData, dobData, plutoData] = await Promise.all([
      housingNyResponse.json(),
      dobResponse.json(),
      plutoResponse.json()
    ]);

    console.log('[Housing Data API] Fetched:', {
      housingNy: housingNyData.length,
      dob: dobData.length,
      pluto: plutoData.length
    });

    // Store in cache
    cachedData = {
      timestamp: Date.now(),
      housingNyData,
      dobData,
      plutoData
    };

    return {
      housingNyData,
      dobData,
      plutoData
    };
  } catch (error) {
    console.error('[Housing Data API] Error fetching data:', error);
    throw error;
  }
}

/**
 * GET /api/housing-data
 * Returns processed housing data with server-side caching
 */
async function getHousingData(request: Request) {
  try {
    const url = new URL(request.url);
    const forceRefresh = url.searchParams.get('refresh') === 'true';

    // Check cache
    if (!forceRefresh && isCacheValid()) {
      console.log('[Housing Data API] Returning cached data');
      return Response.json({
        success: true,
        cached: true,
        data: {
          housingNyData: cachedData!.housingNyData,
          dobData: cachedData!.dobData,
          plutoData: cachedData!.plutoData,
        },
      });
    }

    // Fetch fresh data
    const data = await fetchAndProcessHousingData();

    return Response.json({
      success: true,
      cached: false,
      data: {
        housingNyData: data.housingNyData,
        dobData: data.dobData,
        plutoData: data.plutoData,
      },
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
