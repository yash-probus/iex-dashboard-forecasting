import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { TrendingUp, ArrowRight } from "lucide-react";
import { formatCurrency } from "@/lib/calculatorUtils";

interface TariffSensitivitySliderProps {
  currentBill: number;
  currentRate: number;
}

export function TariffSensitivitySlider({
  currentBill,
  currentRate,
}: TariffSensitivitySliderProps) {
  const [increasePercent, setIncreasePercent] = useState([10]);
  
  const newRate = currentRate * (1 + increasePercent[0] / 100);
  const newBill = currentBill * (1 + increasePercent[0] / 100);
  const increase = newBill - currentBill;

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-accent" />
          If Tariff Increases, Your Bill Could Look Like This
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Simulate the impact of tariff changes on your bill
        </p>
      </CardHeader>
      <CardContent>
        {/* Slider */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Tariff Increase</span>
            <span className="text-lg font-bold text-destructive">+{increasePercent[0]}%</span>
          </div>
          <Slider
            value={increasePercent}
            onValueChange={setIncreasePercent}
            max={50}
            min={0}
            step={5}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0%</span>
            <span>25%</span>
            <span>50%</span>
          </div>
        </div>
        
        {/* Comparison */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="p-4 bg-muted/30 rounded-lg text-center">
            <p className="text-xs text-muted-foreground mb-1">Current Bill</p>
            <p className="text-2xl font-bold">{formatCurrency(currentBill)}</p>
            <p className="text-xs text-muted-foreground">@ ₹{currentRate.toFixed(2)}/kWh</p>
          </div>
          <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-center">
            <p className="text-xs text-muted-foreground mb-1">Projected Bill</p>
            <p className="text-2xl font-bold text-destructive">{formatCurrency(newBill)}</p>
            <p className="text-xs text-muted-foreground">@ ₹{newRate.toFixed(2)}/kWh</p>
          </div>
        </div>
        
        {/* Impact */}
        <div className="mt-4 p-4 bg-destructive/10 rounded-lg text-center">
          <p className="text-sm text-muted-foreground">Additional Monthly Cost</p>
          <p className="text-2xl font-bold text-destructive">+{formatCurrency(increase)}</p>
        </div>
        
        <div className="mt-4 p-3 bg-muted/30 rounded-lg flex items-center gap-3">
          <ArrowRight className="w-5 h-5 text-accent flex-shrink-0" />
          <p className="text-sm">
            Switching to OA can hedge against tariff increases by locking in lower IEX rates.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
