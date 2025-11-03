// ABOUTME: API endpoint for listing all nodes
// ABOUTME: GET endpoint for frontend to show editable nodes

import { db } from '../_lib/db';
import { nodes } from '../_drizzle/schema';
import { eq, asc } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const scope = url.searchParams.get('scope');

    let allNodes;
    if (scope) {
      // Filter by scope if provided
      allNodes = await db
        .select()
        .from(nodes)
        .where(eq(nodes.scopeId, scope))
        .orderBy(asc(nodes.label));
    } else {
      // Get all nodes
      allNodes = await db
        .select()
        .from(nodes)
        .orderBy(asc(nodes.scopeId), asc(nodes.label));
    }

    return Response.json({
      success: true,
      data: allNodes,
      count: allNodes.length,
    });
  } catch (error) {
    console.error('Error fetching nodes:', error);
    return Response.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
