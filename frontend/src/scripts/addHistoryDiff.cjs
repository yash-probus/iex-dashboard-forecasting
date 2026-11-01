const fs = require('fs');

const target = 'frontend/src/pages/SavingsCalculatorPage.tsx';
let content = fs.readFileSync(target, 'utf8');

// Add Stack to material imports
if (!content.includes('Stack')) {
  content = content.replace(
    /import \{\s*Box,\s*Button,/,
    'import { Box, Button, Stack,'
  );
}

// Add ArrowRightAltIcon
if (!content.includes('ArrowRightAlt')) {
  content = content.replace(
    /import HistoryIcon from '@mui\/icons-material\/History';/,
    "import HistoryIcon from '@mui/icons-material/History';\nimport ArrowRightAltIcon from '@mui/icons-material/ArrowRightAlt';"
  );
}

// Add getChanges helper
const getChangesHelper = `
const getChanges = (current, previous) => {
  if (!previous) return [];
  const changes = [];
  const fields = [
    { key: 'clientName', label: 'Client' },
    { key: 'industryName', label: 'Industry' },
    { key: 'address', label: 'Address' },
    { key: 'stateCode', label: 'State' },
    { key: 'discom', label: 'Discom' },
    { key: 'consumerCategory', label: 'Category' },
    { key: 'voltageLevel', label: 'Voltage' },
    { key: 'sanctionedLoadKw', label: 'Load (kW)' },
    { key: 'proltMargin', label: 'PROLT Margin' },
    { key: 'traderMargin', label: 'Trader Margin' },
    { key: 'consultancyFee', label: 'Consultancy Fee' },
    { key: 'probusPlatformFee', label: 'Platform Fee' },
    { key: 'applyElectricityDuty', label: 'Electricity Duty' },
    { key: 'billedDemandKv', label: 'Billed Demand (kV)' },
    { key: 'powerFactor', label: 'Power Factor' },
    { key: 'arrearAmount', label: 'Arrear Amount' },
    { key: 'currentLpsc', label: 'Current LPSC' }
  ];

  fields.forEach(f => {
    if (current[f.key] !== previous[f.key]) {
      changes.push({
        label: f.label,
        old: previous[f.key],
        new: current[f.key]
      });
    }
  });

  return changes;
};
`;

if (!content.includes('const getChanges')) {
  content = content.replace(
    'export default function SavingsCalculatorPage() {',
    getChangesHelper + '\nexport default function SavingsCalculatorPage() {'
  );
}

// Update the rendering loop
// {historyData.map((v) => (
const mapRegex = /\{historyData\.map\(\(v\) => \(\s*<Paper key=\{v\.id\}/;
const newMap = `{historyData.map((v) => {
                const previousVersion = historyData.find(p => p.version === v.version - 1);
                const changes = previousVersion ? getChanges(v, previousVersion) : [];
                return (
                <Paper key={v.id}`;
content = content.replace(mapRegex, newMap);

// Add changes section inside the Paper
const paperEndRegex = /<\/Grid>\s*<\/Paper>\s*\)\)}/;
const changesSection = `</Grid>
                    {changes.length > 0 && (
                      <Box sx={{ mt: 2, p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
                        <Typography variant="subtitle2" color="text.secondary" mb={1}>Changes from Version {previousVersion.version}:</Typography>
                        <Stack spacing={1}>
                           {changes.map(c => (
                              <Box key={c.label} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body2" fontWeight={600}>{c.label}:</Typography>
                                <Typography variant="body2" color="error.main" sx={{ textDecoration: 'line-through' }}>{c.old ?? 'None'}</Typography>
                                <ArrowRightAltIcon fontSize="small" color="action" />
                                <Typography variant="body2" color="success.main" fontWeight={600}>{c.new ?? 'None'}</Typography>
                              </Box>
                           ))}
                        </Stack>
                      </Box>
                    )}
                  </Paper>
                )})}`;

content = content.replace(paperEndRegex, changesSection);

fs.writeFileSync(target, content);
console.log('Done');
