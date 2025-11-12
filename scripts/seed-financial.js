#!/usr/bin/env node

// ABOUTME: Seed script for financial visualizations - generates sankey and sunburst datasets
// ABOUTME: Combines budget sankey, pension sankey, revenue sunburst, and expense sunburst

import { config } from 'dotenv';
import { sankeyDatasets, sunburstDatasets } from '../server/lib/schema.ts';
import {
  initDb,
  closeDb,
  fetchNycOpenData,
  clearTable,
  timer,
  formatNumber,
} from './lib/seed-utils.js';

// Load environment variables
config();

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

// Convert to title case for display
function toTitleCase(str) {
  if (!str) return 'Unknown';
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

  // Aggregate by agency and funding source
  const agencyFunding = new Map();
  const fundingTotals = {
    'City Funds': 0,
    'Federal Funds': 0,
    'State Funds': 0,
  };

  // Process each record
  for (const record of records) {
    const agency = record.agency_name || 'Unknown';
    const category = categorizeAgency(agency);

    // Get funding amounts (use correct field names from NYC Open Data)
    const funding = {
      cityFunds: parseFloat(record.city_funds_current_budget_amount || 0),
      federalFunds: parseFloat(record.federal_funds_current_budget_amount || 0),
      stateFunds: parseFloat(record.state_funds_current_budget_amount || 0),
    };

    const total = funding.cityFunds + funding.federalFunds + funding.stateFunds;
    if (total === 0) continue;

    // Aggregate by agency
    if (!agencyFunding.has(agency)) {
      agencyFunding.set(agency, { ...funding, category });
    } else {
      const existing = agencyFunding.get(agency);
      existing.cityFunds += funding.cityFunds;
      existing.federalFunds += funding.federalFunds;
      existing.stateFunds += funding.stateFunds;
    }

    // Update totals
    fundingTotals['City Funds'] += funding.cityFunds;
    fundingTotals['Federal Funds'] += funding.federalFunds;
    fundingTotals['State Funds'] += funding.stateFunds;
  }

  // Build Sankey structure
  const nodes = [];
  const links = [];

  // Funding source nodes (level 0)
  const fundingSources = [
    { id: 'City Funds', label: 'City Funds', key: 'cityFunds' },
    { id: 'Federal Funds', label: 'Federal Funds', key: 'federalFunds' },
    { id: 'State Funds', label: 'State Funds', key: 'stateFunds' },
  ];

  for (const source of fundingSources) {
    if (fundingTotals[source.id] > 0) {
      nodes.push({ id: `funding-${source.id}`, label: source.label, level: 0, type: 'funding-source' });
    }
  }

  // Aggregate by category
  const categoryFunding = new Map();
  for (const [agency, data] of agencyFunding.entries()) {
    const category = data.category;
    if (!categoryFunding.has(category)) {
      categoryFunding.set(category, {
        cityFunds: 0,
        federalFunds: 0,
        stateFunds: 0,
      });
    }
    const catData = categoryFunding.get(category);
    catData.cityFunds += data.cityFunds;
    catData.federalFunds += data.federalFunds;
    catData.stateFunds += data.stateFunds;
  }

  // Category nodes (level 1)
  const activeCategories = new Set();
  for (const [category, funding] of categoryFunding.entries()) {
    const total = funding.cityFunds + funding.federalFunds + funding.stateFunds;
    if (total > 10000000) { // Only include if > $10M
      nodes.push({ id: `category-${category}`, label: category, level: 1, type: 'category' });
      activeCategories.add(category);

      // Links from funding sources to categories
      for (const source of fundingSources) {
        const amount = funding[source.key];
        if (amount > 1000000) { // Only if > $1M
          links.push({
            source: `funding-${source.id}`,
            target: `category-${category}`,
            value: amount,
          });
        }
      }
    }
  }

  // Agency nodes (level 2) - filtered to top agencies per category
  const agenciesByCategory = new Map();
  for (const [agency, data] of agencyFunding.entries()) {
    const category = data.category;
    if (!activeCategories.has(category)) continue;

    const total = data.cityFunds + data.federalFunds + data.stateFunds;
    if (total < 5000000) continue; // Skip agencies < $5M

    if (!agenciesByCategory.has(category)) {
      agenciesByCategory.set(category, []);
    }
    agenciesByCategory.get(category).push({
      agency,
      total,
      funding: data,
    });
  }

  // Add top 12 agencies per category to keep visualization manageable
  for (const [category, agencies] of agenciesByCategory.entries()) {
    // Sort by total and take top 12
    const topAgencies = agencies
      .sort((a, b) => b.total - a.total)
      .slice(0, 12);

    for (const { agency, funding } of topAgencies) {
      const agencyId = `agency-${agency}`;
      const normalizedAgencyName = toTitleCase(agency);

      nodes.push({
        id: agencyId,
        label: normalizedAgencyName,
        level: 2,
        type: 'agency',
      });

      // Links from category to agency
      for (const source of fundingSources) {
        const amount = funding[source.key];
        if (amount > 500000) { // Only if > $500K
          links.push({
            source: `category-${category}`,
            target: agencyId,
            value: amount,
          });
        }
      }
    }
  }

  // Now has 3 levels: Funding Sources → Service Categories → Major Agencies

  const dataset = {
    id: `budget-fy${FISCAL_YEAR}`,
    label: `NYC Expense Budget by Funding Source FY${FISCAL_YEAR}`,
    description: 'Shows how funding sources (City, Federal, State) flow to service categories and major agencies (3 levels)',
    fiscalYear: FISCAL_YEAR,
    dataType: 'budget',
    units: 'USD',
    nodes,
    links,
    metadata: {
      publicationDate: PUBLICATION_DATE,
      totalBudget: fundingTotals['City Funds'] + fundingTotals['Federal Funds'] + fundingTotals['State Funds'],
      levels: 3,
    },
    generatedAt: new Date(),
  };

  await db.insert(sankeyDatasets).values(dataset);

  console.log(`[Budget Sankey] Generated: ${nodes.length} nodes, ${links.length} links\n`);
}

