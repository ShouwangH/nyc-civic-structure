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
  const regionalData: Backup = JSON.parse(
    fs.readFileSync(path.join(dataDir, 'regional.json'), 'utf-8')
  );

  // Extract and namespace all nodes
  const mainNodes: Node[] = [];

  // City nodes - include ALL
  for (const node of cityBackup.nodes) {
    mainNodes.push({
      ...node,
      id: addNamespacePrefix(node.id, 'city'),
    });
  }

  // State nodes - include ALL
  for (const node of stateBackup.nodes) {
    mainNodes.push({
      ...node,
      id: addNamespacePrefix(node.id, 'state'),
    });
  }

  // Federal nodes - include ALL
  for (const node of federalBackup.nodes) {
    mainNodes.push({
      ...node,
      id: addNamespacePrefix(node.id, 'federal'),
    });
  }

  // Regional authorities (all except 'public_authorities' which is already in state)
  for (const node of regionalData.nodes) {
    if (node.id !== 'public_authorities') {
      mainNodes.push({
        ...node,
        id: addNamespacePrefix(node.id, 'state'),
      });
    }
  }

  // Extract and namespace all edges
  const mainNodeIds = new Set(mainNodes.map(n => n.id));
  const mainEdges: Edge[] = [];

  // City edges - include ALL
  for (const edge of cityBackup.edges || []) {
    mainEdges.push({
      ...edge,
      source: addNamespacePrefix(edge.source, 'city'),
      target: addNamespacePrefix(edge.target, 'city'),
    });
  }

  // State edges - include ALL
  for (const edge of stateBackup.edges || []) {
    mainEdges.push({
      ...edge,
      source: addNamespacePrefix(edge.source, 'state'),
      target: addNamespacePrefix(edge.target, 'state'),
    });
  }

  // Federal edges - include ALL
  for (const edge of federalBackup.edges || []) {
    mainEdges.push({
      ...edge,
      source: addNamespacePrefix(edge.source, 'federal'),
      target: addNamespacePrefix(edge.target, 'federal'),
    });
  }

  // Regional authority edges (connect to state:public_authorities)
  for (const edge of regionalData.edges || []) {
    const namespacedSource = addNamespacePrefix(edge.source, 'state');
    const namespacedTarget = addNamespacePrefix(edge.target, 'state');

    // Only include if both nodes are in mainNodeIds
    if (mainNodeIds.has(namespacedSource) && mainNodeIds.has(namespacedTarget)) {
      mainEdges.push({
        ...edge,
        source: namespacedSource,
        target: namespacedTarget,
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
