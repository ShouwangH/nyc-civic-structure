// ABOUTME: Migrates data to three-tier structure (main/intra/detailed)
// ABOUTME: Adds namespaces, splits files, and integrates generated agency data

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
  [key: string]: any;
};

type Edge = {
  source: string;
  target: string;
  [key: string]: any;
};

type DataFile = {
  meta: any;
  nodes: Node[];
  edges?: Edge[];
};

type Subview = {
  id: string;
  label: string;
  description: string;
  type: string;
  jurisdiction: string;
  anchor: { nodeId: string } | { nodeIds: string[] };
  nodes: string[];
  edges: Edge[];
  [key: string]: any;
};

const JURISDICTIONS = ['city', 'state', 'federal'] as const;

// Main tier nodes - constitutional/charter-defined entities
const MAIN_TIER_CRITERIA = {
  city: new Set([
    'nyc_charter',
    'mayor_nyc',
    'comptroller',
    'public_advocate',
    'city_council',
    'administrative_code',
    'borough_presidents',
    'community_boards',
    'charter_revision_commission',
    'voters',
    'district_attorneys',
    'city_clerk',
  ]),
  state: new Set([
    'ny_constitution',
    'governor',
    'lieutenant_governor',
    'attorney_general',
    'state_comptroller',
    'state_legislature',
    'senate',
    'assembly',
    'court_of_appeals',
    'appellate_divisions',
    'unified_court_system',
    'state_board_of_elections',
  ]),
  federal: new Set([
    'us_constitution',
    'president',
    'vice_president',
    'congress',
    'house_of_representatives',
    'senate_us',
    'supreme_court',
    'federal_courts',
    'cabinet',
  ]),
};

function addNamespacePrefix(id: string, jurisdiction: string): string {
  // Skip if already has prefix
  if (id.startsWith(`${jurisdiction}:`)) {
    return id;
  }
  return `${jurisdiction}:${id}`;
}

function isMainTierNode(nodeId: string, jurisdiction: keyof typeof MAIN_TIER_CRITERIA): boolean {
  return MAIN_TIER_CRITERIA[jurisdiction].has(nodeId);
}

function migrateJurisdiction(jurisdiction: typeof JURISDICTIONS[number]) {
  console.log(`\n📦 Processing ${jurisdiction}...`);

  const inputPath = path.join(__dirname, `../data/${jurisdiction}.json`);
  const data: DataFile = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));

  const oldToNew = new Map<string, string>();
  const mainNodes: Node[] = [];
  const intraNodes: Node[] = [];
  const mainEdges: Edge[] = [];
  const intraEdges: Edge[] = [];

  // Process nodes: add namespace and classify
  data.nodes.forEach(node => {
    const newId = addNamespacePrefix(node.id, jurisdiction);
    oldToNew.set(node.id, newId);

    const namespacedNode = {
      ...node,
      id: newId,
    };

    if (isMainTierNode(node.id, jurisdiction as any)) {
      mainNodes.push(namespacedNode);
    } else {
      intraNodes.push(namespacedNode);
    }
  });

  // Process edges
  data.edges?.forEach(edge => {
    const namespacedEdge = {
      ...edge,
      source: oldToNew.get(edge.source) || addNamespacePrefix(edge.source, jurisdiction),
      target: oldToNew.get(edge.target) || addNamespacePrefix(edge.target, jurisdiction),
    };

    const sourceId = edge.source;
    const targetId = edge.target;

    // Edge belongs to main if both nodes are main tier
    if (isMainTierNode(sourceId, jurisdiction as any) && isMainTierNode(targetId, jurisdiction as any)) {
      mainEdges.push(namespacedEdge);
    } else {
      // Otherwise it belongs to intra tier
      intraEdges.push(namespacedEdge);
    }
  });

  console.log(`  Main tier: ${mainNodes.length} nodes, ${mainEdges.length} edges`);
  console.log(`  Intra tier: ${intraNodes.length} nodes, ${intraEdges.length} edges`);

  return { mainNodes, mainEdges, intraNodes, intraEdges, oldToNew };
}

