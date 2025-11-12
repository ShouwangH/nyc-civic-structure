// ABOUTME: API endpoint for financial visualization data (sankey and sunburst)
// ABOUTME: Serves sankey and sunburst datasets from database with optional cache

import { registerRoute } from '../router.ts';
import { db } from '../lib/db.ts';
import { sankeyDatasets, sunburstDatasets, type SankeyDataset, type SunburstDataset } from '../lib/schema.ts';
import { InMemoryCache, shouldForceRefresh } from '../lib/cache.ts';

// Cached financial data (24-hour TTL)
type FinancialDataCache = {
  sankey: Map<string, SankeyDataset>;
  sunburst: Map<string, SunburstDataset>;
};
const cache = new InMemoryCache<FinancialDataCache>();

/**
 * Fetch all financial data from database
 */
async function fetchFinancialData(): Promise<FinancialDataCache> {
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
    const sankeyMap = new Map<string, SankeyDataset>(sankeyRecords.map(r => [r.id, r]));
    const sunburstMap = new Map<string, SunburstDataset>(sunburstRecords.map(r => [r.id, r]));

    // Store in cache
    const data = {
      sankey: sankeyMap,
      sunburst: sunburstMap,
    };
    cache.set(data);

    return data;
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
    const forceRefresh = shouldForceRefresh(request);

    // Check cache
    let cachedData = cache.get();
    if (forceRefresh || !cachedData) {
      cachedData = await fetchFinancialData();
    }

    // Return list of available datasets
    const sankeyList = Array.from(cachedData.sankey.values()).map(d => ({
      id: d.id,
      label: d.label,
      description: d.description,
      fiscalYear: d.fiscalYear,
      dataType: d.dataType,
      units: d.units,
      generatedAt: d.generatedAt,
    }));

    const sunburstList = Array.from(cachedData.sunburst.values()).map(d => ({
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
      cached: !forceRefresh && cache.isValid(),
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
    const forceRefresh = shouldForceRefresh(request);

    if (!id) {
      return Response.json(
        { error: 'Sankey ID is required' },
        { status: 400 }
      );
    }

    // Check cache
    let cachedData = cache.get();
    if (forceRefresh || !cachedData) {
      cachedData = await fetchFinancialData();
    }

    const dataset = cachedData.sankey.get(id);

    if (!dataset) {
      return Response.json(
        { error: 'Sankey dataset not found' },
        { status: 404 }
      );
    }

    // Transform database record to frontend format
    const frontendData = {
      units: dataset.units || undefined,
      description: dataset.description || undefined,
      meta: dataset.metadata || {},
      nodes: dataset.nodes,
      links: dataset.links,
    };

    return Response.json({
      success: true,
      cached: !forceRefresh && cache.isValid(),
      data: frontendData,
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
    const forceRefresh = shouldForceRefresh(request);

    if (!id) {
      return Response.json(
        { error: 'Sunburst ID is required' },
        { status: 400 }
      );
    }

    // Check cache
    let cachedData = cache.get();
    if (forceRefresh || !cachedData) {
      cachedData = await fetchFinancialData();
    }

    const dataset = cachedData.sunburst.get(id);

    if (!dataset) {
      return Response.json(
        { error: 'Sunburst dataset not found' },
        { status: 404 }
      );
    }

    // Transform database record to frontend format
    const frontendData = {
      meta: {
        source: dataset.label,
        fiscal_year: dataset.fiscalYear?.toString() || '',
        ...(dataset.units && { units: dataset.units }),
        ...(dataset.totalValue && { total_value: dataset.totalValue }),
        ...(dataset.metadata || {}),
      },
      data: dataset.hierarchyData, // This is the root SunburstNode
    };

    return Response.json({
      success: true,
      cached: !forceRefresh && cache.isValid(),
      data: frontendData,
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
