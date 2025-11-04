// ABOUTME: Adds unique IDs, relation types, and categories to all edges in process files
// ABOUTME: Enables visual encoding of different relationship types (hierarchical, financial, etc.)

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type Edge = {
  source: string;
  target: string;
  id?: string;
  relation?: string;
  category?: string;
};

type Process = {
  id: string;
  label: string;
  nodes: string[];
  edges: Edge[];
  steps: any[];
};

type ProcessData = {
  processes: Process[];
};

// Relation type to category mapping
const RELATION_CATEGORIES: Record<string, string> = {
  // Hierarchical
  reports_to: 'hierarchical',
  oversees: 'hierarchical',
  supervises: 'hierarchical',

  // Legislative
  proposes_to: 'legislative',
  submits_to: 'legislative',
  passes_to: 'legislative',
  refers_to: 'legislative',
  approves: 'legislative',
  vetoes: 'legislative',
  enacts: 'legislative',
  authorizes: 'legislative',

  // Appointment
  appoints: 'appointment',
  nominates: 'appointment',
  confirms: 'appointment',

  // Financial
  funds: 'financial',
  allocates_to: 'financial',
  awards_to: 'financial',
  budgets_for: 'financial',
  solicits: 'financial',

  // Review/Oversight
  reviews: 'review',
  monitors: 'review',
  audits: 'review',
  investigates: 'review',

  // Judicial
  presides_over: 'judicial',
  prosecutes: 'judicial',
  adjudicates: 'judicial',

  // Electoral/Public
  elects: 'electoral',
  comments_to: 'civic',
  petitions: 'civic',
  advocates_to: 'civic',

  // Communication
  publishes_to: 'communication',
  notifies: 'communication',
};

// Process-specific relation inference rules
const PROCESS_RELATION_RULES: Record<string, Record<string, string>> = {
  // City processes
  ulurp: {
    'DCP→community_boards': 'submits_to',
    'community_boards→borough_presidents': 'submits_to',
    'borough_presidents→city_council': 'submits_to',
    'city_council→mayor_nyc': 'passes_to',
  },
  city_budget: {
    'departments→OMB': 'reports_to',
    'OMB→mayor_nyc': 'submits_to',
    'mayor_nyc→city_council': 'proposes_to',
    'city_council→mayor_nyc': 'passes_to',
    'mayor_nyc→comptroller': 'submits_to',
  },
  charter_revision: {
    'mayor_nyc→charter_revision_commission': 'appoints',
    'city_council→charter_revision_commission': 'appoints',
    'charter_revision_commission→voters': 'submits_to',
  },
  local_law: {
    'city_council_member→city_council': 'proposes_to',
    'city_council→mayor_nyc': 'passes_to',
    'mayor_nyc→administrative_code': 'enacts',
    'city_council→administrative_code': 'enacts',
  },
  agency_rulemaking: {
    'departments→mayor_office_operations': 'submits_to',
    'mayor_office_operations→public_nyc': 'publishes_to',
    'public_nyc→departments': 'comments_to',
    'departments→city_council': 'reports_to',
    'departments→rules_of_city': 'enacts',
  },
  mayoral_appointments: {
    'mayor_nyc→city_council': 'nominates',
    'city_council→mayor_nyc': 'confirms',
    'mayor_nyc→departments': 'appoints',
  },
  procurement: {
    'departments→comptroller': 'submits_to',
    'comptroller→departments': 'approves',
    'departments→vendors': 'solicits',
    'vendors→departments': 'submits_to',
    'MOCS→departments': 'reviews',
  },

  // State processes
  nys_budget: {
    'state_agencies→division_of_budget': 'reports_to',
    'division_of_budget→governor_ny': 'submits_to',
    'governor_ny→state_assembly': 'proposes_to',
    'governor_ny→state_senate': 'proposes_to',
    'state_assembly→governor_ny': 'passes_to',
    'state_senate→governor_ny': 'passes_to',
    'governor_ny→state_comptroller': 'submits_to',
  },
  judicial_appointment: {
    'commission_on_judicial_nomination→governor_ny': 'nominates',
    'governor_ny→state_senate': 'nominates',
  },
  bond_act: {
    'state_legislature→governor_ny': 'passes_to',
    'governor_ny→attorney_general': 'submits_to',
    'attorney_general→voters_ny': 'publishes_to',
  },
  home_rule: {
    'city_council→mayor_nyc': 'submits_to',
    'mayor_nyc→state_assembly': 'submits_to',
    'mayor_nyc→state_senate': 'submits_to',
    'state_assembly→state_senate': 'passes_to',
    'state_senate→governor_ny': 'passes_to',
  },
  mayoral_control_schools: {
    'governor_ny→state_assembly': 'proposes_to',
    'governor_ny→state_senate': 'proposes_to',
    'mayor_nyc→state_assembly': 'advocates_to',
    'mayor_nyc→state_senate': 'advocates_to',
    'state_assembly→governor_ny': 'passes_to',
    'state_senate→governor_ny': 'passes_to',
    'governor_ny→DOE': 'authorizes',
  },
  state_rulemaking: {
    'state_agencies→governor_ny': 'submits_to',
    'governor_ny→public_ny': 'publishes_to',
    'public_ny→state_agencies': 'comments_to',
    'state_agencies→state_legislature': 'reports_to',
  },

  // Federal processes
  federal_budget: {
    'federal_agencies→omb': 'reports_to',
    'omb→president': 'submits_to',
    'president→congress': 'submits_to',
    'congress→appropriations_committees': 'refers_to',
    'appropriations_committees→president': 'passes_to',
  },
  federal_rulemaking: {
    'agencies→oira': 'submits_to',
    'oira→public': 'publishes_to',
    'public→agencies': 'comments_to',
    'agencies→congress': 'reports_to',
  },
  impeachment: {
    'house_of_representatives→house_judiciary_committee': 'refers_to',
    'house_judiciary_committee→house_of_representatives': 'reports_to',
    'house_of_representatives→senate': 'submits_to',
    'senate→chief_justice': 'presides_over',
  },
  federal_grant: {
    'federal_agencies→subnational_governments': 'publishes_to',
    'subnational_governments→omb': 'submits_to',
    'omb→federal_agencies': 'reviews',
    'subnational_governments→oversight': 'reports_to',
  },
};

