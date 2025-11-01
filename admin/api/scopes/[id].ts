// ABOUTME: API endpoint for updating scope metadata (title, description)
// ABOUTME: Handles PUT requests with authentication and validation

import { db } from '../../lib/db';
import { scopes, auditLog } from '../../drizzle/schema';
import { verifyAuth } from '../../lib/auth';
import { UpdateScopeSchema } from '../../lib/validation';
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
      { error: 'Scope ID is required' },
      { status: 400 }
    );
  }

  try {
    // Parse and validate request body
    const body = await request.json();
    const validation = UpdateScopeSchema.safeParse(body);
    if (!validation.success) {
      return Response.json({
        error: 'Validation failed',
        details: validation.error.errors,
      }, { status: 400 });
    }

    // Get old data for audit log
    const oldScope = await db.select().from(scopes).where(eq(scopes.id, id)).limit(1);

    if (oldScope.length === 0) {
      return Response.json(
        { error: 'Scope not found' },
        { status: 404 }
      );
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
      return Response.json(
        { error: 'Failed to update scope' },
        { status: 404 }
      );
    }

    // Create audit log entry
    await db.insert(auditLog).values({
      tableName: 'scopes',
      recordId: id,
      action: 'UPDATE',
      oldData: oldScope[0],
      newData: updatedScope[0],
    });

    return Response.json({
      success: true,
      data: updatedScope[0],
    });
  } catch (error) {
    console.error('Error updating scope:', error);
    return Response.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
