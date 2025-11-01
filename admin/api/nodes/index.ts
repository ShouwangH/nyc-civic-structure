// ABOUTME: API endpoint for listing all nodes
// ABOUTME: GET endpoint for frontend to show editable nodes

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../../lib/db';
import { nodes } from '../../drizzle/schema';
import { eq, asc } from 'drizzle-orm';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow GET method
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { scope } = req.query;

    let allNodes;
    if (scope && typeof scope === 'string') {
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

    return res.status(200).json({
      success: true,
      data: allNodes,
      count: allNodes.length,
    });
  } catch (error) {
    console.error('Error fetching nodes:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