// ============================================================================
// PENSION SANKEY - REAL DATA FROM NYC OPEN DATA APIs
// ============================================================================

// Asset class mapping to standardize bucket names
const ASSET_CLASS_BUCKETS = {
  'EQUITY': 'Public Equity',
  'PUBLIC EQUITY': 'Public Equity',
  'FIXED INCOME': 'Fixed Income',
  'CORE FIXED INCOME': 'Fixed Income',
  'OPPORTUNISTIC FIXED INCOME': 'Fixed Income',
  'HIGH YIELD': 'Fixed Income',
  'ALTERNATIVES': 'Alternatives',
  'PRIVATE EQUITY': 'Alternatives',
  'REAL ESTATE': 'Alternatives',
  'HEDGE FUNDS': 'Alternatives',
  'INFRASTRUCTURE': 'Alternatives',
  'CASH': 'Cash',
  'CASH EQUIVALENTS': 'Cash'
};

// Investment type to sub-asset mapping
const INVESTMENT_TYPE_MAPPING = {
  'DOMESTIC EQUITY': 'Domestic Equity',
  'US EQUITY': 'Domestic Equity',
  'INTERNATIONAL EQUITY': 'World ex-USA Equity',
  'DEVELOPED MARKETS EQUITY': 'World ex-USA Equity',
  'EMERGING MARKETS EQUITY': 'Emerging Markets Equity',
  'GLOBAL EQUITY': 'Global Equity',
  'CORPORATE BONDS': 'Corporate Bonds',
  'GOVERNMENT BONDS': 'Government Bonds',
  'TREASURY': 'Government Bonds',
  'TIPS': 'TIPS',
  'HIGH YIELD': 'High Yield',
  'BANK LOANS': 'Bank Loans',
  'PRIVATE EQUITY': 'Private Equity',
  'REAL ESTATE': 'Real Estate',
  'HEDGE FUNDS': 'Hedge Funds',
  'INFRASTRUCTURE': 'Infrastructure',
  'CASH': 'Cash'
};

