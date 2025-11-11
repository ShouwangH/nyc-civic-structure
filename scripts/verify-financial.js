#!/usr/bin/env node

// ABOUTME: Validates financial seed data quality by checking structure and totals
// ABOUTME: Verifies sankey and sunburst datasets match expected format and values

import { sankeyDatasets, sunburstDatasets } from '../server/lib/schema.ts';
import { initDb, closeDb, formatNumber } from './lib/seed-utils.js';

async function main() {
  const { db, client } = initDb();

  try {
    console.log('===================================');
    console.log('   FINANCIAL DATA VERIFICATION    ');
    console.log('===================================\n');

    // Fetch all sankey datasets
    const sankeyData = await db.select().from(sankeyDatasets).execute();
    const sunburstData = await db.select().from(sunburstDatasets).execute();

    console.log(`Total Sankey Datasets: ${sankeyData.length}`);
    console.log(`Total Sunburst Datasets: ${sunburstData.length}\n`);

    // Validate Sankey Datasets
    console.log('=== SANKEY DATASETS ===\n');
    for (const dataset of sankeyData) {
      console.log(`ID: ${dataset.id}`);
      console.log(`Label: ${dataset.label}`);
      console.log(`Type: ${dataset.dataType}`);
      console.log(`Fiscal Year: ${dataset.fiscalYear}`);
      console.log(`Nodes: ${dataset.nodes?.length || 0}`);
      console.log(`Links: ${dataset.links?.length || 0}`);

      // Calculate total flow
      const totalFlow = dataset.links?.reduce((sum, link) => sum + (link.value || 0), 0) || 0;
      console.log(`Total Flow: $${formatNumber(totalFlow.toFixed(0))}`);

      // Check for level 0 nodes (root/sources)
      const level0Nodes = dataset.nodes?.filter(n => n.level === 0) || [];
      console.log(`Level 0 Nodes: ${level0Nodes.length}`);
      level0Nodes.forEach(n => console.log(`  - ${n.label}`));

      // Check for level 1 nodes
      const level1Nodes = dataset.nodes?.filter(n => n.level === 1) || [];
      console.log(`Level 1 Nodes: ${level1Nodes.length}`);

      // Check for level 2 nodes
      const level2Nodes = dataset.nodes?.filter(n => n.level === 2) || [];
      console.log(`Level 2 Nodes: ${level2Nodes.length}`);

      console.log('');
    }

    // Validate Sunburst Datasets
    console.log('=== SUNBURST DATASETS ===\n');
    for (const dataset of sunburstData) {
      console.log(`ID: ${dataset.id}`);
      console.log(`Label: ${dataset.label}`);
      console.log(`Type: ${dataset.dataType}`);
      console.log(`Fiscal Year: ${dataset.fiscalYear}`);
      console.log(`Total Value: $${formatNumber((dataset.totalValue || 0).toFixed(0))}`);

      // Analyze hierarchy depth
      const hierarchy = dataset.hierarchyData;
      if (hierarchy && hierarchy.children) {
        console.log(`Top-level Categories: ${hierarchy.children.length}`);

        // Count total leaf nodes (items with actual values)
        let leafCount = 0;
        let totalLeafValue = 0;

        function countLeaves(node) {
          if (!node.children) {
            // Leaf node
            leafCount++;
            totalLeafValue += node.value || 0;
          } else {
            node.children.forEach(countLeaves);
          }
        }

        hierarchy.children.forEach(countLeaves);
        console.log(`Total Leaf Nodes: ${leafCount}`);
        console.log(`Sum of Leaf Values: $${formatNumber(totalLeafValue.toFixed(0))}`);

        // Show top-level breakdown
        console.log('Top-level Categories:');
        for (const topLevel of hierarchy.children) {
          // Calculate total for this category
          let categoryTotal = 0;
          function sumCategory(node) {
            if (!node.children) {
              categoryTotal += node.value || 0;
            } else {
              node.children.forEach(sumCategory);
            }
          }
          sumCategory(topLevel);

          const percentage = dataset.totalValue ? (categoryTotal / dataset.totalValue * 100).toFixed(1) : 0;
          console.log(`  ${topLevel.name}: $${formatNumber(categoryTotal.toFixed(0))} (${percentage}%)`);
        }
      }

      console.log('');
    }

    // Data quality checks
    console.log('=== DATA QUALITY CHECKS ===\n');

    let issues = [];

    // Check for expected datasets
    const expectedSankey = ['budget-fy2025', 'pension-2025'];
    const expectedSunburst = ['revenue-fy2025', 'expense-fy2025'];

    for (const id of expectedSankey) {
      if (!sankeyData.find(d => d.id === id)) {
        issues.push(`Missing expected Sankey dataset: ${id}`);
      }
    }

    for (const id of expectedSunburst) {
      if (!sunburstData.find(d => d.id === id)) {
        issues.push(`Missing expected Sunburst dataset: ${id}`);
      }
    }

    // Check for reasonable budget values (NYC budget is ~$100B)
    const budgetSankey = sankeyData.find(d => d.id === 'budget-fy2025');
    if (budgetSankey) {
      const totalBudget = budgetSankey.metadata?.totalBudget || 0;
      if (totalBudget < 80e9 || totalBudget > 120e9) {
        issues.push(`Budget total seems unusual: $${formatNumber(totalBudget.toFixed(0))} (expected ~$100B)`);
      }
    }

    // Check revenue sunburst total
    const revenueSunburst = sunburstData.find(d => d.id === 'revenue-fy2025');
    if (revenueSunburst) {
      const totalRevenue = revenueSunburst.totalValue || 0;
      if (totalRevenue < 80e9 || totalRevenue > 120e9) {
        issues.push(`Revenue total seems unusual: $${formatNumber(totalRevenue.toFixed(0))} (expected ~$100B)`);
      }
    }

    // Check expense sunburst total
    const expenseSunburst = sunburstData.find(d => d.id === 'expense-fy2025');
    if (expenseSunburst) {
      const totalExpense = expenseSunburst.totalValue || 0;
      if (totalExpense < 80e9 || totalExpense > 120e9) {
        issues.push(`Expense total seems unusual: $${formatNumber(totalExpense.toFixed(0))} (expected ~$100B)`);
      }
    }

    // Check that revenue and expense are roughly balanced
    if (revenueSunburst && expenseSunburst) {
      const revTotal = revenueSunburst.totalValue || 0;
      const expTotal = expenseSunburst.totalValue || 0;
      const difference = Math.abs(revTotal - expTotal);
      const percentDiff = (difference / revTotal * 100).toFixed(1);

      console.log(`Revenue vs Expense:`);
      console.log(`  Revenue: $${formatNumber(revTotal.toFixed(0))}`);
      console.log(`  Expense: $${formatNumber(expTotal.toFixed(0))}`);
      console.log(`  Difference: $${formatNumber(difference.toFixed(0))} (${percentDiff}%)`);
      console.log('');

      if (percentDiff > 10) {
        issues.push(`Revenue and expense differ by ${percentDiff}% (expected within 10%)`);
      }
    }

    if (issues.length === 0) {
      console.log('✓ No data quality issues detected\n');
    } else {
      console.log('⚠ Data quality issues detected:\n');
      issues.forEach((issue, i) => {
        console.log(`${i + 1}. ${issue}`);
      });
      console.log('');
    }

    console.log('===================================\n');

  } catch (error) {
    console.error('\n[ERROR] Verification failed:', error);
    process.exit(1);
  } finally {
    await closeDb(client);
  }
}

main();
