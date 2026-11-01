// @ts-nocheck

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ConsumerMetadata } from "./types";
import { Building2 } from "lucide-react";
import { STATE_MAP } from "@/utils/constant";
import { useConfigData } from "@/hooks/useConfigData";
import { getStateAndDiscomList } from "@/utils/common";

interface ConsumerMetadataCardProps {
  metadata: ConsumerMetadata;
  onChange: (metadata: ConsumerMetadata) => void;
  compact?: boolean;
  onEdit?: () => void;
}

const DISCOMS = [
  { value: "dvvnl", label: "DVVNL" },
  { value: "mvvnl", label: "MVVNL" },
  { value: "pvvnl", label: "PVVNL" },
  { value: "puvvnl", label: "PuVVNL" },
  { value: "kesco", label: "KESCO" },
];

const DISCOMS_FULL = [
  {
    value: "dvvnl",
    label: "Dakshinanchal Vidyut Vitaran Nigam Limited (DVVNL)",
  },
  { value: "mvvnl", label: "Madhyanchal Vidyut Vitaran Nigam Limited (MVVNL)" },
  {
    value: "pvvnl",
    label: "Pashchimanchal Vidyut Vitaran Nigam Limited (PVVNL)",
  },
  {
    value: "puvvnl",
    label: "Purvanchal Vidyut Vitaran Nigam Limited (PuVVNL)",
  },
  { value: "kesco", label: "Kanpur Electricity Supply Company (KESCO)" },
];

const CATEGORIES = [
  { value: "industrial", label: "Industrial" },
  { value: "commercial", label: "Commercial" },
];

const VOLTAGE_LEVELS = [
  { value: "KV_11", label: "11 kV" },
  { value: "KV_33", label: "33 kV" },
];

