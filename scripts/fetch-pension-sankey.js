#!/usr/bin/env node

// ABOUTME: Fetches NYC pension fund holdings data from Open Data API and generates sankey visualization
// ABOUTME: Transforms pension holdings into hierarchical sankey format showing System → Fund → Asset Class → Investment Type flows

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, '../.env') });

// NYC Open Data credentials (not currently used - public API works without token)
// const APP_TOKEN = process.env.OD_KEY_ID;

// Pension fund datasets on NYC Open Data
const PENSION_FUNDS = [
  {
    id: 'NYCERS',
    label: 'NYC Employees\' Retirement System (NYCERS)',
    datasetId: 'p3e6-t4zv'
  },
  {
    id: 'BERS',
    label: 'Board of Education Retirement System (BERS)',
    datasetId: 'fypi-ruxh'
  },
  {
    id: 'POLICE',
    label: 'Police Pension Fund',
    datasetId: 'dy3p-ay2d'
  },
  {
    id: 'TRS',
    label: 'Teachers\' Retirement System (TRS)',
    datasetId: '5u2d-n46s'
  },
  {
    id: 'FIRE',
    label: 'Fire Department Pension Fund',
    datasetId: '95aa-k2ka'
  }
];

// Asset class mapping to standardize bucket names
const ASSET_CLASS_BUCKETS = {
  'EQUITY': 'Public Equity',
  'PUBLIC EQUITY': 'Public Equity',
  'FIXED INCOME': 'Fixed Income - Core',
  'CORE FIXED INCOME': 'Fixed Income - Core',
  'OPPORTUNISTIC FIXED INCOME': 'Fixed Income - Opportunistic',
  'HIGH YIELD': 'Fixed Income - Opportunistic',
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
  'CORPORATE BONDS': 'Structured/Core Bonds',
  'GOVERNMENT BONDS': 'Structured/Core Bonds',
  'TREASURY': 'Structured/Core Bonds',
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
    bucket = 'Fixed Income - Opportunistic';
  } else if (normalizedType.includes('PRIVATE EQUITY') || normalizedType.includes('REAL ESTATE') ||
             normalizedType.includes('HEDGE') || normalizedType.includes('INFRASTRUCTURE')) {
    bucket = 'Alternatives';
  } else if (normalizedType.includes('EQUITY')) {
    bucket = 'Public Equity';
  } else if (normalizedType.includes('BOND') || normalizedType.includes('TREASURY') || normalizedType.includes('TIPS')) {
    bucket = 'Fixed Income - Core';
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
      subAsset = 'Structured/Core Bonds';
    } else if (normalizedType.includes('HIGH YIELD')) {
      subAsset = 'High Yield';
    } else if (normalizedType.includes('PRIVATE EQUITY')) {
      subAsset = 'Private Equity';
    } else if (normalizedType.includes('REAL ESTATE')) {
      subAsset = 'Real Estate';
    } else if (normalizedType.includes('HEDGE')) {
      subAsset = 'Hedge Funds';
    } else {
      subAsset = investmentType || 'Other';
    }
  }

  return { bucket, subAsset };
}

async function fetchFundHoldings(datasetId, fundId) {
  console.log(`Fetching holdings for ${fundId} (dataset: ${datasetId})...`);

  const API_BASE = `https://data.cityofnewyork.us/resource/${datasetId}.json`;

  // First, get the most recent period_end_date
  const dateResponse = await fetch(`${API_BASE}?$select=period_end_date&$group=period_end_date&$order=period_end_date DESC&$limit=1`);
  const dateData = await dateResponse.json();
  const latestPeriodDate = dateData[0]?.period_end_date;

  if (!latestPeriodDate) {
    console.error(`Could not find period_end_date for ${fundId}`);
    return [];
  }

  console.log(`  Using most recent period: ${latestPeriodDate}`);

  const limit = 50000;
  let offset = 0;
  let allRecords = [];
  let hasMore = true;

  while (hasMore) {
    const params = new URLSearchParams({
      period_end_date: latestPeriodDate,
      $limit: limit,
      $offset: offset,
      $order: 'security_name'
    });

    const url = `${API_BASE}?${params}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.error(`HTTP error for ${fundId}! status: ${response.status}`);
        break;
      }

      const records = await response.json();

      if (records.length === 0) {
        break;
      }

      allRecords = allRecords.concat(records);

      if (records.length < limit) {
        hasMore = false;
      } else {
        offset += limit;
      }
    } catch (error) {
      console.error(`Error fetching ${fundId}:`, error.message);
      break;
    }
  }

  console.log(`  Fetched ${allRecords.length} holdings for ${fundId}`);
  return allRecords;
}

async function fetchAllPensionData() {
  const fundData = new Map();

  for (const fund of PENSION_FUNDS) {
    const holdings = await fetchFundHoldings(fund.datasetId, fund.id);
    fundData.set(fund.id, {
      label: fund.label,
      holdings
    });
  }

  return fundData;
}

function transformToSankey(fundData) {
  console.log('\nTransforming pension holdings to sankey format...');

  // Build hierarchy: System → Fund → Asset Bucket → Sub-Asset
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

  for (const [fundId, fundInfo] of fundData.entries()) {
    // Add fund node
    const fundNodeId = fundId;
    if (!nodeIds.has(fundNodeId)) {
      nodes.push({
        id: fundNodeId,
        label: fundInfo.label,
        level: 1,
        type: 'fund'
      });
      nodeIds.add(fundNodeId);
    }

    // Aggregate by asset bucket and sub-asset
    const bucketMap = new Map();
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
        target: fundNodeId,
        value: fundTotal,
        type: 'system_to_fund'
      });
      systemTotal += fundTotal;
    }

    // Add bucket nodes and links
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

      let bucketTotal = 0;
      for (const value of subAssetMap.values()) {
        bucketTotal += value;
      }

      // Link fund to bucket
      if (bucketTotal > 0) {
        links.push({
          source: fundNodeId,
          target: bucketId,
          value: bucketTotal,
          type: 'fund_to_bucket'
        });
      }

      // Add sub-asset nodes and links
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
            value: value,
            type: 'bucket_to_subasset'
          });
        }
      }
    }
  }

  console.log(`Total system value: $${(systemTotal / 1e6).toFixed(0)}M`);
  console.log(`Total nodes: ${nodes.length}`);
  console.log(`Total links: ${links.length}`);

  return {
    units: 'USD',
    description: `NYC Pension System hierarchy: System → Fund → Asset Bucket → Sub-Asset`,
    meta: {
      source: 'NYC Open Data - Comptroller Pension Holdings',
      funds_included: Array.from(fundData.keys()),
      generated_at: new Date().toISOString(),
      total_value: systemTotal
    },
    nodes,
    links
  };
}

async function main() {
  try {
    const fundData = await fetchAllPensionData();
    const sankeyData = transformToSankey(fundData);

    const outputPath = path.join(__dirname, '../public/data/nyc_pension_sankey_generated.json');
    fs.writeFileSync(outputPath, JSON.stringify(sankeyData, null, 2));

    console.log(`\n✓ Pension sankey saved to: ${outputPath}`);
    console.log(`  Funds included: ${sankeyData.meta.funds_included.join(', ')}`);
    console.log(`  Total value: $${(sankeyData.meta.total_value / 1e9).toFixed(2)}B`);
  } catch (error) {
    console.error('Error generating pension sankey:', error);
    process.exit(1);
  }
}

main();
