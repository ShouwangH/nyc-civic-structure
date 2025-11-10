#!/usr/bin/env node

// ABOUTME: Generates combined Revenue→Expense Sankey diagram from NYC Open Data APIs
// ABOUTME: Creates three-level flow: Revenue Sources → NYC General Fund → Expense Categories

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const FISCAL_YEAR = '2025';
const REVENUE_DATASET_ID = 'ugzk-a6x4'; // Revenue Budget & Financial Plan
const EXPENSE_DATASET_ID = '39g5-gbp3'; // Expense Budget Funding
const EXPENSE_PUBLICATION_DATE = '20240630'; // Latest FY2025 publication

// Revenue category hierarchy
const REVENUE_CATEGORIES = {
  'Property Tax': ['Real Property Tax', 'Property Tax', 'Real Estate Tax'],
  'Personal Income Tax': ['Personal Income Tax'],
  'Sales Tax': ['Sales Tax', 'General Sales Tax'],
  'Business Income Tax': ['General Corporation Tax', 'Banking Corporation Tax', 'Unincorporated Business Tax'],
  'Other Taxes': ['Mortgage Recording Tax', 'Utility Tax', 'Commercial Rent Tax', 'Hotel Room Occupancy Tax', 'Cigarette Tax'],
  'Federal Grants': ['Federal', 'Federal Aid'],
  'State Grants': ['State', 'State Aid'],
  'Other Revenue': ['Water', 'Sewer', 'Licenses', 'Permits', 'Rental Income', 'Fines', 'Forfeitures', 'Miscellaneous', 'Other', 'Investment', 'Non-Governmental']
};

// Expense category mappings
const AGENCY_CATEGORIES = {
  'DEPARTMENT OF EDUCATION': 'Education & Libraries',
  'CITY UNIVERSITY OF NEW YORK': 'Education & Libraries',
  'NEW YORK PUBLIC LIBRARY': 'Education & Libraries',
  'BROOKLYN PUBLIC LIBRARY': 'Education & Libraries',
  'QUEENS PUBLIC LIBRARY': 'Education & Libraries',
  'POLICE DEPARTMENT': 'Public Safety & Justice',
  'FIRE DEPARTMENT': 'Public Safety & Justice',
  'DEPARTMENT OF CORRECTION': 'Public Safety & Justice',
  'CIVILIAN COMPLAINT REVIEW BOARD': 'Public Safety & Justice',
  'DISTRICT ATTORNEY': 'Public Safety & Justice',
  'DEPARTMENT OF SOCIAL SERVICES': 'Social Services & Homelessness',
  'DEPARTMENT OF HOMELESS SERVICES': 'Social Services & Homelessness',
  "ADMIN FOR CHILDREN'S SERVICES": 'Social Services & Homelessness',
  'HUMAN RESOURCES ADMINISTRATION': 'Social Services & Homelessness',
  'DEPARTMENT OF HEALTH AND MENTAL HYGIENE': 'Health & Mental Hygiene',
  'HEALTH AND HOSPITALS CORPORATION': 'Health & Mental Hygiene',
  'DEPARTMENT OF SANITATION': 'Sanitation, Parks & Environment',
  'DEPARTMENT OF PARKS AND RECREATION': 'Sanitation, Parks & Environment',
  'DEPARTMENT OF ENVIRONMENTAL PROTECT': 'Sanitation, Parks & Environment',
  'HOUSING PRESERVATION AND DEVELOPMENT': 'Housing & Economic Development',
  'NYC ECONOMIC DEVELOPMENT CORP': 'Housing & Economic Development',
  'DEPT OF SMALL BUSINESS SERVICES': 'Housing & Economic Development',
  'DEPARTMENT OF TRANSPORTATION': 'Transportation',
  'TAXI AND LIMOUSINE COMMISSION': 'Transportation',
  'MISCELLANEOUS': 'Government, Admin & Oversight',
  'DEBT SERVICE': 'Government, Admin & Oversight',
  'PENSION CONTRIBUTIONS': 'Government, Admin & Oversight',
  'CITYWIDE PENSION CONTRIBUTIONS': 'Government, Admin & Oversight',
};

