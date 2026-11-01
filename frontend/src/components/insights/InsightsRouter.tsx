import { UploadType, generateAssumedData, AssumedData } from "@/lib/insightsUtils";
import { CostStructureBreakdown } from "./CostStructureBreakdown";
import { OADISCOMMix } from "./OADISCOMMix";
import { SlotLevelHeatmap } from "./SlotLevelHeatmap";
import { SanctionedLoadGauge } from "./SanctionedLoadGauge";
import { OASettlementSankey } from "./OASettlementSankey";
import { EstimatedSavingsBar } from "./EstimatedSavingsBar";
import { ConsumptionPattern } from "./ConsumptionPattern";
import { PeakHourAnalysis } from "./PeakHourAnalysis";
import { TariffSensitivitySlider } from "./TariffSensitivitySlider";
import { EstimatedBillStack } from "./EstimatedBillStack";
import { ToDBehavior } from "./ToDBehavior";
import { ShiftabilityGauge } from "./ShiftabilityGauge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, AlertTriangle, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface InsightsRouterProps {
  uploadType?: UploadType;
  totalBill?: number;
  actualBill?: number;
  possibleBill?: number;
  oaPercent?: number;
  discomPercent?: number;
  recommendedOaPercent?: number;
  sanctionedLoad?: number;
  estimatedMaxDemand?: number;
  fixedChargePerUnit?: number;
  tod1?: number;
  tod2?: number;
  tod3?: number;
  tod4?: number;
  currentRate?: number;
  monthLabel?: string;
  isEstimated?: boolean;
  estimationReason?: string;
  category?: string;
  hasDiscomBill?: boolean;
  hasOaBill?: boolean;
  hasTodData?: boolean;
}

