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

// Map native Comptroller revenue categories to high-level groups
function getTopLevelCategory(comptrollerCategory) {
  const normalized = comptrollerCategory.toUpperCase();

  if (normalized.includes('TAXES')) {
    return 'Taxes';
  }
  if (normalized.includes('FEDERAL GRANTS') ||
      normalized.includes('STATE GRANTS') ||
      normalized.includes('NON-GOVERNMENTAL GRANTS')) {
    return 'Categorical Aid';
  }

  // Everything else: Charges, Fines, Interest, Misc, Unrestricted Aid, etc.
  return 'Other Revenue';
}

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

function transformToSunburst(records) {
  console.log('Transforming data to sunburst format...');

  // Build 4-level hierarchy: Top-Level → Category → Class → Source
  const hierarchy = new Map();
  let totalRevenue = 0;

  for (const record of records) {
    const amount = parseFloat(record.current_modified_budget_amount || record.adopted_budget_amount || 0);
    if (amount === 0) continue;

    // Use native Comptroller fields
    const comptrollerCategory = record.revenue_category_name || 'Unknown';
    const comptrollerClass = record.revenue_class_name || 'Unknown';
    const sourceName = record.revenue_source_name || 'Unknown';

    // Get top-level grouping
    const topLevel = getTopLevelCategory(comptrollerCategory);

    // Initialize hierarchy levels
    if (!hierarchy.has(topLevel)) {
      hierarchy.set(topLevel, new Map());
    }
    const topLevelMap = hierarchy.get(topLevel);

    if (!topLevelMap.has(comptrollerCategory)) {
      topLevelMap.set(comptrollerCategory, new Map());
    }
    const categoryMap = topLevelMap.get(comptrollerCategory);

    if (!categoryMap.has(comptrollerClass)) {
      categoryMap.set(comptrollerClass, new Map());
    }
    const classMap = categoryMap.get(comptrollerClass);

    // Aggregate by source
    if (!classMap.has(sourceName)) {
      classMap.set(sourceName, 0);
    }
    classMap.set(sourceName, classMap.get(sourceName) + amount);

    totalRevenue += amount;
  }

  console.log(`Total revenue: $${(totalRevenue / 1e9).toFixed(2)}B`);
  console.log(`Top-level categories: ${hierarchy.size}`);

  // Build sunburst structure: 4 levels
  const children = [];

  for (const [topLevelName, categories] of hierarchy.entries()) {
    const topLevelChildren = [];

    for (const [categoryName, classes] of categories.entries()) {
      const categoryChildren = [];

      for (const [className, sources] of classes.entries()) {
        const classChildren = [];

        for (const [sourceName, amount] of sources.entries()) {
          classChildren.push({
            name: sourceName,
            value: Math.abs(amount),
            actualValue: amount,
            isNegative: amount < 0
          });
        }

        if (classChildren.length > 0) {
          categoryChildren.push({
            name: className,
            children: classChildren
          });
        }
      }

      if (categoryChildren.length > 0) {
        topLevelChildren.push({
          name: categoryName,
          children: categoryChildren
        });
      }
    }

    if (topLevelChildren.length > 0) {
      children.push({
        name: topLevelName,
        children: topLevelChildren
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
