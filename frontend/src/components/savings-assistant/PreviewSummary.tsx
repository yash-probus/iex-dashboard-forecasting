import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileCheck, ArrowLeft, Calculator } from "lucide-react";
import { PreviewItem } from "./types";
import { formatCurrency } from "@/lib/calculatorUtils";

interface PreviewSummaryProps {
  items: PreviewItem[];
  onBack: () => void;
  onConfirm: () => void;
}

export function PreviewSummary({
  items,
  onBack,
  onConfirm,
}: PreviewSummaryProps) {
  const totalKwh = items.reduce((sum, item) => sum + item.totalKwh, 0);
  const totalBill = items.reduce((sum, item) => sum + (item.totalBill || 0), 0);

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        onClick={onBack}
        className="gap-2 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" />
        Edit Inputs
      </Button>

      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-accent" />
            Preview Summary
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Review your data before running the savings analysis
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Month</TableHead>
                  <TableHead>OA Files Uploaded</TableHead>
                  <TableHead className="text-right">Total kWh</TableHead>
                  <TableHead className="text-right">Bill Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{item.month}</TableCell>
                    <TableCell>
                      {item.oaFilesUploaded > 0 || item.oaTotalKwh > 0 ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                            {item.oaFilesUploaded} days
                          </span>
                          <p className="text-xs text-muted-foreground">
                            {item.oaTotalKwh.toLocaleString('en-IN')} kWh
                          </p>
                        </div>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
                          No OA files
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {item.totalKwh.toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {item.totalBill ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Totals */}
          <div className="flex justify-between items-center p-4 bg-muted/30 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Total Consumption</p>
              <p className="text-xl font-semibold font-mono">
                {totalKwh.toLocaleString('en-IN')} kWh
              </p>
            </div>
            {totalBill > 0 && (
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Bills</p>
                <p className="text-xl font-semibold font-mono">
                  {formatCurrency(totalBill)}
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={onBack} className="flex-1">
              Edit Inputs
            </Button>
            <Button
              onClick={onConfirm}
              className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground gap-2"
            >
              <Calculator className="w-4 h-4" />
              Confirm & Calculate
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
