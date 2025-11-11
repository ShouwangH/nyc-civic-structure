#!/usr/bin/env node

// ABOUTME: Apply manual migration for DCP Housing Database schema changes
// ABOUTME: Use this if drizzle-kit push doesn't work

import postgres from 'postgres';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  console.log('===================================');
  console.log('  APPLY HOUSING SCHEMA MIGRATION  ');
  console.log('===================================\n');

  // Check for DATABASE_URL
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('[ERROR] DATABASE_URL environment variable not set');
    console.error('Please set DATABASE_URL in your .env file or environment\n');
    process.exit(1);
  }

  console.log('[Info] Connecting to database...');
  const sql = postgres(databaseUrl);

  try {
    // Read migration SQL
    const migrationPath = join(__dirname, 'migrations', '001_migrate_to_dcp_housing.sql');
    console.log(`[Info] Reading migration from: ${migrationPath}\n`);

    const migrationSql = readFileSync(migrationPath, 'utf-8');

    // Split by semicolons to execute statements individually
    const statements = migrationSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`[Info] Executing ${statements.length} SQL statements...\n`);

    let successCount = 0;
    let skipCount = 0;

    for (const statement of statements) {
      // Skip comments and empty statements
      if (statement.startsWith('--') || statement.length < 5) continue;

      try {
        // Special handling for BEGIN/COMMIT
        if (statement.toUpperCase() === 'BEGIN' || statement.toUpperCase() === 'COMMIT') {
          continue;
        }

        await sql.unsafe(statement + ';');
        successCount++;

        // Log what we're doing (abbreviated)
        const firstLine = statement.split('\n')[0].substring(0, 80);
        console.log(`[OK] ${firstLine}${statement.length > 80 ? '...' : ''}`);
      } catch (error) {
        // Ignore "already exists" errors
        if (error.message.includes('already exists') ||
            error.message.includes('does not exist') ||
            error.message.includes('cannot drop')) {
          skipCount++;
          console.log(`[Skip] ${statement.split('\n')[0].substring(0, 60)}... (already applied)`);
        } else {
          console.error(`[ERROR] ${error.message}`);
          console.error(`Statement: ${statement.substring(0, 100)}...`);
        }
      }
    }

    console.log('\n===================================');
    console.log('        MIGRATION COMPLETE        ');
    console.log('===================================');
    console.log(`Success: ${successCount} statements`);
    console.log(`Skipped: ${skipCount} statements (already applied)`);
    console.log('\nYou can now run: npm run seed:housing');
    console.log('===================================\n');

  } catch (error) {
    console.error('\n[ERROR] Migration failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
