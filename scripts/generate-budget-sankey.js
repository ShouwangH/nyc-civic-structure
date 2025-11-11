#!/usr/bin/env node

// ABOUTME: Generates NYC Expense Budget by Funding Source Sankey diagram from NYC Open Data API
// ABOUTME: Shows how funding sources (City, Federal, State funds) flow to service categories and agencies

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const FISCAL_YEAR = '2025';
const PUBLICATION_DATE = '20240630'; // Latest FY2025 publication
const API_BASE = 'https://data.cityofnewyork.us/resource/39g5-gbp3.json';

// Category mappings for agencies
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

function categorizeAgency(agencyName) {
  const normalized = agencyName.toUpperCase().trim();

  // Check exact matches first
  if (AGENCY_CATEGORIES[normalized]) {
    return AGENCY_CATEGORIES[normalized];
  }

  // Check partial matches
  for (const [key, category] of Object.entries(AGENCY_CATEGORIES)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return category;
    }
  }

  return 'Government, Admin & Oversight'; // Default
}

// Convert to title case for display
function toTitleCase(str) {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => {
      // Keep certain words lowercase
      if (['and', 'of', 'the', 'for', 'in', 'on', 'at', 'to'].includes(word)) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ')
    // Capitalize first word
    .replace(/^./, match => match.toUpperCase());
}

async function fetchBudgetData() {
  console.log(`Fetching FY${FISCAL_YEAR} budget data (published ${PUBLICATION_DATE}) from NYC Open Data...`);

  const limit = 50000; // Fetch in batches
  let offset = 0;
  let allRecords = [];
  let hasMore = true;

  while (hasMore) {
    const url = `${API_BASE}?fiscal_year=${FISCAL_YEAR}&publication_date=${PUBLICATION_DATE}&$limit=${limit}&$offset=${offset}`;
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

  console.log(`Fetched ${allRecords.length} records`);
  return allRecords;
}

function transformToSankey(records) {
  console.log('Transforming data to Sankey format...');

  // Aggregate by agency and funding source
  const agencyFunding = new Map();
  const categoryFunding = new Map();
  const fundingTotals = {
    'City Funds': 0,
    'Federal Funds': 0,
    'State Funds': 0,
    'Other Categorical': 0,
    'Community Development': 0,
  };

  // Process each record
  for (const record of records) {
    const agency = record.agency_name;
    const category = categorizeAgency(agency);

    // Get funding amounts (exclude inter-fund and intra-city)
    const funding = {
      cityFunds: parseFloat(record.city_funds_current_budget_amount || 0),
      federalFunds: parseFloat(record.federal_funds_current_budget_amount || 0),
      stateFunds: parseFloat(record.state_funds_current_budget_amount || 0),
      otherCategorical: parseFloat(record.other_categorical_funds_current_budget_amount || 0),
      communityDevelopment: parseFloat(record.community_development_funds_current_budget_amount || 0),
    };

    // Aggregate by agency
    if (!agencyFunding.has(agency)) {
      agencyFunding.set(agency, { ...funding, category });
    } else {
      const existing = agencyFunding.get(agency);
      existing.cityFunds += funding.cityFunds;
      existing.federalFunds += funding.federalFunds;
      existing.stateFunds += funding.stateFunds;
      existing.otherCategorical += funding.otherCategorical;
      existing.communityDevelopment += funding.communityDevelopment;
    }

    // Aggregate by category
    if (!categoryFunding.has(category)) {
      categoryFunding.set(category, { ...funding });
    } else {
      const existing = categoryFunding.get(category);
      existing.cityFunds += funding.cityFunds;
      existing.federalFunds += funding.federalFunds;
      existing.stateFunds += funding.stateFunds;
      existing.otherCategorical += funding.otherCategorical;
      existing.communityDevelopment += funding.communityDevelopment;
    }

    // Update totals
    fundingTotals['City Funds'] += funding.cityFunds;
    fundingTotals['Federal Funds'] += funding.federalFunds;
    fundingTotals['State Funds'] += funding.stateFunds;
    fundingTotals['Other Categorical'] += funding.otherCategorical;
    fundingTotals['Community Development'] += funding.communityDevelopment;
  }

  console.log(`Aggregated ${agencyFunding.size} agencies into ${categoryFunding.size} categories`);
  console.log('Funding totals:', fundingTotals);

  // Build Sankey structure
  const nodes = [];
  const links = [];

  // Root node (strip any parenthetical content like "(external funding)")
  const rootLabel = `NYC Expense Budget FY${FISCAL_YEAR}`.replace(/\s*\([^)]*\)\s*/g, '');
  nodes.push({
    id: 'NYC_Expense_FY2025',
    label: rootLabel,
    level: 0,
    type: 'system'
  });

  // Funding source nodes (level 1)
  const fundingSources = [
    { id: 'fund:city_funds', label: 'City Funds', key: 'cityFunds' },
    { id: 'fund:state_funds', label: 'State Funds', key: 'stateFunds' },
    { id: 'fund:federal_funds', label: 'Federal Funds', key: 'federalFunds' },
    { id: 'fund:other_categorical', label: 'Other Categorical', key: 'otherCategorical' },
    { id: 'fund:community_development', label: 'Community Development', key: 'communityDevelopment' },
  ];

  fundingSources.forEach(source => {
    nodes.push({
      id: source.id,
      label: source.label,
      level: 1,
      type: 'funding_source'
    });

    // Link root to funding source
    const value = fundingTotals[source.label];
    if (value > 0) {
      links.push({
        source: 'NYC_Expense_FY2025',
        target: source.id,
        value,
        type: 'root_to_fund'
      });
    }
  });

  // Category nodes (level 2)
  const categories = Array.from(categoryFunding.keys()).sort();
  categories.forEach(category => {
    const catId = `cat:${category.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
    nodes.push({
      id: catId,
      label: category,
      level: 2,
      type: 'service_category'
    });

    const catData = categoryFunding.get(category);

    // Link funding sources to categories
    fundingSources.forEach(source => {
      const value = catData[source.key];
      if (value > 0) {
        links.push({
          source: source.id,
          target: catId,
          value,
          type: 'fund_to_category'
        });
      }
    });
  });

  // Top 15 agencies + "Other" groups (level 3)
  const agenciesByValue = Array.from(agencyFunding.entries())
    .map(([name, data]) => ({
      name,
      total: data.cityFunds + data.federalFunds + data.stateFunds + data.otherCategorical + data.communityDevelopment,
      ...data
    }))
    .sort((a, b) => b.total - a.total);

  const topAgencies = agenciesByValue.slice(0, 15);
  const remainingAgencies = agenciesByValue.slice(15);

  // Add top agencies
  topAgencies.forEach(agency => {
    const agencyId = `agency:${agency.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
    nodes.push({
      id: agencyId,
      label: toTitleCase(agency.name),
      level: 3,
      type: 'agency'
    });

    const catId = `cat:${agency.category.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
    links.push({
      source: catId,
      target: agencyId,
      value: agency.total,
      type: 'category_to_agency'
    });
  });

  // Group remaining by category
  const otherByCategory = new Map();
  remainingAgencies.forEach(agency => {
    if (!otherByCategory.has(agency.category)) {
      otherByCategory.set(agency.category, 0);
    }
    otherByCategory.set(agency.category, otherByCategory.get(agency.category) + agency.total);
  });

  otherByCategory.forEach((value, category) => {
    const catId = `cat:${category.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
    const otherId = `agency_other:${category.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
    nodes.push({
      id: otherId,
      label: `Other ${category} Agencies`,
      level: 3,
      type: 'agency_group'
    });

    links.push({
      source: catId,
      target: otherId,
      value,
      type: 'category_to_agency'
    });
  });

  return {
    meta: {
      source: `NYC Open Data - Expense Budget Funding (FY${FISCAL_YEAR})`,
      description: 'NYC Expense Budget by Funding Source: Funding Source → Service Category → Major Agencies',
      fiscal_year: parseInt(FISCAL_YEAR),
      currency: 'USD',
      total_budget: Object.values(fundingTotals).reduce((a, b) => a + b, 0),
      fund_totals: fundingTotals,
      category_totals: Object.fromEntries(
        Array.from(categoryFunding.entries()).map(([cat, data]) => [
          cat,
          data.cityFunds + data.federalFunds + data.stateFunds + data.otherCategorical + data.communityDevelopment
        ])
      ),
      note: `Top 15 agencies by funding shown individually; others aggregated into 'Other ... Agencies'`
    },
    nodes,
    links
  };
}

async function main() {
  try {
    const records = await fetchBudgetData();
    const sankeyData = transformToSankey(records);

    const outputPath = path.join(__dirname, '../public/data/nyc_budget_sankey_fy2025_generated.json');
    fs.writeFileSync(outputPath, JSON.stringify(sankeyData, null, 2));

    console.log(`\n✓ Expense Budget by Funding Source Sankey saved to: ${outputPath}`);
    console.log(`  Total nodes: ${sankeyData.nodes.length}`);
    console.log(`  Total links: ${sankeyData.links.length}`);
    console.log(`  Total budget: $${(sankeyData.meta.total_budget / 1e9).toFixed(1)}B`);
  } catch (error) {
    console.error('Error generating Sankey diagram:', error);
    process.exit(1);
  }
}

main();
