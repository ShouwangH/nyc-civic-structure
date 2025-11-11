#!/usr/bin/env node

// Quick housing data verification script

import { initDb, closeDb, formatNumber } from './lib/seed-utils.js';
import { sql } from 'drizzle-orm';

async function main() {
  const { db, client } = initDb();

  try {
    console.log('===================================');
    console.log('   HOUSING DATA VERIFICATION      ');
    console.log('===================================\n');

    // Total count
    const count = await db.execute(sql`SELECT COUNT(*) as count FROM housing_buildings`);
    console.log(`Total Buildings: ${formatNumber(count.rows[0].count)}\n`);

    // By year with units
    const byYear = await db.execute(sql`
      SELECT
        completion_year as year,
        COUNT(*) as buildings,
        SUM(total_units) as units,
        SUM(affordable_units) as affordable
      FROM housing_buildings
      WHERE completion_year >= 2014 AND completion_year <= 2025
      GROUP BY completion_year
      ORDER BY completion_year DESC
    `);

    console.log('Year | Buildings | Total Units | Affordable Units');
    console.log('-----|-----------|-------------|------------------');
    let totalBuildings = 0;
    let totalUnits = 0;
    let totalAffordable = 0;

    for (const row of byYear.rows) {
      totalBuildings += parseInt(row.buildings);
      totalUnits += parseInt(row.units || 0);
      totalAffordable += parseInt(row.affordable || 0);
      console.log(
        `${row.year} | ${String(row.buildings).padStart(9)} | ` +
        `${formatNumber(row.units || 0).padStart(11)} | ${formatNumber(row.affordable || 0).padStart(16)}`
      );
    }

    console.log('-----|-----------|-------------|------------------');
    console.log(
      `TOTAL | ${String(totalBuildings).padStart(9)} | ` +
      `${formatNumber(totalUnits).padStart(11)} | ${formatNumber(totalAffordable).padStart(16)}`
    );

    const affordablePct = totalUnits > 0 ? ((totalAffordable / totalUnits) * 100).toFixed(1) : 0;
    console.log(`\nAffordable Percentage: ${affordablePct}%`);

    // By borough
    const byBorough = await db.execute(sql`
      SELECT
        borough,
        COUNT(*) as buildings,
        SUM(total_units) as units
      FROM housing_buildings
      GROUP BY borough
      ORDER BY units DESC NULLS LAST
    `);

    console.log('\n=== BY BOROUGH ===');
    console.log('Borough        | Buildings | Total Units');
    console.log('---------------|-----------|------------');
    for (const row of byBorough.rows) {
      console.log(
        `${(row.borough || 'Unknown').padEnd(14)} | ${String(row.buildings).padStart(9)} | ${formatNumber(row.units || 0).padStart(11)}`
      );
    }

    // Data quality
    const quality = await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE latitude IS NULL OR longitude IS NULL) as missing_coords,
        COUNT(*) FILTER (WHERE total_units = 0) as zero_units,
        COUNT(*) FILTER (WHERE bbl IS NULL) as missing_bbl
      FROM housing_buildings
    `);

    console.log('\n=== DATA QUALITY ===');
    console.log('Missing Coordinates:', quality.rows[0].missing_coords);
    console.log('Zero Units:', quality.rows[0].zero_units);
    console.log('Missing BBL:', quality.rows[0].missing_bbl);

    console.log('\n===================================\n');

  } catch (error) {
    console.error('\n[ERROR]', error);
    process.exit(1);
  } finally {
    await closeDb(client);
  }
}

main();
