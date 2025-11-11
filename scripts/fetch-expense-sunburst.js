#!/usr/bin/env node

// ABOUTME: Fetches NYC expense data from Open Data API and generates sunburst visualization
// ABOUTME: Transforms expense budget data into hierarchical sunburst format with object code detail

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, '../.env') });

const FISCAL_YEAR = '2025';
const DATASET_ID = 'fyxr-9vkh'; // NYC Budget (comprehensive with object codes)
const PUBLICATION_DATE = '20240630'; // Latest FY2025 publication
const API_BASE = `https://data.cityofnewyork.us/resource/${DATASET_ID}.json`;

// Expense category mappings (same as Sankey)
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

// Normalize object class names to human-readable format
function normalizeObjectClass(name) {
  if (!name) return 'Unknown';

  const normalized = name.toUpperCase().trim();

  const mappings = {
    'FULL TIME SALARIED': 'Full-Time Salaries',
    'OTHER SALARIED': 'Other Salaries',
    'UNSALARIED': 'Unsalaried',
    'ADDITIONAL GROSS PAY': 'Additional Gross Pay',
    'FRINGE BENEFITS': 'Fringe Benefits',
    'CONTRACTUAL SERVICES': 'Contractual Services',
    'OTHER SERVICES AND CHARGES': 'Other Services & Charges',
    'SUPPLIES AND MATERIALS': 'Supplies & Materials',
    'PROPERTY AND EQUIPMENT': 'Property & Equipment',
    'FIXED & MISCELLANEOUS CHARGES': 'Fixed & Misc. Charges',
    'AMOUNTS TO BE SCHEDULED': 'Amounts To Be Scheduled',
  };

  return mappings[normalized] || toTitleCase(name);
}

// Normalize object code names to human-readable format
function normalizeObjectCode(name) {
  if (!name) return 'Unknown';

  let normalized = name.trim();

  // Expand common abbreviations
  normalized = normalized
    .replace(/^PROF SERV /gi, 'Professional Services: ')
    .replace(/^MAINT & REP /gi, 'Maintenance & Repair: ')
    .replace(/^MAINT & OPER /gi, 'Maintenance & Operation: ')
    .replace(/ PRGM /gi, ' Program ')
    .replace(/ VEH /gi, ' Vehicle ')
    .replace(/ EQUIP$/gi, ' Equipment')
    .replace(/ ACCT$/gi, ' Account')
    .replace(/ASST/gi, 'Assistance')
    .replace(/ACCTING/gi, 'Accounting')
    .replace(/TELECOM/gi, 'Telecommunications');

  return toTitleCase(normalized);
}

// Convert to title case
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

async function fetchExpenseData() {
  console.log(`Fetching FY${FISCAL_YEAR} expense data from NYC Open Data...`);

  const limit = 50000;
  let offset = 0;
  let allRecords = [];
  let hasMore = true;

  while (hasMore) {
    const params = new URLSearchParams({
      fiscal_year: FISCAL_YEAR,
      publication_date: PUBLICATION_DATE,
      $limit: limit,
      $offset: offset,
      $order: 'agency_name',
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

  console.log(`Fetched ${allRecords.length} expense records`);
  return allRecords;
}

function transformToSunburst(records) {
  console.log('Transforming data to sunburst format...');

  // Build 5-level hierarchy: High-Level Category → Agency → Unit → Object Class → Object Code
  const hierarchy = new Map();
  let totalExpense = 0;

  for (const record of records) {
    const amount = parseFloat(record.current_modified_budget_amount || record.adopted_budget_amount || 0);
    if (amount === 0) continue;

    // Extract fields
    const agencyName = record.agency_name || 'Unknown';
    const unitName = record.unit_appropriation_name || 'Unknown';
    const objectClassName = record.object_class_name || 'Unknown';
    const objectCodeName = record.object_code_name || 'Unknown';

    // Get high-level category
    const category = categorizeAgency(agencyName);

    // Normalize names for display
    const normalizedObjectClass = normalizeObjectClass(objectClassName);
    const normalizedObjectCode = normalizeObjectCode(objectCodeName);

    // Initialize hierarchy levels
    if (!hierarchy.has(category)) {
      hierarchy.set(category, new Map());
    }
    const categoryMap = hierarchy.get(category);

    if (!categoryMap.has(agencyName)) {
      categoryMap.set(agencyName, new Map());
    }
    const agencyMap = categoryMap.get(agencyName);

    if (!agencyMap.has(unitName)) {
      agencyMap.set(unitName, new Map());
    }
    const unitMap = agencyMap.get(unitName);

    if (!unitMap.has(normalizedObjectClass)) {
      unitMap.set(normalizedObjectClass, new Map());
    }
    const objectClassMap = unitMap.get(normalizedObjectClass);

    // Aggregate by object code
    if (!objectClassMap.has(normalizedObjectCode)) {
      objectClassMap.set(normalizedObjectCode, 0);
    }
    objectClassMap.set(normalizedObjectCode, objectClassMap.get(normalizedObjectCode) + amount);

    totalExpense += amount;
  }

  console.log(`Total expense: $${(totalExpense / 1e9).toFixed(2)}B`);
  console.log(`High-level categories: ${hierarchy.size}`);

  // Build sunburst structure: 5 levels
  const children = [];

  for (const [categoryName, agencies] of hierarchy.entries()) {
    const categoryChildren = [];

    for (const [agencyName, units] of agencies.entries()) {
      const agencyChildren = [];

      for (const [unitName, objectClasses] of units.entries()) {
        const unitChildren = [];

        for (const [objectClassName, objectCodes] of objectClasses.entries()) {
          const objectClassChildren = [];

          for (const [objectCodeName, amount] of objectCodes.entries()) {
            objectClassChildren.push({
              name: objectCodeName,
              value: Math.abs(amount),
              actualValue: amount,
              isNegative: amount < 0
            });
          }

          if (objectClassChildren.length > 0) {
            unitChildren.push({
              name: objectClassName,
              children: objectClassChildren
            });
          }
        }

        if (unitChildren.length > 0) {
          agencyChildren.push({
            name: unitName,
            children: unitChildren
          });
        }
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
      source: `NYC Open Data - NYC Budget (Dataset: ${DATASET_ID})`,
      fiscal_year: parseInt(FISCAL_YEAR),
      publication_date: PUBLICATION_DATE,
      total_expense_billion: parseFloat((totalExpense / 1e9).toFixed(2)),
      generated_at: new Date().toISOString()
    },
    data: {
      name: `NYC Expense Budget FY${FISCAL_YEAR}`,
      children
    }
  };
}

async function main() {
  try {
    const records = await fetchExpenseData();
    const sunburstData = transformToSunburst(records);

    const outputPath = path.join(__dirname, '../public/data/nyc_expense_sunburst_fy2025_generated.json');
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
