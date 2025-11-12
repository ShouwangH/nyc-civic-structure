// ABOUTME: API endpoints for loading civic structure data from database
// ABOUTME: Serves nodes, edges, subviews by government scope (city, state, federal)

import { db } from '../lib/db.ts';
import { nodes, edges, processes, scopes } from '../lib/schema.ts';
import { eq } from 'drizzle-orm';
import { registerRoute } from '../router.ts';

/**
 * GET /api/scopes/:scopeId/dataset
 * Get complete dataset (nodes + edges + subviews) for a government scope
 */
async function getDataset(request: Request) {
  try {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const scopeId = pathParts[3]; // /api/scopes/:scopeId/dataset

    if (!scopeId) {
      return Response.json(
        { error: 'Scope ID is required' },
        { status: 400 }
      );
    }

    // Fetch scope metadata
    const scopeData = await db
      .select()
      .from(scopes)
      .where(eq(scopes.id, scopeId))
      .limit(1);

    if (scopeData.length === 0) {
      return Response.json(
        { error: 'Scope not found' },
        { status: 404 }
      );
    }

    // Fetch nodes for this scope
    const nodesData = await db
      .select()
      .from(nodes)
      .where(eq(nodes.scopeId, scopeId));

    // Fetch edges for this scope
    const edgesData = await db
      .select()
      .from(edges)
      .where(eq(edges.scopeId, scopeId));

    // Fetch processes/subviews for this scope
    const processesData = await db
      .select()
      .from(processes)
      .where(eq(processes.scopeId, scopeId));

    // Transform database records to application format
    const transformedNodes = nodesData.map(node => ({
      id: node.id,
      label: node.label,
      type: node.type,
      branch: node.branch,
      factoid: node.factoid,
      process: node.processTags || undefined,
      position: node.positionX && node.positionY
        ? { x: node.positionX, y: node.positionY }
        : undefined,
      parent: node.parentId || undefined,
    }));

    const transformedEdges = edgesData.map(edge => ({
      id: edge.id,
      source: edge.sourceId,
      target: edge.targetId,
      label: edge.label || undefined,
      type: edge.type || undefined,
      relation: edge.relation || undefined,
      detail: edge.detail || undefined,
      process: edge.processTags || undefined,
    }));

    const transformedProcesses = processesData.map(process => ({
      id: process.id,
      label: process.label,
      description: process.description,
      nodes: process.nodeIds,
      edges: process.edgeData,
      steps: process.steps,
    }));

    return Response.json({
      success: true,
      data: {
        meta: {
          title: scopeData[0].title,
          description: scopeData[0].description,
        },
        nodes: transformedNodes,
        edges: transformedEdges,
        subviews: transformedProcesses.length > 0 ? transformedProcesses : undefined,
      },
    });
  } catch (error) {
    console.error('Error fetching dataset:', error);
    return Response.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

/**
 * GET /api/scopes/:scopeId/nodes
 * Get nodes only for a government scope
 */
async function getNodes(request: Request) {
  try {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const scopeId = pathParts[3]; // /api/scopes/:scopeId/nodes

    if (!scopeId) {
      return Response.json(
        { error: 'Scope ID is required' },
        { status: 400 }
      );
    }

    const nodesData = await db
      .select()
      .from(nodes)
      .where(eq(nodes.scopeId, scopeId));

    const transformedNodes = nodesData.map(node => ({
      id: node.id,
      label: node.label,
      type: node.type,
      branch: node.branch,
      factoid: node.factoid,
      process: node.processTags || undefined,
      position: node.positionX && node.positionY
        ? { x: node.positionX, y: node.positionY }
        : undefined,
      parent: node.parentId || undefined,
    }));

    return Response.json({
      success: true,
      data: transformedNodes,
    });
  } catch (error) {
    console.error('Error fetching nodes:', error);
    return Response.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

/**
 * GET /api/scopes/:scopeId/edges
 * Get edges only for a government scope
 */
async function getEdges(request: Request) {
  try {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const scopeId = pathParts[3]; // /api/scopes/:scopeId/edges

    if (!scopeId) {
      return Response.json(
        { error: 'Scope ID is required' },
        { status: 400 }
      );
    }

    const edgesData = await db
      .select()
      .from(edges)
      .where(eq(edges.scopeId, scopeId));

    const transformedEdges = edgesData.map(edge => ({
      id: edge.id,
      source: edge.sourceId,
      target: edge.targetId,
      label: edge.label || undefined,
      type: edge.type || undefined,
      relation: edge.relation || undefined,
      detail: edge.detail || undefined,
      process: edge.processTags || undefined,
    }));

    return Response.json({
      success: true,
      data: transformedEdges,
    });
  } catch (error) {
    console.error('Error fetching edges:', error);
    return Response.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

/**
 * GET /api/scopes/:scopeId/subviews
 * Get subviews/processes only for a government scope
 */
async function getSubviews(request: Request) {
  try {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const scopeId = pathParts[3]; // /api/scopes/:scopeId/subviews

    if (!scopeId) {
      return Response.json(
        { error: 'Scope ID is required' },
        { status: 400 }
      );
    }

    const processesData = await db
      .select()
      .from(processes)
      .where(eq(processes.scopeId, scopeId));

    const transformedProcesses = processesData.map(process => ({
      id: process.id,
      label: process.label,
      description: process.description,
      nodes: process.nodeIds,
      edges: process.edgeData,
      steps: process.steps,
    }));

    return Response.json({
      success: true,
      data: transformedProcesses,
    });
  } catch (error) {
    console.error('Error fetching subviews:', error);
    return Response.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// Register routes
registerRoute('GET', '/api/scopes/[id]/dataset', getDataset);
registerRoute('GET', '/api/scopes/[id]/nodes', getNodes);
registerRoute('GET', '/api/scopes/[id]/edges', getEdges);
registerRoute('GET', '/api/scopes/[id]/subviews', getSubviews);
