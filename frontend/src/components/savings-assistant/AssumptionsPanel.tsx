import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Info } from "lucide-react";

interface AssumptionsPanelProps {
  category: string;
}

const OA_CAPS: Record<string, number> = {
  industrial_general: 60,
  commercial: 50,
  energy_intensive: 80,
};

export function AssumptionsPanel({ category }: AssumptionsPanelProps) {
  const [open, setOpen] = useState(false);
  const oaCap = OA_CAPS[category] || 60;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full justify-center py-2">
        <Info className="w-4 h-4" />
        <span>View Calculation Assumptions</span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </CollapsibleTrigger>
      
      <CollapsibleContent>
        <div className="mt-2 p-4 bg-muted/30 rounded-lg space-y-3 text-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="font-medium text-foreground">Model Accuracy</p>
              <p className="text-muted-foreground">90% (slot-level prediction)</p>
            </div>
            
            <div className="space-y-1">
              <p className="font-medium text-foreground">OA Recommendation Logic</p>
              <p className="text-muted-foreground">OA slots recommended only when predicted OA landed cost &lt; DISCOM slot rate</p>
            </div>
            
            <div className="space-y-1">
              <p className="font-medium text-foreground">Regulatory Charges Included</p>
              <p className="text-muted-foreground">STU, SLDC, CTU, NLDC, ALDC, transmission losses</p>
            </div>
            
            <div className="space-y-1">
              <p className="font-medium text-foreground">OA Share Cap</p>
              <p className="text-muted-foreground">{oaCap}% (based on consumer category)</p>
            </div>
          </div>
          
          <div className="pt-2 border-t border-border/50">
            <p className="text-xs text-muted-foreground">
              * Adjusted savings account for model accuracy. Actual results may vary based on real-time market conditions.
            </p>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