function categorizeAsset(assetClass, investmentType) {
  const normalizedClass = (assetClass || '').toUpperCase().trim();
  const normalizedType = (investmentType || '').toUpperCase().trim();

  // Determine bucket
  let bucket = ASSET_CLASS_BUCKETS[normalizedClass] || 'Other';

  // More specific bucket determination based on investment type
  if (normalizedType.includes('HIGH YIELD') || normalizedType.includes('BANK LOAN')) {
    bucket = 'Fixed Income';
  } else if (normalizedType.includes('PRIVATE EQUITY') || normalizedType.includes('REAL ESTATE') ||
             normalizedType.includes('HEDGE') || normalizedType.includes('INFRASTRUCTURE')) {
    bucket = 'Alternatives';
  } else if (normalizedType.includes('EQUITY')) {
    bucket = 'Public Equity';
  } else if (normalizedType.includes('BOND') || normalizedType.includes('TREASURY') || normalizedType.includes('TIPS')) {
    bucket = 'Fixed Income';
  } else if (normalizedType.includes('CASH')) {
    bucket = 'Cash';
  }

  // Determine sub-asset
  let subAsset = INVESTMENT_TYPE_MAPPING[normalizedType];

  if (!subAsset) {
    // Fuzzy matching
    if (normalizedType.includes('DOMESTIC') || normalizedType.includes('US ')) {
      subAsset = 'Domestic Equity';
    } else if (normalizedType.includes('INTERNATIONAL') || normalizedType.includes('DEVELOPED')) {
      subAsset = 'World ex-USA Equity';
    } else if (normalizedType.includes('EMERGING')) {
      subAsset = 'Emerging Markets Equity';
    } else if (normalizedType.includes('GLOBAL')) {
      subAsset = 'Global Equity';
    } else if (normalizedType.includes('CORPORATE BOND') || normalizedType.includes('GOVERNMENT')) {
      subAsset = 'Corporate Bonds';
    } else if (normalizedType.includes('HIGH YIELD')) {
      subAsset = 'High Yield';
    } else if (normalizedType.includes('PRIVATE EQUITY')) {
      subAsset = 'Private Equity';
    } else if (normalizedType.includes('REAL ESTATE')) {
      subAsset = 'Real Estate';
    } else if (normalizedType.includes('HEDGE')) {
      subAsset = 'Hedge Funds';
    } else {
      subAsset = toTitleCase(investmentType) || 'Other';
    }
  }

  return { bucket, subAsset: toTitleCase(subAsset) };
}

async function fetchFundHoldings(datasetId, fundId) {
  console.log(`  Fetching holdings for ${fundId}...`);

  const API_BASE = `https://data.cityofnewyork.us/resource/${datasetId}.json`;

  // First, get the most recent period_end_date
  // Use raw fetch for this simple query
  const dateUrl = `${API_BASE}?$select=period_end_date&$group=period_end_date&$order=period_end_date DESC&$limit=1`;
  const dateResponse = await fetch(dateUrl);
  if (!dateResponse.ok) {
    console.error(`    Failed to fetch date for ${fundId}`);
    return [];
  }
  const dateData = await dateResponse.json();
  const latestPeriodDate = dateData[0]?.period_end_date;

  if (!latestPeriodDate) {
    console.error(`    Could not find period_end_date for ${fundId}`);
    return [];
  }

  console.log(`    Using period: ${latestPeriodDate}`);

  const records = await fetchNycOpenData(API_BASE, {
    limit: 50000,
    params: {
      period_end_date: latestPeriodDate,
    },
  });

  console.log(`    Fetched ${records.length} holdings`);
  return records;
}

/**
 * Generate Pension Sankey (System → Funds → Asset Buckets → Sub-Assets)
 * Fetches real holdings data from NYC Open Data APIs
 * 4 levels: System → Fund → Bucket → Sub-Asset
 */
