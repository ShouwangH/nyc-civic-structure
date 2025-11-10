// ABOUTME: API endpoint for fetching and caching NYC capital budget data
// ABOUTME: Fetches from CPDB Polygons dataset with server-side caching

import { registerRoute } from '../api-middleware';

// Cache configuration
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
let cachedData: {
  timestamp: number;
  projects: any[];
} | null = null;

// NYC Open Data API configuration
const CPDB_API = 'https://data.cityofnewyork.us/resource/9jkp-n57r.geojson';
const CPDB_LIMIT = 10000;

/**
 * Check if cached data is still valid
 */
function isCacheValid(): boolean {
  if (!cachedData) return false;
  const now = Date.now();
  return now - cachedData.timestamp < CACHE_TTL_MS;
}

/**
 * Fetch and process capital budget data
 */
async function fetchAndProcessCapitalBudget() {
  console.log('[Capital Budget API] Fetching from NYC Open Data...');

  try {
    // Fetch from CPDB Polygons dataset
    // Filter to active/future projects with allocated budgets
    const response = await fetch(
      `${CPDB_API}?$where=maxdate>='2025-01-01' AND allocate_total>0&$limit=${CPDB_LIMIT}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Transform features to add derived properties
    const features = data.features.map((feature: any) => {
      // Extract fiscal year from mindate
      const fiscalYear = feature.properties.mindate
        ? parseInt(feature.properties.mindate.substring(0, 4), 10)
        : undefined;

      // Extract completion year from maxdate
      const completionYear = feature.properties.maxdate
        ? parseInt(feature.properties.maxdate.substring(0, 4), 10)
        : undefined;

      return {
        type: 'Feature',
        geometry: feature.geometry,
        properties: {
          maprojid: feature.properties.maprojid || 'Unknown',
          description: feature.properties.description || 'Unnamed Project',
          magencyname: feature.properties.magencyname || 'Unknown Agency',
          magencyacro: feature.properties.magencyacro || 'N/A',
          typecategory: feature.properties.typecategory || 'Unknown',
          mindate: feature.properties.mindate || '',
          maxdate: feature.properties.maxdate || '',
          allocate_total: parseFloat(feature.properties.allocate_total || '0'),
          commit_total: parseFloat(feature.properties.commit_total || '0'),
          spent_total: parseFloat(feature.properties.spent_total || '0'),
          plannedcommit_total: parseFloat(feature.properties.plannedcommit_total || '0'),
          fiscalYear,
          completionYear,
        },
      };
    });

    console.log(`[Capital Budget API] Processed ${features.length} projects`);

    // Store in cache
    cachedData = {
      timestamp: Date.now(),
      projects: features,
    };

    return features;
  } catch (error) {
    console.error('[Capital Budget API] Error fetching data:', error);
    throw error;
  }
}

/**
 * GET /api/capital-budget
 * Returns capital budget projects with server-side caching
 */
async function getCapitalBudget(request: Request) {
  try {
    const url = new URL(request.url);
    const forceRefresh = url.searchParams.get('refresh') === 'true';

    // Check cache
    if (!forceRefresh && isCacheValid()) {
      console.log('[Capital Budget API] Returning cached data');
      return Response.json({
        success: true,
        cached: true,
        count: cachedData!.projects.length,
        data: cachedData!.projects,
      });
    }

    // Fetch fresh data
    const projects = await fetchAndProcessCapitalBudget();

    return Response.json({
      success: true,
      cached: false,
      count: projects.length,
      data: projects,
    });
  } catch (error) {
    console.error('[Capital Budget API] Error:', error);
    return Response.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// Register route
registerRoute('GET', '/api/capital-budget', getCapitalBudget);
