// ABOUTME: Validates all process/subgraph node references exist in main graphs
// ABOUTME: Reports missing nodes that need to be added

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type ValidationResult = {
  jurisdiction: string;
  missingInProcesses: string[];
  missingInSubgraphs: Map<string, string[]>; // subgraph file → missing nodes
  typoSuggestions: Map<string, string[]>; // misspelled → possible matches
};

function loadNodeIds(jurisdiction: string): Set<string> {
  const filePath = path.join(__dirname, `../data/${jurisdiction}.json`);
  if (!fs.existsSync(filePath)) {
    return new Set();
  }
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  return new Set(data.nodes.map((n: any) => n.id));
}

function findSimilar(target: string, candidates: string[]): string[] {
  const targetLower = target.toLowerCase();
  return candidates
    .filter(c => {
      const cLower = c.toLowerCase();
      return cLower.includes(targetLower) ||
             targetLower.includes(cLower) ||
             levenshtein(targetLower, cLower) < 3;
    })
    .slice(0, 3);
}

function levenshtein(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

function validateProcesses(jurisdiction: string): ValidationResult {
  const nodeIds = loadNodeIds(jurisdiction);
  const processPath = path.join(__dirname, `../data/${jurisdiction}-processes.json`);

  const result: ValidationResult = {
    jurisdiction,
    missingInProcesses: [],
    missingInSubgraphs: new Map(),
    typoSuggestions: new Map()
  };

  if (!fs.existsSync(processPath)) {
    return result;
  }

  const processData = JSON.parse(fs.readFileSync(processPath, 'utf-8'));
  const missing = new Set<string>();

  processData.processes.forEach((proc: any) => {
    proc.nodes.forEach((nodeId: string) => {
      if (!nodeIds.has(nodeId)) {
        missing.add(nodeId);
      }
    });
  });

  result.missingInProcesses = Array.from(missing);

  // Find suggestions for missing nodes
  const allNodeIds = Array.from(nodeIds);
  result.missingInProcesses.forEach(missingId => {
    const suggestions = findSimilar(missingId, allNodeIds);
    if (suggestions.length > 0) {
      result.typoSuggestions.set(missingId, suggestions);
    }
  });

  return result;
}

function validateSubgraphs(jurisdiction: string): Map<string, string[]> {
  const nodeIds = loadNodeIds(jurisdiction);
  const subgraphsDir = path.join(__dirname, '../data/subgraphs');
  const results = new Map<string, string[]>();

  if (!fs.existsSync(subgraphsDir)) {
    return results;
  }

  const files = fs.readdirSync(subgraphsDir)
    .filter(f => f.startsWith(jurisdiction) && f.endsWith('.json'));

  files.forEach(file => {
    const subgraphPath = path.join(subgraphsDir, file);
    const subgraph = JSON.parse(fs.readFileSync(subgraphPath, 'utf-8'));
    const missing: string[] = [];

    subgraph.elements.nodes.forEach((node: any) => {
      if (!nodeIds.has(node.data.id)) {
        missing.push(node.data.id);
      }
    });

    if (missing.length > 0) {
      results.set(file, missing);
    }
  });

  return results;
}

// Main validation
console.log('='.repeat(60));
console.log('VALIDATING NODE REFERENCES');
console.log('='.repeat(60));
console.log();

let totalIssues = 0;

for (const jurisdiction of ['city', 'state', 'federal']) {
  console.log(`\n📋 ${jurisdiction.toUpperCase()}`);
  console.log('-'.repeat(40));

  const processResult = validateProcesses(jurisdiction);
  const subgraphMissing = validateSubgraphs(jurisdiction);

  if (processResult.missingInProcesses.length === 0 && subgraphMissing.size === 0) {
    console.log('✅ All node references valid\n');
    continue;
  }

  // Report process issues
  if (processResult.missingInProcesses.length > 0) {
    console.log(`\n❌ Processes: ${processResult.missingInProcesses.length} missing nodes`);
    processResult.missingInProcesses.forEach(nodeId => {
      const suggestions = processResult.typoSuggestions.get(nodeId);
      if (suggestions && suggestions.length > 0) {
        console.log(`   "${nodeId}" → Did you mean: ${suggestions.join(', ')}?`);
      } else {
        console.log(`   "${nodeId}" → NOT FOUND (needs to be added to ${jurisdiction}.json)`);
      }
    });
    totalIssues += processResult.missingInProcesses.length;
  }

  // Report subgraph issues
  if (subgraphMissing.size > 0) {
    console.log(`\n❌ Subgraphs: ${subgraphMissing.size} files with missing nodes`);
    subgraphMissing.forEach((missing, file) => {
      console.log(`   ${file}: ${missing.length} missing nodes`);
      missing.forEach(nodeId => {
        console.log(`      - "${nodeId}"`);
      });
    });
    totalIssues += Array.from(subgraphMissing.values()).reduce((sum, arr) => sum + arr.length, 0);
  }
}

console.log('\n' + '='.repeat(60));
if (totalIssues === 0) {
  console.log('✅ VALIDATION PASSED - All references valid');
} else {
  console.log(`❌ VALIDATION FAILED - ${totalIssues} issues found`);
  console.log('\nNext steps:');
  console.log('1. Fix typos in process/subgraph files');
  console.log('2. Add missing nodes to jurisdiction JSON files');
  console.log('3. Re-run validation until clean');
}
console.log('='.repeat(60));

process.exit(totalIssues > 0 ? 1 : 0);
