// ABOUTME: Rebuilds main.json from backup files with namespace prefixes
// ABOUTME: Filters to main tier nodes (constitutional structure)

import fs from 'fs';
import path from 'path';

type Node = {
  id: string;
  label: string;
  type: string;
  branch: string;
  factoid: string;
  process?: string[];
  position?: { x: number; y: number };
  parent?: string;
};

type Edge = {
  source: string;
  target: string;
  relation: string;
  detail?: string;
  category?: string;
  hierarchical?: boolean;
};

type Backup = {
  meta: {
    title: string;
    description: string;
  };
  nodes: Node[];
  edges: Edge[];
};

// Define which nodes are main tier vs intra tier
const MAIN_TIER_PATTERNS = {
  city: [
    'nyc_charter',
    'mayor_nyc',
    'comptroller',
    'public_advocate',
    'city_council',
    'administrative_code',
    'rules_of_city',
    'nyc_budget',
    'borough_structure',
    'departments', // Grouping node for agencies
  ],
  state: [
    'ny_state_constitution',
    'governor_ny',
    'state_legislature',
    'state_senate',
    'state_assembly',
    'state_judiciary',
    'state_comptroller',
    'state_budget',
    'ny_consolidated_laws',
    'nycrr',
    'state_agencies', // Grouping node
    'public_authorities', // Grouping node
  ],
  federal: [
    // All federal nodes are main tier
    'us_constitution',
    'president',
    'congress',
    'senate',
    'house_of_representatives',
    'supreme_court',
    'federal_courts',
    'federal_budget',
    'federal_agencies',
    'us_code',
    'cfr',
  ],
};

function isMainTier(nodeId: string, scope: keyof typeof MAIN_TIER_PATTERNS): boolean {
  return MAIN_TIER_PATTERNS[scope].includes(nodeId);
}

function addNamespacePrefix(id: string, scope: string): string {
  return `${scope}:${id}`;
}

function rebuildMain() {
  const dataDir = path.join(process.cwd(), 'data');

  // Read backup files
  const cityBackup: Backup = JSON.parse(
    fs.readFileSync(path.join(dataDir, 'city.json.backup'), 'utf-8')
  );
  const stateBackup: Backup = JSON.parse(
    fs.readFileSync(path.join(dataDir, 'state.json.backup'), 'utf-8')
  );
  const federalBackup: Backup = JSON.parse(
    fs.readFileSync(path.join(dataDir, 'federal.json.backup'), 'utf-8')
  );

  // Extract and namespace main tier nodes
  const mainNodes: Node[] = [];

  // City nodes
  for (const node of cityBackup.nodes) {
    if (isMainTier(node.id, 'city')) {
      mainNodes.push({
        ...node,
        id: addNamespacePrefix(node.id, 'city'),
      });
    }
  }

  // State nodes
  for (const node of stateBackup.nodes) {
    if (isMainTier(node.id, 'state')) {
      mainNodes.push({
        ...node,
        id: addNamespacePrefix(node.id, 'state'),
      });
    }
  }

  // Federal nodes (all are main tier)
  for (const node of federalBackup.nodes) {
    if (isMainTier(node.id, 'federal')) {
      mainNodes.push({
        ...node,
        id: addNamespacePrefix(node.id, 'federal'),
      });
    }
  }

  // Extract and namespace edges (only for main tier nodes)
  const mainNodeIds = new Set(mainNodes.map(n => n.id));
  const mainEdges: Edge[] = [];

  // Helper to check if an edge connects main tier nodes
  function shouldIncludeEdge(edge: Edge, scope: string): boolean {
    const namespacedSource = addNamespacePrefix(edge.source, scope);
    const namespacedTarget = addNamespacePrefix(edge.target, scope);
    return mainNodeIds.has(namespacedSource) && mainNodeIds.has(namespacedTarget);
  }

  // City edges
  for (const edge of cityBackup.edges || []) {
    if (shouldIncludeEdge(edge, 'city')) {
      mainEdges.push({
        ...edge,
        source: addNamespacePrefix(edge.source, 'city'),
        target: addNamespacePrefix(edge.target, 'city'),
      });
    }
  }

  // State edges
  for (const edge of stateBackup.edges || []) {
    if (shouldIncludeEdge(edge, 'state')) {
      mainEdges.push({
        ...edge,
        source: addNamespacePrefix(edge.source, 'state'),
        target: addNamespacePrefix(edge.target, 'state'),
      });
    }
  }

  // Federal edges
  for (const edge of federalBackup.edges || []) {
    if (shouldIncludeEdge(edge, 'federal')) {
      mainEdges.push({
        ...edge,
        source: addNamespacePrefix(edge.source, 'federal'),
        target: addNamespacePrefix(edge.target, 'federal'),
      });
    }
  }

  // Build main.json structure
  const mainJson = {
    meta: {
      title: 'Main Government Structure',
      description: 'Constitutional structures of NYC, New York State, and U.S. Federal government',
      tier: 'main',
      version: '1.0.0',
    },
    nodes: mainNodes,
    edges: mainEdges,
  };

  // Write to main.json
  const outputPath = path.join(dataDir, 'main.json');
  fs.writeFileSync(outputPath, JSON.stringify(mainJson, null, 2));

  console.log(`✅ Rebuilt main.json with ${mainNodes.length} nodes and ${mainEdges.length} edges`);
  console.log(`   City nodes: ${mainNodes.filter(n => n.id.startsWith('city:')).length}`);
  console.log(`   State nodes: ${mainNodes.filter(n => n.id.startsWith('state:')).length}`);
  console.log(`   Federal nodes: ${mainNodes.filter(n => n.id.startsWith('federal:')).length}`);
}

rebuildMain();
