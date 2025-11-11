#!/usr/bin/env node

// Check specific addresses for duplicates

import { initDb, closeDb } from './lib/seed-utils.js';
import { sql } from 'drizzle-orm';

async function checkAddress(db, addressPattern) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`CHECKING: ${addressPattern}`);
  console.log('='.repeat(80));

  const results = await db.execute(sql`
    SELECT
      job_number,
      job_type,
      job_status,
      address,
      bbl,
      completion_year,
      total_units,
      affordable_units,
      class_a_init,
      class_a_prop,
      class_a_net,
      units_co,
      building_type,
      physical_building_type,
      has_affordable_overlay,
      data_source
    FROM housing_buildings
    WHERE LOWER(address) LIKE LOWER(${`%${addressPattern}%`})
    ORDER BY completion_year, job_number
  `);

  const rows = Array.isArray(results) ? results : (results.rows || []);

  if (rows.length === 0) {
    console.log(`❌ No records found for "${addressPattern}"`);
    return;
  }

  console.log(`\n✅ Found ${rows.length} records:\n`);

  // Summary table
  console.log('Job Number    | Year | Type            | Units | BBL           | Job Type');
  console.log('--------------|------|-----------------|-------|---------------|----------');

  for (const row of rows) {
    console.log(
      `${row.job_number.padEnd(13)} | ` +
      `${row.completion_year} | ` +
      `${row.job_type.padEnd(15)} | ` +
      `${String(row.total_units).padStart(5)} | ` +
      `${(row.bbl || 'N/A').padEnd(13)} | ` +
      `${row.building_type}`
    );
  }

  // Detailed view
  console.log('\n--- DETAILED VIEW ---\n');

  for (const row of rows) {
    console.log(`Job: ${row.job_number} (${row.job_type})`);
    console.log(`  Address: ${row.address}`);
    console.log(`  BBL: ${row.bbl || 'N/A'}`);
    console.log(`  Completion Year: ${row.completion_year}`);
    console.log(`  Job Status: ${row.job_status || 'N/A'}`);
    console.log(`  Total Units: ${row.total_units}`);
    console.log(`  DCP Units: classAInit=${row.class_a_init}, classAProp=${row.class_a_prop}, classANet=${row.class_a_net}, unitsCO=${row.units_co}`);
    console.log(`  Affordable Units: ${row.affordable_units}`);
    console.log(`  Building Type: ${row.building_type}`);
    console.log(`  Physical Type: ${row.physical_building_type}`);
    console.log(`  Has Affordable Overlay: ${row.has_affordable_overlay}`);
    console.log(`  Data Source: ${row.data_source}`);
    console.log('');
  }

  // Analysis
  console.log('--- ANALYSIS ---');

  const uniqueBBLs = new Set(rows.map(r => r.bbl).filter(Boolean));
  console.log(`Unique BBLs: ${uniqueBBLs.size}`);

  if (uniqueBBLs.size === 1 && rows.length > 1) {
    console.log('⚠️  All records share the SAME BBL');

    // Check for potential duplicates
    const sameYearUnits = rows.reduce((acc, row) => {
      const key = `${row.completion_year}-${row.total_units}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const duplicates = Object.entries(sameYearUnits).filter(([_, count]) => count > 1);
    if (duplicates.length > 0) {
      console.log('❌ POTENTIAL DUPLICATES: Same year + same units:');
      for (const [key, count] of duplicates) {
        const [year, units] = key.split('-');
        console.log(`   - ${year}: ${units} units (${count} records)`);
      }
    } else {
      console.log('✅ Different years or unit counts - likely legitimate multiple jobs');
    }
  } else if (uniqueBBLs.size > 1) {
    console.log('✅ Different BBLs - different buildings at same/similar address');
  }

  const totalUnits = rows.reduce((sum, r) => sum + r.total_units, 0);
  console.log(`Total units across all records: ${totalUnits}`);
}

async function main() {
  const { db, client } = initDb();

  try {
    // Check the addresses the user is concerned about
    await checkAddress(db, '227 CHERRY');
    await checkAddress(db, '250 SOUTH');
    await checkAddress(db, '250 WATER');

  } catch (error) {
    console.error('\n[ERROR]', error);
    process.exit(1);
  } finally {
    await closeDb(client);
  }
}

main();
