#!/usr/bin/env node

// ABOUTME: Seed script for financial visualizations - generates sankey and sunburst datasets
// ABOUTME: Combines budget sankey, pension sankey, revenue sunburst, and expense sunburst

import { sankeyDatasets, sunburstDatasets } from '../server/lib/schema.ts';
import {
  initDb,
  closeDb,
  fetchNycOpenData,
  clearTable,
  timer,
  formatNumber,
} from './lib/seed-utils.js';

const FISCAL_YEAR = 2025;
const PUBLICATION_DATE = '20240630';

// NYC Open Data datasets
const BUDGET_API = 'https://data.cityofnewyork.us/resource/39g5-gbp3.json'; // Expense Budget by Funding Source
const REVENUE_API = 'https://data.cityofnewyork.us/resource/ugzk-a6x4.json'; // Revenue Budget
const EXPENSE_API = 'https://data.cityofnewyork.us/resource/fyxr-9vkh.json'; // NYC Budget (comprehensive with object codes)

// Pension fund datasets
const PENSION_FUNDS = [
  { id: 'NYCERS', label: 'NYC Employees\' Retirement System (NYCERS)', datasetId: 'p3e6-t4zv' },
  { id: 'BERS', label: 'Board of Education Retirement System (BERS)', datasetId: 'fypi-ruxh' },
  { id: 'POLICE', label: 'Police Pension Fund', datasetId: 'dy3p-ay2d' },
  { id: 'TRS', label: 'Teachers\' Retirement System (TRS)', datasetId: '5u2d-n46s' },
  { id: 'FIRE', label: 'Fire Department Pension Fund', datasetId: '95aa-k2ka' },
];

// Agency categorization
const AGENCY_CATEGORIES = {
  'DEPARTMENT OF EDUCATION': 'Education & Libraries',
  'CITY UNIVERSITY OF NEW YORK': 'Education & Libraries',
  'POLICE DEPARTMENT': 'Public Safety & Justice',
  'FIRE DEPARTMENT': 'Public Safety & Justice',
  'DEPARTMENT OF CORRECTION': 'Public Safety & Justice',
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
};

function categorizeAgency(agencyName) {
  const normalized = agencyName.toUpperCase().trim();

  for (const [key, category] of Object.entries(AGENCY_CATEGORIES)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return category;
    }
  }

  return 'Government, Admin & Oversight';
}

/**
 * Generate Budget Sankey (Funding Sources → Categories → Agencies)
 */
async function generateBudgetSankey(db) {
  console.log('[Budget Sankey] Fetching budget data...\n');

  const records = await fetchNycOpenData(BUDGET_API, {
    limit: 50000,
    params: {
      fiscal_year: FISCAL_YEAR,
      publication_date: PUBLICATION_DATE,
    },
  });

  console.log('[Budget Sankey] Processing...');

  // Aggregate by funding source → category → agency
  const aggregates = {};

  for (const record of records) {
    const fundingSource = record.funding_source_name || 'Other Funds';
    const agencyName = record.agency_name || 'Unknown';
    const category = categorizeAgency(agencyName);
    const amount = parseFloat(record.amount || 0);

    const key = `${fundingSource}|${category}|${agencyName}`;

    if (!aggregates[key]) {
      aggregates[key] = { fundingSource, category, agencyName, amount: 0 };
    }

    aggregates[key].amount += amount;
  }

  // Build nodes and links
  const nodes = new Map();
  const links = [];

  function getOrCreateNode(id, label, level, type) {
    if (!nodes.has(id)) {
      nodes.set(id, { id, label, level, type });
    }
    return id;
  }

  for (const agg of Object.values(aggregates)) {
    if (agg.amount < 1000000) continue; // Filter small amounts (< $1M)

    const sourceId = getOrCreateNode(
      `funding-${agg.fundingSource}`,
      agg.fundingSource,
      0,
      'funding-source'
    );

    const categoryId = getOrCreateNode(
      `category-${agg.category}`,
      agg.category,
      1,
      'category'
    );

    const agencyId = getOrCreateNode(
      `agency-${agg.agencyName}`,
      agg.agencyName,
      2,
      'agency'
    );

    // Add links
    const sourceToCat = `${sourceId}->${categoryId}`;
    const catToAgency = `${categoryId}->${agencyId}`;

    links.push({
      source: sourceId,
      target: categoryId,
      value: agg.amount,
    });

    links.push({
      source: categoryId,
      target: agencyId,
      value: agg.amount,
    });
  }

  const dataset = {
    id: `budget-fy${FISCAL_YEAR}`,
    label: `NYC Expense Budget by Funding Source FY${FISCAL_YEAR}`,
    description: 'Shows how funding sources (City, Federal, State) flow to service categories and agencies',
    fiscalYear: FISCAL_YEAR,
    dataType: 'budget',
    units: 'USD',
    nodes: Array.from(nodes.values()),
    links,
    metadata: {
      publicationDate: PUBLICATION_DATE,
      totalBudget: links.reduce((sum, l) => sum + l.value, 0),
    },
    generatedAt: new Date(),
  };

  await db.insert(sankeyDatasets).values(dataset);

  console.log(`[Budget Sankey] Generated: ${nodes.size} nodes, ${links.length} links\n`);
}

