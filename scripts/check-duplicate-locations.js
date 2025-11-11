#!/usr/bin/env node

// Check for duplicate buildings at the same location

import { initDb, closeDb, formatNumber } from './lib/seed-utils.js';
import { sql } from 'drizzle-orm';

async function main() {
  const { db, client } = initDb();

  try {
    console.log('=== CHECKING FOR DUPLICATE LOCATIONS ===\n');

    // Find locations with multiple buildings (same lat/long)
    const duplicates = await db.execute(sql`
      SELECT
        longitude,
        latitude,
        COUNT(*) as building_count,
        SUM(total_units) as total_units,
        STRING_AGG(job_number, ', ') as job_numbers,
        STRING_AGG(job_type, ', ') as job_types,
        STRING_AGG(completion_year::text, ', ') as years
      FROM housing_buildings
      GROUP BY longitude, latitude
      HAVING COUNT(*) > 1
      ORDER BY COUNT(*) DESC
      LIMIT 50
    `);

    const rows = Array.isArray(duplicates) ? duplicates : (duplicates.rows || []);

    console.log(`Found ${rows.length} locations with multiple buildings\n`);

    if (rows.length === 0) {
      console.log('✅ No duplicate locations found!');
    } else {
      console.log('Location (Lat, Long) | Buildings | Total Units | Job Numbers');
      console.log('---------------------|-----------|-------------|-------------');

      let totalDuplicateBuildings = 0;
      let totalDuplicateUnits = 0;

      for (const row of rows.slice(0, 20)) {
        totalDuplicateBuildings += parseInt(row.building_count);
        totalDuplicateUnits += parseInt(row.total_units || 0);

        console.log(
          `(${row.latitude}, ${row.longitude}) | ` +
          `${String(row.building_count).padStart(9)} | ` +
          `${String(row.total_units || 0).padStart(11)} | ` +
          `${row.job_numbers.substring(0, 40)}...`
        );
      }

      console.log('\n--- Sample Details ---');
      const sample = rows[0];
      console.log(`Location: ${sample.latitude}, ${sample.longitude}`);
      console.log(`Buildings: ${sample.building_count}`);
      console.log(`Job Numbers: ${sample.job_numbers}`);
      console.log(`Job Types: ${sample.job_types}`);
      console.log(`Years: ${sample.years}`);

      // Get detailed info for this location
      const details = await db.execute(sql`
        SELECT
          job_number,
          job_type,
          name,
          address,
          completion_year,
          total_units,
          bbl
        FROM housing_buildings
        WHERE latitude = ${sample.latitude} AND longitude = ${sample.longitude}
        ORDER BY completion_year
      `);

      const detailRows = Array.isArray(details) ? details : (details.rows || []);
      console.log('\nDetailed view of first duplicate location:');
      for (const d of detailRows) {
        console.log(`  ${d.completion_year} | ${d.job_type.padEnd(15)} | ${d.total_units} units | ${d.job_number} | ${d.address}`);
      }

      // Check if same BBL
      const uniqueBBLs = new Set(detailRows.map(d => d.bbl).filter(Boolean));
      console.log(`\nUnique BBLs at this location: ${uniqueBBLs.size}`);
      if (uniqueBBLs.size === 1) {
        console.log('⚠️  All buildings at this location have the SAME BBL - possible duplicates!');
      } else {
        console.log('✅ Different BBLs - multiple buildings at same address is normal');
      }

      console.log('\n--- Summary ---');
      console.log(`Total locations with duplicates: ${rows.length}`);
      console.log(`Total buildings at duplicate locations: ${totalDuplicateBuildings}`);
      console.log(`Total units at duplicate locations: ${totalDuplicateUnits}`);
    }

    // Check for exact duplicate job data (same BBL + same year + same units)
    console.log('\n\n=== CHECKING FOR POTENTIAL EXACT DUPLICATES ===\n');

    const exactDuplicates = await db.execute(sql`
      SELECT
        bbl,
        completion_year,
        total_units,
        COUNT(*) as count,
        STRING_AGG(job_number, ', ') as job_numbers,
        STRING_AGG(job_type, ', ') as job_types
      FROM housing_buildings
      WHERE bbl IS NOT NULL
      GROUP BY bbl, completion_year, total_units
      HAVING COUNT(*) > 1
      ORDER BY COUNT(*) DESC
      LIMIT 20
    `);

    const exactRows = Array.isArray(exactDuplicates) ? exactDuplicates : (exactDuplicates.rows || []);

    if (exactRows.length === 0) {
      console.log('✅ No exact duplicates found (same BBL + year + units)!');
    } else {
      console.log(`⚠️  Found ${exactRows.length} potential exact duplicates:\n`);
      console.log('BBL | Year | Units | Count | Job Numbers');
      console.log('------------|------|-------|-------|-------------');

      for (const row of exactRows) {
        console.log(
          `${row.bbl} | ${row.completion_year} | ${String(row.total_units).padStart(5)} | ` +
          `${String(row.count).padStart(5)} | ${row.job_numbers}`
        );
      }
    }

  } catch (error) {
    console.error('\n[ERROR]', error);
    process.exit(1);
  } finally {
    await closeDb(client);
  }
}

main();
