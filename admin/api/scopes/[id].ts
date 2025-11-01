// ABOUTME: API endpoint for updating scope metadata (title, description)
// ABOUTME: Handles PUT requests with authentication and validation

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../../lib/db';
import { scopes, auditLog } from '../../drizzle/schema';
import { verifyAuth } from '../../lib/auth';
import { UpdateScopeSchema } from '../../lib/validation';
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
    return res.status(400).json({ error: 'Scope ID is required' });
  }

  try {
    // Validate request body
    const validation = UpdateScopeSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors,
      });
    }

    // Get old data for audit log
    const oldScope = await db.select().from(scopes).where(eq(scopes.id, id)).limit(1);

    if (oldScope.length === 0) {
      return res.status(404).json({ error: 'Scope not found' });
    }

    // Update scope
    const updatedScope = await db
      .update(scopes)
      .set({
        ...validation.data,
        updatedAt: new Date(),
      })
      .where(eq(scopes.id, id))
      .returning();

    if (updatedScope.length === 0) {
      return res.status(404).json({ error: 'Failed to update scope' });
    }

    // Create audit log entry
    await db.insert(auditLog).values({
      tableName: 'scopes',
      recordId: id,
      action: 'UPDATE',
      oldData: oldScope[0],
      newData: updatedScope[0],
    });

    return res.status(200).json({
      success: true,
      data: updatedScope[0],
    });
  } catch (error) {
    console.error('Error updating scope:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
