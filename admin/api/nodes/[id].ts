// ABOUTME: API endpoint for updating individual nodes
// ABOUTME: Handles PUT requests with authentication and validation

import { db } from '../../lib/db';
import { nodes, auditLog } from '../../drizzle/schema';
import { verifyAuth } from '../../lib/auth';
import { UpdateNodeSchema } from '../../lib/validation';
import { eq } from 'drizzle-orm';

export async function PUT(request: Request) {
  // Verify authentication
  const authResult = verifyAuth(request.headers.get('authorization'));
  if (!authResult.authenticated) {
    return Response.json(
      { error: authResult.error || 'Unauthorized' },
      { status: 401 }
    );
  }

  // Extract ID from URL path
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const id = pathParts[pathParts.length - 1];

  if (!id) {
    return Response.json(
      { error: 'Node ID is required' },
      { status: 400 }
    );
  }

  try {
    // Parse and validate request body
    const body = await request.json();
    const validation = UpdateNodeSchema.safeParse(body);
    if (!validation.success) {
      return Response.json({
        error: 'Validation failed',
        details: validation.error.errors,
      }, { status: 400 });
    }

    // Get old data for audit log
    const oldNode = await db.select().from(nodes).where(eq(nodes.id, id)).limit(1);

    if (oldNode.length === 0) {
      return Response.json(
        { error: 'Node not found' },
        { status: 404 }
      );
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
      return Response.json(
        { error: 'Failed to update node' },
        { status: 404 }
      );
    }

    // Create audit log entry
    await db.insert(auditLog).values({
      tableName: 'nodes',
      recordId: id,
      action: 'UPDATE',
      oldData: oldNode[0],
      newData: updatedNode[0],
    });

    return Response.json({
      success: true,
      data: updatedNode[0],
    });
  } catch (error) {
    console.error('Error updating node:', error);
    return Response.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