async function generatePensionSankey(db) {
  console.log('[Pension Sankey] Fetching real holdings from NYC Open Data...\n');

  // Fetch holdings from all 5 pension funds
  const fundData = new Map();
  for (const fund of PENSION_FUNDS) {
    const holdings = await fetchFundHoldings(fund.datasetId, fund.id);
    fundData.set(fund.id, {
      label: fund.label,
      holdings
    });
  }

  // Transform to Sankey structure
  const nodes = [];
  const links = [];
  const nodeIds = new Set();

  // Root node
  const rootId = 'NYC_Pensions';
  nodes.push({
    id: rootId,
    label: 'New York City Pension System',
    level: 0,
    type: 'system'
  });
  nodeIds.add(rootId);

  let systemTotal = 0;

  // Process each fund
  for (const [fundId, fundInfo] of fundData.entries()) {
    // Add fund node
    if (!nodeIds.has(fundId)) {
      nodes.push({
        id: fundId,
        label: fundInfo.label,
        level: 1,
        type: 'fund'
      });
      nodeIds.add(fundId);
    }

    // Aggregate by asset bucket and sub-asset (nested map)
    const bucketMap = new Map(); // bucket -> Map(subAsset -> value)
    let fundTotal = 0;

    for (const holding of fundInfo.holdings) {
      const marketValue = parseFloat(holding.base_market_value || 0);
      if (marketValue <= 0) continue;

      const assetClass = holding.asset_class || 'Unknown';
      const investmentType = holding.investment_type_name || 'Other';

      const { bucket, subAsset } = categorizeAsset(assetClass, investmentType);

      if (!bucketMap.has(bucket)) {
        bucketMap.set(bucket, new Map());
      }
      const subAssetMap = bucketMap.get(bucket);

      if (!subAssetMap.has(subAsset)) {
        subAssetMap.set(subAsset, 0);
      }
      subAssetMap.set(subAsset, subAssetMap.get(subAsset) + marketValue);

      fundTotal += marketValue;
    }

    // Add link from system to fund
    if (fundTotal > 0) {
      links.push({
        source: rootId,
        target: fundId,
        value: fundTotal / 1000000, // Convert to millions
      });
      systemTotal += fundTotal;
    }

    // Add bucket nodes and links (level 2)
    for (const [bucketName, subAssetMap] of bucketMap.entries()) {
      const bucketId = bucketName;

      // Add bucket node if not exists
      if (!nodeIds.has(bucketId)) {
        nodes.push({
          id: bucketId,
          label: bucketName,
          level: 2,
          type: 'bucket'
        });
        nodeIds.add(bucketId);
      }

      // Calculate bucket total from sub-assets
      let bucketTotal = 0;
      for (const value of subAssetMap.values()) {
        bucketTotal += value;
      }

      // Link fund to bucket
      if (bucketTotal > 0) {
        links.push({
          source: fundId,
          target: bucketId,
          value: bucketTotal / 1000000, // Convert to millions
        });
      }

      // Add sub-asset nodes and links (level 3)
      for (const [subAssetName, value] of subAssetMap.entries()) {
        const subAssetId = subAssetName;

        // Add sub-asset node if not exists
        if (!nodeIds.has(subAssetId)) {
          nodes.push({
            id: subAssetId,
            label: subAssetName,
            level: 3,
            type: 'sub-asset'
          });
          nodeIds.add(subAssetId);
        }

        // Link bucket to sub-asset
        if (value > 0) {
          links.push({
            source: bucketId,
            target: subAssetId,
            value: value / 1000000, // Convert to millions
          });
        }
      }
    }
  }

  const totalAumBillion = systemTotal / 1e9;

  const dataset = {
    id: 'pension-2025',
    label: 'NYC Pension System Asset Allocation',
    description: 'Real holdings showing System → Funds → Asset Buckets → Investment Types',
    fiscalYear: FISCAL_YEAR,
    dataType: 'pension',
    units: 'USD (millions)',
    nodes,
    links,
    metadata: {
      source: 'NYC Open Data - Comptroller Pension Holdings',
      total_aum_billion: totalAumBillion,
      funds_included: Array.from(fundData.keys()),
      levels: 4,
    },
    generatedAt: new Date(),
  };

  await db.insert(sankeyDatasets).values(dataset);

  console.log(`[Pension Sankey] Generated: ${nodes.length} nodes, ${links.length} links`);
  console.log(`[Pension Sankey] Total AUM: $${totalAumBillion.toFixed(1)}B\n`);
}