// Default relation for unknown edges
const DEFAULT_RELATION = 'interacts_with';

function stripNamespace(nodeId: string): string {
  return nodeId.split(':').slice(1).join(':') || nodeId;
}

function inferRelation(processId: string, source: string, target: string): string {
  const rules = PROCESS_RELATION_RULES[processId];
  if (!rules) return DEFAULT_RELATION;

  // Try with namespaced IDs first
  let key = `${source}→${target}`;
  if (rules[key]) return rules[key];

  // Try stripping namespaces
  const sourceStripped = stripNamespace(source);
  const targetStripped = stripNamespace(target);
  key = `${sourceStripped}→${targetStripped}`;
  if (rules[key]) return rules[key];

  return DEFAULT_RELATION;
}

function getCategory(relation: string): string {
  return RELATION_CATEGORIES[relation] || 'other';
}

function generateEdgeId(source: string, target: string, relation: string): string {
  return `${source}→${target}:${relation}`;
}

function addEdgeMetadata(jurisdiction: string, dryRun: boolean = false) {
  const processPath = path.join(__dirname, `../data/${jurisdiction}-processes.json`);

  if (!fs.existsSync(processPath)) {
    console.log(`⚠️  ${jurisdiction}-processes.json not found, skipping`);
    return;
  }

  const data: ProcessData = JSON.parse(fs.readFileSync(processPath, 'utf-8'));
  let edgeCount = 0;
  let updatedCount = 0;

  data.processes.forEach(process => {
    if (!process.edges) return;

    process.edges = process.edges.map(edge => {
      edgeCount++;

      // Infer relation if not present
      const relation = edge.relation || inferRelation(process.id, edge.source, edge.target);
      const category = edge.category || getCategory(relation);
      const id = edge.id || generateEdgeId(edge.source, edge.target, relation);

      // Check if we're adding new metadata
      if (!edge.id || !edge.relation || !edge.category) {
        updatedCount++;
      }

      return {
        ...edge,
        id,
        relation,
        category,
      };
    });
  });

  if (dryRun) {
    console.log(`   ${jurisdiction}: Would update ${updatedCount}/${edgeCount} edges`);
    if (updatedCount > 0) {
      const sampleEdge = data.processes
        .find(p => p.edges && p.edges.length > 0)
        ?.edges[0];
      console.log(`      Example: ${sampleEdge?.source} → ${sampleEdge?.target}`);
      console.log(`               id: ${sampleEdge?.id}`);
      console.log(`               relation: ${sampleEdge?.relation}`);
      console.log(`               category: ${sampleEdge?.category}`);
    }
    return;
  }

  // Create backup
  const backupPath = `${processPath}.backup-edges`;
  fs.copyFileSync(processPath, backupPath);

  // Write back
  fs.writeFileSync(processPath, JSON.stringify(data, null, 2));

  console.log(`✅ ${jurisdiction}: Updated ${updatedCount}/${edgeCount} edges`);
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

const JURISDICTIONS = ['city', 'state', 'federal'] as const;

console.log('='.repeat(60));
console.log('ADDING EDGE METADATA TO PROCESS FILES');
if (dryRun) {
  console.log('(DRY RUN - No changes will be made)');
}
console.log('='.repeat(60));
console.log();

for (const jurisdiction of JURISDICTIONS) {
  console.log(`📊 Processing ${jurisdiction}...`);
  addEdgeMetadata(jurisdiction, dryRun);
}

console.log('\n' + '='.repeat(60));
if (dryRun) {
  console.log('✅ DRY RUN COMPLETE - Run without --dry-run to apply');
} else {
  console.log('✅ EDGE METADATA COMPLETE');
  console.log('\nBackups created:');
  console.log('  - data/city-processes.json.backup-edges');
  console.log('  - data/state-processes.json.backup-edges');
  console.log('  - data/federal-processes.json.backup-edges');
  console.log('\nEdge metadata added:');
  console.log('  - id: source→target:relation format');
  console.log('  - relation: standardized relation type');
  console.log('  - category: visual encoding category');
}
console.log('='.repeat(60));