export function InsightsRouter({
  uploadType,
  totalBill = 0,
  actualBill = 0,
  possibleBill = 0,
  oaPercent = 0,
  discomPercent = 0,
  recommendedOaPercent = 0,
  sanctionedLoad = 0,
  estimatedMaxDemand = 0,
  fixedChargePerUnit = 350,
  tod1 = 0,
  tod2 = 0,
  tod3 = 0,
  tod4 = 0,
  currentRate = 6.5,
  monthLabel = "This Month",
  isEstimated = false,
  estimationReason = "",
  category = "industrial_general",
  hasDiscomBill = false,
  hasOaBill = false,
  hasTodData = false,
}: InsightsRouterProps) {
  // Generate assumed data if values are missing
  const needsAssumedData = totalBill === 0 && actualBill === 0 && (tod1 + tod2 + tod3 + tod4) === 0;
  
  let data: AssumedData | null = null;
  if (needsAssumedData) {
    data = generateAssumedData({
      sanctionedLoad: sanctionedLoad || 1,
      category,
      hasTodData,
      hasDiscomBill,
      hasOaBill,
      tod1,
      tod2,
      tod3,
      tod4,
      billAmount: totalBill,
    });
  }

  // Use assumed or provided values
  const finalTotalBill = data?.totalBill || totalBill || 250000;
  const finalActualBill = data?.actualBill || actualBill || 250000;
  const finalPossibleBill = data?.possibleBill || possibleBill || 212500;
  const finalOaPercent = data?.oaPercent || oaPercent || 42;
  const finalDiscomPercent = data?.discomPercent || discomPercent || 58;
  const finalRecommendedOaPercent = data?.recommendedOaPercent || recommendedOaPercent || 60;
  const finalSanctionedLoad = data?.sanctionedLoad || sanctionedLoad || 1;
  const finalEstimatedMaxDemand = data?.estimatedMaxDemand || estimatedMaxDemand || 0.75;
  const finalFixedChargePerUnit = data?.fixedChargePerUnit || fixedChargePerUnit || 350;
  const finalTod1 = data?.tod1 || tod1 || 8400;
  const finalTod2 = data?.tod2 || tod2 || 6000;
  const finalTod3 = data?.tod3 || tod3 || 6000;
  const finalTod4 = data?.tod4 || tod4 || 3600;
  const finalCurrentRate = data?.currentRate || currentRate || 6.5;
  const finalIsEstimated = data?.isEstimated || isEstimated || needsAssumedData;
  const finalEstimationReason = data?.estimationReason || estimationReason || 
    "Some values are estimated using UP tariff benchmarks and historical IEX patterns.";

  // Determine insight description based on data availability
  const getInsightDescription = () => {
    if (hasDiscomBill && hasOaBill) return 'Based on your DISCOM and OA bill data';
    if (hasDiscomBill) return 'Based on your DISCOM bill data';
    if (hasTodData) return 'Based on your ToD consumption inputs';
    return 'Sample insights to demonstrate Prolt capabilities';
  };

  return (
    <div className="space-y-6">
      {/* Estimation Banner */}
      {finalIsEstimated && (
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="py-3 px-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-warning mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-warning">Some insights use estimated values</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {finalEstimationReason}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-0 shadow-lg bg-gradient-to-r from-accent/5 to-success/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl flex items-center gap-2">
            <Lightbulb className="w-6 h-6 text-accent" />
            Dynamic Insights
            {finalIsEstimated && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-4 h-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs text-xs">Values marked with * are estimated</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {getInsightDescription()}
          </p>
        </CardHeader>
      </Card>

      {/* ALWAYS show all 5 insight blocks */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Insight 1: Cost Structure Breakdown */}
        <CostStructureBreakdown 
          totalBill={finalTotalBill} 
          discomOnly={!hasOaBill}
        />
        
        {/* Insight 2: OA vs DISCOM Mix */}
        <OADISCOMMix 
          actualOaPercent={finalOaPercent}
          actualDiscomPercent={finalDiscomPercent}
          recommendedOaPercent={finalRecommendedOaPercent}
          maxOaAllowed={category === 'energy_intensive' ? 80 : 50}
        />
        
        {/* Insight 3: Slot-Level Heatmap */}
        <SlotLevelHeatmap avgConsumption={finalTod1 + finalTod2 + finalTod3 + finalTod4} />
        
        {/* Insight 4: Sanctioned Load Efficiency */}
        <SanctionedLoadGauge 
          sanctionedLoad={finalSanctionedLoad}
          estimatedMaxDemand={finalEstimatedMaxDemand}
          fixedChargePerUnit={finalFixedChargePerUnit}
        />
        
        {/* Insight 5: OA Settlement Transparency - Only show if user uploaded OA bill */}
        {hasOaBill && (
          <div className="md:col-span-2">
            <OASettlementSankey 
              discomCharges={finalTotalBill * 0.6}
              oaEnergyCharges={finalTotalBill * 0.25}
              transmissionCharges={finalTotalBill * 0.15}
              totalBill={finalTotalBill}
              anomalies={finalIsEstimated ? [] : ['SLDC charges 15% higher than expected', 'Wheeling charges vary by ±5%']}
            />
          </div>
        )}
      </div>

      {/* Additional insights based on data availability */}
      <div className="grid gap-6 md:grid-cols-2">
        <EstimatedSavingsBar 
          actualBill={finalActualBill}
          possibleBill={finalPossibleBill}
          monthLabel={monthLabel}
        />
        <ConsumptionPattern monthLabel={monthLabel} />
        <PeakHourAnalysis />
        <TariffSensitivitySlider 
          currentBill={finalActualBill}
          currentRate={finalCurrentRate}
        />
      </div>

      {/* ToD-specific insights */}
      <div className="grid gap-6 md:grid-cols-2">
        <EstimatedBillStack 
          energyCharges={finalTotalBill * 0.55}
          fixedCharges={finalTotalBill * 0.25}
          todCharges={finalTotalBill * 0.20}
          monthLabel={monthLabel}
        />
        <ToDBehavior tod1={finalTod1} tod2={finalTod2} tod3={finalTod3} tod4={finalTod4} />
        <div className="md:col-span-2">
          <ShiftabilityGauge tod1={finalTod1} tod2={finalTod2} tod3={finalTod3} tod4={finalTod4} />
        </div>
      </div>
    </div>
  );
}
