import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Zap, TrendingDown, TrendingUp, IndianRupee } from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from "recharts";

interface OADiscomSeparateInsightsProps {
  hasOaBill: boolean;
  hasDiscomBill: boolean;
  // DISCOM data
  discomTotalUnits: number;
  discomTotalCost: number;
  discomTod1: number;
  discomTod2: number;
  discomTod3: number;
  discomTod4: number;
  // OA data (optional)
  oaTotalUnits?: number;
  oaTotalCost?: number;
  oaSlotCount?: number;
  avgOaRate?: number;
  // Recommended
  recommendedOaUnits: number;
  recommendedDiscomUnits: number;
  proltSuggestedCost: number;
  savings: number;
}

const DISCOM_COLORS = {
  tod1: 'hsl(217, 55%, 45%)',
  tod2: 'hsl(217, 55%, 55%)',
  tod3: 'hsl(217, 55%, 65%)',
  tod4: 'hsl(217, 55%, 75%)',
};

const OA_COLORS = {
  actual: 'hsl(142, 55%, 45%)',
  suggested: 'hsl(142, 55%, 65%)',
};

export function OADiscomSeparateInsights({
  hasOaBill,
  hasDiscomBill,
  discomTotalUnits,
  discomTotalCost,
  discomTod1,
  discomTod2,
  discomTod3,
  discomTod4,
  oaTotalUnits = 0,
  oaTotalCost = 0,
  oaSlotCount = 0,
  avgOaRate = 0,
  recommendedOaUnits,
  recommendedDiscomUnits,
  proltSuggestedCost,
  savings,
}: OADiscomSeparateInsightsProps) {
  
  const discomTodData = [
    { name: 'ToD1 (06-17h)', units: discomTod1, fill: DISCOM_COLORS.tod1 },
    { name: 'ToD2 (17-23h)', units: discomTod2, fill: DISCOM_COLORS.tod2 },
    { name: 'ToD3 (23-06h)', units: discomTod3, fill: DISCOM_COLORS.tod3 },
    { name: 'ToD4 (Peak)', units: discomTod4, fill: DISCOM_COLORS.tod4 },
  ];

  const avgDiscomRate = discomTotalUnits > 0 ? discomTotalCost / discomTotalUnits : 0;
  const totalUnits = discomTotalUnits + oaTotalUnits;

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <IndianRupee className="w-5 h-5 text-accent" />
          Source-wise Breakdown
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          View DISCOM and OA consumption separately
        </p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="discom" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="discom" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              DISCOM
            </TabsTrigger>
            <TabsTrigger value="oa" className="flex items-center gap-2" disabled={!hasOaBill}>
              <Zap className="w-4 h-4" />
              Open Access
              {!hasOaBill && <span className="text-xs text-muted-foreground">(No data)</span>}
            </TabsTrigger>
          </TabsList>
          
          {/* DISCOM Tab */}
          <TabsContent value="discom" className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <p className="text-xs text-muted-foreground">Total Units</p>
                <p className="text-xl font-bold text-blue-600">{discomTotalUnits.toLocaleString('en-IN')} kWh</p>
              </div>
              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <p className="text-xs text-muted-foreground">Total Cost</p>
                <p className="text-xl font-bold text-blue-600">₹{discomTotalCost.toLocaleString('en-IN')}</p>
              </div>
              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <p className="text-xs text-muted-foreground">Avg Rate</p>
                <p className="text-xl font-bold text-blue-600">₹{avgDiscomRate.toFixed(2)}/kWh</p>
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium mb-3">ToD-wise Consumption</h4>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={discomTodData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => [`${value.toLocaleString('en-IN')} kWh`, 'Units']}
                  />
                  <Bar dataKey="units" radius={[4, 4, 0, 0]}>
                    {discomTodData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
          
          {/* OA Tab */}
          <TabsContent value="oa" className="space-y-4">
            {hasOaBill ? (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                    <p className="text-xs text-muted-foreground">Total Units</p>
                    <p className="text-xl font-bold text-green-600">{oaTotalUnits.toLocaleString('en-IN')} kWh</p>
                  </div>
                  <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                    <p className="text-xs text-muted-foreground">Total Cost</p>
                    <p className="text-xl font-bold text-green-600">₹{oaTotalCost.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                    <p className="text-xs text-muted-foreground">Avg Rate</p>
                    <p className="text-xl font-bold text-green-600">₹{avgOaRate.toFixed(2)}/kWh</p>
                  </div>
                </div>
                
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">OA Slots Tracked</span>
                    <span className="font-medium">{oaSlotCount.toLocaleString('en-IN')} slots</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">OA Share of Total</span>
                    <span className="font-medium">{totalUnits > 0 ? ((oaTotalUnits / totalUnits) * 100).toFixed(1) : 0}%</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Zap className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No OA bill uploaded for this month</p>
                <p className="text-sm">Upload an OA bill to see detailed breakdown</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
        
        {/* Prolt Recommendation Summary */}
        <div className="mt-6 pt-4 border-t border-border">
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-accent" />
            Prolt Optimized Mix
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
              <p className="text-xs text-muted-foreground">Suggested OA</p>
              <p className="text-lg font-bold text-accent">{recommendedOaUnits.toLocaleString('en-IN')} kWh</p>
              <p className="text-xs text-muted-foreground">
                ({totalUnits > 0 ? ((recommendedOaUnits / totalUnits) * 100).toFixed(1) : 0}% of total)
              </p>
            </div>
            <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
              <p className="text-xs text-muted-foreground">Suggested DISCOM</p>
              <p className="text-lg font-bold text-accent">{recommendedDiscomUnits.toLocaleString('en-IN')} kWh</p>
              <p className="text-xs text-muted-foreground">
                ({totalUnits > 0 ? ((recommendedDiscomUnits / totalUnits) * 100).toFixed(1) : 0}% of total)
              </p>
            </div>
          </div>
          
          <div className="mt-4 p-4 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Potential Monthly Savings</p>
              <p className="text-2xl font-bold text-green-600">₹{savings.toLocaleString('en-IN')}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-500" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