function loadGeneratedNodes(jurisdiction: string): Node[] {
  const generatedPath = path.join(__dirname, `../.claude/generated/${jurisdiction}-generated-nodes.json`);
  const agencyPath = path.join(__dirname, `../.claude/generated/${jurisdiction}-agency-nodes.json`);

  const allNodes: Node[] = [];

  // Load main generated nodes (parent agencies like NYPD, DOE, etc.)
  if (fs.existsSync(generatedPath)) {
    const nodes: Node[] = JSON.parse(fs.readFileSync(generatedPath, 'utf-8'));
    // Add namespace prefix
    const namespacedNodes = nodes.map(node => ({
      ...node,
      id: node.id.startsWith(`${jurisdiction}:`) ? node.id : `${jurisdiction}:${node.id}`
    }));
    allNodes.push(...namespacedNodes);
    console.log(`  Loaded ${namespacedNodes.length} generated nodes (parent agencies)`);
  }

  // Load agency internal nodes (bureaus, divisions, etc. - already have namespace)
  if (fs.existsSync(agencyPath)) {
    const nodes: Node[] = JSON.parse(fs.readFileSync(agencyPath, 'utf-8'));
    allNodes.push(...nodes);
    console.log(`  Loaded ${nodes.length} agency internal nodes`);
  }

  return allNodes;
}

function loadGeneratedSubviews(jurisdiction: string): Subview[] {
  const subviewsPath = path.join(__dirname, `../.claude/generated/${jurisdiction}-intra-subviews.json`);
  if (!fs.existsSync(subviewsPath)) {
    console.log('  ℹ️  No generated subviews found');
    return [];
  }
  const subviews: Subview[] = JSON.parse(fs.readFileSync(subviewsPath, 'utf-8'));

  // Fix namespace prefixes in subview edges
  subviews.forEach(subview => {
    subview.edges = subview.edges.map(edge => ({
      ...edge,
      source: edge.source.startsWith(`${jurisdiction}:`) ? edge.source : `${jurisdiction}:${edge.source}`,
      target: edge.target.startsWith(`${jurisdiction}:`) ? edge.target : `${jurisdiction}:${edge.target}`,
    }));

    // Fix anchor nodeId if present
    if ('nodeId' in subview.anchor) {
      const anchorId = subview.anchor.nodeId;
      if (!anchorId.startsWith(`${jurisdiction}:`)) {
        subview.anchor.nodeId = `${jurisdiction}:${anchorId}`;
      }
    }
  });

  console.log(`  Loaded ${subviews.length} generated subviews`);
  return subviews;
}

function writeMainFile(
  jurisdiction: string,
  mainNodes: Node[],
  mainEdges: Edge[],
  originalMeta: any
) {
  const outputPath = path.join(__dirname, `../data/${jurisdiction}.json`);
  const output = {
    meta: {
      ...originalMeta,
      tier: 'main',
      description: `${originalMeta.description} - Main constitutional structure`,
    },
    nodes: mainNodes,
    edges: mainEdges,
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`  ✅ Wrote ${outputPath}`);
}

function writeIntraFile(
  jurisdiction: string,
  intraNodes: Node[],
  intraEdges: Edge[],
  subviews: Subview[],
  originalMeta: any
) {
  const outputPath = path.join(__dirname, `../data/${jurisdiction}-intra.json`);
  const output = {
    meta: {
      jurisdiction,
      tier: 'intra',
      version: '1.0.0',
      description: `${jurisdiction} agencies, departments, and intra-agency subviews`,
    },
    nodes: intraNodes,
    edges: intraEdges,
    subviews,
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`  ✅ Wrote ${outputPath}`);
}

// Main execution
console.log('='.repeat(60));
console.log('MIGRATING TO THREE-TIER STRUCTURE');
console.log('='.repeat(60));

// Process all jurisdictions (with generated data where available)
for (const jurisdiction of JURISDICTIONS) {
  console.log(`\n📍 ${jurisdiction.toUpperCase()}`);

  const result = migrateJurisdiction(jurisdiction);
  const generatedNodes = loadGeneratedNodes(jurisdiction);
  const generatedSubviews = loadGeneratedSubviews(jurisdiction);

  // Merge generated nodes into intra tier
  const allIntraNodes = [...result.intraNodes, ...generatedNodes];
  console.log(`  Total intra nodes: ${allIntraNodes.length} (${result.intraNodes.length} from split + ${generatedNodes.length} generated)`);

  // Load original meta
  const data: DataFile = JSON.parse(fs.readFileSync(path.join(__dirname, `../data/${jurisdiction}.json`), 'utf-8'));

  writeMainFile(jurisdiction, result.mainNodes, result.mainEdges, data.meta);
  writeIntraFile(jurisdiction, allIntraNodes, result.intraEdges, generatedSubviews, data.meta);
}

console.log('\n' + '='.repeat(60));
console.log('✅ MIGRATION COMPLETE');
console.log('='.repeat(60));
console.log('\nCreated files:');
console.log('  - data/city.json (main tier)');
console.log('  - data/city-intra.json (intra tier + subviews)');
console.log('  - data/state.json (main tier)');
console.log('  - data/state-intra.json (intra tier)');
console.log('  - data/federal.json (main tier)');
console.log('  - data/federal-intra.json (intra tier)');
console.log('\nNext: Review data/city-intra.json for manual verification');
