#!/usr/bin/env node

// ABOUTME: Seed script for capital budget data - fetches CPDB from NYC Open Data and stores in database
// ABOUTME: Replicates processing from server/routes/capital-budget.ts but stores results

import { capitalProjects } from '../server/lib/schema.ts';
import {
  initDb,
  closeDb,
  fetchNycOpenData,
  batchInsert,
  clearTable,
  timer,
  formatNumber,
} from './lib/seed-utils.js';

// NYC Open Data API endpoint
const CPDB_API = 'https://data.cityofnewyork.us/resource/9jkp-n57r.geojson';

/**
 * Process CPDB GeoJSON records
 */
function processCapitalProjects(features) {
  console.log('[Process] Processing capital projects...');

  const projects = [];

  for (const feature of features) {
    const props = feature.properties;

    // Parse fiscal year from mindate
    const fiscalYear = props.mindate
      ? parseInt(props.mindate.substring(0, 4), 10)
      : null;

    // Parse completion year from maxdate
    const completionYear = props.maxdate
      ? parseInt(props.maxdate.substring(0, 4), 10)
      : null;

    // Data correction: Fix erroneous 100 billion value (should be 100 million)
    let allocateTotal = parseFloat(props.allocate_total || '0');
    if (allocateTotal >= 99e9 && allocateTotal <= 101e9) {
      allocateTotal = 100e6; // Correct to 100 million
    }

    const project = {
      id: props.maprojid || `project-${Math.random().toString(36).substr(2, 9)}`,
      maprojid: props.maprojid || 'Unknown',
      description: props.description || 'Unnamed Project',

      managingAgency: props.magencyname || 'Unknown Agency',
      managingAgencyAcronym: props.magencyacro || 'N/A',

      typeCategory: props.typecategory || 'Unknown',

      minDate: props.mindate || null,
      maxDate: props.maxdate || null,
      fiscalYear,
      completionYear,

      allocateTotal,
      commitTotal: parseFloat(props.commit_total || '0'),
      spentTotal: parseFloat(props.spent_total || '0'),
      plannedCommitTotal: parseFloat(props.plannedcommit_total || '0'),

      // Store geometry as JSONB (PostGIS-compatible GeoJSON)
      geometry: feature.geometry,

      lastSyncedAt: new Date(),
    };

    projects.push(project);
  }

  console.log(`[Process] Processed ${formatNumber(projects.length)} capital projects\n`);
  return projects;
}

/**
 * Main seed function
 */
async function main() {
  const t = timer();

  console.log('========================================');
  console.log('   NYC CAPITAL BUDGET SEED SCRIPT      ');
  console.log('========================================\n');

  // Initialize database
  const { db, client } = initDb();

  try {
    // Step 1: Clear existing data
    await clearTable(db, 'capital_projects', 'capital_projects');

    // Step 2: Fetch CPDB data (GeoJSON format)
    console.log('--- STEP 1: Fetch Capital Projects Data ---\n');

    // Fetch active/future projects with allocated budgets
    const url = `${CPDB_API}?$where=maxdate>='2025-01-01' AND allocate_total>0&$limit=10000`;

    console.log(`[Fetch] Fetching from: ${CPDB_API}`);
    console.log(`[Fetch] Filter: maxdate>='2025-01-01' AND allocate_total>0\n`);

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const geojson = await response.json();
    const features = geojson.features || [];

    console.log(`[Fetch] Retrieved ${formatNumber(features.length)} projects\n`);

    // Step 3: Process projects
    console.log('--- STEP 2: Process Capital Projects ---\n');
    const projects = processCapitalProjects(features);

    // Step 4: Insert into database
    console.log('--- STEP 3: Insert into Database ---\n');
    await batchInsert(db, capitalProjects, projects, {
      batchSize: 500,
      label: 'capital projects',
    });

    // Summary
    console.log('========================================');
    console.log('           SEED SUMMARY                 ');
    console.log('========================================');
    console.log(`Capital Projects: ${formatNumber(projects.length)}`);
    console.log(`Total Budget Allocated: $${formatNumber(projects.reduce((sum, p) => sum + p.allocateTotal, 0).toFixed(0))}`);
    console.log(`Total Time: ${t.stop()}`);
    console.log('========================================\n');

  } catch (error) {
    console.error('\n[ERROR] Seed failed:', error);
    process.exit(1);
  } finally {
    await closeDb(client);
  }
}

// Run the seed script
main();