/**
 * Generate Pension Sankey (System → Funds → Asset Classes)
 */
async function generatePensionSankey(db) {
  console.log('[Pension Sankey] Fetching pension data...\n');

  const nodes = [
    { id: 'NYC_Pensions', label: 'New York City Pension System', level: 0, type: 'system' },
  ];
  const links = [];

  // Note: This is simplified - full implementation would fetch from all 5 pension datasets
  // For now, we'll create a placeholder structure

  for (const fund of PENSION_FUNDS) {
    nodes.push({
      id: fund.id,
      label: fund.label,
      level: 1,
      type: 'fund',
    });

    // Placeholder link (would fetch actual data in production)
    links.push({
      source: 'NYC_Pensions',
      target: fund.id,
      value: 1000000000, // Placeholder
    });
  }

  const dataset = {
    id: 'pension-2025',
    label: 'NYC Pension System Holdings',
    description: 'Pension fund allocations across asset classes',
    fiscalYear: FISCAL_YEAR,
    dataType: 'pension',
    units: 'USD (millions)',
    nodes,
    links,
    metadata: {
      note: 'Simplified dataset - full implementation requires fetching from all 5 pension fund APIs',
    },
    generatedAt: new Date(),
  };

  await db.insert(sankeyDatasets).values(dataset);

  console.log(`[Pension Sankey] Generated: ${nodes.length} nodes, ${links.length} links\n`);
}

/**
 * Generate Revenue Sunburst
 */
async function generateRevenueSunburst(db) {
  console.log('[Revenue Sunburst] Fetching revenue data...\n');

  const records = await fetchNycOpenData(REVENUE_API, {
    limit: 50000,
    params: {
      fiscal_year: FISCAL_YEAR,
    },
  });

  console.log('[Revenue Sunburst] Processing...');

  // Build hierarchy: Revenue → Major Category → Minor Category → Detail
  const hierarchy = { name: `NYC Revenue FY${FISCAL_YEAR}`, children: [] };
  const categories = new Map();

  for (const record of records) {
    const majorCat = record.revenue_category || 'Other';
    const minorCat = record.revenue_source_name || 'Unspecified';
    const amount = parseFloat(record.amount || 0);

    if (amount < 100000) continue; // Filter small amounts

    if (!categories.has(majorCat)) {
      categories.set(majorCat, { name: majorCat, children: [] });
    }

    const category = categories.get(majorCat);
    let subcategory = category.children.find(c => c.name === minorCat);

    if (!subcategory) {
      subcategory = { name: minorCat, value: 0 };
      category.children.push(subcategory);
    }

    subcategory.value += amount;
  }

  hierarchy.children = Array.from(categories.values());

  const totalRevenue = records.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);

  const dataset = {
    id: `revenue-fy${FISCAL_YEAR}`,
    label: `NYC Revenue FY${FISCAL_YEAR}`,
    description: 'Revenue sources breakdown by category',
    fiscalYear: FISCAL_YEAR,
    dataType: 'revenue',
    units: 'USD',
    totalValue: totalRevenue,
    hierarchyData: hierarchy,
    metadata: {
      source: 'NYC Open Data - Revenue Budget & Financial Plan (Dataset: ugzk-a6x4)',
    },
    generatedAt: new Date(),
  };

  await db.insert(sunburstDatasets).values(dataset);

  console.log(`[Revenue Sunburst] Generated: ${hierarchy.children.length} top-level categories\n`);
}

