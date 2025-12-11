// ABOUTME: API endpoint for NYC capital budget data - serves from database with optional cache
// ABOUTME: Replaces NYC Open Data API fetching with database queries for faster response

import { registerRoute } from '../router.ts';
import { db } from '../lib/db.ts';
import { capitalProjects, type CapitalProject } from '../lib/schema.ts';
import { InMemoryCache, shouldForceRefresh, cachedJsonResponse } from '../lib/cache.ts';

// GeoJSON Feature type for capital projects (frontend format)
type CapitalProjectFeature = {
  type: 'Feature';
  geometry: CapitalProject['geometry'];
  properties: {
    maprojid: string;
    description: string;
    magencyname: string;
    magencyacro: string | null;
    typecategory: string | null;
    mindate: string | null;
    maxdate: string | null;
    allocate_total: number;
    commit_total: number;
    spent_total: number;
    plannedcommit_total: number;
    fiscalYear: number | null;
    completionYear: number | null;
    // Pre-computed centroid for faster rendering
    centroid_lon: number | null;
    centroid_lat: number | null;
  };
};

// Cached capital budget data (24-hour TTL)
const cache = new InMemoryCache<CapitalProjectFeature[]>();

/**
 * Fetch capital budget data from database
 * @param useSimplified - Use simplified geometry (default: true for faster loading)
 */
async function fetchCapitalBudget(useSimplified = true): Promise<CapitalProjectFeature[]> {
  console.log(`[Capital Budget API] Fetching from database (simplified=${useSimplified})...`);

  try {
    // Fetch all projects (already processed during seed)
    const projects = await db
      .select()
      .from(capitalProjects)
      .execute();

    console.log(`[Capital Budget API] Fetched ${projects.length} projects`);

    // Transform to GeoJSON features format for frontend compatibility
    // Use simplified geometry by default for faster loading (82% smaller)
    const features: CapitalProjectFeature[] = projects.map(project => ({
      type: 'Feature' as const,
      geometry: useSimplified && project.geometrySimplified
        ? project.geometrySimplified
        : project.geometry,
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
        centroid_lon: project.centroidLon,
        centroid_lat: project.centroidLat,
      },
    }));

    // Store in cache
    cache.set(features);

    return features;
  } catch (error) {
    console.error('[Capital Budget API] Error fetching data:', error);
    throw error;
  }
}

/**
 * GET /api/capital-budget
 * Returns capital budget projects from database with in-memory caching
 * Query params:
 *   - refresh=true: Force refresh from database
 *   - full=true: Return full geometry instead of simplified (larger payload)
 */
async function getCapitalBudget(request: Request) {
  try {
    const url = new URL(request.url);
    const forceRefresh = shouldForceRefresh(request);
    const useFullGeometry = url.searchParams.get('full') === 'true';
    const useSimplified = !useFullGeometry;

    // Check cache (only for simplified geometry requests)
    const cachedProjects = cache.get();
    if (!forceRefresh && useSimplified && cachedProjects) {
      console.log('[Capital Budget API] Returning cached data');
      return cachedJsonResponse({
        success: true,
        cached: true,
        count: cachedProjects.length,
        data: cachedProjects,
      });
    }

    // Fetch fresh data from database
    const projects = await fetchCapitalBudget(useSimplified);

    return cachedJsonResponse({
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
