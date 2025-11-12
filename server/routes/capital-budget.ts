// ABOUTME: API endpoint for NYC capital budget data - serves from database with optional cache
// ABOUTME: Replaces NYC Open Data API fetching with database queries for faster response

import { registerRoute } from '../api-middleware';
import { db } from '../lib/db';
import { capitalProjects } from '../lib/schema';
import { InMemoryCache, shouldForceRefresh } from '../lib/cache';

// Cached capital budget data (24-hour TTL)
const cache = new InMemoryCache<any[]>();

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
 */
async function getCapitalBudget(request: Request) {
  try {
    const forceRefresh = shouldForceRefresh(request);

    // Check cache
    const cachedProjects = cache.get();
    if (!forceRefresh && cachedProjects) {
      console.log('[Capital Budget API] Returning cached data');
      return Response.json({
        success: true,
        cached: true,
        count: cachedProjects.length,
        data: cachedProjects,
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
