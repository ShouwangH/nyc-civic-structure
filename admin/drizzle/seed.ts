// ABOUTME: Database seed script that migrates data from JSON files to PostgreSQL
// ABOUTME: Run this once to populate the database with existing civic structure data

import { db } from '../lib/db';
import { scopes, nodes, edges, processes, subgraphs } from './schema';
import { governmentDatasets, type GovernmentScope } from '../../src/data/datasets';

async function seed() {
  console.log('🌱 Starting database seed...\n');

  try {
    // 1. Insert scopes
    console.log('📊 Inserting scopes...');
    const scopeData = [
      { id: 'federal', title: 'United States', description: governmentDatasets.federal.description },
      { id: 'state', title: 'New York State', description: governmentDatasets.state.description },
      { id: 'regional', title: 'Regional Authorities', description: governmentDatasets.regional.description },
      { id: 'city', title: 'New York City', description: governmentDatasets.city.description },
    ];

    await db.insert(scopes).values(scopeData);
    console.log(`✓ Inserted ${scopeData.length} scopes\n`);

    // 2. Insert nodes for each scope
    console.log('🔵 Inserting nodes...');
    let totalNodes = 0;

    for (const scopeId of ['federal', 'state', 'regional', 'city'] as GovernmentScope[]) {
      const dataset = governmentDatasets[scopeId];
      const nodeData = dataset.nodes.map((node) => ({
        id: node.id,
        scopeId: scopeId,
        label: node.label,
        type: node.type,
        branch: node.branch,
        factoid: node.factoid || '',
        positionX: node.position?.x,
        positionY: node.position?.y,
        parentId: node.parent,
        processTags: node.process || [],
      }));

      if (nodeData.length > 0) {
        await db.insert(nodes).values(nodeData);
        totalNodes += nodeData.length;
        console.log(`  ✓ ${scopeId}: ${nodeData.length} nodes`);
      }
    }
    console.log(`✓ Total nodes inserted: ${totalNodes}\n`);

    // 3. Insert edges for each scope
    console.log('🔗 Inserting edges...');
    let totalEdges = 0;

    for (const scopeId of ['federal', 'state', 'regional', 'city'] as GovernmentScope[]) {
      const dataset = governmentDatasets[scopeId];
      const edgeData = dataset.edges.map((edge, index) => ({
        id: edge.id || `${scopeId}-edge-${index}`,
        scopeId: scopeId,
        sourceId: edge.source,
        targetId: edge.target,
        label: edge.label,
        type: edge.type,
        relation: edge.relation,
        detail: edge.detail,
        processTags: edge.process || [],
      }));

      if (edgeData.length > 0) {
        await db.insert(edges).values(edgeData);
        totalEdges += edgeData.length;
        console.log(`  ✓ ${scopeId}: ${edgeData.length} edges`);
      }
    }
    console.log(`✓ Total edges inserted: ${totalEdges}\n`);

    // 4. Insert processes for each scope
    console.log('⚙️  Inserting processes...');
    let totalProcesses = 0;

    for (const scopeId of ['federal', 'state', 'regional', 'city'] as GovernmentScope[]) {
      const dataset = governmentDatasets[scopeId];
      const processData = dataset.processes.map((process) => ({
        id: process.id,
        scopeId: scopeId,
        label: process.label,
        description: process.description,
        nodeIds: process.nodes,
        edgeData: process.edges,
        steps: process.steps || null,
      }));

      if (processData.length > 0) {
        await db.insert(processes).values(processData);
        totalProcesses += processData.length;
        console.log(`  ✓ ${scopeId}: ${processData.length} processes`);
      }
    }
    console.log(`✓ Total processes inserted: ${totalProcesses}\n`);

    // 5. Insert subgraphs for each scope
    console.log('📦 Inserting subgraphs...');
    let totalSubgraphs = 0;

    for (const scopeId of ['federal', 'state', 'regional', 'city'] as GovernmentScope[]) {
      const dataset = governmentDatasets[scopeId];
      const subgraphData = (dataset.subgraphs || []).map((subgraph) => ({
        id: subgraph.id,
        scopeId: scopeId,
        label: subgraph.label,
        entryNodeId: subgraph.entryNodeId,
        description: subgraph.description,
        layoutType: subgraph.layoutType,
        elements: subgraph.elements,
      }));

      if (subgraphData.length > 0) {
        await db.insert(subgraphs).values(subgraphData);
        totalSubgraphs += subgraphData.length;
        console.log(`  ✓ ${scopeId}: ${subgraphData.length} subgraphs`);
      }
    }
    console.log(`✓ Total subgraphs inserted: ${totalSubgraphs}\n`);

    console.log('✅ Database seed completed successfully!');
    console.log(`\nSummary:`);
    console.log(`  - Scopes: ${scopeData.length}`);
    console.log(`  - Nodes: ${totalNodes}`);
    console.log(`  - Edges: ${totalEdges}`);
    console.log(`  - Processes: ${totalProcesses}`);
    console.log(`  - Subgraphs: ${totalSubgraphs}`);

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }

  process.exit(0);
}

seed();
