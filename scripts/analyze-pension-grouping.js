#!/usr/bin/env node

// ABOUTME: Analyze pension holdings to verify asset class grouping

import { config } from 'dotenv';
import { initDb, closeDb, fetchNycOpenData } from './lib/seed-utils.js';

config();

const PENSION_FUNDS = [
  { id: 'NYCERS', label: 'NYC Employees\' Retirement System', datasetId: 'p3e6-t4zv' },
  { id: 'BERS', label: 'Board of Education Retirement System', datasetId: 'fypi-ruxh' },
  { id: 'POLICE', label: 'Police Pension Fund', datasetId: 'dy3p-ay2d' },
  { id: 'TRS', label: 'Teachers\' Retirement System', datasetId: '5u2d-n46s' },
  { id: 'FIRE', label: 'Fire Department Pension Fund', datasetId: '95aa-k2ka' },
];

// Same categorization logic as in seed-financial.js
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

function categorizeAsset(assetClass, investmentType) {
  const normalizedClass = (assetClass || '').toUpperCase().trim();
  const normalizedType = (investmentType || '').toUpperCase().trim();

  let bucket = ASSET_CLASS_BUCKETS[normalizedClass] || 'Other';

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

  return bucket;
}

async function fetchFundHoldings(datasetId, fundId) {
  console.log(`\nFetching holdings for ${fundId}...`);

  const API_BASE = `https://data.cityofnewyork.us/resource/${datasetId}.json`;

  // Get the most recent period_end_date
  const dateUrl = `${API_BASE}?$select=period_end_date&$group=period_end_date&$order=period_end_date DESC&$limit=1`;
  const dateResponse = await fetch(dateUrl);
  if (!dateResponse.ok) {
    console.error(`  Failed to fetch date for ${fundId}`);
    return [];
  }
  const dateData = await dateResponse.json();
  const latestPeriodDate = dateData[0]?.period_end_date;

  if (!latestPeriodDate) {
    console.error(`  Could not find period_end_date for ${fundId}`);
    return [];
  }

  console.log(`  Using period: ${latestPeriodDate}`);

  const records = await fetchNycOpenData(API_BASE, {
    limit: 50000,
    params: {
      period_end_date: latestPeriodDate,
    },
  });

  console.log(`  Fetched ${records.length} holdings`);
  return records;
}

function formatCurrency(value) {
  if (value >= 1e9) {
    return `$${(value / 1e9).toFixed(2)}B`;
  } else if (value >= 1e6) {
    return `$${(value / 1e6).toFixed(2)}M`;
  } else {
    return `$${(value / 1e3).toFixed(2)}K`;
  }
}

async function analyzeFund(fund) {
  console.log('\n' + '='.repeat(80));
  console.log(`${fund.label} (${fund.id})`);
  console.log('='.repeat(80));

  let holdings;
  try {
    holdings = await fetchFundHoldings(fund.datasetId, fund.id);
  } catch (error) {
    console.log(`  Error fetching data: ${error.message}`);
    console.log('  Skipping this fund\n');
    return;
  }

  if (holdings.length === 0) {
    console.log('  No holdings found\n');
    return;
  }

  // Aggregate by investment type
  const typeMap = new Map();

  for (const holding of holdings) {
    const marketValue = parseFloat(holding.base_market_value || 0);
    if (marketValue <= 0) continue;

    const assetClass = holding.asset_class || 'Unknown';
    const investmentType = holding.investment_type_name || 'Other';
    const bucket = categorizeAsset(assetClass, investmentType);

    const key = `${investmentType}|||${assetClass}|||${bucket}`;

    if (!typeMap.has(key)) {
      typeMap.set(key, {
        investmentType,
        assetClass,
        bucket,
        value: 0,
        count: 0,
      });
    }

    const entry = typeMap.get(key);
    entry.value += marketValue;
    entry.count += 1;
  }

  // Sort by value and get top 10
  const sorted = Array.from(typeMap.values())
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  console.log('\nTop 10 Investment Types:\n');
  console.log('Rank | Investment Type | Asset Class | → Bucket | Value | Holdings');
  console.log('-'.repeat(120));

  sorted.forEach((entry, idx) => {
    const rank = (idx + 1).toString().padStart(2);
    const type = entry.investmentType.padEnd(35);
    const assetClass = entry.assetClass.padEnd(25);
    const bucket = entry.bucket.padEnd(15);
    const value = formatCurrency(entry.value).padStart(12);
    const count = entry.count.toString().padStart(6);

    console.log(`${rank}   | ${type} | ${assetClass} | → ${bucket} | ${value} | ${count}`);
  });

  // Show bucket totals
  const bucketTotals = new Map();
  for (const entry of typeMap.values()) {
    if (!bucketTotals.has(entry.bucket)) {
      bucketTotals.set(entry.bucket, 0);
    }
    bucketTotals.set(entry.bucket, bucketTotals.get(entry.bucket) + entry.value);
  }

  console.log('\nBucket Totals:');
  const sortedBuckets = Array.from(bucketTotals.entries())
    .sort((a, b) => b[1] - a[1]);

  for (const [bucket, value] of sortedBuckets) {
    const bucketName = bucket.padEnd(20);
    const bucketValue = formatCurrency(value).padStart(12);
    console.log(`  ${bucketName}: ${bucketValue}`);
  }
}

async function main() {
  console.log('\n========================================');
  console.log('   PENSION GROUPING ANALYSIS');
  console.log('========================================');

  for (const fund of PENSION_FUNDS) {
    await analyzeFund(fund);
  }

  console.log('\n========================================');
  console.log('   ANALYSIS COMPLETE');
  console.log('========================================\n');
}

main().catch(console.error);
