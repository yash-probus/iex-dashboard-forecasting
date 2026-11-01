const fs = require('fs');
const path = require('path');

const analysisPath = path.join(__dirname, '../../src/pages/SavingsCalculatorAnalysisPage.tsx');
let code = fs.readFileSync(analysisPath, 'utf8');

// 1. Rename executeCalculation to handleCalculate
code = code.replace(/onClick=\{executeCalculation\}/g, 'onClick={handleCalculate}');

// 2. Add clientOverview and overviewLoading states
if (!code.includes('const [clientOverview, setClientOverview]')) {
  code = code.replace(
    'const [calculating, setCalculating] = useState(false);',
    `const [calculating, setCalculating] = useState(false);
  const [clientOverview, setClientOverview] = useState<ClientOverviewResult | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);`
  );
}

// 3. Add fetchClientOverview to loadEntry
if (!code.includes('setOverviewLoading(true);')) {
  code = code.replace(
    /setSelectedSimMonth\('all'\);\n\s*\}\n\s*\}/,
    `setSelectedSimMonth('all');
          }
          
          setOverviewLoading(true);
          fetchClientOverview(entry.id).then(res => {
            setClientOverview(res);
            setOverviewLoading(false);
          }).catch(err => {
            console.error("Failed to fetch overview", err);
            setOverviewLoading(false);
          });
        }`
  );
}

// 4. Fix handleCloseCalc -> we'll replace it with a navigate function or remove it.
code = code.replace(/onClick=\{handleCloseCalc\}/g, "onClick={() => navigate('/savings-calculator')}");

// 5. Remove historyDialogOpen Dialog and related code
// The history dialog looks like `<Dialog\n        open={historyDialogOpen}`
// Let's remove it using a regex.
const historyDialogRegex = /<Dialog\s+open=\{historyDialogOpen\}[\s\S]*?<\/Dialog>/m;
code = code.replace(historyDialogRegex, '');

fs.writeFileSync(analysisPath, code);
console.log("Fixed errors");