export function ConsumerMetadataCard({
  metadata,
  onChange,
  compact = false,
  onEdit,
}: ConsumerMetadataCardProps) {
  const updateField = (
    field: keyof ConsumerMetadata,
    value: string | boolean,
  ) => {
    onChange({ ...metadata, [field]: value });
  };

  const validateSanctionedLoad = (value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return "";
    if (num < 0.01) return "0.01";
    if (num > 1000) return "1000";
    return value;
  };

  const discomList = compact ? DISCOMS : DISCOMS_FULL;

  const { data } = useConfigData();

  const transformedData = getStateAndDiscomList(data);

  const discomOptions =
    transformedData.getDiscomList[metadata?.state || ""] || [];

  if (compact) {
    return (
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-accent" />
            <span className="flex-1">Consumer Details</span>
            {onEdit && (
              <button
                onClick={onEdit}
                className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
              >
                Edit
              </button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 space-y-2.5">
          <div className="space-y-2.5">
            <div className="space-y-1">
              <Label className="text-xs">State</Label>
              <Select
                value={metadata?.state}
                onValueChange={(v) => updateField("state", v)}
              >
                <SelectTrigger
                  className="h-8 text-xs"
                  disabled={metadata.isEditable}
                >
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATE_MAP).map(([code, name]) => (
                    <SelectItem key={code} value={code}>
                      {code.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">DISCOM</Label>
              <Select
                value={metadata?.discom}
                onValueChange={(v) => updateField("discom", v)}
              >
                <SelectTrigger
                  className="h-8 text-xs"
                  disabled={metadata.isEditable}
                >
                  <SelectValue placeholder="Select DISCOM" />
                </SelectTrigger>
                <SelectContent>
                  {discomOptions.length === 0 && (
                    <SelectItem value="nodiscom" disabled>
                      No Discom Present
                    </SelectItem>
                  )}
                  {discomOptions.map(
                    (d: { discom: string; displayName: string }) => (
                      <SelectItem key={d.discom} value={d.discom}>
                        {d.displayName}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Category</Label>
                <Select
                  value={metadata?.category.toLowerCase()}
                  onValueChange={(v) => updateField("category", v)}
                >
                  <SelectTrigger
                    className="h-8 text-xs"
                    disabled={metadata.isEditable}
                  >
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Voltage</Label>
                <Select
                  value={metadata?.voltageLevel}
                  onValueChange={(v) => updateField("voltageLevel", v)}
                >
                  <SelectTrigger
                    className="h-8 text-xs"
                    disabled={metadata.isEditable}
                  >
                    <SelectValue placeholder="Voltage" />
                  </SelectTrigger>
                  <SelectContent>
                    {VOLTAGE_LEVELS.map((v) => (
                      <SelectItem key={v.value} value={v.value}>
                        {v.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs" htmlFor="sanctioned-load-compact">
                Sanctioned Load (KW)
              </Label>
              <Input
                id="sanctioned-load-compact"
                type="number"
                step="0.01"
                min="0.01"
                max="1000"
                placeholder="e.g., 2.5"
                value={metadata?.sanctionedLoad}
                onChange={(e) => updateField("sanctionedLoad", e.target.value)}
                className="h-8 text-xs"
                disabled={metadata.isEditable}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Using OA?</Label>
              <div className="flex gap-1.5 h-8 items-center">
                <Button
                  type="button"
                  size="sm"
                  variant={metadata?.usesOA ? "default" : "outline"}
                  className={`h-7 text-xs flex-1 ${metadata?.usesOA ? "bg-accent text-accent-foreground hover:bg-accent/90" : ""}`}
                  onClick={() => updateField("usesOA", true)}
                  disabled={metadata.isEditable}
                >
                  Yes
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={!metadata?.usesOA ? "default" : "outline"}
                  className={`h-7 text-xs flex-1 ${!metadata?.usesOA ? "bg-accent text-accent-foreground hover:bg-accent/90" : ""}`}
                  onClick={() => updateField("usesOA", false)}
                  disabled={metadata.isEditable}
                >
                  No
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-3 pt-4 px-4">
        <CardTitle className="text-base flex items-center gap-2">
          <Building2 className="w-5 h-5 text-accent" />
          Consumer Details
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-sm">State</Label>
            <Select
              value={metadata.state}
              onValueChange={(v) => updateField("state", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent>
                {/* {Object.entries(STATE_MAP).map(([code, name]) => (
                  <SelectItem key={code} value={code}>
                    {code.replace("_", " ")}
                  </SelectItem>
                ))} */}
                {transformedData.getStateList.length === 0 && (
                  <SelectItem key="select-state" value="select-state" disabled>
                    No State Present
                  </SelectItem>
                )}
                {transformedData.getStateList.map(({ label, value }) => (
                  <SelectItem key={label} value={label}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">DISCOM</Label>
            <Select
              value={metadata.discom}
              onValueChange={(v) => updateField("discom", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select DISCOM" />
              </SelectTrigger>
              <SelectContent>
                {discomOptions.length === 0 && (
                  <SelectItem value="nodiscom" disabled>
                    No Discom Present
                  </SelectItem>
                )}
                {discomOptions.map(
                  (d: { discom: string; displayName: string }) => (
                    <SelectItem key={d.discom} value={d.discom}>
                      {d.displayName}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">Consumer Category</Label>
            <Select
              value={metadata.category}
              onValueChange={(v) => updateField("category", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">Voltage Level</Label>
            <Select
              value={metadata.voltageLevel}
              onValueChange={(v) => updateField("voltageLevel", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select voltage" />
              </SelectTrigger>
              <SelectContent>
                {VOLTAGE_LEVELS.map((v) => (
                  <SelectItem key={v.value} value={v.value}>
                    {v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sanctioned-load" className="text-sm">
              Sanctioned Load (KW)
            </Label>
            <Input
              id="sanctioned-load"
              type="number"
              step="0.01"
              min="0.01"
              max="1000"
              placeholder="e.g., 2.5"
              value={metadata.sanctionedLoad}
              onChange={(e) => updateField("sanctionedLoad", e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">Currently Using OA?</Label>
            <div className="flex gap-2 h-10 items-center">
              <Button
                type="button"
                size="sm"
                variant={metadata.usesOA ? "default" : "outline"}
                className={
                  metadata.usesOA
                    ? "bg-accent text-accent-foreground hover:bg-accent/90 flex-1"
                    : "flex-1"
                }
                onClick={() => updateField("usesOA", true)}
              >
                Yes
              </Button>
              <Button
                type="button"
                size="sm"
                variant={!metadata.usesOA ? "default" : "outline"}
                className={
                  !metadata.usesOA
                    ? "bg-accent text-accent-foreground hover:bg-accent/90 flex-1"
                    : "flex-1"
                }
                onClick={() => updateField("usesOA", false)}
              >
                No
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
