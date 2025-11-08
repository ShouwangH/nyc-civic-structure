#!/usr/bin/env node

// ABOUTME: Fetches NYC revenue data from Open Data API and generates sunburst visualization
// ABOUTME: Transforms revenue budget data into hierarchical sunburst format for D3 visualization

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, '../.env') });

const FISCAL_YEAR = '2025';
const DATASET_ID = 'ugzk-a6x4'; // Revenue Budget & Financial Plan
const API_BASE = `https://data.cityofnewyork.us/resource/${DATASET_ID}.json`;

// NYC Open Data credentials (not currently used - public API works without token)
// const APP_TOKEN = process.env.OD_KEY_ID;

// Revenue category hierarchy mapping
const REVENUE_HIERARCHY = {
  'Taxes': {
    subcategories: {
      'Real Estate Taxes': ['Real Property Tax', 'Property Tax'],
      'Sales and Use Taxes': ['Sales Tax', 'General Sales Tax', 'Commercial Rent Tax', 'Hotel Room Occupancy Tax'],
      'Income Taxes': ['Personal Income Tax', 'General Corporation Tax', 'Banking Corporation Tax', 'Unincorporated Business Tax'],
      'Other Taxes': ['Mortgage Recording Tax', 'Utility Tax', 'Commercial Rent', 'Cigarette Tax']
    }
  },
  'Categorical Aid': {
    subcategories: {
      'Federal Grants': ['Federal', 'Federal Aid'],
      'State Grants': ['State', 'State Aid'],
      'Non-Governmental Grants': ['Non-Governmental']
    }
  },
  'Unrestricted Aid': {
    subcategories: {
      'Intergovernmental Aid': ['Unrestricted Intergovernmental']
    }
  },
  'Charges for Services': {
    subcategories: {
      'Water and Sewer Charges': ['Water', 'Sewer'],
      'Other Service Charges': ['Licenses', 'Permits', 'Rental Income']
    }
  },
  'Investment Income': {
    subcategories: {}
  },
  'Other Revenues': {
    subcategories: {
      'Fines and Forfeitures': ['Fines', 'Forfeitures'],
      'Miscellaneous': ['Miscellaneous', 'Other']
    }
  }
};

async function fetchRevenueData() {
  console.log(`Fetching FY${FISCAL_YEAR} revenue data from NYC Open Data...`);

  // First, get the most recent publication date
  const dateResponse = await fetch(`${API_BASE}?fiscal_year=${FISCAL_YEAR}&$select=publication_date&$group=publication_date&$order=publication_date DESC&$limit=1`);
  const dateData = await dateResponse.json();
  const latestPublicationDate = dateData[0]?.publication_date;

  if (!latestPublicationDate) {
    throw new Error('Could not find publication date');
  }

  console.log(`Using most recent publication date: ${latestPublicationDate}`);

  const limit = 50000;
  let offset = 0;
  let allRecords = [];
  let hasMore = true;

  while (hasMore) {
    const params = new URLSearchParams({
      fiscal_year: FISCAL_YEAR,
      publication_date: latestPublicationDate,
      $limit: limit,
      $offset: offset,
      $order: 'revenue_source_name'
    });

    const url = `${API_BASE}?${params}`;
    console.log(`Fetching batch: offset=${offset}`);
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Failed URL: ${url}`);
      console.error(`Response status: ${response.status} ${response.statusText}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const records = await response.json();
    allRecords = allRecords.concat(records);

    if (records.length < limit) {
      hasMore = false;
    } else {
      offset += limit;
    }
  }

  console.log(`Fetched ${allRecords.length} revenue records`);
  return allRecords;
}

function categorizeRevenue(revenueName, categoryName) {
  const normalized = revenueName.toUpperCase();

  // Try to match to hierarchy
  for (const [mainCat, config] of Object.entries(REVENUE_HIERARCHY)) {
    for (const [subCat, keywords] of Object.entries(config.subcategories)) {
      for (const keyword of keywords) {
        if (normalized.includes(keyword.toUpperCase())) {
          return { main: mainCat, sub: subCat };
        }
      }
    }
  }

  // Fallback to category name if provided
  if (categoryName && categoryName.trim()) {
    return { main: 'Other Revenues', sub: 'Miscellaneous' };
  }

  return { main: 'Other Revenues', sub: 'Miscellaneous' };
}

function transformToSunburst(records) {
  console.log('Transforming data to sunburst format...');

  // Build hierarchy: Main Category → Subcategory → Revenue Source
  const hierarchy = new Map();
  let totalRevenue = 0;

  for (const record of records) {
    // Use current_modified_budget_amount as the primary value
    const amount = parseFloat(record.current_modified_budget_amount || record.adopted_budget_amount || 0);

    if (amount === 0) continue; // Skip zero amounts

    const revenueName = record.revenue_source_name || record.revenue_class_name || 'Unknown';
    const categoryName = record.revenue_category_name || '';

    const { main, sub } = categorizeRevenue(revenueName, categoryName);

    // Initialize hierarchy levels
    if (!hierarchy.has(main)) {
      hierarchy.set(main, new Map());
    }
    const mainCategory = hierarchy.get(main);

    if (!mainCategory.has(sub)) {
      mainCategory.set(sub, new Map());
    }
    const subCategory = mainCategory.get(sub);

    // Aggregate by revenue source name
    if (!subCategory.has(revenueName)) {
      subCategory.set(revenueName, 0);
    }
    subCategory.set(revenueName, subCategory.get(revenueName) + amount);

    totalRevenue += amount;
  }

  console.log(`Total revenue: $${(totalRevenue / 1e9).toFixed(2)}B`);
  console.log(`Main categories: ${hierarchy.size}`);

  // Build sunburst structure
  const children = [];

  for (const [mainName, subCategories] of hierarchy.entries()) {
    const mainChildren = [];

    for (const [subName, sources] of subCategories.entries()) {
      const sourceChildren = [];

      for (const [sourceName, amount] of sources.entries()) {
        sourceChildren.push({
          name: sourceName,
          value: Math.abs(amount),
          actualValue: amount,
          isNegative: amount < 0
        });
      }

      if (sourceChildren.length > 0) {
        mainChildren.push({
          name: subName,
          children: sourceChildren
        });
      }
    }

    if (mainChildren.length > 0) {
      children.push({
        name: mainName,
        children: mainChildren
      });
    }
  }

  return {
    meta: {
      source: `NYC Open Data - Revenue Budget & Financial Plan (Dataset: ${DATASET_ID})`,
      fiscal_year: parseInt(FISCAL_YEAR),
      fund_group: 'All Funds',
      total_revenue_billion: parseFloat((totalRevenue / 1e9).toFixed(2)),
      generated_at: new Date().toISOString()
    },
    data: {
      name: `NYC Revenue FY${FISCAL_YEAR}`,
      children
    }
  };
}

async function main() {
  try {
    const records = await fetchRevenueData();
    const sunburstData = transformToSunburst(records);

    const outputPath = path.join(__dirname, '../public/data/nyc_revenue_sunburst_fy2025_generated.json');
    fs.writeFileSync(outputPath, JSON.stringify(sunburstData, null, 2));

    console.log(`\n✓ Revenue sunburst saved to: ${outputPath}`);
    console.log(`  Total categories: ${sunburstData.data.children.length}`);
    console.log(`  Total revenue: $${sunburstData.meta.total_revenue_billion}B`);
  } catch (error) {
    console.error('Error generating revenue sunburst:', error);
    process.exit(1);
  }
}

main();
