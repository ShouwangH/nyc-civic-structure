// ABOUTME: Validates three-tier data structure integrity
// ABOUTME: Checks node references, namespaces, duplicates, and subview definitions

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type Node = {
  id: string;
  [key: string]: any;
};

type Edge = {
  source: string;
  target: string;
  [key: string]: any;
};

type Subview = {
  id: string;
  nodes: string[];
  edges: Edge[];
  anchor?: { nodeId?: string; nodeIds?: string[] };
  [key: string]: any;
};

type DataFile = {
  meta: any;
  nodes: Node[];
  edges?: Edge[];
  subviews?: Subview[];
};

const JURISDICTIONS = ['city', 'state', 'federal'] as const;
let totalErrors = 0;
let totalWarnings = 0;

function loadFile(jurisdiction: string, tier: 'main' | 'intra'): DataFile | null {
  const filename = tier === 'main' ? `${jurisdiction}.json` : `${jurisdiction}-intra.json`;
  const filePath = path.join(__dirname, `../data/${filename}`);

  if (!fs.existsSync(filePath)) {
    console.log(`  ⚠️  ${filename} not found`);
    return null;
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function validateJurisdiction(jurisdiction: typeof JURISDICTIONS[number]) {
  console.log(`\n📋 ${jurisdiction.toUpperCase()}`);
  console.log('-'.repeat(50));

  const main = loadFile(jurisdiction, 'main');
  const intra = loadFile(jurisdiction, 'intra');

  if (!main) {
    console.log('  ❌ Missing main file');
    totalErrors++;
    return;
  }

  // Build complete node set
  const allNodes = new Set<string>();
  const nodesByFile = new Map<string, string>();

  // Add main nodes
  main.nodes.forEach(node => {
    if (allNodes.has(node.id)) {
      console.log(`  ❌ Duplicate node ID: ${node.id}`);
      totalErrors++;
    }
    allNodes.add(node.id);
    nodesByFile.set(node.id, 'main');
  });

  // Add intra nodes
  if (intra) {
    intra.nodes.forEach(node => {
      if (allNodes.has(node.id)) {
        console.log(`  ❌ Duplicate node ID: ${node.id} (already in main)`);
        totalErrors++;
      }
      allNodes.add(node.id);
      nodesByFile.set(node.id, 'intra');
    });
  }

  console.log(`  Nodes: ${main.nodes.length} main + ${intra?.nodes.length || 0} intra = ${allNodes.size} total`);

  // Validate namespace prefixes
  let namespaceErrors = 0;
  const expectedPrefix = `${jurisdiction}:`;
  allNodes.forEach(nodeId => {
    if (!nodeId.startsWith(expectedPrefix)) {
      console.log(`  ❌ Invalid namespace: ${nodeId} (expected ${expectedPrefix})`);
      namespaceErrors++;
      totalErrors++;
    }
  });

  if (namespaceErrors === 0) {
    console.log(`  ✅ All nodes have correct namespace prefix`);
  }

  // Validate main edges
  let edgeErrors = 0;
  main.edges?.forEach(edge => {
    if (!allNodes.has(edge.source)) {
      console.log(`  ❌ Main edge references missing source: ${edge.source}`);
      edgeErrors++;
      totalErrors++;
    }
    if (!allNodes.has(edge.target)) {
      console.log(`  ❌ Main edge references missing target: ${edge.target}`);
      edgeErrors++;
      totalErrors++;
    }
  });

  // Validate intra edges
  intra?.edges?.forEach(edge => {
    if (!allNodes.has(edge.source)) {
      console.log(`  ❌ Intra edge references missing source: ${edge.source}`);
      edgeErrors++;
      totalErrors++;
    }
    if (!allNodes.has(edge.target)) {
      console.log(`  ❌ Intra edge references missing target: ${edge.target}`);
      edgeErrors++;
      totalErrors++;
    }
  });

  if (edgeErrors === 0) {
    console.log(`  ✅ All edges reference existing nodes`);
  }

  // Validate subviews
  if (intra?.subviews) {
    console.log(`  Subviews: ${intra.subviews.length}`);

    let subviewErrors = 0;
    intra.subviews.forEach(subview => {
      // Check anchor
      if (subview.anchor?.nodeId && !allNodes.has(subview.anchor.nodeId)) {
        console.log(`  ❌ Subview "${subview.id}" anchor missing: ${subview.anchor.nodeId}`);
        subviewErrors++;
        totalErrors++;
      }

      if (subview.anchor?.nodeIds) {
        subview.anchor.nodeIds.forEach(nodeId => {
          if (!allNodes.has(nodeId)) {
            console.log(`  ❌ Subview "${subview.id}" anchor missing: ${nodeId}`);
            subviewErrors++;
            totalErrors++;
          }
        });
      }

      // Check nodes
      subview.nodes.forEach(nodeId => {
        if (!allNodes.has(nodeId)) {
          console.log(`  ❌ Subview "${subview.id}" references missing node: ${nodeId}`);
          subviewErrors++;
          totalErrors++;
        }
      });

      // Check edge sources/targets
      subview.edges.forEach(edge => {
        const fullSource = edge.source.includes(':') ? edge.source : `${jurisdiction}:${edge.source}`;
        const fullTarget = edge.target.includes(':') ? edge.target : `${jurisdiction}:${edge.target}`;

        if (!allNodes.has(fullSource)) {
          console.log(`  ⚠️  Subview "${subview.id}" edge source missing namespace or node: ${edge.source} (looking for ${fullSource})`);
          totalWarnings++;
        }

        if (!allNodes.has(fullTarget)) {
          console.log(`  ⚠️  Subview "${subview.id}" edge target missing namespace or node: ${edge.target} (looking for ${fullTarget})`);
          totalWarnings++;
        }
      });
    });

    if (subviewErrors === 0) {
      console.log(`  ✅ All subview references valid`);
    }
  } else {
    console.log(`  ℹ️  No subviews in intra file`);
  }

  // Check tier metadata
  if (main.meta.tier !== 'main') {
    console.log(`  ⚠️  Main file missing tier metadata (expected "main", got "${main.meta.tier}")`);
    totalWarnings++;
  }

  if (intra && intra.meta.tier !== 'intra') {
    console.log(`  ⚠️  Intra file missing tier metadata (expected "intra", got "${intra.meta.tier}")`);
    totalWarnings++;
  }
}

// Main validation
console.log('='.repeat(60));
console.log('VALIDATING THREE-TIER DATA STRUCTURE');
console.log('='.repeat(60));

for (const jurisdiction of JURISDICTIONS) {
  validateJurisdiction(jurisdiction);
}

console.log('\n' + '='.repeat(60));
if (totalErrors === 0 && totalWarnings === 0) {
  console.log('✅ VALIDATION PASSED - No errors or warnings');
  console.log('='.repeat(60));
  process.exit(0);
} else {
  if (totalErrors > 0) {
    console.log(`❌ VALIDATION FAILED - ${totalErrors} errors found`);
  }
  if (totalWarnings > 0) {
    console.log(`⚠️  ${totalWarnings} warnings found`);
  }
  console.log('='.repeat(60));
  process.exit(totalErrors > 0 ? 1 : 0);
}