/**
 * Generate Expense Sunburst
 */
async function generateExpenseSunburst(db) {
  console.log('[Expense Sunburst] Fetching expense data...\n');

  const records = await fetchNycOpenData(EXPENSE_API, {
    limit: 50000,
    params: {
      fiscal_year: FISCAL_YEAR,
      publication_date: PUBLICATION_DATE,
    },
  });

  console.log('[Expense Sunburst] Processing...');

  // Build hierarchy: Expenses → Category → Agency → Object Code
  const hierarchy = { name: `NYC Expenses FY${FISCAL_YEAR}`, children: [] };
  const categories = new Map();

  for (const record of records) {
    const agencyName = record.agency_name || 'Unknown';
    const category = categorizeAgency(agencyName);
    const amount = parseFloat(record.amount || 0);

    if (amount < 100000) continue; // Filter small amounts

    if (!categories.has(category)) {
      categories.set(category, { name: category, children: [] });
    }

    const cat = categories.get(category);
    let agency = cat.children.find(a => a.name === agencyName);

    if (!agency) {
      agency = { name: agencyName, value: 0 };
      cat.children.push(agency);
    }

    agency.value += amount;
  }

  hierarchy.children = Array.from(categories.values());

  const totalExpense = records.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);

  const dataset = {
    id: `expense-fy${FISCAL_YEAR}`,
    label: `NYC Expenses FY${FISCAL_YEAR}`,
    description: 'Expense budget breakdown by category and agency',
    fiscalYear: FISCAL_YEAR,
    dataType: 'expense',
    units: 'USD',
    totalValue: totalExpense,
    hierarchyData: hierarchy,
    metadata: {
      source: 'NYC Open Data - Budget (Dataset: fyxr-9vkh)',
      publicationDate: PUBLICATION_DATE,
    },
    generatedAt: new Date(),
  };

  await db.insert(sunburstDatasets).values(dataset);

  console.log(`[Expense Sunburst] Generated: ${hierarchy.children.length} top-level categories\n`);
}

/**
 * Main seed function
 */
async function main() {
  const t = timer();

  console.log('========================================');
  console.log('   NYC FINANCIAL DATA SEED SCRIPT      ');
  console.log('========================================\n');

  const { db, client } = initDb();

  try {
    // Clear existing data
    await clearTable(db, 'sankey_datasets', 'sankey_datasets');
    await clearTable(db, 'sunburst_datasets', 'sunburst_datasets');

    // Generate all visualizations
    console.log('--- STEP 1: Generate Budget Sankey ---\n');
    await generateBudgetSankey(db);

    console.log('--- STEP 2: Generate Pension Sankey ---\n');
    await generatePensionSankey(db);

    console.log('--- STEP 3: Generate Revenue Sunburst ---\n');
    await generateRevenueSunburst(db);

    console.log('--- STEP 4: Generate Expense Sunburst ---\n');
    await generateExpenseSunburst(db);

    // Summary
    console.log('========================================');
    console.log('           SEED SUMMARY                 ');
    console.log('========================================');
    console.log('Sankey Datasets: 2 (Budget, Pension)');
    console.log('Sunburst Datasets: 2 (Revenue, Expense)');
    console.log(`Total Time: ${t.stop()}`);
    console.log('========================================\n');

  } catch (error) {
    console.error('\n[ERROR] Seed failed:', error);
    process.exit(1);
  } finally {
    await closeDb(client);
  }
}

// Run the seed script
main();
