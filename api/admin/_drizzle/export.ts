// ABOUTME: Export script to dump database data back to JSON files
// ABOUTME: Run after making edits to sync database changes back to version-controlled JSON

import 'dotenv/config';
import { db } from '../_lib/db';
import { scopes, nodes, edges, processes, subgraphs } from './schema';
import { eq } from 'drizzle-orm';
import fs from 'fs/promises';
import path from 'path';
import type { GovernmentScope } from '../../../src/data/types';

// When running from api directory: process.cwd() = /path/to/project/api
// We need to go up one level to get to project root, then into data
const PROJECT_ROOT = path.join(process.cwd(), '..');
const DATA_DIR = path.join(PROJECT_ROOT, 'data');
const SUBGRAPHS_DIR = path.join(DATA_DIR, 'subgraphs');

async function exportData() {
  console.log('📤 Starting database export to JSON...\n');

  try {
    // Ensure directories exist
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.mkdir(SUBGRAPHS_DIR, { recursive: true });

    // Get all scopes
    const allScopes = await db.select().from(scopes);
    console.log(`Found ${allScopes.length} scopes\n`);

    for (const scope of allScopes) {
      console.log(`📊 Exporting ${scope.id}...`);
      const scopeId = scope.id as GovernmentScope;

      // 1. Export main scope data (nodes + edges)
      const scopeNodes = await db
        .select()
        .from(nodes)
        .where(eq(nodes.scopeId, scopeId));

      const scopeEdges = await db
        .select()
        .from(edges)
        .where(eq(edges.scopeId, scopeId));

      const mainData = {
        meta: {
          title: scope.title,
          description: scope.description,
        },
        nodes: scopeNodes.map((node) => ({
          id: node.id,
          label: node.label,
          type: node.type,
          branch: node.branch,
          factoid: node.factoid,
          ...(node.positionX !== null && node.positionY !== null
            ? { position: { x: node.positionX, y: node.positionY } }
            : {}),
          ...(node.parentId ? { parent: node.parentId } : {}),
          ...(node.processTags && node.processTags.length > 0
            ? { process: node.processTags }
            : {}),
        })),
        edges: scopeEdges.map((edge) => ({
          ...(edge.id ? { id: edge.id } : {}),
          source: edge.sourceId,
          target: edge.targetId,
          ...(edge.label ? { label: edge.label } : {}),
          ...(edge.type ? { type: edge.type } : {}),
          ...(edge.relation ? { relation: edge.relation } : {}),
          ...(edge.detail ? { detail: edge.detail } : {}),
          ...(edge.processTags && edge.processTags.length > 0
            ? { process: edge.processTags }
            : {}),
        })),
      };

      const mainFilePath = path.join(DATA_DIR, `${scopeId}.json`);
      await fs.writeFile(mainFilePath, JSON.stringify(mainData, null, 2));
      console.log(
        `  ✓ Wrote ${scopeNodes.length} nodes, ${scopeEdges.length} edges to ${scopeId}.json`,
      );

      // 2. Export processes
      const scopeProcesses = await db
        .select()
        .from(processes)
        .where(eq(processes.scopeId, scopeId));

      const processData = {
        processes: scopeProcesses.map((proc) => ({
          id: proc.id,
          label: proc.label,
          description: proc.description,
          nodes: proc.nodeIds,
          edges: proc.edgeData as Array<{ source: string; target: string }>,
          ...(proc.steps ? { steps: proc.steps } : {}),
        })),
      };

      const processFilePath = path.join(DATA_DIR, `${scopeId}-processes.json`);
      await fs.writeFile(processFilePath, JSON.stringify(processData, null, 2));
      console.log(
        `  ✓ Wrote ${scopeProcesses.length} processes to ${scopeId}-processes.json`,
      );

      // 3. Export subgraphs
      const scopeSubgraphs = await db
        .select()
        .from(subgraphs)
        .where(eq(subgraphs.scopeId, scopeId));

      for (const subgraph of scopeSubgraphs) {
        const subgraphData = {
          id: subgraph.id,
          label: subgraph.label,
          entryNodeId: subgraph.entryNodeId,
          description: subgraph.description || undefined,
          layoutType: subgraph.layoutType || undefined,
          elements: subgraph.elements,
        };

        const subgraphFilePath = path.join(SUBGRAPHS_DIR, `${subgraph.id}.json`);
        await fs.writeFile(
          subgraphFilePath,
          JSON.stringify(subgraphData, null, 2),
        );
      }

      if (scopeSubgraphs.length > 0) {
        console.log(
          `  ✓ Wrote ${scopeSubgraphs.length} subgraphs to subgraphs/`,
        );
      }

      console.log();
    }

    console.log('✅ Export completed successfully!');
    console.log(`\nFiles written to ${DATA_DIR}`);
  } catch (error) {
    console.error('❌ Error exporting data:', error);
    process.exit(1);
  }

  process.exit(0);
}

exportData();
