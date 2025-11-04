// ABOUTME: Adds jurisdiction prefixes to all node IDs
// ABOUTME: Format: city:node_id, state:node_id, federal:node_id

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type NodeData = {
  meta: any;
  nodes: Array<{ id: string; [key: string]: any }>;
  edges?: Array<{ source: string; target: string; [key: string]: any }>;
};

const JURISDICTIONS = ['city', 'state', 'federal'] as const;

function migrateNodeIds(jurisdiction: string, dryRun: boolean = false) {
  const filePath = path.join(__dirname, `../data/${jurisdiction}.json`);

  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  ${jurisdiction}.json not found, skipping`);
    return { oldToNew: new Map<string, string>(), count: 0 };
  }

  const data: NodeData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const oldToNew = new Map<string, string>();

  // Build mapping
  data.nodes.forEach(node => {
    const oldId = node.id;
    const newId = `${jurisdiction}:${oldId}`;
    oldToNew.set(oldId, newId);
  });

  if (dryRun) {
    console.log(`   ${jurisdiction}: Would update ${data.nodes.length} nodes`);
    console.log(`      Example: "${data.nodes[0].id}" → "${jurisdiction}:${data.nodes[0].id}"`);
    return { oldToNew, count: data.nodes.length };
  }

  // Update node IDs
  data.nodes = data.nodes.map(node => ({
    ...node,
    id: `${jurisdiction}:${node.id}`,
    legacyId: node.id  // Keep for reference
  }));

  // Update edge references
  if (data.edges) {
    data.edges = data.edges.map(edge => ({
      ...edge,
      source: oldToNew.get(edge.source) || edge.source,
      target: oldToNew.get(edge.target) || edge.target
    }));
  }

  // Create backup
  const backupPath = `${filePath}.backup-namespace`;
  fs.copyFileSync(filePath, backupPath);

  // Write back
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

  console.log(`✅ ${jurisdiction}: Updated ${data.nodes.length} nodes, ${data.edges?.length || 0} edges`);

  return { oldToNew, count: data.nodes.length };
}

function migrateProcessReferences(jurisdiction: string, oldToNew: Map<string, string>, dryRun: boolean = false) {
  const processPath = path.join(__dirname, `../data/${jurisdiction}-processes.json`);

  if (!fs.existsSync(processPath)) {
    return;
  }

  const data = JSON.parse(fs.readFileSync(processPath, 'utf-8'));

  // Build cross-jurisdiction mapping for state processes that reference city entities
  const allMappings = new Map<string, string>(oldToNew);

  // Add mappings from other jurisdictions if needed (for cross-jurisdictional references)
  if (jurisdiction === 'state') {
    // Load city mappings for cross-references
    const cityPath = path.join(__dirname, `../data/city.json`);
    if (fs.existsSync(cityPath)) {
      const cityData: NodeData = JSON.parse(fs.readFileSync(cityPath, 'utf-8'));
      cityData.nodes.forEach(node => {
        const actualId = node.legacyId || node.id.replace(/^city:/, '');
        allMappings.set(actualId, node.id);
      });
    }
  }

  const originalProcesses = JSON.stringify(data.processes);

  data.processes = data.processes.map((proc: any) => ({
    ...proc,
    nodes: proc.nodes.map((nodeId: string) => allMappings.get(nodeId) || nodeId)
  }));

  if (dryRun) {
    if (originalProcesses !== JSON.stringify(data.processes)) {
      console.log(`   Would update ${jurisdiction}-processes.json`);
    }
    return;
  }

  fs.writeFileSync(processPath, JSON.stringify(data, null, 2));
  console.log(`   Updated ${jurisdiction}-processes.json`);
}

function migrateSubgraphReferences(jurisdiction: string, oldToNew: Map<string, string>, dryRun: boolean = false) {
  const subgraphsDir = path.join(__dirname, '../data/subgraphs');

  if (!fs.existsSync(subgraphsDir)) {
    return;
  }

  const files = fs.readdirSync(subgraphsDir)
    .filter(f => f.startsWith(jurisdiction) && f.endsWith('.json'));

  files.forEach(file => {
    const filePath = path.join(subgraphsDir, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    if (dryRun) {
      console.log(`   Would update ${file}`);
      return;
    }

    // Update node IDs
    data.elements.nodes = data.elements.nodes.map((node: any) => ({
      ...node,
      data: {
        ...node.data,
        id: oldToNew.get(node.data.id) || node.data.id
      }
    }));

    // Update edge references
    data.elements.edges = data.elements.edges.map((edge: any) => ({
      ...edge,
      data: {
        ...edge.data,
        source: oldToNew.get(edge.data.source) || edge.data.source,
        target: oldToNew.get(edge.data.target) || edge.data.target
      }
    }));

    // Update entryNodeId
    if (data.entryNodeId) {
      data.entryNodeId = oldToNew.get(data.entryNodeId) || data.entryNodeId;
    }

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`   Updated ${file}`);
  });
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

// Run migration
console.log('='.repeat(60));
console.log('MIGRATING NODE IDs TO NAMESPACED FORMAT');
if (dryRun) {
  console.log('(DRY RUN - No changes will be made)');
}
console.log('='.repeat(60));
console.log();

const mappings = new Map<string, Map<string, string>>();

for (const jurisdiction of JURISDICTIONS) {
  console.log(`\n📦 Migrating ${jurisdiction}...`);
  const { oldToNew } = migrateNodeIds(jurisdiction, dryRun);
  mappings.set(jurisdiction, oldToNew);

  if (!dryRun) {
    migrateProcessReferences(jurisdiction, oldToNew, dryRun);
    migrateSubgraphReferences(jurisdiction, oldToNew, dryRun);
  } else {
    migrateProcessReferences(jurisdiction, oldToNew, dryRun);
    migrateSubgraphReferences(jurisdiction, oldToNew, dryRun);
  }
}

console.log('\n' + '='.repeat(60));
if (dryRun) {
  console.log('✅ DRY RUN COMPLETE - Run without --dry-run to apply');
} else {
  console.log('✅ MIGRATION COMPLETE');
  console.log('\nBackups created:');
  console.log('  - data/city.json.backup-namespace');
  console.log('  - data/state.json.backup-namespace');
  console.log('  - data/federal.json.backup-namespace');
  console.log('\nNode IDs now use format: jurisdiction:node_id');
  console.log('Examples: city:mayor_nyc, state:governor_ny, federal:president');
  console.log('\nLegacy IDs preserved in node.legacyId field for reference');
  console.log('\nNext step: Re-run validation to confirm all references resolved');
}
console.log('='.repeat(60));
