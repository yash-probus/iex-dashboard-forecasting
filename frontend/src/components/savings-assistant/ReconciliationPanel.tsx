import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, ArrowRight, TrendingDown, FileSpreadsheet } from "lucide-react";
import { 
  OASettlementData, 
  generateReconciliation,
  downloadSettlement,
} from "@/lib/oaSettlementUtils";

interface ReconciliationPanelProps {
  actualSettlement: OASettlementData | null;
  proposedSettlement: OASettlementData | null;
  monthLabel: string;
}

export function ReconciliationPanel({
  actualSettlement,
  proposedSettlement,
  monthLabel,
}: ReconciliationPanelProps) {
  if (!actualSettlement || !proposedSettlement) {
    return null;
  }

  const reconciliation = generateReconciliation(actualSettlement, proposedSettlement);

  const downloadReconciliationCSV = () => {
    const rows = [
      'OA Settlement Reconciliation',
      `Month,${monthLabel}`,
      '',
      'Component,Actual (₹),Proposed (₹),Savings (₹)',
      ...reconciliation.breakdown.map(item => 
        `${item.component},${item.actual.toFixed(2)},${item.proposed.toFixed(2)},${item.diff.toFixed(2)}`
      ),
      '',
      `Total,${actualSettlement.chargeBreakdown.total.toFixed(2)},${proposedSettlement.chargeBreakdown.total.toFixed(2)},${reconciliation.savings.toFixed(2)}`,
      `Savings %,,,${reconciliation.savingsPercent.toFixed(1)}%`,
    ];

    const content = rows.join('\n');
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `oa_reconciliation_${actualSettlement.month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-accent" />
            OA Settlement Reconciliation - {monthLabel}
          </span>
          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
            <TrendingDown className="w-3 h-3 mr-1" />
            {reconciliation.savingsPercent.toFixed(1)}% savings
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Side by Side Comparison Header */}
        <div className="grid grid-cols-3 gap-4 text-center text-sm font-medium">
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-muted-foreground text-xs mb-1">Actual OA Settlement</p>
            <p className="text-xl font-bold text-foreground">
              ₹{(actualSettlement.chargeBreakdown.total / 1000).toFixed(1)}K
            </p>
          </div>
          <div className="flex items-center justify-center">
            <ArrowRight className="w-6 h-6 text-muted-foreground" />
          </div>
          <div className="p-3 rounded-lg bg-green-500/10">
            <p className="text-muted-foreground text-xs mb-1">Prolt Proposed</p>
            <p className="text-xl font-bold text-green-600">
              ₹{(proposedSettlement.chargeBreakdown.total / 1000).toFixed(1)}K
            </p>
          </div>
        </div>

        {/* Detailed Breakdown Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-3 font-medium text-muted-foreground">Component</th>
                <th className="text-right py-2 px-3 font-medium text-muted-foreground">Actual (₹)</th>
                <th className="text-right py-2 px-3 font-medium text-muted-foreground">Proposed (₹)</th>
                <th className="text-right py-2 px-3 font-medium text-green-600">Savings (₹)</th>
              </tr>
            </thead>
            <tbody>
              {reconciliation.breakdown.map((item, idx) => (
                <tr key={idx} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="py-2 px-3 font-medium">{item.component}</td>
                  <td className="py-2 px-3 text-right text-muted-foreground">{item.actual.toLocaleString('en-IN')}</td>
                  <td className="py-2 px-3 text-right text-muted-foreground">{item.proposed.toLocaleString('en-IN')}</td>
                  <td className="py-2 px-3 text-right text-green-600 font-medium">
                    {item.diff > 0 ? '+' : ''}{item.diff.toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}
              <tr className="bg-muted/30 font-semibold">
                <td className="py-3 px-3">Total</td>
                <td className="py-3 px-3 text-right">{actualSettlement.chargeBreakdown.total.toLocaleString('en-IN')}</td>
                <td className="py-3 px-3 text-right">{proposedSettlement.chargeBreakdown.total.toLocaleString('en-IN')}</td>
                <td className="py-3 px-3 text-right text-green-600">
                  +{reconciliation.savings.toLocaleString('en-IN')}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Download Buttons */}
        <div className="flex flex-wrap gap-3 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadSettlement(actualSettlement, 'actual')}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Actual OA Bill (CSV)
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadSettlement(proposedSettlement, 'proposed')}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Proposed OA Bill (CSV)
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={downloadReconciliationCSV}
            className="gap-2 bg-accent hover:bg-accent/90"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Reconciliation Report (CSV)
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default ReconciliationPanel;
