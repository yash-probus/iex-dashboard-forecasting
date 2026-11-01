import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, X, FileText, ArrowLeft, Download, Zap, Building2 } from "lucide-react";
import { FileMapping, ParsedBillData, ParsedOABillData, OASlotData } from "./types";
import { useToast } from "@/hooks/use-toast";
import { MonthYearPicker } from "@/components/MonthYearPicker";

interface FileUploadFlowProps {
  fileMappings: FileMapping[];
  onFilesChange: (mappings: FileMapping[]) => void;
  onBack: () => void;
  onPreview: () => void;
}

function detectMonthFromFilename(filename: string): string {
  const currentYear = new Date().getFullYear();
  const monthPatterns = [
    { pattern: /jan(uary)?/i, month: "01" },
    { pattern: /feb(ruary)?/i, month: "02" },
    { pattern: /mar(ch)?/i, month: "03" },
    { pattern: /apr(il)?/i, month: "04" },
    { pattern: /may/i, month: "05" },
    { pattern: /jun(e)?/i, month: "06" },
    { pattern: /jul(y)?/i, month: "07" },
    { pattern: /aug(ust)?/i, month: "08" },
    { pattern: /sep(tember)?/i, month: "09" },
    { pattern: /oct(ober)?/i, month: "10" },
    { pattern: /nov(ember)?/i, month: "11" },
    { pattern: /dec(ember)?/i, month: "12" },
  ];

  // Check for ISO format first (YYYY-MM)
  const isoMatch = filename.match(/(\d{4})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}`;

  // Check for year in filename
  const yearMatch = filename.match(/20\d{2}/);
  const detectedYear = yearMatch ? yearMatch[0] : String(currentYear);

  for (const { pattern, month } of monthPatterns) {
    if (pattern.test(filename)) return `${detectedYear}-${month}`;
  }

  return "";
}

function detectFileTypeFromContent(headers: string[]): 'discom' | 'oa' {
  // Check if headers indicate OA format
  const hasOAHeaders = headers.some(h => 
    h.includes('delivery_date') || h.includes('period_start') || 
    h.includes('qty_mw') || h.includes('rate_mwh')
  );
  return hasOAHeaders ? 'oa' : 'discom';
}

function detectFileType(filename: string): 'discom' | 'oa' {
  if (/oa|iex|open.?access/i.test(filename)) return 'oa';
  return 'discom';
}

// Parse DISCOM CSV content (ToD format)
function parseCSVContent(content: string): ParsedBillData | null {
  const lines = content.split('\n').map(line => line.trim()).filter(line => line);
  const data: ParsedBillData = {
    tod1: '',
    tod2: '',
    tod3: '',
    tod4: '',
    billAmount: '',
  };

  for (const line of lines) {
    const parts = line.split(',').map(p => p.trim());
    if (parts.length < 2) continue;

    const key = parts[0].toLowerCase().replace(/[_\s-]/g, '');
    const value = parts[1];

    if (/tod1|tod1kwh/.test(key)) {
      data.tod1 = value;
    } else if (/tod2|tod2kwh/.test(key)) {
      data.tod2 = value;
    } else if (/tod3|tod3kwh/.test(key)) {
      data.tod3 = value;
    } else if (/tod4|tod4kwh/.test(key)) {
      data.tod4 = value;
    } else if (/totalbill|billamount|bill|total|amount/.test(key)) {
      data.billAmount = value;
    }
  }

  const hasData = data.tod1 || data.tod2 || data.tod3 || data.tod4 || data.billAmount;
  return hasData ? data : null;
}

// Parse OA CSV content (slot-level format)
function parseOACSVContent(content: string): ParsedOABillData | null {
  const lines = content.split('\n').map(line => line.trim()).filter(line => line);
  
  if (lines.length < 2) return null;
  
  const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/['"]/g, ''));
  
  // Check if this is OA format
  const hasOAHeaders = headers.some(h => 
    h.includes('delivery_date') || h.includes('period_start') || 
    h.includes('qty_mw') || h.includes('rate_mwh')
  );
  
  if (!hasOAHeaders) return null;
  
  // Find column indices
  const dateIdx = headers.findIndex(h => h.includes('delivery_date') || h === 'date');
  const startIdx = headers.findIndex(h => h.includes('period_start') || h === 'start');
  const endIdx = headers.findIndex(h => h.includes('period_end') || h === 'end');
  const qtyIdx = headers.findIndex(h => h.includes('qty_mw') || h === 'qty' || h === 'mw');
  const rateIdx = headers.findIndex(h => h.includes('rate_mwh') || h === 'rate');
  const amountIdx = headers.findIndex(h => h.includes('amount') || h === 'total');
  
  if (dateIdx === -1 || qtyIdx === -1) return null;
  
  const slots: OASlotData[] = [];
  let totalMwh = 0;
  let totalSpend = 0;
  
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',').map(p => p.trim().replace(/['"]/g, ''));
    
    const qtyMw = parseFloat(parts[qtyIdx]) || 0;
    const rateMwh = rateIdx !== -1 ? parseFloat(parts[rateIdx]) || 0 : 0;
    const amount = amountIdx !== -1 ? parseFloat(parts[amountIdx]) || (qtyMw * rateMwh / 4) : (qtyMw * rateMwh / 4);
    
    const slot: OASlotData = {
      deliveryDate: parts[dateIdx] || '',
      periodStart: startIdx !== -1 ? parts[startIdx] : '',
      periodEnd: endIdx !== -1 ? parts[endIdx] : '',
      qtyMw,
      rateMwh,
      amount,
    };
    
    slots.push(slot);
    totalMwh += qtyMw * 0.25;
    totalSpend += amount;
  }
  
  return {
    slots,
    totalMwh,
    totalSpend,
    totalUnits: totalMwh * 1000,
  };
}

export function FileUploadFlow({ fileMappings, onFilesChange, onBack, onPreview }: FileUploadFlowProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const { toast } = useToast();

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files) return;
    
    const newMappings: FileMapping[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Read and parse CSV file
      let parsedData: ParsedBillData | undefined;
      let parsedOaData: ParsedOABillData | undefined;
      let detectedType: 'discom' | 'oa' = detectFileType(file.name);
      
      try {
        const content = await file.text();
        const lines = content.split('\n').map(line => line.trim()).filter(line => line);
        
        if (lines.length > 0) {
          const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
          detectedType = detectFileTypeFromContent(headers);
        }
        
        if (detectedType === 'oa') {
          // Try parsing as OA format
          const oaParsed = parseOACSVContent(content);
          if (oaParsed) {
            parsedOaData = oaParsed;
            toast({
              title: "OA Bill Parsed",
              description: `Found ${oaParsed.slots.length} slots, ${(oaParsed.totalUnits || 0).toLocaleString('en-IN')} kWh total`,
            });
          }
        } else {
          // Try parsing as DISCOM format
          const discomParsed = parseCSVContent(content);
          if (discomParsed) {
            parsedData = discomParsed;
          } else {
            toast({
              title: "Incomplete CSV",
              description: `File "${file.name}" has no valid ToD data. Please use the sample format.`,
              variant: "destructive",
            });
          }
        }
      } catch (e) {
        console.error('Error parsing CSV:', e);
      }

      newMappings.push({
        id: `${Date.now()}-${i}`,
        file,
        detectedMonth: detectMonthFromFilename(file.name),
        selectedMonth: detectMonthFromFilename(file.name),
        fileType: detectedType,
        parsedData,
        parsedOaData,
        hasDiscomBill: detectedType === 'discom',
        hasOaBill: detectedType === 'oa',
      });
    }

    // Merge files with the same month
    const mergedMappings = mergeFileMappings([...fileMappings, ...newMappings]);
    onFilesChange(mergedMappings.slice(0, 12));
  }, [fileMappings, onFilesChange, toast]);

  // Merge files that have the same selectedMonth
  const mergeFileMappings = (mappings: FileMapping[]): FileMapping[] => {
    const monthMap = new Map<string, FileMapping>();
    
    for (const mapping of mappings) {
      const month = mapping.selectedMonth;
      if (!month) {
        // Keep unmapped files separate
        monthMap.set(mapping.id, mapping);
        continue;
      }
      
      const existing = Array.from(monthMap.values()).find(m => m.selectedMonth === month);
      
      if (existing) {
        // Merge into existing entry
        const merged: FileMapping = {
          ...existing,
          hasDiscomBill: existing.hasDiscomBill || mapping.fileType === 'discom',
          hasOaBill: existing.hasOaBill || mapping.fileType === 'oa',
          parsedData: mapping.fileType === 'discom' ? mapping.parsedData : existing.parsedData,
          parsedOaData: mapping.fileType === 'oa' ? mapping.parsedOaData : existing.parsedOaData,
        };
        monthMap.set(existing.id, merged);
        
        toast({
          title: "Files Merged",
          description: `DISCOM and OA bills combined for ${month}`,
        });
      } else {
        monthMap.set(mapping.id, mapping);
      }
    }
    
    return Array.from(monthMap.values());
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const updateMapping = (id: string, field: 'selectedMonth' | 'fileType', value: string) => {
    const updatedMappings = fileMappings.map(m => 
      m.id === id ? { 
        ...m, 
        [field]: value,
        // Update bill type flags if fileType changes
        ...(field === 'fileType' ? {
          hasDiscomBill: value === 'discom',
          hasOaBill: value === 'oa',
        } : {})
      } : m
    );
    
    // Re-merge if month changed to check for duplicates
    if (field === 'selectedMonth') {
      const mergedMappings = mergeFileMappings(updatedMappings);
      onFilesChange(mergedMappings);
    } else {
      onFilesChange(updatedMappings);
    }
  };

  const removeFile = (id: string) => {
    onFilesChange(fileMappings.filter(m => m.id !== id));
  };

  const downloadSample = (type: 'discom' | 'oa') => {
    const link = document.createElement('a');
    link.href = type === 'discom' ? '/sample_discom_template.csv' : '/sample_oa_template.csv';
    link.download = type === 'discom' ? 'sample_discom_template.csv' : 'sample_oa_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isValid = fileMappings.length > 0 && fileMappings.every(m => m.selectedMonth);

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        onClick={onBack}
        className="gap-2 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </Button>

      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="text-xl">Upload Your Bills</CardTitle>
              <p className="text-sm text-muted-foreground">
                Drag and drop or select multiple DISCOM and OA bill files (CSV format)
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => downloadSample('discom')}
              >
                <Building2 className="w-4 h-4" />
                DISCOM Sample
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => downloadSample('oa')}
              >
                <Zap className="w-4 h-4" />
                OA Sample
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Drop Zone */}
          <div
            className={`
              border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer
              ${isDragOver 
                ? 'border-accent bg-accent/5' 
                : 'border-border hover:border-accent/50 hover:bg-muted/30'
              }
            `}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <input
              id="file-input"
              type="file"
              multiple
              accept=".csv"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-foreground font-medium mb-1">
              Drop files here or click to browse
            </p>
            <p className="text-sm text-muted-foreground">
              Supports CSV files • Max 12 months
            </p>
          </div>

          {/* File Mapping Table */}
          {fileMappings.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium text-foreground">Map Your Files</h3>
              <div className="space-y-2">
                {fileMappings.map((mapping) => (
                  <div
                    key={mapping.id}
                    className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg"
                  >
                    {/* Visual indicator for bill types */}
                    <div className="flex gap-1 flex-shrink-0">
                      {mapping.hasDiscomBill && (
                        <div className="w-6 h-6 rounded bg-blue-500/20 flex items-center justify-center" title="DISCOM Bill">
                          <Building2 className="w-3.5 h-3.5 text-blue-500" />
                        </div>
                      )}
                      {mapping.hasOaBill && (
                        <div className="w-6 h-6 rounded bg-amber-500/20 flex items-center justify-center" title="OA Bill">
                          <Zap className="w-3.5 h-3.5 text-amber-500" />
                        </div>
                      )}
                      {!mapping.hasDiscomBill && !mapping.hasOaBill && (
                        <FileText className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    
                    <span className="flex-1 truncate text-sm font-medium">
                      {mapping.file.name}
                      {mapping.hasDiscomBill && mapping.hasOaBill && (
                        <span className="ml-2 text-xs px-1.5 py-0.5 bg-accent/20 text-accent rounded">Both</span>
                      )}
                    </span>
                    
                    <MonthYearPicker
                      value={mapping.selectedMonth}
                      onChange={(v) => updateMapping(mapping.id, 'selectedMonth', v)}
                      placeholder="Select month"
                      className="w-44"
                    />

                    <Select
                      value={mapping.fileType}
                      onValueChange={(v) => updateMapping(mapping.id, 'fileType', v as 'discom' | 'oa')}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="discom">DISCOM</SelectItem>
                        <SelectItem value="oa">OA Bill</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFile(mapping.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

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
