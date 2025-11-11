// ABOUTME: API endpoint for NYC capital budget data - serves from database with optional cache
// ABOUTME: Replaces NYC Open Data API fetching with database queries for faster response

import { registerRoute } from '../api-middleware';
import { db } from '../lib/db';
import { capitalProjects } from '../lib/schema';

// Cache configuration (in-memory)
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
let cachedData: {
  timestamp: number;
  projects: any[];
} | null = null;

/**
 * Check if cached data is still valid
 */
function isCacheValid(): boolean {
  if (!cachedData) return false;
  const now = Date.now();
  return now - cachedData.timestamp < CACHE_TTL_MS;
}

/**
 * Fetch capital budget data from database
 */
async function fetchCapitalBudget() {
  console.log('[Capital Budget API] Fetching from database...');

  try {
    // Fetch all projects (already processed during seed)
    const projects = await db
      .select()
      .from(capitalProjects)
      .execute();

    console.log(`[Capital Budget API] Fetched ${projects.length} projects`);

    // Transform to GeoJSON features format for frontend compatibility
    const features = projects.map(project => ({
      type: 'Feature',
      geometry: project.geometry,
      properties: {
        maprojid: project.maprojid,
        description: project.description,
        magencyname: project.managingAgency,
        magencyacro: project.managingAgencyAcronym,
        typecategory: project.typeCategory,
        mindate: project.minDate,
        maxdate: project.maxDate,
        allocate_total: project.allocateTotal,
        commit_total: project.commitTotal,
        spent_total: project.spentTotal,
        plannedcommit_total: project.plannedCommitTotal,
        fiscalYear: project.fiscalYear,
        completionYear: project.completionYear,
      },
    }));

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
 * Returns capital budget projects from database with in-memory caching
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

    // Fetch fresh data from database
    const projects = await fetchCapitalBudget();

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