function categorizeRevenue(revenueName) {
  const normalized = revenueName.toUpperCase();

  for (const [category, keywords] of Object.entries(REVENUE_CATEGORIES)) {
    for (const keyword of keywords) {
      if (normalized.includes(keyword.toUpperCase())) {
        return category;
      }
    }
  }

  return 'Other Revenue';
}

function categorizeAgency(agencyName) {
  const normalized = agencyName.toUpperCase().trim();

  if (AGENCY_CATEGORIES[normalized]) {
    return AGENCY_CATEGORIES[normalized];
  }

  for (const [key, category] of Object.entries(AGENCY_CATEGORIES)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return category;
    }
  }

  return 'Government, Admin & Oversight';
}

async function fetchRevenueData() {
  console.log(`Fetching FY${FISCAL_YEAR} revenue data...`);

  // Get most recent publication date
  const dateResponse = await fetch(
    `https://data.cityofnewyork.us/resource/${REVENUE_DATASET_ID}.json?fiscal_year=${FISCAL_YEAR}&$select=publication_date&$group=publication_date&$order=publication_date DESC&$limit=1`
  );
  const dateData = await dateResponse.json();
  const latestPublicationDate = dateData[0]?.publication_date;

  if (!latestPublicationDate) {
    throw new Error('Could not find revenue publication date');
  }

  console.log(`Revenue publication date: ${latestPublicationDate}`);

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

    const url = `https://data.cityofnewyork.us/resource/${REVENUE_DATASET_ID}.json?${params}`;
    console.log(`  Fetching revenue batch: offset=${offset}`);
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

  console.log(`Fetched ${allRecords.length} revenue records`);
  return allRecords;
}

