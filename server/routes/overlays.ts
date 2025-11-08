// ABOUTME: API endpoints for overlay management (sankey, sunburst)
// ABOUTME: GET list, GET by ID, POST create, PUT update overlays

import { db } from '../lib/db';
import { overlays } from '../../api/admin/_drizzle/schema';
import { verifyAuth } from '../lib/auth';
import { eq, and } from 'drizzle-orm';
import { registerRoute } from '../api-middleware';

interface CreateOverlayBody {
  id: string;
  scopeId: string;
  anchorNodeId: string;
  label: string;
  description?: string;
  type: string;
  renderTarget?: string;
  dataSource?: string;
  dataSnapshot?: unknown;
  metadata?: unknown;
  lastFetched?: string;
}

interface UpdateOverlayBody {
  scopeId?: string;
  anchorNodeId?: string;
  label?: string;
  description?: string;
  type?: string;
  renderTarget?: string;
  dataSource?: string;
  dataSnapshot?: unknown;
  metadata?: unknown;
  lastFetched?: string;
}

/**
 * GET /api/overlays
 * List all overlays, optionally filtered by scope or anchor node
 */
async function getOverlays(request: Request) {
  try {
    const url = new URL(request.url);
    const scopeId = url.searchParams.get('scope');
    const anchorNodeId = url.searchParams.get('anchorNode');

    let query = db.select().from(overlays);

    if (scopeId && anchorNodeId) {
      query = query.where(
        and(
          eq(overlays.scopeId, scopeId),
          eq(overlays.anchorNodeId, anchorNodeId)
        )
      ) as typeof query;
    } else if (scopeId) {
      query = query.where(eq(overlays.scopeId, scopeId)) as typeof query;
    } else if (anchorNodeId) {
      query = query.where(eq(overlays.anchorNodeId, anchorNodeId)) as typeof query;
    }

    const results = await query;

    return Response.json({
      success: true,
      data: results,
      count: results.length,
    });
  } catch (error) {
    console.error('Error fetching overlays:', error);
    return Response.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

/**
 * GET /api/overlays/[id]
 * Get a specific overlay by ID
 */
async function getOverlayById(request: Request) {
  try {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const id = pathParts[pathParts.length - 1];

    if (!id) {
      return Response.json(
        { error: 'Overlay ID is required' },
        { status: 400 }
      );
    }

    const results = await db
      .select()
      .from(overlays)
      .where(eq(overlays.id, id))
      .limit(1);

    if (results.length === 0) {
      return Response.json(
        { error: 'Overlay not found' },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      data: results[0],
    });
  } catch (error) {
    console.error('Error fetching overlay:', error);
    return Response.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

/**
 * POST /api/overlays
 * Create a new overlay
 */
async function createOverlay(request: Request) {
  // Verify authentication
  const authResult = verifyAuth(request.headers.get('authorization'));
  if (!authResult.authenticated) {
    return Response.json(
      { error: authResult.error || 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json() as CreateOverlayBody;

    // Validate required fields
    if (!body.id || !body.scopeId || !body.anchorNodeId || !body.label || !body.type) {
      return Response.json(
        { error: 'Missing required fields: id, scopeId, anchorNodeId, label, type' },
        { status: 400 }
      );
    }

    // Insert overlay
    const newOverlay = await db
      .insert(overlays)
      .values({
        id: body.id,
        scopeId: body.scopeId,
        anchorNodeId: body.anchorNodeId,
        label: body.label,
        description: body.description,
        type: body.type,
        renderTarget: body.renderTarget,
        dataSource: body.dataSource,
        dataSnapshot: body.dataSnapshot,
        metadata: body.metadata,
        lastFetched: body.lastFetched ? new Date(body.lastFetched) : null,
      })
      .returning();

    return Response.json({
      success: true,
      data: newOverlay[0],
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating overlay:', error);
    return Response.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

/**
 * PUT /api/overlays/[id]
 * Update an existing overlay
 */
async function updateOverlay(request: Request) {
  // Verify authentication
  const authResult = verifyAuth(request.headers.get('authorization'));
  if (!authResult.authenticated) {
    return Response.json(
      { error: authResult.error || 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const id = pathParts[pathParts.length - 1];

    if (!id) {
      return Response.json(
        { error: 'Overlay ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json() as UpdateOverlayBody;

    // Update overlay
    const updatedOverlay = await db
      .update(overlays)
      .set({
        scopeId: body.scopeId,
        anchorNodeId: body.anchorNodeId,
        label: body.label,
        description: body.description,
        type: body.type,
        renderTarget: body.renderTarget,
        dataSource: body.dataSource,
        dataSnapshot: body.dataSnapshot,
        metadata: body.metadata,
        updatedAt: new Date(),
        lastFetched: body.lastFetched ? new Date(body.lastFetched) : undefined,
      })
      .where(eq(overlays.id, id))
      .returning();

    if (updatedOverlay.length === 0) {
      return Response.json(
        { error: 'Overlay not found' },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      data: updatedOverlay[0],
    });
  } catch (error) {
    console.error('Error updating overlay:', error);
    return Response.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// Register routes
registerRoute('GET', '/api/overlays', getOverlays);
registerRoute('GET', '/api/overlays/[id]', getOverlayById);
registerRoute('POST', '/api/overlays', createOverlay);
registerRoute('PUT', '/api/overlays/[id]', updateOverlay);
