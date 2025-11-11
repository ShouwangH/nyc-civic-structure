#!/usr/bin/env node

// Test DCP ArcGIS Housing Database to understand its structure

const HOUSING_DATABASE_URL = 'https://services5.arcgis.com/GfwWNkhOj9bNBqoJ/ArcGIS/rest/services/Housing_Database/FeatureServer/0';

async function exploreHousingDatabase() {
  console.log('=== DCP HOUSING DATABASE EXPLORER ===\n');

  // 1. Get metadata about the service
  console.log('Fetching service metadata...');
  const metadataUrl = `${HOUSING_DATABASE_URL}?f=json`;

  try {
    const metaResponse = await fetch(metadataUrl);
    const metadata = await metaResponse.json();

    console.log('\nService Info:');
    console.log('  Name:', metadata.name);
    console.log('  Type:', metadata.type);
    console.log('  Geometry Type:', metadata.geometryType);

    if (metadata.fields) {
      console.log('\nAvailable Fields:');
      for (const field of metadata.fields.slice(0, 30)) {
        console.log(`  - ${field.name} (${field.type}): ${field.alias || 'no alias'}`);
      }
      console.log(`  ... and ${metadata.fields.length - 30} more fields`);
    }

    // 2. Fetch sample records
    console.log('\n\nFetching sample records...');
    const queryUrl = `${HOUSING_DATABASE_URL}/query?where=1=1&outFields=*&resultRecordCount=5&f=json`;

    const queryResponse = await fetch(queryUrl);
    const queryResult = await queryResponse.json();

    console.log(`\nRecords returned: ${queryResult.features?.length || 0}`);

    if (queryResult.features && queryResult.features.length > 0) {
      const firstRecord = queryResult.features[0];

      console.log('\nFirst Record Structure:');
      console.log('Attributes:', Object.keys(firstRecord.attributes).slice(0, 20).join(', '));
      console.log('Geometry:', firstRecord.geometry ? 'Present' : 'None');

      console.log('\nSample Data from First Record:');
      const attrs = firstRecord.attributes;

      // Look for key fields
      const keyFields = [
        'project_id', 'project_name', 'building_id',
        'bbl', 'bin', 'address', 'borough',
        'latitude', 'longitude',
        'total_units', 'counted_units', 'all_counted_units',
        'affordable_units', 'extremely_low_income_units', 'very_low_income_units',
        'completion_date', 'building_completion_date', 'reporting_construction_type',
        'construction_type', 'extended_affordability_only',
        'yearbuilt', 'status'
      ];

      for (const field of keyFields) {
        if (attrs[field] !== undefined) {
          console.log(`  ${field}: ${attrs[field]}`);
        }
      }

      console.log('\nGeometry:');
      if (firstRecord.geometry) {
        console.log('  Type:', firstRecord.geometry.x ? 'Point' : 'Other');
        if (firstRecord.geometry.x) {
          console.log('  X (lon):', firstRecord.geometry.x);
          console.log('  Y (lat):', firstRecord.geometry.y);
        }
      }
    }

    // 3. Count total records
    console.log('\n\nCounting total records...');
    const countUrl = `${HOUSING_DATABASE_URL}/query?where=1=1&returnCountOnly=true&f=json`;
    const countResponse = await fetch(countUrl);
    const countResult = await countResponse.json();
    console.log('Total records:', countResult.count);

    // 4. Test filtering by date
    console.log('\n\nTesting date filters...');
    const dateFilterUrl = `${HOUSING_DATABASE_URL}/query?where=building_completion_date>='2020-01-01'&returnCountOnly=true&f=json`;
    const dateResponse = await fetch(dateFilterUrl);
    const dateResult = await dateResponse.json();
    console.log('Records with completion_date >= 2020:', dateResult.count);

    console.log('\n=== EXPLORER COMPLETE ===\n');

  } catch (error) {
    console.error('Error:', error.message);
  }
}

exploreHousingDatabase();
