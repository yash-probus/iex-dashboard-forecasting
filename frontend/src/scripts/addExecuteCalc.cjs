const fs = require('fs');
const path = require('path');

const analysisPath = path.join(__dirname, '../../src/pages/SavingsCalculatorAnalysisPage.tsx');
let code = fs.readFileSync(analysisPath, 'utf8');

const execCalcFunc = `  const executeCalculation = async () => {
    if (!calcEntry) return;
    try {
      setCalculating(true);
      const months = ['all', ...Object.keys(calcEntry.todConsumptions || {}).sort()];
      
      const newCache: Record<string, any> = { ...cachedResults };
      
      await Promise.all(months.map(async (m) => {
        const [savingsRes, marketRes] = await Promise.all([
          calculateSavings(calcEntry.id, m, selectedCalcVersion || undefined),
          calculateMarketDecision(calcEntry.id, m, selectedCalcVersion || undefined)
        ]);
        if (!newCache[m]) newCache[m] = { calc: null, market: null, insights: null };
        newCache[m].calc = savingsRes;
        newCache[m].market = marketRes;
      }));
      
      setCachedResults(newCache);
      setCalcTab(0);
    } catch (err: any) {
      console.error('Calculation failed:', err);
      setSnackbar({
        open: true,
        message: err.message || 'Calculations failed.',
        severity: 'error'
      });
    } finally {
      setCalculating(false);
    }
  };
`;

if (!code.includes('const executeCalculation = async () =>')) {
  // Insert before executeGraphSimulation
  code = code.replace(
    'const executeGraphSimulation = async () => {', 
    execCalcFunc + '\nconst executeGraphSimulation = async () => {'
  );
}

// Rename handleCalculate to executeCalculation
code = code.replace(/onClick=\{handleCalculate\}/g, 'onClick={executeCalculation}');

fs.writeFileSync(analysisPath, code);
console.log("Added executeCalculation");
