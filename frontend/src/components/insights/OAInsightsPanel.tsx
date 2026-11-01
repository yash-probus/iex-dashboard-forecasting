import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, AlertTriangle, Zap, PieChart, TrendingUp, FileText } from "lucide-react";
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { 
  OASettlementData, 
  OAAnomaly,
  downloadSettlement,
} from "@/lib/oaSettlementUtils";

interface OAInsightsPanelProps {
  actualSettlement: OASettlementData | null;
  proposedSettlement: OASettlementData | null;
  anomalies: OAAnomaly[];
  oaSharePercent: number;
  discomSharePercent: number;
  totalOaMwh: number;
  totalOaSpend: number;
}

const COLORS = ['hsl(142, 55%, 45%)', 'hsl(217, 55%, 55%)'];

export function OAInsightsPanel({
  actualSettlement,
  proposedSettlement,
  anomalies,
  oaSharePercent,
  discomSharePercent,
  totalOaMwh,
  totalOaSpend,
}: OAInsightsPanelProps) {
  const shareData = [
    { name: 'OA', value: oaSharePercent, fill: COLORS[0] },
    { name: 'DISCOM', value: discomSharePercent, fill: COLORS[1] },
  ];

  const chargeBreakdownData = actualSettlement ? [
    { name: 'Energy', value: actualSettlement.chargeBreakdown.energyCharges },
    { name: 'CTU', value: actualSettlement.chargeBreakdown.ctuCharges },
    { name: 'STU', value: actualSettlement.chargeBreakdown.stuCharges },
    { name: 'SLDC', value: actualSettlement.chargeBreakdown.sldcCharges },
    { name: 'Wheeling', value: actualSettlement.chargeBreakdown.wheelingCharges },
    { name: 'Fees & Taxes', value: actualSettlement.chargeBreakdown.schedulingFees + actualSettlement.chargeBreakdown.taxes },
  ] : [];

  const BREAKDOWN_COLORS = [
    'hsl(142, 55%, 35%)',
    'hsl(142, 55%, 45%)',
    'hsl(142, 55%, 55%)',
    'hsl(142, 55%, 65%)',
    'hsl(178, 55%, 45%)',
    'hsl(178, 55%, 55%)',
  ];

  const savings = actualSettlement && proposedSettlement 
    ? actualSettlement.chargeBreakdown.total - proposedSettlement.chargeBreakdown.total 
    : 0;

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Zap className="w-5 h-5 text-accent" />
          Open Access Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-muted/50 text-center">
            <p className="text-2xl font-bold text-foreground">{totalOaMwh.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">Total OA MWh</p>
          </div>
          <div className="p-4 rounded-xl bg-muted/50 text-center">
            <p className="text-2xl font-bold text-foreground">₹{(totalOaSpend / 1000).toFixed(0)}K</p>
            <p className="text-xs text-muted-foreground">Total OA Spend</p>
          </div>
          <div className="p-4 rounded-xl bg-muted/50 text-center">
            <p className="text-2xl font-bold text-accent">{oaSharePercent}%</p>
            <p className="text-xs text-muted-foreground">OA Share</p>
          </div>
          <div className="p-4 rounded-xl bg-green-500/10 text-center">
            <p className="text-2xl font-bold text-green-500">₹{(savings / 1000).toFixed(0)}K</p>
            <p className="text-xs text-muted-foreground">Potential Savings</p>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* OA vs DISCOM Share Pie */}
          <div className="p-4 rounded-xl bg-muted/30">
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-muted-foreground" />
              Energy Source Mix
            </h4>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={shareData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}%`}
                    labelLine={false}
                  >
                    {shareData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [`${value}%`, 'Share']}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Charge Breakdown Pie */}
          {actualSettlement && (
            <div className="p-4 rounded-xl bg-muted/30">
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
                OA Charge Breakdown
              </h4>
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={chargeBreakdownData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={1}
                      dataKey="value"
                    >
                      {chargeBreakdownData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={BREAKDOWN_COLORS[index % BREAKDOWN_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, 'Amount']}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* Anomalies Section */}
        {anomalies.length > 0 && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-4 h-4" />
              Detected Anomalies ({anomalies.length})
            </h4>
            <div className="space-y-2">
              {anomalies.slice(0, 3).map((anomaly, idx) => (
                <div key={idx} className="flex items-start gap-2 text-sm">
                  <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/30">
                    {anomaly.type.replace('_', ' ')}
                  </Badge>
                  <span className="text-muted-foreground">{anomaly.message}</span>
                  {anomaly.date && (
                    <span className="text-xs text-muted-foreground/60">({anomaly.date})</span>
                  )}
                </div>
              ))}
              {anomalies.length > 3 && (
                <p className="text-xs text-muted-foreground">+{anomalies.length - 3} more anomalies</p>
              )}
            </div>
          </div>
        )}

        {/* Download Buttons */}
        <div className="flex flex-wrap gap-3">
          {actualSettlement && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadSettlement(actualSettlement, 'actual')}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Reconstructed OA Settlement (CSV)
            </Button>
          )}
          {proposedSettlement && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadSettlement(proposedSettlement, 'proposed')}
              className="gap-2"
            >
              <FileText className="w-4 h-4" />
              Prolt Proposed Settlement (CSV)
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default OAInsightsPanel;
