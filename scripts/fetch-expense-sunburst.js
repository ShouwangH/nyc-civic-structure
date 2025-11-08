#!/usr/bin/env node

// ABOUTME: Fetches NYC expense budget data from Open Data API and generates sunburst visualization
// ABOUTME: Transforms expense budget data into hierarchical sunburst format organized by service category, agency, and object class

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, '../.env') });

const FISCAL_YEAR = '2026';
const DATASET_ID = 'mwzb-yiwb'; // Expense Budget
const API_BASE = `https://data.cityofnewyork.us/resource/${DATASET_ID}.json`;

// NYC Open Data credentials (not currently used - public API works without token)
// const APP_TOKEN = process.env.OD_KEY_ID;

// Agency to service category mapping
const AGENCY_TO_CATEGORY = {
  'Department Of Education': 'Education',
  'City University Of New York': 'Education',
  'New York Public Library': 'Culture & Recreation',
  'Brooklyn Public Library': 'Culture & Recreation',
  'Queens Public Library': 'Culture & Recreation',
  'Department Of Parks And Recreation': 'Culture & Recreation',
  'Department Of Cultural Affairs': 'Culture & Recreation',

  'Police Department': 'Public Safety',
  'Fire Department': 'Public Safety',
  'Department Of Correction': 'Public Safety',
  'District Attorney': 'Public Safety',
  'Law Department': 'Public Safety',

  'Department Of Social Services': 'Social Services',
  'Department Of Homeless Services': 'Social Services',
  'Admin For Children\'s Services': 'Social Services',
  'Human Resources Administration': 'Social Services',
  'Administration For Children\'s Services': 'Social Services',

  'Department Of Health And Mental Hygiene': 'Health',
  'Health And Hospitals Corporation': 'Health',

  'Department Of Sanitation': 'Sanitation & Environment',
  'Department Of Environmental Protection': 'Sanitation & Environment',

  'Department Of Transportation': 'Transportation',
  'Taxi And Limousine Commission': 'Transportation',

  'Department Of Housing Preservation And Development': 'Housing',
  'Housing Preservation And Development': 'Housing',

  'Dept Of Finance': 'Finance & Administration',
  'Department Of Finance': 'Finance & Administration',
  'Office Of Management And Budget': 'Finance & Administration',
  'Mayoralty': 'Finance & Administration',
  'Board Of Election': 'Finance & Administration',
  'Department Of Citywide Administrative Services': 'Finance & Administration',

  'Debt Service': 'Debt Service',
  'Miscellaneous': 'Other'
};

function categorizeAgency(agencyName) {
  // Normalize agency name for comparison
  const normalized = agencyName.trim();

  // Direct match
  if (AGENCY_TO_CATEGORY[normalized]) {
    return AGENCY_TO_CATEGORY[normalized];
  }

  // Partial match
  const upper = normalized.toUpperCase();
  for (const [key, category] of Object.entries(AGENCY_TO_CATEGORY)) {
    if (upper.includes(key.toUpperCase()) || key.toUpperCase().includes(upper)) {
      return category;
    }
  }

  // Special cases
  if (upper.includes('PENSION')) return 'Debt Service';
  if (upper.includes('LIBRARY')) return 'Culture & Recreation';
  if (upper.includes('EDUCATION') || upper.includes('SCHOOL')) return 'Education';
  if (upper.includes('POLICE') || upper.includes('FIRE')) return 'Public Safety';
  if (upper.includes('HEALTH')) return 'Health';
  if (upper.includes('HOUSING')) return 'Housing';
  if (upper.includes('TRANSPORT')) return 'Transportation';
  if (upper.includes('SANITATION') || upper.includes('ENVIRONMENTAL')) return 'Sanitation & Environment';

  return 'Other';
}

async function fetchExpenseData() {
  console.log(`Fetching FY${FISCAL_YEAR} expense budget data from NYC Open Data...`);

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
      $order: 'agency_name'
    });

    const url = `${API_BASE}?${params}`;
    console.log(`Fetching batch: offset=${offset}`);

    const response = await fetch(url);
    if (!response.ok) {
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

  console.log(`Fetched ${allRecords.length} expense records`);
  return allRecords;
}

