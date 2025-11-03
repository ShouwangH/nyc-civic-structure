// ABOUTME: API endpoint for listing all processes
// ABOUTME: GET endpoint for frontend to show editable processes

import { db } from '../_lib/db';
import { processes } from '../_drizzle/schema';
import { eq, asc } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const scope = url.searchParams.get('scope');

    let allProcesses;
    if (scope) {
      // Filter by scope if provided
      allProcesses = await db
        .select()
        .from(processes)
        .where(eq(processes.scopeId, scope))
        .orderBy(asc(processes.label));
    } else {
      // Get all processes
      allProcesses = await db
        .select()
        .from(processes)
        .orderBy(asc(processes.scopeId), asc(processes.label));
    }

    return Response.json({
      success: true,
      data: allProcesses,
      count: allProcesses.length,
    });
  } catch (error) {
    console.error('Error fetching processes:', error);
    return Response.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
