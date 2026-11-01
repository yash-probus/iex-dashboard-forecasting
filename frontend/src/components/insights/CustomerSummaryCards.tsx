import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { 
  Hash, 
  User, 
  Calendar, 
  IndianRupee, 
  Zap, 
  Gauge, 
  Layers, 
  Info, 
  Leaf, 
  Clock,
  Download,
  X,
  ChevronRight
} from "lucide-react";
import { formatCurrency } from "@/lib/calculatorUtils";

// Bill data interface for real data
export interface BillData {
  account_number: string;
  consumer_name: string;
  bill_month: string;
  amount_payable: number;
  billed_units_kwh: number;
  contracted_demand_kva: number;
  billable_demand_kva: number;
  total_energy_charges: number;
  total_misc_charges: number;
  oa_estimated_share_pct: number;
  oa_estimated_settlement_total: number;
  last_payment_status: { status: string; date: string; amount: number };
}

// Default dummy bill data for prototype
const defaultBillData: BillData = {
  account_number: "0001234567",
  consumer_name: "Acme Foods Pvt Ltd",
  bill_month: "2025-09",
  amount_payable: 125000.00,
  billed_units_kwh: 65000,
  contracted_demand_kva: 500,
  billable_demand_kva: 450,
  total_energy_charges: 82000.00,
  total_misc_charges: 15000.00,
  oa_estimated_share_pct: 28.5,
  oa_estimated_settlement_total: 36000.00,
  last_payment_status: { status: "Paid", date: "2025-09-05", amount: 125000.00 }
};

interface SummaryCardData {
  id: string;
  icon: React.ReactNode;
  label: string;
  value: string | React.ReactNode;
  tooltip: string;
  details: string;
  isPrimary?: boolean;
  isAlwaysVisible?: boolean;
}

interface CustomerSummaryCardsProps {
  billData?: Partial<BillData>;
  onShowFormulaModal?: () => void;
}

