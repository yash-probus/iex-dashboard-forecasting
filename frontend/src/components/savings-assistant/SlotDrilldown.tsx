import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, ExternalLink, Info } from "lucide-react";
import { SlotDrilldownData } from "./types";
import { formatCurrency } from "@/lib/calculatorUtils";

interface SlotDrilldownProps {
  date: string;
  slots: SlotDrilldownData[];
  onBack: () => void;
}

interface FormulaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slot: SlotDrilldownData | null;
}

function FormulaModal({ open, onOpenChange, slot }: FormulaModalProps) {
  if (!slot) return null;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Slot Calculation Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-4 bg-muted/30 rounded-lg space-y-2">
            <p className="text-sm font-medium">Interval: {slot.interval}</p>
            <p className="text-sm text-muted-foreground">Date: {slot.date}</p>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium">Formula Applied</h4>
            <div className="p-3 bg-muted/20 rounded-lg font-mono text-sm space-y-1">
              <p>Actual Cost = kWh × DISCOM Rate</p>
              <p className="text-muted-foreground">
                = {slot.kwh} × ₹{(slot.actualCost / slot.kwh).toFixed(2)}/kWh
              </p>
              <p className="text-accent font-medium">= {formatCurrency(slot.actualCost)}</p>
            </div>

            <div className="p-3 bg-muted/20 rounded-lg font-mono text-sm space-y-1">
              <p>Prolt Optimized Cost = kWh × Predicted {slot.recSource} Rate</p>
              <p className="text-muted-foreground">
                = {slot.kwh} × ₹{(slot.recCost / slot.kwh).toFixed(2)}/kWh
              </p>
              <p className="text-success font-medium">= {formatCurrency(slot.recCost)}</p>
            </div>

            <div className="p-3 bg-success/10 rounded-lg font-mono text-sm">
              <p>Slot Saving = Actual - Prolt Optimized</p>
              <p className="text-success font-medium">= {formatCurrency(slot.slotSaving)}</p>
            </div>
          </div>

          <a
            href="https://upsldc.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-accent hover:underline"
          >
            <ExternalLink className="w-4 h-4" />
            View UP SLDC Regulatory Reference
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function SlotDrilldown({ date, slots, onBack }: SlotDrilldownProps) {
  const [selectedSlot, setSelectedSlot] = useState<SlotDrilldownData | null>(null);
  const [formulaOpen, setFormulaOpen] = useState(false);

  const totalSaving = slots.reduce((sum, s) => sum + s.slotSaving, 0);

  return (
    <>
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <CardTitle className="text-lg">Slot-Level Breakdown</CardTitle>
              <p className="text-sm text-muted-foreground">{date}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-muted">
                <TableRow>
                  <TableHead className="w-20">Hour</TableHead>
                  <TableHead className="w-16">Block</TableHead>
                  <TableHead>Interval</TableHead>
                  <TableHead className="text-right">kWh</TableHead>
                  <TableHead className="text-center">Actual</TableHead>
                  <TableHead className="text-right">Actual ₹</TableHead>
                  <TableHead className="text-center">Rec.</TableHead>
                  <TableHead className="text-right">Rec. ₹</TableHead>
                  <TableHead className="text-right">Saving</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {slots.map((slot, index) => (
                  <TableRow
                    key={index}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      setSelectedSlot(slot);
                      setFormulaOpen(true);
                    }}
                  >
                    <TableCell className="font-mono">{String(slot.hour).padStart(2, '0')}:00</TableCell>
                    <TableCell className="font-mono">{slot.block}</TableCell>
                    <TableCell className="font-mono text-sm">{slot.interval}</TableCell>
                    <TableCell className="text-right font-mono">{slot.kwh.toFixed(2)}</TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                        {slot.actualSource}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(slot.actualCost)}</TableCell>
                    <TableCell className="text-center">
                      <span className={`
                        inline-flex px-2 py-0.5 rounded text-xs font-medium
                        ${slot.recSource === 'OA' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                        }
                      `}>
                        {slot.recSource}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(slot.recCost)}</TableCell>
                    <TableCell className={`text-right font-mono ${slot.slotSaving > 0 ? 'text-success' : ''}`}>
                      {formatCurrency(slot.slotSaving)}
                    </TableCell>
                    <TableCell>
                      <Info className="w-4 h-4 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Total */}
          <div className="flex justify-between items-center mt-4 p-3 bg-success/10 rounded-lg">
            <span className="font-medium">Total Day Saving</span>
            <span className="text-xl font-bold text-success">{formatCurrency(totalSaving)}</span>
          </div>
        </CardContent>
      </Card>

      <FormulaModal
        open={formulaOpen}
        onOpenChange={setFormulaOpen}
        slot={selectedSlot}
      />
    </>
  );
}