async function fetchExpenseData() {
  console.log(`Fetching FY${FISCAL_YEAR} expense data (published ${EXPENSE_PUBLICATION_DATE})...`);

  const limit = 50000;
  let offset = 0;
  let allRecords = [];
  let hasMore = true;

  while (hasMore) {
    const url = `https://data.cityofnewyork.us/resource/${EXPENSE_DATASET_ID}.json?fiscal_year=${FISCAL_YEAR}&publication_date=${EXPENSE_PUBLICATION_DATE}&$limit=${limit}&$offset=${offset}`;
    console.log(`  Fetching expense batch: offset=${offset}`);

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

function processRevenueData(records) {
  console.log('Processing revenue data...');

  const revenueByCategory = new Map();
  let totalRevenue = 0;

  for (const record of records) {
    const amount = parseFloat(record.current_modified_budget_amount || record.adopted_budget_amount || 0);
    if (amount === 0) continue;

    const revenueName = record.revenue_source_name || record.revenue_class_name || 'Unknown';
    const category = categorizeRevenue(revenueName);

    revenueByCategory.set(category, (revenueByCategory.get(category) || 0) + amount);
    totalRevenue += amount;
  }

  console.log(`Total revenue: $${(totalRevenue / 1e9).toFixed(2)}B`);
  console.log(`Revenue categories: ${revenueByCategory.size}`);

  return { revenueByCategory, totalRevenue };
}

function processExpenseData(records) {
  console.log('Processing expense data...');

  const expenseByCategory = new Map();
  let totalExpense = 0;

  for (const record of records) {
    const agency = record.agency_name;
    const category = categorizeAgency(agency);

    const amount =
      parseFloat(record.city_funds_current_budget_amount || 0) +
      parseFloat(record.federal_funds_current_budget_amount || 0) +
      parseFloat(record.state_funds_current_budget_amount || 0) +
      parseFloat(record.other_categorical_funds_current_budget_amount || 0) +
      parseFloat(record.community_development_funds_current_budget_amount || 0);

    expenseByCategory.set(category, (expenseByCategory.get(category) || 0) + amount);
    totalExpense += amount;
  }

  console.log(`Total expense: $${(totalExpense / 1e9).toFixed(2)}B`);
  console.log(`Expense categories: ${expenseByCategory.size}`);

  return { expenseByCategory, totalExpense };
}

function buildSankeyStructure(revenueByCategory, expenseByCategory, totalRevenue, totalExpense) {
  console.log('Building Sankey structure...');

  const nodes = [];
  const links = [];

  // Add revenue source nodes (level 0)
  const sortedRevenue = Array.from(revenueByCategory.entries()).sort((a, b) => b[1] - a[1]);
  sortedRevenue.forEach(([category, amount]) => {
    nodes.push({
      id: `revenue:${category.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
      label: category,
      level: 0,
      type: 'revenue_source'
    });
  });

  // Add General Fund node (level 1)
  const generalFundId = 'general_fund';
  nodes.push({
    id: generalFundId,
    label: `NYC General Fund FY${FISCAL_YEAR}`,
    level: 1,
    type: 'fund'
  });

  // Add expense category nodes (level 2)
  const sortedExpense = Array.from(expenseByCategory.entries()).sort((a, b) => b[1] - a[1]);
  sortedExpense.forEach(([category, amount]) => {
    nodes.push({
      id: `expense:${category.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
      label: category,
      level: 2,
      type: 'expense_category'
    });
  });

  // Create links: Revenue → General Fund
  sortedRevenue.forEach(([category, amount]) => {
    links.push({
      source: `revenue:${category.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
      target: generalFundId,
      value: amount,
      type: 'revenue_to_fund'
    });
  });

  // Create links: General Fund → Expenses
  sortedExpense.forEach(([category, amount]) => {
    links.push({
      source: generalFundId,
      target: `expense:${category.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
      value: amount,
      type: 'fund_to_expense'
    });
  });

  return {
    meta: {
      source: `NYC Open Data - Revenue (${REVENUE_DATASET_ID}) & Expense (${EXPENSE_DATASET_ID})`,
      description: 'NYC FY2025 Revenue Sources → General Fund → Expense Categories',
      fiscal_year: parseInt(FISCAL_YEAR),
      currency: 'USD',
      total_revenue: totalRevenue,
      total_expense: totalExpense,
      revenue_categories: Object.fromEntries(revenueByCategory),
      expense_categories: Object.fromEntries(expenseByCategory),
      note: 'Revenue and expense flows are independent aggregations connected through the General Fund. Specific revenue sources are not directly tracked to specific expenses in the city budget system.'
    },
    nodes,
    links
  };
}

async function main() {
  try {
    const [revenueRecords, expenseRecords] = await Promise.all([
      fetchRevenueData(),
      fetchExpenseData()
    ]);

    const { revenueByCategory, totalRevenue } = processRevenueData(revenueRecords);
    const { expenseByCategory, totalExpense } = processExpenseData(expenseRecords);

    const sankeyData = buildSankeyStructure(
      revenueByCategory,
      expenseByCategory,
      totalRevenue,
      totalExpense
    );

    const outputPath = path.join(__dirname, '../public/data/nyc_revenue_expense_sankey_fy2025.json');
    fs.writeFileSync(outputPath, JSON.stringify(sankeyData, null, 2));

    console.log(`\n✓ Revenue→Expense Sankey saved to: ${outputPath}`);
    console.log(`  Total nodes: ${sankeyData.nodes.length}`);
    console.log(`  Total links: ${sankeyData.links.length}`);
    console.log(`  Revenue: $${(totalRevenue / 1e9).toFixed(1)}B`);
    console.log(`  Expense: $${(totalExpense / 1e9).toFixed(1)}B`);
  } catch (error) {
    console.error('Error generating Revenue→Expense Sankey:', error);
    process.exit(1);
  }
}

main();
