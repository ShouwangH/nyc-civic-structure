#!/usr/bin/env node

// Diagnostic to understand DOB API data and why we're getting so few records

console.log('Testing different DOB API queries...\n');

const DOB_API = 'https://data.cityofnewyork.us/resource/ic3t-wcy2.json';

async function testQuery(description, params) {
  console.log(`\n=== ${description} ===`);
  const queryParams = new URLSearchParams(params);
  const url = `${DOB_API}?${queryParams}`;
  console.log('URL:', url);

  try {
    const response = await fetch(url);
    const data = await response.json();
    console.log('Records returned:', data.length);

    if (data.length > 0) {
      console.log('\nFirst record fields:');
      const record = data[0];
      const dateFields = [
        'pre_filing_date',
        'approved_date',
        'fully_permitted_date',
        'job_start_date',
        'signoff_date',
        'latest_action_date',
        'fully_paid_date',
        'job_status_descrp'
      ];

      for (const field of dateFields) {
        if (record[field] !== undefined) {
          console.log(`  ${field}: ${record[field]}`);
        }
      }

      console.log(`  job_type: ${record.job_type}`);
      console.log(`  job_: ${record.job_}`);
      console.log(`  borough: ${record.borough}`);
      console.log(`  latitude: ${record.latitude}`);
      console.log(`  longitude: ${record.longitude}`);
      console.log(`  proposed_dwelling_units: ${record.proposed_dwelling_units}`);
      console.log(`  existing_dwelling_units: ${record.existing_dwelling_units}`);
    }

    return data.length;
  } catch (error) {
    console.error('Error:', error.message);
    return 0;
  }
}

async function main() {
  // Test 1: Current query (latest_action_date)
  const count1 = await testQuery(
    'CURRENT QUERY: latest_action_date >= 2014',
    {
      '$limit': '100',
      '$where': "job_type IN ('A1', 'A2', 'A3', 'NB') AND latest_action_date >= '2014-01-01T00:00:00'",
      '$order': 'latest_action_date DESC'
    }
  );

  // Test 2: Use signoff_date instead (completion date)
  const count2 = await testQuery(
    'TEST QUERY: signoff_date >= 2014',
    {
      '$limit': '100',
      '$where': "job_type IN ('A1', 'A2', 'A3', 'NB') AND signoff_date >= '2014-01-01T00:00:00'",
      '$order': 'signoff_date DESC'
    }
  );

  // Test 3: Use approved_date
  const count3 = await testQuery(
    'TEST QUERY: approved_date >= 2014',
    {
      '$limit': '100',
      '$where': "job_type IN ('A1', 'A2', 'A3', 'NB') AND approved_date >= '2014-01-01T00:00:00'",
      '$order': 'approved_date DESC'
    }
  );

  // Test 4: Just job type filter (no date filter)
  const count4 = await testQuery(
    'TEST QUERY: No date filter, just job types',
    {
      '$limit': '100',
      '$where': "job_type IN ('A1', 'A2', 'A3', 'NB')",
      '$order': 'job_ DESC'
    }
  );

  // Test 5: New Buildings only with signoff_date
  const count5 = await testQuery(
    'TEST QUERY: NB only with signoff_date >= 2014',
    {
      '$limit': '100',
      '$where': "job_type = 'NB' AND signoff_date >= '2014-01-01T00:00:00'",
      '$order': 'signoff_date DESC'
    }
  );

  console.log('\n=== SUMMARY ===');
  console.log(`Current query (latest_action_date): ${count1} records`);
  console.log(`Using signoff_date: ${count2} records`);
  console.log(`Using approved_date: ${count3} records`);
  console.log(`No date filter: ${count4} records`);
  console.log(`NB only with signoff_date: ${count5} records`);

  console.log('\n=== RECOMMENDATION ===');
  if (count2 > count1) {
    console.log('✓ Switch to signoff_date - it returns more completed buildings');
  } else if (count3 > count1) {
    console.log('✓ Switch to approved_date - it returns more records');
  } else if (count4 > count1) {
    console.log('✓ Remove date filter from API query, filter during processing instead');
  }
  console.log('');
}

main();
