#!/usr/bin/env node

// Test different NYC Open Data DOB datasets to find the correct one

console.log('Testing NYC Open Data DOB datasets...\n');

const DOB_DATASETS = [
  {
    id: 'ic3t-wcy2',
    name: 'DOB Job Application Filings',
    url: 'https://data.cityofnewyork.us/resource/ic3t-wcy2.json'
  },
  {
    id: 'ipu4-2q9a',
    name: 'DOB NOW: Build - Approved Permits',
    url: 'https://data.cityofnewyork.us/resource/ipu4-2q9a.json'
  },
  {
    id: 'rbx6-tga4',
    name: 'DOB Permit Issuance',
    url: 'https://data.cityofnewyork.us/resource/rbx6-tga4.json'
  },
  {
    id: '83x8-shf7',
    name: 'DOB Job Application Filings (Older)',
    url: 'https://data.cityofnewyork.us/resource/83x8-shf7.json'
  }
];

async function testDataset(dataset) {
  console.log(`\n=== ${dataset.name} (${dataset.id}) ===`);
  console.log(`URL: ${dataset.url}`);

  try {
    // Test simple query
    const url = `${dataset.url}?$limit=5&$where=job_type IN ('NB') AND latest_action_date >= '2024-01-01T00:00:00'`;
    const response = await fetch(url);

    if (!response.ok) {
      console.log(`❌ HTTP ${response.status}: ${response.statusText}`);
      return;
    }

    const data = await response.json();
    console.log(`✓ Retrieved ${data.length} records`);

    if (data.length === 0) {
      console.log('  No records found with this query');
      return;
    }

    const record = data[0];
    console.log('\nFirst record structure:');
    console.log('  Fields:', Object.keys(record).slice(0, 20).join(', '));

    // Check critical fields
    const hasJobNum = record.job_ !== undefined || record.job || record.job_filing_number || record.job_number;
    const hasCoords = (record.latitude !== undefined && record.longitude !== undefined) ||
                     (record.gis_latitude !== undefined && record.gis_longitude !== undefined);
    const hasUnits = record.proposed_dwelling_units !== undefined || record.dwelling_units !== undefined;
    const hasStatus = record.job_status_descrp !== undefined || record.status !== undefined;
    const hasDate = record.signoff_date !== undefined || record.issuance_date !== undefined || record.latest_action_date !== undefined;

    console.log('\nCritical fields check:');
    console.log(`  Job Number: ${hasJobNum ? '✓' : '❌'}`);
    console.log(`  Coordinates: ${hasCoords ? '✓' : '❌'}`);
    console.log(`  Dwelling Units: ${hasUnits ? '✓' : '❌'}`);
    console.log(`  Status: ${hasStatus ? '✓' : '❌'}`);
    console.log(`  Date fields: ${hasDate ? '✓' : '❌'}`);

    if (hasJobNum && hasCoords && hasUnits) {
      console.log('\n✅ This dataset looks GOOD - has all critical fields!');
    }

    // Show sample values
    console.log('\nSample values:');
    if (hasJobNum) console.log(`  Job: ${record.job_ || record.job || record.job_filing_number || record.job_number}`);
    if (hasCoords) console.log(`  Coords: ${record.latitude || record.gis_latitude}, ${record.longitude || record.gis_longitude}`);
    if (hasUnits) console.log(`  Units: ${record.proposed_dwelling_units || record.dwelling_units}`);
    if (hasStatus) console.log(`  Status: ${record.job_status_descrp || record.status}`);

  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

async function main() {
  for (const dataset of DOB_DATASETS) {
    await testDataset(dataset);
    await new Promise(resolve => setTimeout(resolve, 500)); // Rate limit
  }

  console.log('\n' + '='.repeat(60));
  console.log('RECOMMENDATION: Use the dataset marked with ✅ above');
  console.log('='.repeat(60) + '\n');
}

main();
