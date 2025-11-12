#!/usr/bin/env node

// ABOUTME: Analyze specific Limited Partnership Units holdings

import { config } from 'dotenv';
import { fetchNycOpenData } from './lib/seed-utils.js';

config();

const NYCERS_DATASET = 'p3e6-t4zv';

async function fetchLimitedPartnershipUnits() {
  console.log('\n========================================');
  console.log('   LIMITED PARTNERSHIP UNITS ANALYSIS');
  console.log('========================================\n');

  const API_BASE = `https://data.cityofnewyork.us/resource/${NYCERS_DATASET}.json`;

  // Get the most recent period
  const dateUrl = `${API_BASE}?$select=period_end_date&$group=period_end_date&$order=period_end_date DESC&$limit=1`;
  const dateResponse = await fetch(dateUrl);
  const dateData = await dateResponse.json();
  const latestPeriodDate = dateData[0]?.period_end_date;

  console.log(`Fetching NYCERS holdings for period: ${latestPeriodDate}\n`);

  // Fetch holdings that are "LMTD PARTNRSHIP UNTS"
  const records = await fetchNycOpenData(API_BASE, {
    limit: 1000, // Get top 1000
    params: {
      period_end_date: latestPeriodDate,
      investment_type_name: 'LMTD PARTNRSHIP UNTS',
    },
  });

  console.log(`Found ${records.length} Limited Partnership Units\n`);

  // Sort by market value
  const sorted = records
    .map(r => ({
      name: r.security_name || 'Unknown',
      ticker: r.ticker_symbol || 'N/A',
      cusip: r.cusip || 'N/A',
      assetClass: r.asset_class || 'Unknown',
      investmentType: r.investment_type_name || 'Unknown',
      marketValue: parseFloat(r.base_market_value || 0),
      shares: parseFloat(r.shares || 0),
    }))
    .filter(h => h.marketValue > 0)
    .sort((a, b) => b.marketValue - a.marketValue)
    .slice(0, 50); // Top 50

  console.log('Top 50 Limited Partnership Unit Holdings:\n');
  console.log('Rank | Security Name | Ticker | Market Value | Asset Class');
  console.log('-'.repeat(120));

  sorted.forEach((holding, idx) => {
    const rank = (idx + 1).toString().padStart(2);
    const name = holding.name.substring(0, 50).padEnd(50);
    const ticker = holding.ticker.padEnd(8);
    const value = `$${(holding.marketValue / 1e6).toFixed(1)}M`.padStart(12);
    const assetClass = holding.assetClass.padEnd(20);

    console.log(`${rank}   | ${name} | ${ticker} | ${value} | ${assetClass}`);
  });

  // Analyze patterns
  console.log('\n\nPattern Analysis:');
  console.log('='.repeat(80));

  // Count by name patterns
  const patterns = {
    'ETF/Fund': 0,
    'Index': 0,
    'Trust': 0,
    'LP/Partnership': 0,
    'Other': 0,
  };

  for (const holding of sorted) {
    const name = holding.name.toUpperCase();
    if (name.includes('ETF') || name.includes('FUND') || name.includes('INDEX')) {
      patterns['ETF/Fund']++;
    } else if (name.includes('INDEX')) {
      patterns['Index']++;
    } else if (name.includes('TRUST')) {
      patterns['Trust']++;
    } else if (name.includes(' LP') || name.includes('PARTNERSHIP') || name.includes('PARTNERS')) {
      patterns['LP/Partnership']++;
    } else {
      patterns['Other']++;
    }
  }

  console.log('\nTop 50 Holdings by Type:');
  for (const [pattern, count] of Object.entries(patterns)) {
    console.log(`  ${pattern.padEnd(20)}: ${count}`);
  }

  // Calculate total value
  const totalValue = sorted.reduce((sum, h) => sum + h.marketValue, 0);
  console.log(`\nTotal Value (top 50): $${(totalValue / 1e9).toFixed(2)}B`);

  console.log('\n========================================\n');
}

fetchLimitedPartnershipUnits().catch(console.error);