export const CustomerSummaryCards = ({ 
  billData: propsBillData,
  onShowFormulaModal
}: CustomerSummaryCardsProps) => {
  // Merge provided data with defaults
  const billData: BillData = { ...defaultBillData, ...propsBillData };
  
  const [selectedCard, setSelectedCard] = useState<SummaryCardData | null>(null);
  const [showMore, setShowMore] = useState(false);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-IN', {
      month: 'short',
      year: 'numeric'
    });
  };

  const handleDownload = () => {
    // Dummy download for prototype
    const blob = new Blob([`Parsed Bill Data\n\nAccount: ${billData.account_number}\nConsumer: ${billData.consumer_name}\nBill Month: ${billData.bill_month}\nAmount Payable: ₹${billData.amount_payable.toLocaleString('en-IN')}\nBilled Units: ${billData.billed_units_kwh} kWh`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `parsed_bill_${billData.bill_month}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const cards: SummaryCardData[] = [
    {
      id: 'account',
      icon: <Hash className="w-4 h-4" />,
      label: 'Account',
      value: billData.account_number,
      tooltip: 'Your electricity account number used to fetch the bill.',
      details: `Account Number: ${billData.account_number}\n\nThis is your unique electricity connection identifier used by the DISCOM to track your consumption and billing.`,
    },
    {
      id: 'customer',
      icon: <User className="w-4 h-4" />,
      label: 'Customer',
      value: billData.consumer_name,
      tooltip: 'Name of the consumer as it appears on the bill.',
      details: `Consumer Name: ${billData.consumer_name}\n\nThis is the registered name under which the electricity connection is held.`,
    },
    {
      id: 'bill_month',
      icon: <Calendar className="w-4 h-4" />,
      label: 'Bill Month',
      value: formatMonth(billData.bill_month),
      tooltip: 'Billing month for this bill.',
      details: `Billing Period: ${formatMonth(billData.bill_month)}\n\nThis indicates the month for which this bill has been generated.`,
      isAlwaysVisible: true,
    },
    {
      id: 'amount_payable',
      icon: <IndianRupee className="w-4 h-4" />,
      label: 'Amount Payable',
      value: `₹${billData.amount_payable.toLocaleString('en-IN')}`,
      tooltip: 'Total amount payable for this bill (final amount after all charges).',
      details: `Total Amount: ₹${billData.amount_payable.toLocaleString('en-IN')}\n\nThis is the final amount payable after including all charges: energy charges, fixed charges, taxes, and adjustments.`,
      isPrimary: true,
      isAlwaysVisible: true,
    },
    {
      id: 'billed_units',
      icon: <Zap className="w-4 h-4" />,
      label: 'Billed Units',
      value: `${billData.billed_units_kwh.toLocaleString('en-IN')} kWh`,
      tooltip: 'Total energy consumed in kWh for this bill month.',
      details: `Energy Consumption: ${billData.billed_units_kwh.toLocaleString('en-IN')} kWh\n\nThis is the total electrical energy consumed during the billing period, measured in kilowatt-hours.`,
      isAlwaysVisible: true,
    },
    {
      id: 'demand',
      icon: <Gauge className="w-4 h-4" />,
      label: 'Contract / Billable',
      value: `${billData.contracted_demand_kva} / ${billData.billable_demand_kva} kVA`,
      tooltip: 'Contracted and billed demand in kVA (used to compute fixed charges).',
      details: `Contracted Demand: ${billData.contracted_demand_kva} kVA\nBillable Demand: ${billData.billable_demand_kva} kVA\n\nContracted demand is your sanctioned maximum load. Billable demand is the higher of 85% of contracted demand or actual maximum demand recorded.`,
    },
    {
      id: 'energy_charges',
      icon: <Layers className="w-4 h-4" />,
      label: 'Energy Charges',
      value: `₹${billData.total_energy_charges.toLocaleString('en-IN')}`,
      tooltip: 'Total charges for actual energy consumed (variable cost).',
      details: `Energy Charges: ₹${billData.total_energy_charges.toLocaleString('en-IN')}\n\nThis is the variable cost component based on your actual consumption multiplied by the applicable tariff rates for each ToD slot.`,
    },
    {
      id: 'misc_charges',
      icon: <Info className="w-4 h-4" />,
      label: 'Misc Charges',
      value: `₹${billData.total_misc_charges.toLocaleString('en-IN')}`,
      tooltip: 'Other charges (wheeling, SLDC, fixed, taxes).',
      details: `Miscellaneous Charges: ₹${billData.total_misc_charges.toLocaleString('en-IN')}\n\nThis includes wheeling charges, SLDC charges, fixed/demand charges, electricity duty, and other regulatory levies.`,
    },
    {
      id: 'oa_estimate',
      icon: <Leaf className="w-4 h-4" />,
      label: 'OA Estimate',
      value: `${billData.oa_estimated_share_pct}% · ₹${billData.oa_estimated_settlement_total.toLocaleString('en-IN')}`,
      tooltip: 'Model estimate of OA share and settlement amount from OA if applicable.',
      details: `OA Share: ${billData.oa_estimated_share_pct}%\nSettlement Amount: ₹${billData.oa_estimated_settlement_total.toLocaleString('en-IN')}\n\nThis is the estimated proportion of your consumption that could be met through Open Access procurement and the associated settlement charges.`,
    },
    {
      id: 'last_payment',
      icon: <Clock className="w-4 h-4" />,
      label: 'Last Payment',
      value: (
        <div className="flex items-center gap-1.5">
          <Badge 
            variant={billData.last_payment_status.status === 'Paid' ? 'default' : 'destructive'}
            className={`text-[10px] px-1.5 py-0 ${billData.last_payment_status.status === 'Paid' ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : ''}`}
          >
            {billData.last_payment_status.status}
          </Badge>
          <span className="text-xs text-muted-foreground">{formatDate(billData.last_payment_status.date)}</span>
        </div>
      ),
      tooltip: 'Status, date and amount of the latest payment recorded.',
      details: `Payment Status: ${billData.last_payment_status.status}\nDate: ${formatDate(billData.last_payment_status.date)}\nAmount: ₹${billData.last_payment_status.amount.toLocaleString('en-IN')}\n\nThis shows the status of your most recent payment against electricity bills.`,
      isAlwaysVisible: true,
    },
  ];

  // Cards that are always visible on small screens
  const alwaysVisibleIds = ['amount_payable', 'billed_units', 'bill_month', 'last_payment'];
  const visibleCards = showMore ? cards : cards.filter(c => c.isAlwaysVisible || window.innerWidth >= 640);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="w-full">
        {/* Cards Container */}
        <div className="flex flex-wrap justify-center gap-3">
          {cards.map((card) => {
            const isHiddenOnMobile = !card.isAlwaysVisible && !showMore;
            
            return (
              <Tooltip key={card.id}>
                <TooltipTrigger asChild>
                  <Card
                    role="button"
                    tabIndex={0}
                    aria-label={`${card.label}: ${typeof card.value === 'string' ? card.value : 'View details'}`}
                    onClick={() => setSelectedCard(card)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedCard(card);
                      }
                    }}
                    className={`
                      group cursor-pointer transition-all duration-300 ease-out
                      py-3 px-4 rounded-xl
                      bg-[hsl(210,20%,97%)] dark:bg-[hsl(217,33%,17%)]
                      border border-border/50 
                      shadow-sm hover:shadow-lg
                      hover:-translate-y-1.5
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2
                      ${card.isPrimary ? 'border-l-4 border-l-accent' : ''}
                      ${isHiddenOnMobile ? 'hidden sm:flex' : 'flex'}
                      flex-col items-start gap-1.5
                      min-w-[140px] max-w-[180px]
                    `}
                  >
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span className="text-accent">{card.icon}</span>
                      <span className="text-xs font-medium">{card.label}</span>
                    </div>
                    <div className={`font-semibold text-foreground ${card.isPrimary ? 'text-lg' : 'text-sm'} truncate max-w-full`}>
                      {card.value}
                    </div>
                  </Card>
                </TooltipTrigger>
                <TooltipContent 
                  side="bottom" 
                  className="max-w-[250px] text-xs"
                  sideOffset={8}
                >
                  {card.tooltip}
                </TooltipContent>
              </Tooltip>
            );
          })}

          {/* "More" pill for mobile */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMore(!showMore)}
            className="sm:hidden flex items-center gap-1 rounded-full px-4 py-2 text-xs"
          >
            {showMore ? 'Less' : 'More'}
            <ChevronRight className={`w-3 h-3 transition-transform ${showMore ? 'rotate-90' : ''}`} />
          </Button>
        </div>

        {/* Detail Flyout Sheet */}
        <Sheet open={!!selectedCard} onOpenChange={(open) => !open && setSelectedCard(null)}>
          <SheetContent side="right" className="w-[420px] max-w-full">
            <SheetHeader className="pb-4">
              <SheetTitle className="flex items-center gap-2">
                <span className="text-accent">{selectedCard?.icon}</span>
                {selectedCard?.label}
              </SheetTitle>
              <SheetDescription className="text-sm">
                Detailed information about this field
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-4">
              {/* Value Display */}
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-foreground">
                  {typeof selectedCard?.value === 'string' ? selectedCard.value : billData.last_payment_status.status}
                </p>
              </div>

              {/* Details */}
              <div className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                {selectedCard?.details}
              </div>

              {/* Special link for Amount Payable */}
              {selectedCard?.id === 'amount_payable' && onShowFormulaModal && (
                <Button 
                  variant="link" 
                  size="sm" 
                  onClick={() => {
                    setSelectedCard(null);
                    onShowFormulaModal();
                  }}
                  className="text-accent p-0 h-auto"
                >
                  Explain how this was calculated →
                </Button>
              )}

              {/* Download Button */}
              <Button 
                variant="outline" 
                className="w-full mt-4"
                onClick={handleDownload}
              >
                <Download className="w-4 h-4 mr-2" />
                Download parsed bill (PDF)
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </TooltipProvider>
  );
};

export default CustomerSummaryCards;