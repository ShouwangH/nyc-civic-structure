#!/usr/bin/env node

// Diagnostic script to understand why DOB records are being filtered out

import { fetchNycOpenData } from './lib/seed-utils.js';

const DOB_API = 'https://data.cityofnewyork.us/resource/ic3t-wcy2.json';

async function diagnose() {
  console.log('Fetching DOB records...\n');

  const dobRecords = await fetchNycOpenData(DOB_API, {
    limit: 100, // Get more for diagnosis
    where: "job_type IN ('A1', 'A2', 'A3', 'NB') AND latest_action_date >= '2014-01-01T00:00:00'",
    order: 'latest_action_date DESC',
  });

  console.log(`Fetched ${dobRecords.length} DOB records\n`);

  if (dobRecords.length === 0) {
    console.log('No records returned from API. Check the query.');
    return;
  }

  // Sample first 10 records
  console.log('=== SAMPLE RECORDS ===\n');
  const sample = dobRecords.slice(0, 10);

  for (let i = 0; i < sample.length; i++) {
    const record = sample[i];
    console.log(`Record ${i + 1}:`);
    console.log('  Job Number:', record.job_);
    console.log('  Job Type:', record.job_type);
    console.log('  Latest Action Date:', record.latest_action_date);
    console.log('  Latitude:', record.latitude);
    console.log('  Longitude:', record.longitude);
    console.log('  Borough:', record.borough);
    console.log('  Proposed Dwelling Units:', record.proposed_dwelling_units);
    console.log('  Existing Dwelling Units:', record.existing_dwelling_units);

    // Check each filter
    const hasDate = !!record.latest_action_date;
    const year = hasDate ? new Date(record.latest_action_date).getFullYear() : null;
    const inYearRange = year && year >= 2014 && year <= 2025;
    const lat = parseFloat(record.latitude);
    const lon = parseFloat(record.longitude);
    const hasCoords = !isNaN(lat) && !isNaN(lon);
    const totalUnits = parseInt(record.proposed_dwelling_units || record.existing_dwelling_units || 0, 10);
    const hasUnits = totalUnits > 0;

    console.log('\n  Filter checks:');
    console.log('    Has date:', hasDate);
    console.log('    Year:', year, '(in range:', inYearRange + ')');
    console.log('    Has coordinates:', hasCoords, `(${lat}, ${lon})`);
    console.log('    Has units:', hasUnits, `(${totalUnits} units)`);
    console.log('    WOULD PASS:', hasDate && inYearRange && hasCoords && hasUnits);
    console.log('');
  }

  // Summary statistics
  let rejectNoDate = 0;
  let rejectBadYear = 0;
  let rejectNoCoords = 0;
  let rejectNoUnits = 0;
  let accepted = 0;

  for (const record of dobRecords) {
    const hasDate = !!record.latest_action_date;
    if (!hasDate) {
      rejectNoDate++;
      continue;
    }

    const year = new Date(record.latest_action_date).getFullYear();
    if (year < 2014 || year > 2025) {
      rejectBadYear++;
      continue;
    }

    const lat = parseFloat(record.latitude);
    const lon = parseFloat(record.longitude);
    if (isNaN(lat) || isNaN(lon)) {
      rejectNoCoords++;
      continue;
    }

    const totalUnits = parseInt(record.proposed_dwelling_units || record.existing_dwelling_units || 0, 10);
    if (totalUnits === 0) {
      rejectNoUnits++;
      continue;
    }

    accepted++;
  }

  console.log('=== FILTER SUMMARY ===');
  console.log(`Total fetched: ${dobRecords.length}`);
  console.log(`Rejected (no date): ${rejectNoDate}`);
  console.log(`Rejected (year out of range): ${rejectBadYear}`);
  console.log(`Rejected (no coordinates): ${rejectNoCoords}`);
  console.log(`Rejected (no units): ${rejectNoUnits}`);
  console.log(`ACCEPTED: ${accepted}`);
  console.log('');

  if (accepted === 0) {
    console.log('⚠️  NO RECORDS PASSED ALL FILTERS!');
    console.log('\nMost common rejection reason:');
    const reasons = [
      { name: 'No date', count: rejectNoDate },
      { name: 'Bad year', count: rejectBadYear },
      { name: 'No coordinates', count: rejectNoCoords },
      { name: 'No units', count: rejectNoUnits },
    ].sort((a, b) => b.count - a.count);
    console.log(`  ${reasons[0].name}: ${reasons[0].count} records`);
  }
}

diagnose().catch(console.error);
