import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ArrowLeft,
  Plus,
  ChevronDown,
  ChevronUp,
  Trash2,
  Info,
  Pencil,
  Check,
} from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { ManualMonthEntry, ConsumerMetadata } from "./types";
import { MonthYearPicker } from "@/components/MonthYearPicker";
import { formatMonthYear } from "@/utils/common";
import { monthNames } from "@/utils/constant";
import { cn } from "@/lib/utils";

interface ManualEntryFlowProps {
  entries: ManualMonthEntry[];
  onEntriesChange: (entries: ManualMonthEntry[]) => void;
  onBack: () => void;
  onPreview: () => void;
  usesOA?: boolean;
  compact?: boolean;
  todConfigs?: Record<string, any[]>;
  metadata?: ConsumerMetadata;
}

interface TodSlotDefinition {
  id: number;
  tod: string;
  description: string;
  todStartHour: number;
  todEndHour: number;
}

function UnitToggle({
  value,
  onChange,
  options,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  disabled?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-0.5 rounded-md border border-border p-0.5 bg-muted/30",
        disabled && "opacity-50 cursor-not-allowed",
      )}
    >
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          disabled={disabled}
          className={`px-2 py-0.5 text-[11px] font-medium rounded transition-colors ${
            value === opt
              ? "bg-accent text-accent-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => onChange(opt)}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function formatTime(hour: number): string {
  return `${hour.toString().padStart(2, "0")}:00`;
}

function getTimeRange(startHour: number, endHour: number): string {
  return `${formatTime(startHour)} – ${formatTime(endHour)}`;
}

export function ManualEntryFlow({
  entries,
  onEntriesChange,
  onBack,
  onPreview,
  usesOA = false,
  compact = false,
  todConfigs = {},
  metadata,
}: ManualEntryFlowProps) {
  const [consumptionUnit, setConsumptionUnit] = useState<"kWh" | "MWh">("kWh");

  const getDefaultTodSlots = (): TodSlotDefinition[] => [
    {
      id: 1,
      tod: "TOD-1",
      description: "Morning",
      todStartHour: 5,
      todEndHour: 11,
    },
    {
      id: 2,
      tod: "TOD-2",
      description: "Day",
      todStartHour: 11,
      todEndHour: 17,
    },
    {
      id: 3,
      tod: "TOD-3",
      description: "Evening",
      todStartHour: 17,
      todEndHour: 23,
    },
    {
      id: 4,
      tod: "TOD-4",
      description: "Night",
      todStartHour: 23,
      todEndHour: 5,
    },
  ];

  const handleConsumptionUnitChange = (newUnit: string) => {
    const from = consumptionUnit;
    const to = newUnit as "kWh" | "MWh";
    if (from === to) return;

    const factor = to === "MWh" ? 0.001 : 1000;

    const converted = entries.map((e) => {
      const updated = { ...e };
      Object.keys(updated).forEach((key) => {
        if (key.match(/^tod\d+(Discom|Oa)?$/i) || key.match(/^oaTod\d+$/i)) {
          const val = updated[key];
          if (val && val !== "" && typeof val === "string") {
            updated[key] = (parseFloat(val) * factor).toFixed(
              to === "MWh" ? 3 : 0,
            );
          }
        }
      });
      return updated;
    });

    onEntriesChange(converted);
    setConsumptionUnit(to);
  };

  const addMonth = () => {
    if (entries.length >= 12) return;
    const newEntry: ManualMonthEntry = {
      id: Math.random().toString(36).substr(2, 9),
      month: "",
      monthISO: "",
      billAmount: "",
      oaBillAmount: "",
      expanded: true,
      hasOaBill: usesOA,
      oaFiles: [],
      peakDemand: "",
      peakDemandUnit: "kW",
      isNew: true,
      isLocked: false,
      isEdited: false,
    };
    const updated = entries.map((e) => ({ ...e, expanded: false }));
    onEntriesChange([...updated, newEntry]);
  };

  const updateEntry = (id: string, updates: Partial<ManualMonthEntry>) => {
    onEntriesChange(
      entries.map((e) => (e.id === id ? { ...e, ...updates } : e)),
    );
  };

  const toggleExpand = (id: string) => {
    onEntriesChange(
      entries.map((e) => (e.id === id ? { ...e, expanded: !e.expanded } : e)),
    );
  };

  const removeEntry = (id: string) => {
    onEntriesChange(entries.filter((e) => e.id !== id));
  };

  const isValid =
    entries.length > 0 &&
    entries.every((e) => {
      const currentMonth = e.monthISO || e.month;
      if (!currentMonth || !e.billAmount) return false;

      let slotsToCheck: string[] = [];
      if (currentMonth && metadata?.state && metadata?.discom) {
        const [yearStr, monthNumStr] = currentMonth.split("-");
        const monthName = monthNames[parseInt(monthNumStr) - 1];
        const configKey = `${metadata.state}-${metadata.discom}-${monthName}-${yearStr}`;
        const config = todConfigs[configKey];
        if (config) {
          slotsToCheck = config.map((s) => `tod${s.id}Discom`);
        } else {
          slotsToCheck = [
            "tod1Discom",
            "tod2Discom",
            "tod3Discom",
            "tod4Discom",
          ];
        }
      } else {
        slotsToCheck = ["tod1Discom", "tod2Discom", "tod3Discom", "tod4Discom"];
      }

      const hasAnyTod = slotsToCheck.length !== 0;
      if (!hasAnyTod) return false;

      if (usesOA) {
        const oaSlotsToCheck = slotsToCheck.map((s) =>
          s.replace("Discom", "Oa"),
        );
        const hasAnyOaTod = oaSlotsToCheck.length !== 0;
        if (!hasAnyOaTod || !e.oaBillAmount) return false;
      }
      return true;
    });

  const renderTodRow = (
    entry: ManualMonthEntry,
    type: "Discom" | "Oa",
    heading: string,
    showUnitToggle: boolean,
  ) => {
    let slots = getDefaultTodSlots();

    const currentMonth = entry.monthISO || entry.month;

    if (currentMonth && metadata?.state && metadata?.discom) {
      const [yearStr, monthNumStr] = currentMonth.split("-");
      const monthName = monthNames[parseInt(monthNumStr) - 1];
      const configKey = `${metadata.state}-${metadata.discom}-${monthName}-${yearStr}`;
      const config = todConfigs[configKey];
      if (config) {
        slots = config.map((s) => ({
          id: s.id,
          tod: s.tod,
          description: s.description || "",
          todStartHour: s.todStartHour,
          todEndHour: s.todEndHour,
        }));
      }
    }

    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-foreground">
              {heading}
            </span>
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3.5 h-3.5 text-muted-foreground cursor-pointer hover:text-foreground transition-colors" />
                </TooltipTrigger>
                <TooltipContent className="max-w-[250px] text-xs" side="top">
                  {type === "Oa"
                    ? "Enter total OA consumption as per your Daily Obligation Report or Settlement Report for each TOD."
                    : "Enter total monthly consumption values as per your DISCOM electricity bill for each TOD."}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          {showUnitToggle && (
            <UnitToggle
              value={consumptionUnit}
              onChange={handleConsumptionUnitChange}
              options={["kWh", "MWh"]}
              disabled={entry.isLocked}
            />
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {slots
            .sort((a, b) => {
              const aId = parseInt(a.tod.match(/\d+/)?.[0] || "0");
              const bId = parseInt(b.tod.match(/\d+/)?.[0] || "0");
              return aId - bId;
            })
            .map((slot) => {
              const numericId =
                slot.tod.match(/\d+/)?.[0] || slot.id.toString();
              const fieldName = `tod${numericId}${type}`;
              return (
                <div key={slot.id} className="space-y-0.5">
                  <Label className="text-xs font-medium">{slot.tod}</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    disabled={entry.isLocked}
                    value={(entry as any)[fieldName] || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "" || /^\d*\.?\d*$/.test(val)) {
                        updateEntry(entry.id, {
                          [fieldName]: val,
                        });
                      }
                    }}
                    className="h-8 text-sm font-mono"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    {getTimeRange(slot.todStartHour, slot.todEndHour)}
                  </p>
                </div>
              );
            })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {!compact && (
        <Button
          variant="ghost"
          onClick={onBack}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
      )}

      <Card className="border-0 shadow-lg">
        <CardHeader className={compact ? "pb-2 py-2 px-4" : ""}>
          <CardTitle className={compact ? "text-base" : "text-xl"}>
            Enter ToD Consumption
          </CardTitle>
          <p
            className={`${compact ? "text-xs" : "text-sm"} text-muted-foreground`}
          >
            Add monthly consumption data for each Time-of-Day period
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {entries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No months added yet. Click below to add your first month.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {entries.map((entry) => (
                <Collapsible
                  key={entry.id}
                  open={entry.expanded}
                  onOpenChange={() => toggleExpand(entry.id)}
                >
                  <div className="border rounded-lg overflow-hidden">
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between p-3 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          {entry.expanded ? (
                            <ChevronUp className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          )}
                          <span className="font-medium">
                            {entry.monthISO
                              ? formatMonthYear(entry.monthISO)
                              : "New Month"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {entry.isLocked ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-primary hover:text-primary/80 flex items-center gap-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateEntry(entry.id, {
                                  isLocked: false,
                                  isEdited: true,
                                });
                              }}
                            >
                              <Pencil className="w-3 h-3" />
                              Edit
                            </Button>
                          ) : (
                            !entry.isNew && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-success hover:text-success/80 flex items-center gap-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateEntry(entry.id, {
                                    isLocked: true,
                                  });
                                }}
                              >
                                <Check className="w-3 h-3" />
                                Done
                              </Button>
                            )
                          )}
                          {entry?.isNew && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeEntry(entry.id);
                              }}
                              className="text-muted-foreground hover:text-destructive h-7 w-7"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="p-3 space-y-3 border-t">
                        <div className="space-y-1">
                          <Label className="text-xs">Month</Label>
                          <MonthYearPicker
                            disabled={entry.isLocked || !entry.isNew}
                            disabledMonths={entries
                              .filter((e) => e.id !== entry.id)
                              .map((e) => e.monthISO || e.month)}
                            value={entry.monthISO || entry.month}
                            onChange={(value: string) => {
                              updateEntry(entry.id, {
                                monthISO: value,
                                month: value,
                              });
                            }}
                          />
                        </div>

                        {(entry.monthISO || entry.month) && (
                          <>
                            {renderTodRow(
                              entry,
                              "Discom",
                              usesOA
                                ? "Total Monthly Consumption with OA"
                                : "Total Monthly Consumption",
                              true,
                            )}

                            {usesOA &&
                              renderTodRow(
                                entry,
                                "Oa",
                                "OA Consumption",
                                false,
                              )}

                            <div className="pt-2 border-t border-border/50 space-y-3">
                              <div className="space-y-1">
                                <Label className="text-xs">Peak Demand</Label>
                                <div className="relative">
                                  <Input
                                    type="text"
                                    inputMode="decimal"
                                    placeholder="500"
                                    disabled={entry.isLocked}
                                    value={entry.peakDemand || ""}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      if (
                                        val === "" ||
                                        /^\d*\.?\d*$/.test(val)
                                      ) {
                                        updateEntry(entry.id, {
                                          peakDemand: val,
                                        });
                                      }
                                    }}
                                    className="h-8 text-sm font-mono pr-20"
                                  />
                                  <div className="absolute right-1 top-1/2 -translate-y-1/2">
                                    <UnitToggle
                                      value={entry.peakDemandUnit || "kW"}
                                      disabled={entry.isLocked}
                                      onChange={(v) =>
                                        updateEntry(entry.id, {
                                          peakDemandUnit: v,
                                        })
                                      }
                                      options={["kW", "MW"]}
                                    />
                                  </div>
                                </div>
                              </div>

                              {usesOA ? (
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                    <Label className="text-xs">
                                      Total DISCOM Bill (₹){" "}
                                      <span className="text-destructive">
                                        *
                                      </span>
                                    </Label>
                                    <Input
                                      type="text"
                                      inputMode="decimal"
                                      placeholder="250000"
                                      disabled={entry.isLocked}
                                      value={entry.billAmount || ""}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        if (
                                          val === "" ||
                                          /^\d*\.?\d*$/.test(val)
                                        ) {
                                          updateEntry(entry.id, {
                                            billAmount: val,
                                          });
                                        }
                                      }}
                                      className="h-8 text-sm font-mono"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs">
                                      Total OA Bill (₹){" "}
                                      <span className="text-destructive">
                                        *
                                      </span>
                                    </Label>
                                    <Input
                                      type="text"
                                      inputMode="decimal"
                                      placeholder="100000"
                                      disabled={entry.isLocked}
                                      value={entry.oaBillAmount || ""}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        if (
                                          val === "" ||
                                          /^\d*\.?\d*$/.test(val)
                                        ) {
                                          updateEntry(entry.id, {
                                            oaBillAmount: val,
                                          });
                                        }
                                      }}
                                      className="h-8 text-sm font-mono"
                                    />
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  <Label className="text-xs">
                                    Total Bill Amount (₹){" "}
                                    <span className="text-destructive">*</span>
                                  </Label>
                                  <Input
                                    type="text"
                                    inputMode="decimal"
                                    placeholder="250000"
                                    disabled={entry.isLocked}
                                    value={entry.billAmount || ""}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      if (
                                        val === "" ||
                                        /^\d*\.?\d*$/.test(val)
                                      ) {
                                        updateEntry(entry.id, {
                                          billAmount: val,
                                        });
                                      }
                                    }}
                                    className="h-8 text-sm font-mono"
                                  />
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
            </div>
          )}

          <Button
            variant="outline"
            onClick={addMonth}
            disabled={entries.length >= 12}
            className="w-full gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Month
          </Button>

          <Button
            onClick={onPreview}
            disabled={!isValid}
            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
            size="lg"
          >
            Preview Inputs
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
