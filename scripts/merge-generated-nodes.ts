// ABOUTME: Merges LLM-generated nodes into main jurisdiction JSON files
// ABOUTME: Handles deduplication, sorting, and validation

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type Node = {
  id: string;
  label: string;
  type: string;
  branch: string;
  factoid: string;
  [key: string]: any; // Allow additional properties
};

type JurisdictionData = {
  meta: {
    title: string;
    description: string;
  };
  nodes: Node[];
  edges?: any[];
};

function validateNode(node: Node, index: number): string[] {
  const errors: string[] = [];

  if (!node.id) {
    errors.push(`Node at index ${index}: missing 'id' field`);
  }
  if (!node.label) {
    errors.push(`Node ${node.id || index}: missing 'label' field`);
  }
  if (!node.type) {
    errors.push(`Node ${node.id || index}: missing 'type' field`);
  }
  if (!node.branch) {
    errors.push(`Node ${node.id || index}: missing 'branch' field`);
  }
  if (!node.factoid) {
    errors.push(`Node ${node.id || index}: missing 'factoid' field`);
  }

  // Check factoid is reasonable length
  if (node.factoid && node.factoid.length < 20) {
    errors.push(`Node ${node.id}: factoid seems too short (< 20 chars)`);
  }

  return errors;
}

function mergeNodes(jurisdiction: string, generatedFilePath: string, dryRun: boolean = false) {
  console.log('='.repeat(60));
  console.log(`MERGING GENERATED NODES INTO ${jurisdiction.toUpperCase()}`);
  console.log('='.repeat(60));
  console.log();

  // Load existing jurisdiction data
  const jurisdictionPath = path.join(__dirname, `../data/${jurisdiction}.json`);
  if (!fs.existsSync(jurisdictionPath)) {
    console.error(`❌ ${jurisdiction}.json not found at ${jurisdictionPath}`);
    process.exit(1);
  }

  const existingData: JurisdictionData = JSON.parse(
    fs.readFileSync(jurisdictionPath, 'utf-8')
  );

  // Load generated nodes
  if (!fs.existsSync(generatedFilePath)) {
    console.error(`❌ Generated file not found at ${generatedFilePath}`);
    process.exit(1);
  }

  const generatedNodes: Node[] = JSON.parse(
    fs.readFileSync(generatedFilePath, 'utf-8')
  );

  console.log(`📖 Loaded ${existingData.nodes.length} existing nodes`);
  console.log(`📥 Loaded ${generatedNodes.length} generated nodes\n`);

  // Validate generated nodes
  console.log('🔍 Validating generated nodes...');
  let validationErrors: string[] = [];
  generatedNodes.forEach((node, index) => {
    const errors = validateNode(node, index);
    validationErrors.push(...errors);
  });

  if (validationErrors.length > 0) {
    console.error('❌ Validation errors found:\n');
    validationErrors.forEach(err => console.error(`   ${err}`));
    console.error('\nFix these errors in the generated file and try again.');
    process.exit(1);
  }
  console.log('✅ All generated nodes valid\n');

  // Check for duplicates
  console.log('🔍 Checking for duplicate IDs...');
  const existingIds = new Set(existingData.nodes.map(n => n.id));
  const generatedIds = new Set<string>();
  const duplicates: string[] = [];
  const newNodes: Node[] = [];

  generatedNodes.forEach(node => {
    if (existingIds.has(node.id)) {
      duplicates.push(node.id);
    } else if (generatedIds.has(node.id)) {
      duplicates.push(`${node.id} (duplicate in generated file)`);
    } else {
      generatedIds.add(node.id);
      newNodes.push(node);
    }
  });

  if (duplicates.length > 0) {
    console.log(`⚠️  Found ${duplicates.length} duplicate IDs:`);
    duplicates.forEach(id => console.log(`   - ${id}`));
    console.log('\nThese nodes already exist and will be SKIPPED.\n');
  } else {
    console.log('✅ No duplicates found\n');
  }

  if (newNodes.length === 0) {
    console.log('ℹ️  No new nodes to add (all were duplicates)');
    return;
  }

  // Merge nodes
  const mergedNodes = [...existingData.nodes, ...newNodes];

  // Sort alphabetically by ID
  mergedNodes.sort((a, b) => a.id.localeCompare(b.id));

  console.log(`✅ Will add ${newNodes.length} new nodes\n`);

  if (dryRun) {
    console.log('🔍 DRY RUN - Changes that would be made:');
    console.log(`   Total nodes after merge: ${mergedNodes.length}`);
    console.log('   New nodes to be added:');
    newNodes.slice(0, 5).forEach(n => {
      console.log(`     - ${n.id}: ${n.label}`);
    });
    if (newNodes.length > 5) {
      console.log(`     ... and ${newNodes.length - 5} more`);
    }
    console.log('\n✅ Dry run complete. Run without --dry-run to apply changes.');
    return;
  }

  // Create backup
  const backupPath = `${jurisdictionPath}.backup`;
  fs.copyFileSync(jurisdictionPath, backupPath);
  console.log(`💾 Backup created: ${path.basename(backupPath)}`);

  // Write merged data
  const updatedData: JurisdictionData = {
    ...existingData,
    nodes: mergedNodes
  };

  fs.writeFileSync(jurisdictionPath, JSON.stringify(updatedData, null, 2));

  console.log(`✅ Successfully merged ${newNodes.length} nodes into ${jurisdiction}.json`);
  console.log(`   Total nodes: ${existingData.nodes.length} → ${mergedNodes.length}`);
  console.log();
  console.log('='.repeat(60));
  console.log('MERGE COMPLETE');
  console.log('='.repeat(60));
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length < 2) {
  console.error('Usage: npx tsx scripts/merge-generated-nodes.ts <jurisdiction> <generated-file> [--dry-run]');
  console.error('');
  console.error('Example:');
  console.error('  npx tsx scripts/merge-generated-nodes.ts city city-generated-nodes.json');
  console.error('  npx tsx scripts/merge-generated-nodes.ts state state-generated-nodes.json --dry-run');
  process.exit(1);
}

const jurisdiction = args[0];
const generatedFile = args[1];
const dryRun = args.includes('--dry-run');

// Validate jurisdiction
if (!['city', 'state', 'federal'].includes(jurisdiction)) {
  console.error(`❌ Invalid jurisdiction: ${jurisdiction}`);
  console.error('   Must be one of: city, state, federal');
  process.exit(1);
}

// Resolve generated file path
const generatedFilePath = path.isAbsolute(generatedFile)
  ? generatedFile
  : path.join(process.cwd(), generatedFile);

mergeNodes(jurisdiction, generatedFilePath, dryRun);
