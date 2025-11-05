// ABOUTME: Fixes node ID mismatches between generated nodes and subviews
// ABOUTME: Updates subview anchor and node references to match actual generated node IDs

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ID mappings for state
const STATE_ID_MAP: Record<string, string> = {
  'state_police': 'state_police_ny',
  'dot': 'dot_ny',
  'dec': 'dec_ny',
  'health': 'doh_ny',
  'education': 'sed_ny',
  'labor': 'dol_ny',
  'parks': 'parks_ny',
  'agriculture': 'agm_ny',
  'budget_division': 'division_of_budget',
  'comptroller': 'state_comptroller',
};

// ID mappings for federal
const FEDERAL_ID_MAP: Record<string, string> = {
  'state_dept': 'state',
};

function fixSubviewIds(jurisdiction: string, idMap: Record<string, string>) {
  const subviewsPath = path.join(__dirname, `../.claude/generated/${jurisdiction}-intra-subviews.json`);

  if (!fs.existsSync(subviewsPath)) {
    console.log(`  ℹ️  No subviews file for ${jurisdiction}`);
    return;
  }

  const subviews = JSON.parse(fs.readFileSync(subviewsPath, 'utf-8'));

  subviews.forEach((subview: any) => {
    // Fix anchor nodeId
    if ('nodeId' in subview.anchor) {
      const anchorId = subview.anchor.nodeId.replace(`${jurisdiction}:`, '');
      if (idMap[anchorId]) {
        subview.anchor.nodeId = `${jurisdiction}:${idMap[anchorId]}`;
        console.log(`    Fixed anchor: ${anchorId} → ${idMap[anchorId]}`);
      }
    }

    // Fix nodes array
    subview.nodes = subview.nodes.map((nodeId: string) => {
      const bareId = nodeId.replace(`${jurisdiction}:`, '');
      if (idMap[bareId]) {
        console.log(`    Fixed node: ${bareId} → ${idMap[bareId]}`);
        return `${jurisdiction}:${idMap[bareId]}`;
      }
      return nodeId;
    });

    // Fix edge sources and targets
    subview.edges = subview.edges.map((edge: any) => {
      const newEdge = { ...edge };

      if (idMap[edge.source]) {
        newEdge.source = idMap[edge.source];
        newEdge.id = newEdge.id.replace(edge.source, idMap[edge.source]);
      }

      if (idMap[edge.target]) {
        newEdge.target = idMap[edge.target];
        newEdge.id = newEdge.id.replace(edge.target, idMap[edge.target]);
      }

      return newEdge;
    });
  });

  fs.writeFileSync(subviewsPath, JSON.stringify(subviews, null, 2));
  console.log(`  ✅ Fixed ${subviewsPath}`);
}

console.log('='.repeat(60));
console.log('FIXING SUBVIEW NODE ID REFERENCES');
console.log('='.repeat(60));

console.log('\n📋 State');
fixSubviewIds('state', STATE_ID_MAP);

console.log('\n📋 Federal');
fixSubviewIds('federal', FEDERAL_ID_MAP);

console.log('\n' + '='.repeat(60));
console.log('✅ COMPLETE');
console.log('='.repeat(60));
