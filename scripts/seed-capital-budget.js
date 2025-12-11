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
 * Calculate centroid of a GeoJSON geometry (Polygon or MultiPolygon)
 * Uses simple average of all coordinates (not true centroid, but fast and sufficient for visualization)
 */
function calculateCentroid(geometry) {
  if (!geometry || !geometry.coordinates) {
    return [0, 0];
  }

  let totalX = 0;
  let totalY = 0;
  let totalPoints = 0;

  const processRing = (ring) => {
    for (const [lon, lat] of ring) {
      totalX += lon;
      totalY += lat;
      totalPoints++;
    }
  };

  if (geometry.type === 'Polygon') {
    processRing(geometry.coordinates[0]); // Outer ring only
  } else if (geometry.type === 'MultiPolygon') {
    for (const polygon of geometry.coordinates) {
      processRing(polygon[0]); // Outer ring of each polygon
    }
  } else if (geometry.type === 'Point') {
    return geometry.coordinates;
  }

  return totalPoints > 0
    ? [totalX / totalPoints, totalY / totalPoints]
    : [0, 0];
}

/**
 * Douglas-Peucker line simplification algorithm
 * Reduces coordinate count while preserving shape
 *
 * @param coords - Array of [lon, lat] coordinates
 * @param tolerance - Distance tolerance in degrees (~0.0001 = 11 meters at NYC latitude)
 */
function simplifyLine(coords, tolerance = 0.0001) {
  if (coords.length <= 2) return coords;

  // Find point with max distance from line between first and last
  let maxDist = 0;
  let maxIdx = 0;
  const [x1, y1] = coords[0];
  const [x2, y2] = coords[coords.length - 1];
  const lineLengthSq = (y2 - y1) ** 2 + (x2 - x1) ** 2;

  // Handle case where first and last points are the same (closed ring)
  if (lineLengthSq === 0) {
    // Find point furthest from the start point
    for (let i = 1; i < coords.length - 1; i++) {
      const [x0, y0] = coords[i];
      const dist = Math.sqrt((x0 - x1) ** 2 + (y0 - y1) ** 2);
      if (dist > maxDist) {
        maxDist = dist;
        maxIdx = i;
      }
    }
  } else {
    for (let i = 1; i < coords.length - 1; i++) {
      const [x0, y0] = coords[i];
      // Perpendicular distance to line
      const dist = Math.abs((y2 - y1) * x0 - (x2 - x1) * y0 + x2 * y1 - y2 * x1) /
                   Math.sqrt(lineLengthSq);
      if (dist > maxDist) {
        maxDist = dist;
        maxIdx = i;
      }
    }
  }

  if (maxDist > tolerance) {
    // Recursively simplify
    const left = simplifyLine(coords.slice(0, maxIdx + 1), tolerance);
    const right = simplifyLine(coords.slice(maxIdx), tolerance);
    return [...left.slice(0, -1), ...right];
  }

  return [coords[0], coords[coords.length - 1]];
}

/**
 * Simplify a GeoJSON geometry using Douglas-Peucker algorithm
 */
function simplifyGeometry(geometry, tolerance = 0.0001) {
  if (!geometry) return null;

  if (geometry.type === 'Polygon') {
    return {
      type: 'Polygon',
      coordinates: geometry.coordinates.map(ring => {
        const simplified = simplifyLine(ring, tolerance);
        // Ensure ring has at least 4 points (GeoJSON requirement for polygons)
        return simplified.length >= 4 ? simplified : ring;
      }),
    };
  }

  if (geometry.type === 'MultiPolygon') {
    return {
      type: 'MultiPolygon',
      coordinates: geometry.coordinates.map(polygon =>
        polygon.map(ring => {
          const simplified = simplifyLine(ring, tolerance);
          return simplified.length >= 4 ? simplified : ring;
        })
      ),
    };
  }

  // Points and other types don't need simplification
  return geometry;
}

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

      // Pre-computed centroid for faster rendering (Phase 2.1)
      centroidLon: calculateCentroid(feature.geometry)[0],
      centroidLat: calculateCentroid(feature.geometry)[1],

      // Simplified geometry for faster API responses (Phase 2.2)
      geometrySimplified: simplifyGeometry(feature.geometry, 0.0001),

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
