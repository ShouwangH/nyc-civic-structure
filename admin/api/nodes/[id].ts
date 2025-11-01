// ABOUTME: API endpoint for updating individual nodes
// ABOUTME: Handles PUT requests with authentication and validation

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../../lib/db';
import { nodes, auditLog } from '../../drizzle/schema';
import { verifyAuth } from '../../lib/auth';
import { UpdateNodeSchema } from '../../lib/validation';
import { eq } from 'drizzle-orm';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow PUT method
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify authentication
  const authResult = verifyAuth(req.headers.authorization);
  if (!authResult.authenticated) {
    return res.status(401).json({ error: authResult.error || 'Unauthorized' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Node ID is required' });
  }

  try {
    // Validate request body
    const validation = UpdateNodeSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors,
      });
    }

    // Get old data for audit log
    const oldNode = await db.select().from(nodes).where(eq(nodes.id, id)).limit(1);

    if (oldNode.length === 0) {
      return res.status(404).json({ error: 'Node not found' });
    }

    // Update node
    const updatedNode = await db
      .update(nodes)
      .set({
        ...validation.data,
        updatedAt: new Date(),
      })
      .where(eq(nodes.id, id))
      .returning();

    if (updatedNode.length === 0) {
      return res.status(404).json({ error: 'Failed to update node' });
    }

    // Create audit log entry
    await db.insert(auditLog).values({
      tableName: 'nodes',
      recordId: id,
      action: 'UPDATE',
      oldData: oldNode[0],
      newData: updatedNode[0],
    });

    return res.status(200).json({
      success: true,
      data: updatedNode[0],
    });
  } catch (error) {
    console.error('Error updating node:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
