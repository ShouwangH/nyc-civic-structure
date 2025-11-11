// ABOUTME: API endpoint for financial visualization data (sankey and sunburst)
// ABOUTME: Serves sankey and sunburst datasets from database with optional cache

import { registerRoute } from '../api-middleware';
import { db } from '../lib/db';
import { sankeyDatasets, sunburstDatasets } from '../lib/schema';
import { eq } from 'drizzle-orm';

// Cache configuration (in-memory)
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
let cachedData: {
  timestamp: number;
  sankey: Map<string, any>;
  sunburst: Map<string, any>;
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
 * Fetch all financial data from database
 */
async function fetchFinancialData() {
  console.log('[Financial Data API] Fetching from database...');

  try {
    // Fetch all sankey datasets
    const sankeyRecords = await db
      .select()
      .from(sankeyDatasets)
      .execute();

    // Fetch all sunburst datasets
    const sunburstRecords = await db
      .select()
      .from(sunburstDatasets)
      .execute();

    console.log('[Financial Data API] Fetched:', {
      sankey: sankeyRecords.length,
      sunburst: sunburstRecords.length,
    });

    // Store in maps by ID
    const sankeyMap = new Map(sankeyRecords.map(r => [r.id, r]));
    const sunburstMap = new Map(sunburstRecords.map(r => [r.id, r]));

    // Store in cache
    cachedData = {
      timestamp: Date.now(),
      sankey: sankeyMap,
      sunburst: sunburstMap,
    };

    return {
      sankey: sankeyMap,
      sunburst: sunburstMap,
    };
  } catch (error) {
    console.error('[Financial Data API] Error fetching data:', error);
    throw error;
  }
}

/**
 * GET /api/financial-data
 * List all available financial datasets
 */
async function listFinancialData(request: Request) {
  try {
    const url = new URL(request.url);
    const forceRefresh = url.searchParams.get('refresh') === 'true';

    // Check cache
    if (forceRefresh || !isCacheValid()) {
      await fetchFinancialData();
    }

    // Return list of available datasets
    const sankeyList = Array.from(cachedData!.sankey.values()).map(d => ({
      id: d.id,
      label: d.label,
      description: d.description,
      fiscalYear: d.fiscalYear,
      dataType: d.dataType,
      units: d.units,
      generatedAt: d.generatedAt,
    }));

    const sunburstList = Array.from(cachedData!.sunburst.values()).map(d => ({
      id: d.id,
      label: d.label,
      description: d.description,
      fiscalYear: d.fiscalYear,
      dataType: d.dataType,
      units: d.units,
      totalValue: d.totalValue,
      generatedAt: d.generatedAt,
    }));

    return Response.json({
      success: true,
      cached: !forceRefresh && isCacheValid(),
      data: {
        sankey: sankeyList,
        sunburst: sunburstList,
      },
    });
  } catch (error) {
    console.error('[Financial Data API] Error:', error);
    return Response.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

/**
 * GET /api/financial-data/sankey/:id
 * Get specific sankey dataset by ID
 */
async function getSankeyById(request: Request) {
  try {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const id = pathParts[pathParts.length - 1];
    const forceRefresh = url.searchParams.get('refresh') === 'true';

    if (!id) {
      return Response.json(
        { error: 'Sankey ID is required' },
        { status: 400 }
      );
    }

    // Check cache
    if (forceRefresh || !isCacheValid()) {
      await fetchFinancialData();
    }

    const dataset = cachedData!.sankey.get(id);

    if (!dataset) {
      return Response.json(
        { error: 'Sankey dataset not found' },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      cached: !forceRefresh && isCacheValid(),
      data: dataset,
    });
  } catch (error) {
    console.error('[Financial Data API] Error:', error);
    return Response.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

/**
 * GET /api/financial-data/sunburst/:id
 * Get specific sunburst dataset by ID
 */
async function getSunburstById(request: Request) {
  try {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const id = pathParts[pathParts.length - 1];
    const forceRefresh = url.searchParams.get('refresh') === 'true';

    if (!id) {
      return Response.json(
        { error: 'Sunburst ID is required' },
        { status: 400 }
      );
    }

    // Check cache
    if (forceRefresh || !isCacheValid()) {
      await fetchFinancialData();
    }

    const dataset = cachedData!.sunburst.get(id);

    if (!dataset) {
      return Response.json(
        { error: 'Sunburst dataset not found' },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      cached: !forceRefresh && isCacheValid(),
      data: dataset,
    });
  } catch (error) {
    console.error('[Financial Data API] Error:', error);
    return Response.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// Register routes
registerRoute('GET', '/api/financial-data', listFinancialData);
registerRoute('GET', '/api/financial-data/sankey/[id]', getSankeyById);
registerRoute('GET', '/api/financial-data/sunburst/[id]', getSunburstById);
