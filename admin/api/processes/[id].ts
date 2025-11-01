// ABOUTME: API endpoint for updating process metadata (label, description)
// ABOUTME: Handles PUT requests with authentication and validation

import { db } from '../../lib/db';
import { processes, auditLog } from '../../drizzle/schema';
import { verifyAuth } from '../../lib/auth';
import { UpdateProcessSchema } from '../../lib/validation';
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
      { error: 'Process ID is required' },
      { status: 400 }
    );
  }

  try {
    // Parse and validate request body
    const body = await request.json();
    const validation = UpdateProcessSchema.safeParse(body);
    if (!validation.success) {
      return Response.json({
        error: 'Validation failed',
        details: validation.error.errors,
      }, { status: 400 });
    }

    // Get old data for audit log
    const oldProcess = await db.select().from(processes).where(eq(processes.id, id)).limit(1);

    if (oldProcess.length === 0) {
      return Response.json(
        { error: 'Process not found' },
        { status: 404 }
      );
    }

    // Update process
    const updatedProcess = await db
      .update(processes)
      .set({
        ...validation.data,
        updatedAt: new Date(),
      })
      .where(eq(processes.id, id))
      .returning();

    if (updatedProcess.length === 0) {
      return Response.json(
        { error: 'Failed to update process' },
        { status: 404 }
      );
    }

    // Create audit log entry
    await db.insert(auditLog).values({
      tableName: 'processes',
      recordId: id,
      action: 'UPDATE',
      oldData: oldProcess[0],
      newData: updatedProcess[0],
    });

    return Response.json({
      success: true,
      data: updatedProcess[0],
    });
  } catch (error) {
    console.error('Error updating process:', error);
    return Response.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
