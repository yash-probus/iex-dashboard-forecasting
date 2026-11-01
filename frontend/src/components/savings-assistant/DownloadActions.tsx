import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, FileSpreadsheet, FileCheck } from "lucide-react";
import { SlotData, exportToCSV, downloadCSV } from "@/lib/calculatorUtils";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { 
  generateTemplateData, 
  numberToWords, 
  getDiscomName, 
  OABillTemplateData 
} from "@/lib/oaBillTemplateUtils";

interface DownloadActionsProps {
  slotData: SlotData[];
  totalActualCost?: number;
  totalSuggestedCost?: number;
  totalSavings?: number;
  oaUnits?: number;
  discomUnits?: number;
  hasOaBill?: boolean;
  avgActualRate?: number;
  avgSuggestedRate?: number;
  totalUnits?: number;
  // New props for comprehensive bill template
  monthLabel?: string;
  monthISO?: string;
  consumerName?: string;
  accountId?: string;
  meterNumber?: string;
  sanctionedLoad?: number;
  voltageLevel?: string;
  category?: string;
  address?: string;
  mobileNo?: string;
  todBreakdown?: { tod1: number; tod2: number; tod3: number; tod4: number };
  discomName?: string;
}

export function DownloadActions({ 
  slotData, 
  totalActualCost = 0, 
  totalSuggestedCost = 0, 
  totalSavings = 0,
  oaUnits = 0,
  discomUnits = 0,
  hasOaBill = false,
  avgActualRate = 0,
  avgSuggestedRate = 0,
  totalUnits = 0,
  monthLabel = '',
  monthISO = '',
  consumerName = '',
  accountId = '',
  meterNumber = '',
  sanctionedLoad = 0,
  voltageLevel = '33 kV',
  category = 'Industrial',
  address = '',
  mobileNo = '',
  todBreakdown,
  discomName = '',
}: DownloadActionsProps) {
  
  // Generate Actual OA Settlement PDF (only when OA bill is uploaded)
  const handleDownloadActualSettlement = () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Header
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pageWidth, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("PROLT", 20, 25);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Smart Energy Assistant", 20, 32);
      
      // Title
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("Actual OA Settlement Report", 20, 55);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated: ${new Date().toLocaleDateString('en-IN', { 
        day: '2-digit', 
        month: 'long', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}`, 20, 62);
      
      doc.setDrawColor(200, 200, 200);
      doc.line(20, 68, pageWidth - 20, 68);
      
      // Summary Section
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("Actual Energy Cost Summary", 20, 80);
      
      const totalEnergy = oaUnits + discomUnits;
      const actualAvgRate = totalEnergy > 0 ? totalActualCost / totalEnergy : 0;
      
      const summaryData = [
        ["Total Energy Consumed", `${totalEnergy.toLocaleString('en-IN')} kWh`],
        ["OA Energy Purchased", `${oaUnits.toLocaleString('en-IN')} kWh`],
        ["DISCOM Energy Purchased", `${discomUnits.toLocaleString('en-IN')} kWh`],
        ["Actual Amount Paid", `₹${totalActualCost.toLocaleString('en-IN')}`],
        ["Actual Avg. Rate", `₹${actualAvgRate.toFixed(2)}/kWh`],
      ];
      
      let yPos = 90;
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      
      summaryData.forEach(([label, value]) => {
        doc.setTextColor(80, 80, 80);
        doc.text(label, 25, yPos);
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "bold");
        doc.text(value, 140, yPos);
        doc.setFont("helvetica", "normal");
        yPos += 10;
      });
      
      // Comparison Section
      yPos += 10;
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Comparison with Prolt Recommendation", 20, yPos);
      
      yPos += 12;
      const suggestedAvgRate = totalEnergy > 0 ? totalSuggestedCost / totalEnergy : 0;
      const comparisonData = [
        ["Prolt Suggested Amount", `₹${totalSuggestedCost.toLocaleString('en-IN')}`],
        ["Suggested Avg. Rate", `₹${suggestedAvgRate.toFixed(2)}/kWh`],
        ["Potential Savings", `₹${totalSavings.toLocaleString('en-IN')}`],
        ["Savings per Unit", `₹${((actualAvgRate - suggestedAvgRate)).toFixed(2)}/kWh`],
      ];
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      
      comparisonData.forEach(([label, value]) => {
        doc.setTextColor(80, 80, 80);
        doc.text(label, 25, yPos);
        doc.setTextColor(0, 100, 0);
        doc.setFont("helvetica", "bold");
        doc.text(value, 140, yPos);
        doc.setFont("helvetica", "normal");
        yPos += 8;
      });
      
      // Regulatory Charges Section
      yPos += 10;
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("Regulatory Charges Breakdown", 20, yPos);
      
      yPos += 12;
      const regulatoryData = [
        ["STU Charges (State Transmission)", "₹0.25/kWh"],
        ["SLDC Charges (State Load Dispatch)", "₹0.02/kWh"],
        ["CTU Charges (Central Transmission)", "₹0.15/kWh"],
        ["NLDC Charges (National Load Dispatch)", "₹0.01/kWh"],
        ["ALDC Charges (Available Losses)", "₹0.03/kWh"],
        ["Cross Subsidy Surcharge", "As per tariff order"],
      ];
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      
      regulatoryData.forEach(([label, value]) => {
        doc.setTextColor(80, 80, 80);
        doc.text(label, 25, yPos);
        doc.setTextColor(0, 0, 0);
        doc.text(value, 140, yPos);
        yPos += 8;
      });
      
      // Footer
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text("This report tallies your actual OA bill with Prolt's analysis. Use for reconciliation and comparison.", 20, 280);
      doc.text("© Probus SmartThings Pvt. Ltd. | www.prolt.in", 20, 286);
      
      doc.save('prolt_actual_oa_settlement.pdf');
      toast.success("Actual OA Settlement PDF downloaded successfully");
    } catch (error) {
      toast.error("Failed to generate PDF. Please try again.");
      console.error(error);
    }
  };

  // Generate Proposed OA Bill PDF
  const handleDownloadProposedBill = () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Header
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pageWidth, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("PROLT", 20, 25);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Smart Energy Assistant", 20, 32);
      
      // Title
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("Proposed OA Bill", 20, 55);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated: ${new Date().toLocaleDateString('en-IN', { 
        day: '2-digit', 
        month: 'long', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}`, 20, 62);
      
      doc.setDrawColor(200, 200, 200);
      doc.line(20, 68, pageWidth - 20, 68);
      
      // Description
      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      doc.text("This is what your energy bill could look like with Prolt's optimized OA + DISCOM mix.", 20, 78);
      
      // Summary Section
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("Proposed Energy Cost", 20, 92);
      
      const totalEnergy = totalUnits || (oaUnits + discomUnits);
      const suggestedAvgRate = totalEnergy > 0 ? totalSuggestedCost / totalEnergy : avgSuggestedRate;
      
      // Calculate recommended OA/DISCOM split
      const recOaUnits = slotData.reduce((sum, s) => sum + (s.rec_source === 'OA' ? s.slot_kwh : 0), 0);
      const recDiscomUnits = slotData.reduce((sum, s) => sum + (s.rec_source === 'DISCOM' ? s.slot_kwh : 0), 0);
      
      const summaryData = [
        ["Total Energy Consumed", `${totalEnergy.toLocaleString('en-IN')} kWh`],
        ["Prolt Optimized OA Purchase", `${Math.round(recOaUnits).toLocaleString('en-IN')} kWh`],
        ["Prolt Optimized DISCOM Purchase", `${Math.round(recDiscomUnits).toLocaleString('en-IN')} kWh`],
        ["Proposed Total Bill", `₹${totalSuggestedCost.toLocaleString('en-IN')}`],
        ["Proposed Avg. Rate", `₹${suggestedAvgRate.toFixed(2)}/kWh`],
      ];
      
      let yPos = 102;
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      
      summaryData.forEach(([label, value]) => {
        doc.setTextColor(80, 80, 80);
        doc.text(label, 25, yPos);
        doc.setTextColor(0, 100, 0);
        doc.setFont("helvetica", "bold");
        doc.text(value, 140, yPos);
        doc.setFont("helvetica", "normal");
        yPos += 10;
      });
      
      // Savings Highlight
      yPos += 10;
      doc.setFillColor(220, 252, 231);
      doc.rect(20, yPos - 5, pageWidth - 40, 25, 'F');
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 100, 0);
      doc.text(`Potential Savings: ₹${totalSavings.toLocaleString('en-IN')}`, 25, yPos + 5);
      
      const actualAvgRate = totalEnergy > 0 ? totalActualCost / totalEnergy : avgActualRate;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`(Avg. rate reduction from ₹${actualAvgRate.toFixed(2)}/kWh to ₹${suggestedAvgRate.toFixed(2)}/kWh)`, 25, yPos + 15);
      
      // OA Charge Components
      yPos += 35;
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("OA Charge Components (Estimated)", 20, yPos);
      
      yPos += 12;
      const oaCharges = [
        ["IEX Energy Charges", `₹${(recOaUnits * 3.5).toLocaleString('en-IN')} (est. ₹3.50/kWh avg)`],
        ["STU + CTU Transmission", `₹${(recOaUnits * 0.40).toLocaleString('en-IN')}`],
        ["SLDC + NLDC Charges", `₹${(recOaUnits * 0.03).toLocaleString('en-IN')}`],
        ["Cross Subsidy Surcharge", `₹${(recOaUnits * 0.80).toLocaleString('en-IN')} (est.)`],
      ];
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      
      oaCharges.forEach(([label, value]) => {
        doc.setTextColor(80, 80, 80);
        doc.text(label, 25, yPos);
        doc.setTextColor(0, 0, 0);
        doc.text(value, 120, yPos);
        yPos += 8;
      });
      
      // Footer
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text("This proposed bill shows potential costs with Prolt's optimized energy mix. Actual costs may vary based on market conditions.", 20, 280);
      doc.text("© Probus SmartThings Pvt. Ltd. | www.prolt.in", 20, 286);
      
      doc.save('prolt_proposed_oa_bill.pdf');
      toast.success("Proposed OA Bill PDF downloaded successfully");
    } catch (error) {
      toast.error("Failed to generate PDF. Please try again.");
      console.error(error);
    }
  };

  // Generate comprehensive 3-page OA Settlement Report PDF matching DISCOM format
  const handleDownloadSettlementReport = () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 10;
      
      // Generate template data from props
      const templateData = generateTemplateData({
        monthLabel,
        monthISO,
        consumerName,
        accountId,
        meterNumber,
        sanctionedLoad,
        voltageLevel,
        category,
        address,
        mobileNo,
        todBreakdown,
        totalUnits,
        totalBill: totalActualCost,
        oaUnits,
        discomUnits,
        savings: totalSavings,
      });

      const fullDiscomName = getDiscomName(discomName);

      // Helper functions
      const drawBox = (x: number, y: number, w: number, h: number) => {
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.3);
        doc.rect(x, y, w, h);
      };

      const drawFilledBox = (x: number, y: number, w: number, h: number, r: number, g: number, b: number) => {
        doc.setFillColor(r, g, b);
        doc.rect(x, y, w, h, 'F');
        drawBox(x, y, w, h);
      };

      // ==================== PAGE 1: Bill Summary & Charges ====================
      
      // Header with DISCOM branding
      drawFilledBox(0, 0, pageWidth, 28, 15, 23, 42);
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("ELECTRICITY URBAN DISTRIBUTION DIVISION", pageWidth / 2, 10, { align: 'center' });
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(fullDiscomName, pageWidth / 2, 16, { align: 'center' });
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("OPEN ACCESS ADJUSTMENT BILL", pageWidth / 2, 24, { align: 'center' });

      // Top info row
      let yPos = 34;
      drawFilledBox(margin, yPos, pageWidth - 2 * margin, 8, 240, 240, 240);
      
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      
      const infoItems = [
        { label: 'Account ID:', value: templateData.accountId },
        { label: 'Agreement Type:', value: templateData.agreementType },
        { label: 'Voltage Level:', value: templateData.voltageLevel },
        { label: 'Feeder Type:', value: templateData.feederType },
      ];
      
      let xOffset = margin + 2;
      infoItems.forEach((item, i) => {
        doc.setFont("helvetica", "bold");
        doc.text(item.label, xOffset, yPos + 5);
        doc.setFont("helvetica", "normal");
        doc.text(item.value, xOffset + 22, yPos + 5);
        xOffset += 47;
      });

      yPos += 12;

      // Three boxes side by side: Consumer Details, Meter Details, Billing Information
      const boxWidth = (pageWidth - 2 * margin - 6) / 3;
      const boxHeight = 28;

      // Consumer Details Box
      drawBox(margin, yPos, boxWidth, boxHeight);
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.text("CONSUMER DETAILS", margin + 2, yPos + 5);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6);
      doc.text(`Name: ${templateData.consumerName}`, margin + 2, yPos + 11);
      doc.text(`Address: ${templateData.address.substring(0, 35)}`, margin + 2, yPos + 16);
      doc.text(`Mobile: ${templateData.mobileNo}`, margin + 2, yPos + 21);

      // Meter Details Box
      const meterBoxX = margin + boxWidth + 3;
      drawBox(meterBoxX, yPos, boxWidth, boxHeight);
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.text("METER DETAILS", meterBoxX + 2, yPos + 5);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6);
      doc.text(`Meter No: ${templateData.meterNumber}`, meterBoxX + 2, yPos + 11);
      doc.text(`MF: ${templateData.mf}`, meterBoxX + 2, yPos + 16);
      doc.text(`Line Loss: ${templateData.lineLoss}%   PF: ${templateData.powerFactor}`, meterBoxX + 2, yPos + 21);

      // Billing Information Box
      const billBoxX = margin + 2 * boxWidth + 6;
      drawBox(billBoxX, yPos, boxWidth, boxHeight);
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.text("BILLING INFORMATION", billBoxX + 2, yPos + 5);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6);
      doc.text(`Bill Month: ${templateData.billMonth}`, billBoxX + 2, yPos + 11);
      doc.text(`Bill Date: ${templateData.billDate}`, billBoxX + 2, yPos + 16);
      doc.text(`Due Date: ${templateData.billDueDate}`, billBoxX + 2, yPos + 21);
      doc.text(`OA Purchase Month: ${templateData.oaPurchaseMonth}`, billBoxX + 2, yPos + 26);

      yPos += boxHeight + 4;

      // Consumption Details Table
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("CONSUMPTION DETAILS", margin, yPos + 4);
      yPos += 6;

      // Table headers
      const consumptionCols = [
        'TOD', 'Prev Month\nKVAH', 'Curr Month\nKVAH', 'OA Units\nPeriphery', 'Available\nfor Consumer',
        'Adjustable\nOA Units', 'Extra\nPurchased', 'OA to be\nAdjusted', 'Actual\nAdjusted', 'Billable\nConsumption'
      ];
      
      const colWidth = (pageWidth - 2 * margin) / consumptionCols.length;
      
      drawFilledBox(margin, yPos, pageWidth - 2 * margin, 10, 220, 220, 220);
      
      doc.setFontSize(5);
      doc.setFont("helvetica", "bold");
      consumptionCols.forEach((col, i) => {
        const lines = col.split('\n');
        lines.forEach((line, j) => {
          doc.text(line, margin + i * colWidth + colWidth / 2, yPos + 3 + j * 3, { align: 'center' });
        });
      });

      yPos += 10;

      // Table rows
      doc.setFont("helvetica", "normal");
      doc.setFontSize(5);
      
      templateData.todConsumption.forEach((row, i) => {
        drawBox(margin, yPos, pageWidth - 2 * margin, 7);
        
        const values = [
          row.tod.split(' ')[0],
          row.prevMonthKVAH > 0 ? Math.round(row.prevMonthKVAH).toLocaleString('en-IN') : '—',
          row.currMonthKVAH > 0 ? Math.round(row.currMonthKVAH).toLocaleString('en-IN') : '—',
          row.oaUnitsPeriphery > 0 ? Math.round(row.oaUnitsPeriphery).toLocaleString('en-IN') : '—',
          row.availableForConsumer > 0 ? Math.round(row.availableForConsumer).toLocaleString('en-IN') : '—',
          row.adjustableOAUnits > 0 ? Math.round(row.adjustableOAUnits).toLocaleString('en-IN') : '—',
          row.extraPurchasedOA > 0 ? Math.round(row.extraPurchasedOA).toLocaleString('en-IN') : '—',
          row.oaUnitsToBeAdjusted > 0 ? Math.round(row.oaUnitsToBeAdjusted).toLocaleString('en-IN') : '—',
          row.actualAdjustedUnits > 0 ? Math.round(row.actualAdjustedUnits).toLocaleString('en-IN') : '—',
          row.billableConsumption > 0 ? Math.round(row.billableConsumption).toLocaleString('en-IN') : '—',
        ];
        
        values.forEach((val, j) => {
          doc.text(val, margin + j * colWidth + colWidth / 2, yPos + 4.5, { align: 'center' });
        });
        
        yPos += 7;
      });

      // Total row
      drawFilledBox(margin, yPos, pageWidth - 2 * margin, 7, 235, 235, 235);
      doc.setFont("helvetica", "bold");
      
      const totals = templateData.todConsumption.reduce((acc, row) => ({
        prev: acc.prev + row.prevMonthKVAH,
        curr: acc.curr + row.currMonthKVAH,
        oaPer: acc.oaPer + row.oaUnitsPeriphery,
        avail: acc.avail + row.availableForConsumer,
        adjust: acc.adjust + row.adjustableOAUnits,
        extra: acc.extra + row.extraPurchasedOA,
        toAdj: acc.toAdj + row.oaUnitsToBeAdjusted,
        actual: acc.actual + row.actualAdjustedUnits,
        billable: acc.billable + row.billableConsumption,
      }), { prev: 0, curr: 0, oaPer: 0, avail: 0, adjust: 0, extra: 0, toAdj: 0, actual: 0, billable: 0 });

      const totalValues = [
        'TOTAL',
        totals.prev > 0 ? Math.round(totals.prev).toLocaleString('en-IN') : '—',
        totals.curr > 0 ? Math.round(totals.curr).toLocaleString('en-IN') : '—',
        totals.oaPer > 0 ? Math.round(totals.oaPer).toLocaleString('en-IN') : '—',
        totals.avail > 0 ? Math.round(totals.avail).toLocaleString('en-IN') : '—',
        totals.adjust > 0 ? Math.round(totals.adjust).toLocaleString('en-IN') : '—',
        totals.extra > 0 ? Math.round(totals.extra).toLocaleString('en-IN') : '—',
        totals.toAdj > 0 ? Math.round(totals.toAdj).toLocaleString('en-IN') : '—',
        totals.actual > 0 ? Math.round(totals.actual).toLocaleString('en-IN') : '—',
        totals.billable > 0 ? Math.round(totals.billable).toLocaleString('en-IN') : '—',
      ];
      
      totalValues.forEach((val, j) => {
        doc.text(val, margin + j * colWidth + colWidth / 2, yPos + 4.5, { align: 'center' });
      });

      yPos += 12;

      // Two columns: Connection Details + Bill Details
      const halfWidth = (pageWidth - 2 * margin - 4) / 2;

      // Connection Details Box
      drawBox(margin, yPos, halfWidth, 32);
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.text("CONNECTION DETAILS", margin + 2, yPos + 5);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6);
      doc.text(`Sanctioned Load (kVA): ${templateData.sanctionedLoad || '—'}`, margin + 2, yPos + 11);
      doc.text(`Actual MD (kVA): ${templateData.actualMD > 0 ? Math.round(templateData.actualMD) : '—'}`, margin + 2, yPos + 16);
      doc.text(`Billable Demand: ${templateData.billableDemand > 0 ? Math.round(templateData.billableDemand) : '—'}`, margin + 2, yPos + 21);
      doc.text(`Supply Type: ${templateData.supplyType}`, margin + 2, yPos + 26);
      doc.text(`Tariff Type: ${templateData.tariffType}`, margin + 2, yPos + 31);

      // Bill Details Box
      const billDetailX = margin + halfWidth + 4;
      drawBox(billDetailX, yPos, halfWidth, 32);
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.text("BILL DETAILS", billDetailX + 2, yPos + 5);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6);

      const billItems = [
        ['Energy Charges', templateData.energyCharges],
        ['Fixed Charges', templateData.fixedCharges],
        ['Electricity Duty', templateData.electricityDuty],
        ['Other Adjustment', templateData.otherAdjustment],
      ];

      let billY = yPos + 11;
      billItems.forEach(([label, amount]) => {
        doc.text(`${label}:`, billDetailX + 2, billY);
        doc.text(`₹${Math.round(amount as number).toLocaleString('en-IN')}`, billDetailX + halfWidth - 20, billY);
        billY += 5;
      });

      yPos += 36;

      // Net Payable Amount Box
      drawFilledBox(margin, yPos, pageWidth - 2 * margin, 14, 220, 252, 231);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 100, 0);
      doc.text("NET PAYABLE AMOUNT:", margin + 5, yPos + 6);
      doc.setFontSize(12);
      doc.text(`₹${Math.round(templateData.netPayableAmount).toLocaleString('en-IN')}`, margin + 65, yPos + 6);
      
      doc.setFontSize(6);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      doc.text(`Due Date Rebate @1%: ₹${Math.round(templateData.dueDateRebate).toLocaleString('en-IN')}   |   Amount Payable before Due Date: ₹${Math.round(templateData.amountPayableBeforeDue).toLocaleString('en-IN')}`, margin + 5, yPos + 11);

      yPos += 18;

      // Amount in Words
      doc.setFontSize(6);
      doc.setFont("helvetica", "italic");
      doc.text(`Amount in Words: ${numberToWords(Math.round(templateData.netPayableAmount))}`, margin, yPos);

      yPos += 8;

      // Other Adjustment Details Table
      drawBox(margin, yPos, pageWidth - 2 * margin, 20);
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.text("OTHER ADJUSTMENT DETAILS", margin + 2, yPos + 5);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6);
      doc.text(`TCS: ₹${Math.round(templateData.tcs).toLocaleString('en-IN')}`, margin + 5, yPos + 11);
      doc.text(`FPPA Surcharge: ₹${Math.round(templateData.fppaSurcharge).toLocaleString('en-IN')}`, margin + 60, yPos + 11);
      doc.text(`Security Deposit Interest: ₹${Math.round(templateData.securityDepositInterest).toLocaleString('en-IN')}`, margin + 120, yPos + 11);

      yPos += 24;

      // Footer with signatures
      doc.setFontSize(6);
      doc.setFont("helvetica", "normal");
      doc.text("Prepared By: Junior Engineer", margin, yPos);
      doc.text("Reviewed By: Assistant Engineer", margin + 60, yPos);
      doc.text("Sanctioned By: Executive Engineer", margin + 130, yPos);

      yPos += 8;

      // Notes section
      doc.setFontSize(5);
      doc.setFont("helvetica", "bold");
      doc.text("NOTES:", margin, yPos);
      doc.setFont("helvetica", "normal");
      const notes = [
        "1. OA units are adjusted after deducting applicable line losses as per UPERC regulations.",
        "2. Extra OA units purchased beyond the scheduled quantity shall be banked for the next billing period.",
        "3. In case of any discrepancy, please contact the Division Office within 7 days of bill receipt.",
        "4. Payment after due date will attract Late Payment Surcharge as per tariff order.",
      ];
      notes.forEach((note, i) => {
        doc.text(note, margin, yPos + 4 + i * 3.5);
      });

      // ==================== PAGE 2: TOD & Meter Readings ====================
      doc.addPage();

      // Page 2 Header
      drawFilledBox(0, 0, pageWidth, 20, 15, 23, 42);
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("TOD CONSUMPTION & METER READINGS", pageWidth / 2, 12, { align: 'center' });

      yPos = 26;

      // Consumer info row
      drawFilledBox(margin, yPos, pageWidth - 2 * margin, 8, 240, 240, 240);
      doc.setFontSize(6);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      doc.text(`Account ID: ${templateData.accountId}`, margin + 2, yPos + 5);
      doc.text(`Consumer: ${templateData.consumerName}`, margin + 50, yPos + 5);
      doc.text(`Bill Date: ${templateData.billDate}`, margin + 130, yPos + 5);

      yPos += 12;

      // Meter and Contract Details
      drawBox(margin, yPos, (pageWidth - 2 * margin) / 2 - 2, 18);
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.text("METER DETAILS", margin + 2, yPos + 5);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6);
      doc.text(`Meter No: ${templateData.meterNumber}`, margin + 2, yPos + 11);
      doc.text(`MF: ${templateData.mf}`, margin + 2, yPos + 16);

      drawBox(margin + (pageWidth - 2 * margin) / 2 + 2, yPos, (pageWidth - 2 * margin) / 2 - 2, 18);
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.text("CONTRACT DETAILS", margin + (pageWidth - 2 * margin) / 2 + 4, yPos + 5);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6);
      doc.text(`Sanctioned Load: ${templateData.sanctionedLoad || '—'} kVA`, margin + (pageWidth - 2 * margin) / 2 + 4, yPos + 11);
      doc.text(`Tariff Category: ${templateData.tariffType}`, margin + (pageWidth - 2 * margin) / 2 + 4, yPos + 16);

      yPos += 22;

      // Time Slot Wise Reading Table
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("TIME SLOT WISE READING", margin, yPos + 4);
      yPos += 6;

      // Zone headers
      const zoneHeaders = ['Read Date', 'Zone 1', 'Zone 2', 'Zone 3', 'Zone 4', 'Zone 5', 'Zone 6', 'Zone 7', 'Zone 8', 'Total KVAH'];
      const zoneColWidth = (pageWidth - 2 * margin) / zoneHeaders.length;
      
      drawFilledBox(margin, yPos, pageWidth - 2 * margin, 8, 220, 220, 220);
      doc.setFontSize(5);
      doc.setFont("helvetica", "bold");
      zoneHeaders.forEach((header, i) => {
        doc.text(header, margin + i * zoneColWidth + zoneColWidth / 2, yPos + 5, { align: 'center' });
      });

      yPos += 8;

      // Zone values
      doc.setFont("helvetica", "normal");
      templateData.meterReadings.forEach((reading) => {
        drawBox(margin, yPos, pageWidth - 2 * margin, 7);
        const rowValues = [
          reading.readDate,
          ...reading.zones.map(z => z > 0 ? Math.round(z).toString() : '—'),
          Math.round(reading.totalKVAH).toLocaleString('en-IN'),
        ];
        rowValues.forEach((val, j) => {
          doc.text(val, margin + j * zoneColWidth + zoneColWidth / 2, yPos + 4.5, { align: 'center' });
        });
        yPos += 7;
      });

      yPos += 8;

      // Consumption Details Table
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("CONSUMPTION DETAILS", margin, yPos + 4);
      yPos += 6;

      const consumptionHeaders = ['TOD', 'Time Zone', 'Slab', 'Reading Date', 'KVAH', 'Open Access KWH'];
      const consColWidth = (pageWidth - 2 * margin) / consumptionHeaders.length;

      drawFilledBox(margin, yPos, pageWidth - 2 * margin, 8, 220, 220, 220);
      doc.setFontSize(6);
      doc.setFont("helvetica", "bold");
      consumptionHeaders.forEach((header, i) => {
        doc.text(header, margin + i * consColWidth + consColWidth / 2, yPos + 5, { align: 'center' });
      });

      yPos += 8;

      doc.setFont("helvetica", "normal");
      const todTimeZones = ['06:00-10:00', '10:00-18:00', '18:00-22:00', '22:00-06:00'];
      templateData.todConsumption.forEach((row, i) => {
        drawBox(margin, yPos, pageWidth - 2 * margin, 7);
        const rowData = [
          `TOD${i + 1}`,
          todTimeZones[i],
          '—',
          templateData.billDate,
          row.currMonthKVAH > 0 ? Math.round(row.currMonthKVAH).toLocaleString('en-IN') : '—',
          row.oaUnitsPeriphery > 0 ? Math.round(row.oaUnitsPeriphery).toLocaleString('en-IN') : '—',
        ];
        rowData.forEach((val, j) => {
          doc.text(val, margin + j * consColWidth + consColWidth / 2, yPos + 4.5, { align: 'center' });
        });
        yPos += 7;
      });

      yPos += 10;

      // Line Loss Calculation Box
      drawBox(margin, yPos, pageWidth - 2 * margin, 24);
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.text("LINE LOSS CALCULATION", margin + 2, yPos + 5);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6);
      
      const sumConsumption = templateData.todConsumption.reduce((sum, r) => sum + r.currMonthKVAH, 0);
      const consumptionAtTrans = sumConsumption * (1 + templateData.lineLoss / 100);
      
      doc.text(`Sum of Consumption: ${Math.round(sumConsumption).toLocaleString('en-IN')} KVAH`, margin + 5, yPos + 11);
      doc.text(`Consumption at Transmission End: ${Math.round(consumptionAtTrans).toLocaleString('en-IN')} KVAH`, margin + 5, yPos + 16);
      doc.text(`Line Loss: ${templateData.lineLoss}%`, margin + 5, yPos + 21);

      doc.text(`Feeder Type: ${templateData.feederType}`, margin + 110, yPos + 11);
      doc.text(`Voltage Level: ${templateData.voltageLevel}`, margin + 110, yPos + 16);

      yPos += 30;

      // Signature
      doc.setFontSize(6);
      doc.text("Prepared By: Junior Engineer", pageWidth - margin - 50, yPos);

      // ==================== PAGE 3: Banked Energy & Adjustment ====================
      doc.addPage();

      // Page 3 Header
      drawFilledBox(0, 0, pageWidth, 20, 15, 23, 42);
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("BANKED ENERGY & ADJUSTMENT STATEMENT", pageWidth / 2, 12, { align: 'center' });

      yPos = 26;

      // Consumer info
      drawFilledBox(margin, yPos, pageWidth - 2 * margin, 10, 240, 240, 240);
      doc.setFontSize(6);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      doc.text(`Consumer Account No: ${templateData.accountId}`, margin + 2, yPos + 4);
      doc.text(`Name of Drawee Entity: ${templateData.consumerName}`, margin + 65, yPos + 4);
      doc.text(`Billing Period: ${templateData.billMonth}`, margin + 150, yPos + 4);

      yPos += 14;

      // Banked Energy Table
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("TIME SLOT WISE BANKED ENERGY", margin, yPos + 4);
      yPos += 6;

      const bankedHeaders = ['Time Slot', 'Total Share of Drawee (MWh)', 'Banked Energy after Deduction', 'Final Share after Adjustment'];
      const bankedColWidth = (pageWidth - 2 * margin) / bankedHeaders.length;

      drawFilledBox(margin, yPos, pageWidth - 2 * margin, 10, 220, 220, 220);
      doc.setFontSize(6);
      doc.setFont("helvetica", "bold");
      bankedHeaders.forEach((header, i) => {
        doc.text(header, margin + i * bankedColWidth + bankedColWidth / 2, yPos + 6, { align: 'center' });
      });

      yPos += 10;

      doc.setFont("helvetica", "normal");
      templateData.bankedEnergy.forEach((row) => {
        drawBox(margin, yPos, pageWidth - 2 * margin, 8);
        const rowData = [
          row.timeSlot,
          row.totalShareMwh > 0 ? row.totalShareMwh.toFixed(3) : '—',
          row.bankedEnergyAfterDeduction > 0 ? row.bankedEnergyAfterDeduction.toFixed(3) : '—',
          row.finalShareAfterAdjustment > 0 ? row.finalShareAfterAdjustment.toFixed(3) : '—',
        ];
        rowData.forEach((val, j) => {
          doc.text(val, margin + j * bankedColWidth + bankedColWidth / 2, yPos + 5, { align: 'center' });
        });
        yPos += 8;
      });

      // Total row
      drawFilledBox(margin, yPos, pageWidth - 2 * margin, 8, 235, 235, 235);
      doc.setFont("helvetica", "bold");
      
      const bankedTotals = templateData.bankedEnergy.reduce((acc, row) => ({
        total: acc.total + row.totalShareMwh,
        banked: acc.banked + row.bankedEnergyAfterDeduction,
        final: acc.final + row.finalShareAfterAdjustment,
      }), { total: 0, banked: 0, final: 0 });

      const totalBankedData = [
        'TOTAL',
        bankedTotals.total > 0 ? bankedTotals.total.toFixed(3) : '—',
        bankedTotals.banked > 0 ? bankedTotals.banked.toFixed(3) : '—',
        bankedTotals.final > 0 ? bankedTotals.final.toFixed(3) : '—',
      ];
      totalBankedData.forEach((val, j) => {
        doc.text(val, margin + j * bankedColWidth + bankedColWidth / 2, yPos + 5, { align: 'center' });
      });

      yPos += 16;

      // Important Instructions
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("IMPORTANT INSTRUCTIONS", margin, yPos);
      yPos += 6;

      doc.setFontSize(5);
      doc.setFont("helvetica", "normal");
      const instructions = [
        "1. The above statement shows the energy banked under Open Access arrangement as per UPERC OA Regulations.",
        "2. Banked energy is available for adjustment in subsequent billing periods subject to applicable regulations.",
        "3. Any unutilized banked energy shall lapse as per the banking period specified in the tariff order.",
        "4. The drawee entity is responsible for ensuring proper scheduling and deviation settlement.",
        "5. Cross Subsidy Surcharge and Additional Surcharge are applicable as per the prevailing tariff order.",
        "6. For any queries regarding OA settlement, please contact the SLDC or the designated nodal officer.",
        "7. This statement is computer-generated and does not require physical signature for validation.",
        "8. All values are subject to reconciliation with SLDC records and final settlement.",
      ];
      instructions.forEach((instr, i) => {
        doc.text(instr, margin, yPos + 4 + i * 4);
      });

      yPos += 40;

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text("This document is generated by Prolt Smart Energy Assistant for OA settlement reconciliation.", pageWidth / 2, pageHeight - 15, { align: 'center' });
      doc.text("© Probus SmartThings Pvt. Ltd. | www.prolt.in", pageWidth / 2, pageHeight - 10, { align: 'center' });

      doc.save(`prolt_oa_settlement_${monthISO || 'report'}.pdf`);
      toast.success("OA Settlement Report PDF downloaded successfully");
    } catch (error) {
      toast.error("Failed to generate PDF. Please try again.");
      console.error(error);
    }
  };

  const handleDownloadCSV = () => {
    const csv = exportToCSV(slotData);
    downloadCSV(csv, 'slot_level_reconciliation.csv');
    toast.success("CSV downloaded successfully");
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Download className="w-5 h-5 text-accent" />
          Download Reports
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Export detailed analysis and settlement documents
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Actual OA Settlement - Only show if OA bill was uploaded */}
        {hasOaBill && (
          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-auto py-3"
            onClick={handleDownloadActualSettlement}
          >
            <FileCheck className="w-5 h-5 text-emerald-500" />
            <div className="text-left">
              <p className="font-medium">Actual OA Bill (PDF)</p>
              <p className="text-xs text-muted-foreground">
                Tally your actual OA bill with Prolt analysis
              </p>
            </div>
          </Button>
        )}

        {/* Proposed OA Bill - Always available */}
        <Button
          variant="outline"
          className="w-full justify-start gap-3 h-auto py-3"
          onClick={handleDownloadProposedBill}
        >
          <FileText className="w-5 h-5 text-blue-500" />
          <div className="text-left">
            <p className="font-medium">Proposed OA Bill (PDF)</p>
            <p className="text-xs text-muted-foreground">
              What you could pay with Prolt's optimized mix
            </p>
          </div>
        </Button>

        {/* OA Settlement Report - Always available */}
        <Button
          variant="outline"
          className="w-full justify-start gap-3 h-auto py-3"
          onClick={handleDownloadSettlementReport}
        >
          <FileText className="w-5 h-5 text-purple-500" />
          <div className="text-left">
            <p className="font-medium">OA Settlement Report (PDF)</p>
            <p className="text-xs text-muted-foreground">
              Detailed comparison with slot-level breakdown
            </p>
          </div>
        </Button>

        {/* CSV Export - Always available */}
        <Button
          variant="outline"
          className="w-full justify-start gap-3 h-auto py-3"
          onClick={handleDownloadCSV}
        >
          <FileSpreadsheet className="w-5 h-5 text-orange-500" />
          <div className="text-left">
            <p className="font-medium">Slot CSV</p>
            <p className="text-xs text-muted-foreground">
              Detailed 15-min slot reconciliation data
            </p>
          </div>
        </Button>
      </CardContent>
    </Card>
  );
}