function transformToSunburst(records) {
  console.log('Transforming data to sunburst format...');

  // Build hierarchy: Service Category → Agency → Object Class
  const hierarchy = new Map();
  let totalExpense = 0;

  for (const record of records) {
    // Use current_modified_budget_amount as the primary value
    const amount = parseFloat(record.current_modified_budget_amount || record.adopted_budget_amount || 0);

    if (amount === 0) continue; // Skip zero amounts

    const agencyName = record.agency_name || 'Unknown Agency';
    const objectClassName = record.object_class_name || record.object_code_name || 'Other';
    const category = categorizeAgency(agencyName);

    // Initialize hierarchy levels
    if (!hierarchy.has(category)) {
      hierarchy.set(category, new Map());
    }
    const categoryMap = hierarchy.get(category);

    if (!categoryMap.has(agencyName)) {
      categoryMap.set(agencyName, new Map());
    }
    const agencyMap = categoryMap.get(agencyName);

    // Aggregate by object class
    if (!agencyMap.has(objectClassName)) {
      agencyMap.set(objectClassName, 0);
    }
    agencyMap.set(objectClassName, agencyMap.get(objectClassName) + amount);

    totalExpense += amount;
  }

  console.log(`Total expense: $${(totalExpense / 1e9).toFixed(2)}B`);
  console.log(`Service categories: ${hierarchy.size}`);

  // Build sunburst structure
  const children = [];

  // Sort categories by total amount
  const sortedCategories = Array.from(hierarchy.entries())
    .map(([catName, agencies]) => {
      let catTotal = 0;
      for (const [, objectClasses] of agencies.entries()) {
        for (const amount of objectClasses.values()) {
          catTotal += amount;
        }
      }
      return [catName, agencies, catTotal];
    })
    .sort((a, b) => b[2] - a[2]);

  for (const [categoryName, agencies, catTotal] of sortedCategories) {
    const categoryChildren = [];

    // Sort agencies by total amount within category
    const sortedAgencies = Array.from(agencies.entries())
      .map(([agencyName, objectClasses]) => {
        let agencyTotal = 0;
        for (const amount of objectClasses.values()) {
          agencyTotal += amount;
        }
        return [agencyName, objectClasses, agencyTotal];
      })
      .sort((a, b) => b[2] - a[2]);

    for (const [agencyName, objectClasses, agencyTotal] of sortedAgencies) {
      const agencyChildren = [];

      // Sort object classes by amount
      const sortedObjectClasses = Array.from(objectClasses.entries())
        .sort((a, b) => b[1] - a[1]);

      for (const [objectClassName, amount] of sortedObjectClasses) {
        agencyChildren.push({
          name: objectClassName,
          value: Math.abs(amount),
          actualValue: amount,
          isNegative: amount < 0
        });
      }

      if (agencyChildren.length > 0) {
        categoryChildren.push({
          name: agencyName,
          children: agencyChildren
        });
      }
    }

    if (categoryChildren.length > 0) {
      children.push({
        name: categoryName,
        children: categoryChildren
      });
    }
  }

  return {
    meta: {
      source: `NYC Open Data - Expense Budget (Dataset: ${DATASET_ID})`,
      fiscal_year: parseInt(FISCAL_YEAR),
      fund_group: 'City Funds',
      total_expense_billion: parseFloat((totalExpense / 1e9).toFixed(2)),
      generated_at: new Date().toISOString()
    },
    data: {
      name: `NYC Expense FY${FISCAL_YEAR}`,
      children
    }
  };
}

async function main() {
  try {
    const records = await fetchExpenseData();
    const sunburstData = transformToSunburst(records);

    const outputPath = path.join(__dirname, '../public/data/nyc_expense_budget_sunburst_generated.json');
    fs.writeFileSync(outputPath, JSON.stringify(sunburstData, null, 2));

    console.log(`\n✓ Expense sunburst saved to: ${outputPath}`);
    console.log(`  Total categories: ${sunburstData.data.children.length}`);
    console.log(`  Total expense: $${sunburstData.meta.total_expense_billion}B`);
  } catch (error) {
    console.error('Error generating expense sunburst:', error);
    process.exit(1);
  }
}

main();
