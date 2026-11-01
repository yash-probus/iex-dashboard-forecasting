const fs = require('fs');
const files = [
  'src/pages/SavingsCalculatorAnalysisPage.tsx',
  'src/pages/SavingsCalculatorPage.tsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // Update executeCalculation to fetch insights as well
  content = content.replace(
    'calculateSavings(calcEntry.id, m, selectedCalcVersion || undefined),\n          calculateMarketDecision(calcEntry.id, m, selectedCalcVersion || undefined)\n        ]);\n        if (!newCache[m]) newCache[m] = { calc: null, market: null, insights: null };\n        newCache[m].calc = savingsRes;\n        newCache[m].market = marketRes;',
    'calculateSavings(calcEntry.id, m, selectedCalcVersion || undefined),\n          calculateMarketDecision(calcEntry.id, m, selectedCalcVersion || undefined),\n          fetchDemandShiftInsights(calcEntry.id, m, selectedCalcVersion || undefined)\n        ]);\n        if (!newCache[m]) newCache[m] = { calc: null, market: null, insights: null };\n        newCache[m].calc = savingsRes;\n        newCache[m].market = marketRes;\n        newCache[m].insights = insightsRes;'
  );

  // Note: savingsRes, marketRes -> savingsRes, marketRes, insightsRes
  content = content.replace(
    'const [savingsRes, marketRes] = await Promise.all([',
    'const [savingsRes, marketRes, insightsRes] = await Promise.all(['
  );

  // Remove the second button
  const buttonRegex = /<Button\s+variant="contained"\s+startIcon={<PlayIcon \/>}\s+onClick={executeInsights}[\s\S]*?<\/Button>/;
  content = content.replace(buttonRegex, '');

  // Change "Run Simulation" button to "View"
  content = content.replace(
    /{calculating \? 'Analyzing\.\.\.' : 'Run Simulation'}/g,
    '{calculating ? \'Analyzing...\' : \'View\'}'
  );
  
  // Also change the empty state hint if it exists
  content = content.replace(
    /Click 'Run Simulation' to load the landed cost analysis for your configured months\./g,
    'Click \\'View\\' to load the landed cost analysis for your configured months.'
  );

  fs.writeFileSync(file, content);
  console.log(`Updated ${file}`);
});
