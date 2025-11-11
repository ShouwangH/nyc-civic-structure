#!/usr/bin/env node

import { initDb, closeDb } from './lib/seed-utils.js';
import { sql } from 'drizzle-orm';

async function main() {
  const { db, client } = initDb();

  try {
    console.log('=== TOP 20 ALTERATIONS BY UNIT COUNT ===\n');

    const result = await db.execute(sql`
      SELECT
        job_number,
        name,
        total_units,
        class_a_net,
        units_co,
        completion_year
      FROM housing_buildings
      WHERE job_type = 'Alteration'
      ORDER BY total_units DESC
      LIMIT 20
    `);

    const rows = Array.isArray(result) ? result : (result.rows || []);

    console.log('Units | ClassANet | UnitsCO | Year | Address');
    console.log('------|-----------|---------|------|----------');

    for (const r of rows) {
      console.log(
        `${String(r.total_units).padStart(5)} | ` +
        `${String(r.class_a_net || 'null').padStart(9)} | ` +
        `${String(r.units_co || 'null').padStart(7)} | ` +
        `${r.completion_year} | ` +
        `${r.name.substring(0, 40)}`
      );
    }

    // Check average alteration size
    const stats = await db.execute(sql`
      SELECT
        COUNT(*) as count,
        AVG(total_units) as avg_units,
        MIN(total_units) as min_units,
        MAX(total_units) as max_units,
        SUM(total_units) as sum_units
      FROM housing_buildings
      WHERE job_type = 'Alteration'
    `);

    const statsRows = Array.isArray(stats) ? stats : (stats.rows || []);
    const s = statsRows[0];

    console.log('\n=== ALTERATION STATISTICS ===');
    console.log(`Total Alterations: ${s.count}`);
    console.log(`Average Units/Alteration: ${parseFloat(s.avg_units).toFixed(2)}`);
    console.log(`Min Units: ${s.min_units}`);
    console.log(`Max Units: ${s.max_units}`);
    console.log(`Total Units: ${s.sum_units}`);

  } catch (error) {
    console.error('\n[ERROR]', error);
    process.exit(1);
  } finally {
    await closeDb(client);
  }
}

main();