/**
 * Generate Revenue Sunburst (Top Level → Category → Class → Source)
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

  // Build 4-level hierarchy: Top Level → Category → Class → Source
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

    // Skip if category matches top-level (e.g., "TAXES" category under "Taxes" top-level)
    // This prevents duplicate "Taxes" hierarchy
    const normalizedCategory = comptrollerCategory.toUpperCase().trim();
    if (topLevel === 'Taxes' && normalizedCategory === 'TAXES') {
      // Use the class directly under the top-level to avoid duplicate "Taxes"
      if (!hierarchy.has(topLevel)) {
        hierarchy.set(topLevel, new Map());
      }
      const topLevelMap = hierarchy.get(topLevel);

      const normalizedClass = toTitleCase(comptrollerClass);
      if (!topLevelMap.has(normalizedClass)) {
        topLevelMap.set(normalizedClass, new Map());
      }
      const classMap = topLevelMap.get(normalizedClass);

      const normalizedSource = toTitleCase(sourceName);
      if (!classMap.has(normalizedSource)) {
        classMap.set(normalizedSource, 0);
      }
      classMap.set(normalizedSource, classMap.get(normalizedSource) + amount);
    } else {
      // Normal hierarchy with all levels
      if (!hierarchy.has(topLevel)) {
        hierarchy.set(topLevel, new Map());
      }
      const topLevelMap = hierarchy.get(topLevel);

      const normalizedCategory = toTitleCase(comptrollerCategory);
      if (!topLevelMap.has(normalizedCategory)) {
        topLevelMap.set(normalizedCategory, new Map());
      }
      const categoryMap = topLevelMap.get(normalizedCategory);

      const normalizedClass = toTitleCase(comptrollerClass);
      if (!categoryMap.has(normalizedClass)) {
        categoryMap.set(normalizedClass, new Map());
      }
      const classMap = categoryMap.get(normalizedClass);

      const normalizedSource = toTitleCase(sourceName);
      if (!classMap.has(normalizedSource)) {
        classMap.set(normalizedSource, 0);
      }
      classMap.set(normalizedSource, classMap.get(normalizedSource) + amount);
    }

    totalRevenue += amount;
  }

  // Build sunburst structure: 3 levels for Taxes (skip duplicate), 4 levels for others
  const children = [];

  for (const [topLevelName, categories] of hierarchy.entries()) {
    const topLevelChildren = [];

    for (const [categoryName, classes] of categories.entries()) {
      // Check if this is a Map (normal 4-level) or has sources directly (3-level for Taxes)
      const firstValue = classes.values().next().value;
      const isDirectSources = typeof firstValue === 'number';

      if (isDirectSources) {
        // 3-level structure: Class → Source (for Taxes)
        const classChildren = [];
        for (const [sourceName, amount] of classes.entries()) {
          classChildren.push({
            name: sourceName,
            value: Math.abs(amount),
            actualValue: amount,
            isNegative: amount < 0
          });
        }

        if (classChildren.length > 0) {
          topLevelChildren.push({
            name: categoryName,
            children: classChildren
          });
        }
      } else {
        // 4-level structure: Category → Class → Source (normal)
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
    }

    if (topLevelChildren.length > 0) {
      children.push({
        name: topLevelName,
        children: topLevelChildren
      });
    }
  }

  const dataset = {
    id: `revenue-fy${FISCAL_YEAR}`,
    label: `NYC Revenue FY${FISCAL_YEAR}`,
    description: 'Revenue sources breakdown by category',
    fiscalYear: FISCAL_YEAR,
    dataType: 'revenue',
    units: 'USD',
    totalValue: totalRevenue,
    hierarchyData: {
      name: `NYC Revenue FY${FISCAL_YEAR}`,
      children
    },
    metadata: {
      source: 'NYC Open Data - Revenue Budget & Financial Plan (Dataset: ugzk-a6x4)',
      totalRevenue,
    },
    generatedAt: new Date(),
  };

  await db.insert(sunburstDatasets).values(dataset);

  console.log(`[Revenue Sunburst] Generated: ${children.length} top-level categories\n`);
}

/**
 * Generate Expense Sunburst (Category → Agency → Object Class)
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

  // Build 3-level hierarchy: High-Level Category → Agency → Object Class
  const hierarchy = new Map();
  let totalExpense = 0;

  for (const record of records) {
    const amount = parseFloat(record.current_modified_budget_amount || record.adopted_budget_amount || 0);
    if (amount === 0) continue;

    // Extract fields
    const agencyName = record.agency_name || 'Unknown';
    const objectClassName = record.object_class_name || 'Unknown';

    // Get high-level category
    const category = categorizeAgency(agencyName);

    // Normalize names for display
    const normalizedAgency = toTitleCase(agencyName);
    const normalizedObjectClass = normalizeObjectClass(objectClassName);

    // Initialize hierarchy levels
    if (!hierarchy.has(category)) {
      hierarchy.set(category, new Map());
    }
    const categoryMap = hierarchy.get(category);

    if (!categoryMap.has(normalizedAgency)) {
      categoryMap.set(normalizedAgency, new Map());
    }
    const agencyMap = categoryMap.get(normalizedAgency);

    // Aggregate by object class (no deeper levels)
    if (!agencyMap.has(normalizedObjectClass)) {
      agencyMap.set(normalizedObjectClass, 0);
    }
    agencyMap.set(normalizedObjectClass, agencyMap.get(normalizedObjectClass) + amount);

    totalExpense += amount;
  }

  // Build sunburst structure: 3 levels (Category → Agency → Object Class)
  const children = [];

  for (const [categoryName, agencies] of hierarchy.entries()) {
    const categoryChildren = [];

    for (const [agencyName, objectClasses] of agencies.entries()) {
      const agencyChildren = [];

      for (const [objectClassName, amount] of objectClasses.entries()) {
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

  const dataset = {
    id: `expense-fy${FISCAL_YEAR}`,
    label: `NYC Expenses FY${FISCAL_YEAR}`,
    description: 'Expense budget breakdown by category, agency, and object class',
    fiscalYear: FISCAL_YEAR,
    dataType: 'expense',
    units: 'USD',
    totalValue: totalExpense,
    hierarchyData: {
      name: `NYC Expenses FY${FISCAL_YEAR}`,
      children
    },
    metadata: {
      source: 'NYC Open Data - Budget (Dataset: fyxr-9vkh)',
      publicationDate: PUBLICATION_DATE,
      totalExpense,
    },
    generatedAt: new Date(),
  };

  await db.insert(sunburstDatasets).values(dataset);

  console.log(`[Expense Sunburst] Generated: ${children.length} top-level categories\n`);
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
