// @ts-nocheck
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ArrowLeft,
  Download,
  FileText,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Calculator as CalcIcon,
  Zap,
  TrendingUp,
  PieChart,
  Info,
  Database,
  IndianRupee,
  Upload,
  Lightbulb,
  Clock,
  BarChart3,
  FileDown,
  AlertTriangle,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { SummaryCardsWithSelector } from "@/components/savings-assistant/SummaryCardsWithSelector";
import { TariffSensitivitySlider } from "@/components/insights/TariffSensitivitySlider";
import { DownloadActions } from "@/components/savings-assistant/DownloadActions";
import { InlineProgress } from "@/components/savings-assistant/InlineProgress";
import { ConsumerMetadataCard } from "@/components/savings-assistant/ConsumerMetadataCard";
import { ManualEntryFlow } from "@/components/savings-assistant/ManualEntryFlow";
import {
  LineChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import Breadcrumb from "@/components/Breadcrumb";
import { ThemeToggle } from "@/components/ThemeToggle";
import ProfileMenu from "@/components/ProfileMenu";
import NotificationCenter from "@/components/NotificationCenter";
import { MonthYearPicker } from "@/components/MonthYearPicker";
import { ProltLogo } from "@/components/ProltLogo";
import {
  isAuthenticated,
  saveCalculationRun,
  getCalculationById,
} from "@/lib/auth";
import {
  MonthEntry,
  SlotData,
  CalculationResult,
  computeSavings,
  generateDemoData,
  exportToCSV,
  downloadCSV,
  formatCurrency,
  formatMonthLabel,
  parseMonthISO,
  predictIEXPrice,
  getUPTariffConfig,
  getToDMultiplier,
} from "@/lib/calculatorUtils";
import { smartSavingCalService } from "@/api/smartSavingCalService";
import { STATE_MAP, TOD_SLOTS } from "@/utils/constant";
import {
  buildMonthEntry,
  buildMonthEntryV2,
  transformMonthlyBreakdownSlotData,
  transformSlotData,
  transformToPayload,
} from "@/utils/pyloadTransformation";
import { ManualMonthEntry } from "@/components/savings-assistant/types";
import { useConfigData } from "@/hooks/useConfigData";
import { formatIndianNumber, getStateAndDiscomList } from "@/utils/common";
import { calculatorGraphsServices } from "@/api/calculatorGraphServices";

// Source Mix colors - green shades for OA/DISCOM breakdown
const SOURCE_MIX_COLORS = ["hsl(142, 55%, 40%)", "hsl(142, 55%, 65%)"];
// Savings comparison colors - red for actual, green for recommended
const MONTHLY_COLORS = {
  actual: "hsl(0, 72%, 51%)",
  recommended: "hsl(142, 55%, 45%)",
};
// Day-wise breakdown colors - greens for actual vs suggested
const DAY_WISE_COLORS = {
  actualPaid: "hsl(142, 71%, 75%)",
  proltSuggested: "hsl(142, 71%, 35%)",
};

const Calculator = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const runId = location.state?.runId;
  const fromHistory = searchParams.get("fromHistory") === "true";
  const sectionParam = searchParams.get("section");
  const monthParam = searchParams.get("month");
  const [consumerData, setConsumerData] = useState<any>(null);

  // Configuration state

  const [state, setState] = useState("");
  const [category, setCategory] = useState("");
  const [voltageLevel, setVoltageLevel] = useState("");
  const [sanctionedLoad, setSanctionedLoad] = useState("");
  const [hasOaBill, setHasOaBill] = useState(false);
  const [discom, setDiscom] = useState("");

  // Monthly entries state (source of truth for calculations, set only from API)
  const [monthEntries, setMonthEntries] = useState<MonthEntry[]>([]);

  // Local UI state for ManualEntryFlow (can expand/collapse etc. without touching calculations)
  const [manualEntries, setManualEntries] = useState<ManualMonthEntry[]>([]);

  // Results state
  const [results, setResults] = useState<CalculationResult | null>(null);

  const [selectedMonth, setSelectedMonth] = useState<string>("");

  // Section toggle: 'overall' or 'monthly'
  const [currentSection, setCurrentSection] = useState<"overall" | "monthly">(
    sectionParam === "monthly" ? "monthly" : "overall",
  );

  // Formula modal state
  const [selectedSlot, setSelectedSlot] = useState<SlotData | null>(null);
  const [showFormulaModal, setShowFormulaModal] = useState(false);
  const [slotData, setSlotData] = useState([]);
  const [dailyBreakdownTable, setDailyBreakdownTable] = useState([]);

  // Submission and calculation state
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [shouldAutoCalculate, setShouldAutoCalculate] = useState(false);
  const [isLoadingConsumerData, setIsLoadingConsumerData] = useState(false);
  const [isLoadingMonthlyData, setIsLoadingMonthlyData] = useState(false);
  const [initialEntryCount, setInitialEntryCount] = useState(0);
  const [monthlySummaryCardData, setMonthlySummaryCardData] = useState(null);
  const [isCalculationFinished, setIsCalculationFinished] = useState(false);
  const [calculationResponse, setCalculationResponse] = useState<any>(null);

  const fetchMonthSelectionData = async (monthName: string) => {
    if (!monthName) return;

    try {
      setIsLoadingMonthlyData(true);
      const parts = monthName.split(" ");

      let params = {
        month: parts[0],
        year: Number(parts[1]),
      };
      const response = await smartSavingCalService.getMonthWiseData(params);

      const [dayWiseResponse, dayWiseActualResponse, dayWiseProltResponse] =
        await Promise.all([
          calculatorGraphsServices.getMonthlyDayWiseData(params),
          calculatorGraphsServices.getMonthlyDayWiseActualData(params),
          calculatorGraphsServices.getMonthlyDayWiseProltData(params),
        ]);
      const dailyBreakdownResponse =
        await calculatorGraphsServices.getDailyBreakdownData(params);

      const slotDataResponse = transformSlotData(
        dayWiseResponse,
        dayWiseActualResponse,
        dayWiseProltResponse,
      );

      const breakDownResult = transformMonthlyBreakdownSlotData(
        dailyBreakdownResponse,
      );

      setSlotData(slotDataResponse);
      setDailyBreakdownTable(breakDownResult);

      // setResults((prev) => ({
      //   ...prev,
      //   slotData,
      // }));

      setMonthlySummaryCardData(response);
    } catch (error) {
      console.error("Error fetching monthly selection data:", error);
    } finally {
      setIsLoadingMonthlyData(false);
    }
  };

  // Synchronize monthly summary card data with selected month/section
  useEffect(() => {
    if (
      currentSection === "monthly" &&
      results &&
      results.monthlySummaries.length > 0
    ) {
      const monthToShow =
        results.monthlySummaries.length === 1
          ? results.monthlySummaries[0].monthISO
          : selectedMonth;

      const monthData = results.monthlySummaries.find(
        (m) => m.monthISO === monthToShow,
      );

      if (monthData && monthData.monthName) {
        fetchMonthSelectionData(monthData.monthName);
      }
    }
  }, [currentSection, selectedMonth, results]);

  // FIXED: Correct API data mapping function
  const fetchCardData = useCallback(async () => {
    // if (!runId) return;

    try {
      setIsLoadingConsumerData(true);

      const configResponse = await smartSavingCalService.getConsumerDataInfo();
      // const todResponse =
      //   await smartSavingCalService.consumerTodConsumptionByRunId({ runId });
      const completeOverviewResponse =
        await smartSavingCalService.completeCalcDashOverviewReportFull();

      let todMonthlyCons;
      if (configResponse) {
        setConsumerData(configResponse);

        // Deduce hasOaBill from API response
        const monthlyCons = configResponse.monthlyTodConsumptionList || [];
        const apiHasOaData = monthlyCons.every(
          (month: any) =>
            (month.totalOaBill && month.totalOaBill !== 0) ||
            month.todConsumptionList?.every(
              (tod: any) => (tod.oaConsumption || 0) !== 0,
            ),
        );
        const deduceedHasOa =
          apiHasOaData || configResponse.oaInfoType === "OA_TOD";

        setHasOaBill(deduceedHasOa);

        // Process and format the consumer data
        if (configResponse.state) {
          const stateCode =
            configResponse.state.toUpperCase() ||
            STATE_MAP[configResponse.state]?.toLowerCase() ||
            "up";
          setState(stateCode);
        }

        if (configResponse.consumerCategory) {
          const apiCategory = configResponse.consumerCategory.toLowerCase();
          setCategory(apiCategory);
        }

        if (configResponse.voltageLevel) {
          setVoltageLevel(configResponse.voltageLevel.toString());
        }

        if (configResponse.sanctionedLoad) {
          setSanctionedLoad(configResponse.sanctionedLoad.toString());
        }

        if (configResponse.discom) {
          setDiscom(configResponse?.discom.toString() || "");
        }

        todMonthlyCons = configResponse.monthlyTodConsumptionList.reduce(
          (acc, item) => {
            const key = `${item.month}-${item.year}`;

            const totalDiscomConsumption = item.todConsumptionList.reduce(
              (sum, tod) => sum + (tod.discomConsumption || 0),
              0,
            );

            acc[key] = totalDiscomConsumption;
            return acc;
          },
          {},
        );

        if (!!configResponse.monthlyTodConsumptionList) {
          const todResponse = configResponse.monthlyTodConsumptionList;

          const formattedEntries: MonthEntry[] = buildMonthEntryV2(todResponse);
          const initialManualEntries = formattedEntries.map((e) => ({
            ...e,
            isLocked: true,
            isNew: false,
            isEdited: false,
          }));
          setInitialEntryCount(formattedEntries.length || 0);
          setMonthEntries(formattedEntries);
          setManualEntries(initialManualEntries as any);

          if (formattedEntries.length > 0 && configResponse?.sanctionedLoad) {
            setShouldAutoCalculate(true);
          }
        }
      }

      // Process ToD data to create month entries
      // if (todResponse) {
      //   const formattedEntries: MonthEntry[] = buildMonthEntry(todResponse);
      //   setInitialEntryCount(formattedEntries.length || 0);
      //   setMonthEntries(formattedEntries);

      //   if (formattedEntries.length > 0 && configResponse?.sanctionedLoad) {
      //     setShouldAutoCalculate(true);
      //   }
      // } else {
      //   console.warn("No ToD data received from API or invalid format");
      // }

      // FIXED: Correct complete overview report mapping based on API response
      if (completeOverviewResponse) {
        // Extract data from API response safely and round to 2 decimals
        const rawActualSpend = Number(
          completeOverviewResponse?.cards?.actualSpend ?? 0,
        );
        const rawProltSpend = Number(
          completeOverviewResponse?.cards?.proltOpSpent ?? 0,
        );
        const rawSaving = Number(
          completeOverviewResponse?.cards?.proltSavings ?? 0,
        );
        const rawTotalUnits = Number(
          completeOverviewResponse?.cards?.totalUnitsAnalyzed ?? 0,
        );

        const actualSpend = Number(rawActualSpend.toFixed(2));
        const proltSpend = Number(rawProltSpend.toFixed(2));
        const saving = Number(rawSaving.toFixed(2));
        const totalUnits = Number(rawTotalUnits.toFixed(2));
        // Calculate savings percentage safely
        const savingsPercent =
          actualSpend > 0 ? Math.round((saving / actualSpend) * 100) : 0;

        // const currentMonth = new Date().toISOString().slice(0, 7);
        // const monthLabel = new Date(currentMonth + "-01").toLocaleDateString(
        //   "en-US",
        //   {
        //     month: "short",
        //     year: "numeric",
        //   }
        // );

        // console.log("month details,  : ", currentMonth)

        function convertResponseInMonthlyGraphData(
          consumptionGraph,
          costGraph,
          actualSpend,
          proltSpend,
          saving,
          savingsPercent,
          totalUnits,
          todMonthlyCons,
        ) {
          const costMap = costGraph.reduce((acc, item) => {
            const key = `${item.month}-${item.year}`;
            acc[key] = item;
            return acc;
          }, {});

          const result = consumptionGraph.map((item) => {
            const key = `${item.month}-${item.year}`;
            const cost = costMap[key] || {};

            return {
              monthISO: `${item.month.slice(0, 3)} ${item.year}` || "",
              monthLabel: `${item.month.slice(0, 3)} ${item.year}` || "",

              actualCost: cost.actual || 0,
              recCost: cost.proltOptimized || 0,

              savings: saving || 0,
              savingsPercent: savingsPercent || 0,

              oaShare: 50,
              totalUnits: todMonthlyCons[key] || 0,

              actualOaUnits: item.actualOa || 0,
              actualDiscomUnits: item.actualDiscom || 0,
              recommendedOaUnits: item.proltOa || 0,
              recommendedDiscomUnits: item.proltDiscom || 0,
              monthName: `${item.month} ${item.year}` || "",
            };
          });

          return result;
        }

        const monthlySummaries = convertResponseInMonthlyGraphData(
          completeOverviewResponse.consumptionGraph,
          completeOverviewResponse.costGraph,
          actualSpend,
          proltSpend,
          saving,
          savingsPercent,
          totalUnits,
          todMonthlyCons,
        );

        // Create correct CalculationResult object
        const convertedResults: CalculationResult = {
          totalActualCost: actualSpend,
          totalRecCost: proltSpend,
          totalSavings: saving,
          adjustedSavings: saving,
          savingsPercent: savingsPercent,
          totalUnits: totalUnits,
          oaSharePercent: 50, // Default for industrial_general
          discomSharePercent: 50,
          actualOaSharePercent: 0, // Default - no OA bills from API
          actualDiscomSharePercent: 100,
          monthlySummaries,
          slotData: [],
          iexRowsCount: 0,
          hasOaBills: false,
        };

        setResults(convertedResults);
        setHasSubmitted(true);
        setSelectedMonth(
          convertedResults?.monthlySummaries?.[0]?.monthLabel ?? "",
        );

        toast({
          title: "Data Loaded Successfully",
          description: "Consumer data loaded from API",
        });
      } else {
        console.warn("No complete overview report received from API");
        toast({
          title: "Warning",
          description: "No overview data received from API",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching consumer data:", error);
      toast({
        title: "Error",
        description: "Failed to load consumer data from API",
        variant: "destructive",
      });
    } finally {
      setIsLoadingConsumerData(false);
    }
  }, []);

  useEffect(() => {
    fetchCardData();
  }, []);

  // Persist state to localStorage whenever results change
  // useEffect(() => {
  //   if (results) {
  //     try {
  //       localStorage.setItem(
  //         "calculatorPersistentResults",
  //         JSON.stringify(results)
  //       );
  //       localStorage.setItem(
  //         "calculatorPersistentState",
  //         JSON.stringify({
  //           config: { state, category, voltageLevel, sanctionedLoad },
  //           monthEntries,
  //         })
  //       );
  //     } catch (e) {
  //       console.error("Error persisting results:", e);
  //     }
  //   }
  // }, [results, state, category, voltageLevel, sanctionedLoad, monthEntries]);

  // Authentication check
  useEffect(() => {
    if (!isAuthenticated()) {
      navigate("/login");
    }
  }, [navigate]);

  // Sync selectedMonth with monthParam
  useEffect(() => {
    if (monthParam && results?.monthlySummaries?.length > 0) {
      const monthExists = results.monthlySummaries.some(
        (m) => m.monthISO === monthParam,
      );
      if (monthExists && selectedMonth !== monthParam) {
        setSelectedMonth(monthParam);
      }
    }
  }, [monthParam]);

  // Auto-calculate when coming from Dashboard wizard or consumer data
  // useEffect(() => {
  //   if (
  //     shouldAutoCalculate &&
  //     monthEntries.length > 0 &&
  //     sanctionedLoad &&
  //     !isLoadingConsumerData
  //   ) {
  //     setShouldAutoCalculate(false);
  //     const load = parseFloat(sanctionedLoad) || 0.5;
  //     const result = computeSavings(monthEntries, category, voltageLevel, load);

  //     setResults(result);
  //     setHasSubmitted(true);

  //     if (result.monthlySummaries.length > 0) {
  //       setSelectedMonth(result.monthlySummaries[0].monthISO);
  //     }

  //     // Save to history
  //     if (result.totalSavings > 0) {
  //       const months = monthEntries
  //         .filter((e) => e.monthISO)
  //         .map((e) => e.monthISO);
  //       saveCalculationRun({
  //         months,
  //         totalSavings: result.totalSavings,
  //         savingsPercent: result.savingsPercent,
  //         metadata: { state, category, voltageLevel, sanctionedLoad },
  //         entries: monthEntries,
  //         results: result,
  //       });
  //     }

  //     toast({
  //       title: "Data Loaded Successfully",
  //       description: `Consumer data loaded from API and calculations complete.`,
  //     });
  //   }
  // }, [
  //   shouldAutoCalculate,
  //   monthEntries,
  //   sanctionedLoad,
  //   category,
  //   voltageLevel,
  //   state,
  //   isLoadingConsumerData,
  // ]);

  // Generate timeline data from user inputs or results
  const timelineData = useMemo(() => {
    const config = getUPTariffConfig(category, voltageLevel);

    if (results && results.monthlySummaries.length > 0) {
      const sortedSummaries = [...results.monthlySummaries].sort((a, b) =>
        a.monthISO.localeCompare(b.monthISO),
      );
      return sortedSummaries.map((summary) => {
        const { month } = parseMonthISO(summary.monthISO);
        const avgPrice = predictIEXPrice(12, month);
        const avgDemand = summary.totalUnits / 30;
        return {
          month: summary.monthLabel,
          monthISO: summary.monthISO,
          demand: Math.round(avgDemand),
          price: avgPrice,
          discomRate: config.baseEnergy * getToDMultiplier(12, month, config),
        };
      });
    }

    if (monthEntries.length > 0) {
      const sortedEntries = [...monthEntries]
        .filter((entry) => entry.monthISO)
        .sort((a, b) => a.monthISO.localeCompare(b.monthISO));
      return sortedEntries.map((entry) => {
        const { month } = parseMonthISO(entry.monthISO);
        const totalUnits =
          (parseFloat(entry.tod1) || 0) +
          (parseFloat(entry.tod2) || 0) +
          (parseFloat(entry.tod3) || 0) +
          (parseFloat(entry.tod4) || 0);
        const avgPrice = predictIEXPrice(12, month);
        return {
          month: formatMonthLabel(entry.monthISO),
          monthISO: entry.monthISO,
          demand: totalUnits > 0 ? Math.round(totalUnits / 30) : 0,
          price: avgPrice,
          discomRate: config.baseEnergy * getToDMultiplier(12, month, config),
        };
      });
    }

    const defaultMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
    return defaultMonths.map((m, idx) => ({
      month: m,
      demand: 0,
      price: predictIEXPrice(12, idx + 1),
      discomRate: config.baseEnergy,
    }));
  }, [monthEntries, results, category, voltageLevel]);

  // File upload refs per month entry
  const fileInputRefs = useRef<{
    [key: string]: {
      discom: HTMLInputElement | null;
      oa: HTMLInputElement | null;
    };
  }>({});

  // Add new month entry
  const addMonthEntry = () => {
    const newEntry: MonthEntry = {
      id: Date.now().toString(),
      monthISO: "",
      expanded: true,
      billAmount: "",
      tod1: "",
      tod2: "",
      tod3: "",
      tod4: "",
    };
    setMonthEntries([...monthEntries, newEntry]);
  };

  // Handle DISCOM CSV upload
  const handleDiscomCSVUpload = (entryId: string, file: File) => {
    const entry = monthEntries.find((e) => e.id === entryId);
    if (!entry) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split("\n").filter((line) => line.trim());

        if (lines.length < 1) {
          toast({
            title: "Error",
            description: "Empty CSV file.",
            variant: "destructive",
          });
          return;
        }

        const parseNumericValue = (val: string | undefined): string => {
          if (!val) return "";
          const cleaned = val.replace(/[₹,\s]/g, "").trim();
          const num = parseFloat(cleaned);
          return isNaN(num) ? "" : num.toString();
        };

        const isKeyValueFormat = lines.some((line) => {
          const parts = line.split(",");
          return parts.length === 2 && /tod\d|bill|total/i.test(parts[0]);
        });

        let parsedData = {
          tod1: "",
          tod2: "",
          tod3: "",
          tod4: "",
          billAmount: "",
        };

        if (isKeyValueFormat) {
          for (const line of lines) {
            const parts = line
              .split(",")
              .map((p) => p.trim().replace(/['"]/g, ""));
            if (parts.length >= 2) {
              const key = parts[0].toLowerCase();
              const value = parseNumericValue(parts[1]);

              if (/tod1|tod_1|tod 1/i.test(key)) parsedData.tod1 = value;
              else if (/tod2|tod_2|tod 2/i.test(key)) parsedData.tod2 = value;
              else if (/tod3|tod_3|tod 3/i.test(key)) parsedData.tod3 = value;
              else if (/tod4|tod_4|tod 4/i.test(key)) parsedData.tod4 = value;
              else if (/bill|total|amount/i.test(key))
                parsedData.billAmount = value;
            }
          }
        } else {
          if (lines.length < 2) {
            toast({
              title: "Error",
              description:
                "Invalid CSV format. Expected header row and at least one data row.",
              variant: "destructive",
            });
            return;
          }

          const headers = lines[0]
            .toLowerCase()
            .split(",")
            .map((h) => h.trim().replace(/['"]/g, ""));
          const dataLine = lines[1]
            .split(",")
            .map((v) => v.trim().replace(/['"]/g, ""));

          const findToDIndex = (todNum: number) => {
            const patterns = [
              `tod${todNum}`,
              `tod_${todNum}`,
              `tod ${todNum}`,
              `tod${todNum}_kwh`,
              `tod_${todNum}_kwh`,
              `tod${todNum}kwh`,
              `tod${todNum}_units`,
              `tod_${todNum}_units`,
              `slab${todNum}`,
              `slab_${todNum}`,
              `period${todNum}`,
              `consumption_tod${todNum}`,
              `energy_tod${todNum}`,
              `kwh_tod${todNum}`,
              `units_tod${todNum}`,
            ];
            return headers.findIndex((h) =>
              patterns.some((p) => h.includes(p) || h === p),
            );
          };

          const tod1Idx = findToDIndex(1);
          const tod2Idx = findToDIndex(2);
          const tod3Idx = findToDIndex(3);
          const tod4Idx = findToDIndex(4);

          const billIdx = headers.findIndex(
            (h) =>
              h.includes("bill") ||
              h.includes("total") ||
              h.includes("amount") ||
              h.includes("bill_amount") ||
              h.includes("total_amount") ||
              h.includes("net_bill") ||
              h.includes("gross") ||
              h === "total_rs" ||
              h.includes("payable") ||
              h.includes("charge"),
          );

          parsedData = {
            tod1: tod1Idx !== -1 ? parseNumericValue(dataLine[tod1Idx]) : "",
            tod2: tod2Idx !== -1 ? parseNumericValue(dataLine[tod2Idx]) : "",
            tod3: tod3Idx !== -1 ? parseNumericValue(dataLine[tod3Idx]) : "",
            tod4: tod4Idx !== -1 ? parseNumericValue(dataLine[tod4Idx]) : "",
            billAmount:
              billIdx !== -1 ? parseNumericValue(dataLine[billIdx]) : "",
          };
        }

        const hasToD =
          parsedData.tod1 ||
          parsedData.tod2 ||
          parsedData.tod3 ||
          parsedData.tod4;

        if (!hasToD && !parsedData.billAmount) {
          toast({
            title: "Parsing Warning",
            description:
              "Could not find ToD columns. Expected columns like: tod1, tod2, tod3, tod4, bill_amount",
            variant: "destructive",
          });
          return;
        }

        setMonthEntries((prev) =>
          prev.map((ent) => {
            if (ent.id !== entryId) return ent;
            return {
              ...ent,
              tod1: parsedData.tod1 || ent.tod1,
              tod2: parsedData.tod2 || ent.tod2,
              tod3: parsedData.tod3 || ent.tod3,
              tod4: parsedData.tod4 || ent.tod4,
              billAmount: parsedData.billAmount || ent.billAmount,
            };
          }),
        );

        const parsedFields = [
          parsedData.tod1 && "TOD1",
          parsedData.tod2 && "TOD2",
          parsedData.tod3 && "TOD3",
          parsedData.tod4 && "TOD4",
          parsedData.billAmount && "Bill Amount",
        ]
          .filter(Boolean)
          .join(", ");

        toast({ title: "Success", description: `Loaded: ${parsedFields}` });
      } catch (err) {
        toast({
          title: "Error",
          description: "Failed to parse CSV file. Please check the format.",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
  };

  // Handle OA CSV upload
  const handleOaCSVUpload = (entryId: string, file: File) => {
    toast({
      title: "OA Bill Uploaded",
      description: `${file.name} attached for this month`,
    });
  };

  // Remove month entry
  const removeMonthEntry = (id: string) => {
    setMonthEntries(monthEntries.filter((entry) => entry.id !== id));
  };

  // Update month entry
  const updateMonthEntry = (
    id: string,
    field: keyof MonthEntry,
    value: string | boolean,
  ) => {
    setMonthEntries(
      monthEntries.map((entry) =>
        entry.id === id ? { ...entry, [field]: value } : entry,
      ),
    );
  };

  // Toggle entry expansion
  const toggleExpanded = (id: string) => {
    setMonthEntries(
      monthEntries.map((entry) =>
        entry.id === id ? { ...entry, expanded: !entry.expanded } : entry,
      ),
    );
  };

  // Clear all entries
  const clearEntries = () => {
    setMonthEntries([]);
    setResults(null);
  };

  // Load demo data
  const loadDemoData = () => {
    const demoData = generateDemoData();
    setMonthEntries(demoData);
    setSanctionedLoad("0.5");
  };

  // Calculate savings
  const calculateSavings = async () => {
    try {
      const entriesToSave = manualEntries.filter((e) => e.isNew || e.isEdited);

      if (entriesToSave.length === 0) {
        toast({
          title: "No New Data",
          description: "No new months or changes were detected to save.",
        });
        return;
      }

      const transformedEntries = transformToPayload(entriesToSave, {
        usesOA: hasOaBill,
      });

      const monthEntryPayload = transformedEntries;

      // Start calculating state BEFORE call so user sees visual feedback
      setIsCalculating(true);
      setIsCalculationFinished(false);
      setHasSubmitted(true);

      const result = await smartSavingCalService.saveTodConsumptionDetails(
        monthEntryPayload,
        { oaInfoType: "OA_TOD" },
      );

      // Store response and mark as finished to trigger InlineProgress completion
      setCalculationResponse(result);
      setIsCalculationFinished(true);

      toast({
        title: "Saving Calculation",
        description: result.message || "Generating results...",
      });
    } catch (error) {
      console.error("Error calculating savings:", error);
      setIsCalculating(false);
      toast({
        title: "Error",
        description: "Failed to save consumption details.",
        variant: "destructive",
      });
    }
  };

  // Handle progress completion
  // const handleProgressComplete = async () => {
  // const load = parseFloat(sanctionedLoad) || 0.5;
  // const result = computeSavings(monthEntries, category, voltageLevel, load);
  // setResults(result);
  // if (result.monthlySummaries.length > 0) {
  //   const sortedMonths = [...result.monthlySummaries].sort((a, b) =>
  //     a.monthISO.localeCompare(b.monthISO)
  //   );
  //   setSelectedMonth(sortedMonths[0].monthISO);
  // }
  // setIsCalculating(false);
  // if (result.totalSavings > 0) {
  //   const months = monthEntries
  //     .filter((e) => e.monthISO)
  //     .map((e) => e.monthISO);
  //   saveCalculationRun({
  //     months,
  //     totalSavings: result.totalSavings,
  //     savingsPercent: result.savingsPercent,
  //     metadata: { state, category, voltageLevel, sanctionedLoad },
  //     entries: monthEntries,
  //     results: result,
  //   });
  // }
  // toast({
  //   title: "Calculation Complete",
  //   description: `Potential savings of ${formatCurrency(
  //     result.totalSavings
  //   )} identified.`,
  // });
  // };

  // Calculation progress handler - Fixed to prevent infinite loop
  // Calculation progress handler - Fixed to prevent infinite loop
  const handleProgressComplete = useCallback(async () => {
    try {
      if (calculationResponse) {
        console.log(
          "Complete Overview API Response (from save):",
          calculationResponse,
        );

        // Extract data from API response safely (adjusting path based on user's manual changes elsewhere)
        const actualSpend = calculationResponse?.actualSpend || 0;
        const proltSpend = calculationResponse?.proltSpend || 0;
        const saving = calculationResponse?.saving || 0;
        const totalUnits = calculationResponse?.totalUnits || 0;

        // Calculate savings percentage safely
        const savingsPercent =
          actualSpend > 0 ? Math.round((saving / actualSpend) * 100) : 0;

        const currentMonth = new Date().toISOString().slice(0, 7);
        const monthLabel = new Date(currentMonth + "-01").toLocaleDateString(
          "en-US",
          {
            month: "short",
            year: "numeric",
          },
        );

        // Create correct CalculationResult object
        const convertedResults: CalculationResult = {
          totalActualCost: actualSpend,
          totalRecCost: proltSpend,
          totalSavings: saving,
          adjustedSavings: saving,
          savingsPercent: savingsPercent,
          totalUnits: totalUnits,
          oaSharePercent: 50, // Default for industrial_general
          discomSharePercent: 50,
          actualOaSharePercent: 0, // Default - no OA bills from API
          actualDiscomSharePercent: 100,
          monthlySummaries: [
            {
              monthISO: currentMonth,
              monthLabel: monthLabel,
              actualCost: actualSpend,
              recCost: proltSpend,
              savings: saving,
              savingsPercent: savingsPercent,
              oaShare: 50,
              totalUnits: totalUnits,
              actualOaUnits: 0,
              actualDiscomUnits: totalUnits,
              recommendedOaUnits: Math.round(totalUnits * 0.5),
              recommendedDiscomUnits: Math.round(totalUnits * 0.5),
            },
          ],
          slotData: [],
          iexRowsCount: 0,
          hasOaBills: false,
        };

        if (results?.totalSavings !== saving) {
          setResults(convertedResults);
          setHasSubmitted(true);
          setSelectedMonth(currentMonth);
          setIsCalculating(false);

          toast({
            title: "Calculation Complete",
            description: `Potential savings identified.`,
          });

          // Refresh dashboard data after successful calculation
          await fetchCardData();
        } else {
          setIsCalculating(false);
        }
      } else {
        // Fallback or secondary check if needed, but user wanted it from saveTodConsumptionDetails
        const completeOverviewResponse =
          await smartSavingCalService.completeOverviewReportFull({ runId });

        if (completeOverviewResponse) {
          // ... same mapping as above ...
          // Using a helper or repeated logic for brevity here
          const actualSpend = completeOverviewResponse?.actualSpend || 0;
          const proltSpend = completeOverviewResponse?.proltSpend || 0;
          const saving = completeOverviewResponse?.saving || 0;
          const totalUnits = completeOverviewResponse?.totalUnits || 0;
          const savingsPercent =
            actualSpend > 0 ? Math.round((saving / actualSpend) * 100) : 0;
          const currentMonth = new Date().toISOString().slice(0, 7);
          const monthLabel = new Date(currentMonth + "-01").toLocaleDateString(
            "en-US",
            { month: "short", year: "numeric" },
          );

          const convertedResults: CalculationResult = {
            totalActualCost: actualSpend,
            totalRecCost: proltSpend,
            totalSavings: saving,
            adjustedSavings: saving,
            savingsPercent: savingsPercent,
            totalUnits: totalUnits,
            oaSharePercent: 50,
            discomSharePercent: 50,
            actualOaSharePercent: 0,
            actualDiscomSharePercent: 100,
            monthlySummaries: [
              {
                monthISO: currentMonth,
                monthLabel: monthLabel,
                actualCost: actualSpend,
                recCost: proltSpend,
                savings: saving,
                savingsPercent: savingsPercent,
                oaShare: 50,
                totalUnits: totalUnits,
                actualOaUnits: 0,
                actualDiscomUnits: totalUnits,
                recommendedOaUnits: Math.round(totalUnits * 0.5),
                recommendedDiscomUnits: Math.round(totalUnits * 0.5),
              },
            ],
            slotData: [],
            iexRowsCount: 0,
            hasOaBills: false,
          };

          setResults(convertedResults);
          setHasSubmitted(true);
          setSelectedMonth(currentMonth);
          setIsCalculating(false);
          await fetchCardData();
        } else {
          setIsCalculating(false);
        }
      }
    } catch (error) {
      console.error("Error in handleProgressComplete:", error);
      setIsCalculating(false);
    }
  }, [runId, results?.totalSavings, fetchCardData, calculationResponse]); // results?.totalSavings को dependency में रखें

  // Handle progress cancellation
  const handleProgressCancel = () => {
    setIsCalculating(false);
    toast({
      title: "Calculation Cancelled",
      description: "You can restart the calculation anytime.",
    });
  };

  // Export CSV
  const handleExportCSV = () => {
    if (results) {
      const csv = exportToCSV(results.slotData);
      downloadCSV(csv, "prolt-proposed-settlement-bill.csv");
    }
  };

  // Export PDF
  const handleExportPDF = () => {
    if (!results) return;

    const report = `
PROPOSED SETTLEMENT BILL - PROLT ENERGY
========================================
Generated: ${new Date().toLocaleDateString()}

SUMMARY
-------
Total DISCOM Cost: ₹${results.totalActualCost.toLocaleString('en-IN')}
Proposed OA Cost: ₹${results.totalRecCost.toLocaleString('en-IN')}
Potential Savings: ₹${results.adjustedSavings.toLocaleString('en-IN')} (${
      results.savingsPercent
    }%)
Total Units: ${results.totalUnits.toLocaleString('en-IN')} kWh

ENERGY SOURCE BREAKDOWN
-----------------------
OA Share: ${results.oaSharePercent}%
DISCOM Share: ${results.discomSharePercent}%

MONTHLY BREAKDOWN
-----------------
${results.monthlySummaries
  .map(
    (s) =>
      `${
        s.monthLabel
      }: DISCOM ₹${s.actualCost.toLocaleString('en-IN')} → OA ₹${s.recCost.toLocaleString('en-IN')} (Save ₹${s.savings.toLocaleString('en-IN')})`,
  )
  .join("\n")}

NOTES
-----
- This is a proposed settlement showing potential savings with Open Access
- Calculations based on predicted IEX prices with 90% accuracy factor
- Cross Subsidy Surcharge and Transmission Charges included
- Final settlement subject to actual market conditions

========================================
Report generated by Prolt Energy Platform
    `.trim();

    const blob = new Blob([report], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "prolt-proposed-settlement-bill.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Open formula modal
  const openFormulaModal = (slot: SlotData) => {
    setSelectedSlot(slot);
    setShowFormulaModal(true);
  };

  // Get day-wise data for selected month
  const getDayWiseData = () => {
    if (!results || !selectedMonth) return [];

    const monthSlots = results.slotData.filter(
      (s) => s.month === formatMonthLabel(selectedMonth),
    );

    if (monthSlots.length === 0) {
      return [];
    }

    const dayMap = new Map<
      string,
      {
        actualPaid: number;
        proltSuggested: number;
        units: number;
        actualOaUnits: number;
        actualDiscomUnits: number;
        recommendedOaUnits: number;
        recommendedDiscomUnits: number;
      }
    >();

    monthSlots.forEach((slot) => {
      const existing = dayMap.get(slot.date) || {
        actualPaid: 0,
        proltSuggested: 0,
        units: 0,
        actualOaUnits: 0,
        actualDiscomUnits: 0,
        recommendedOaUnits: 0,
        recommendedDiscomUnits: 0,
      };

      const isActualOa = hasOaBill && slot.actual_source === "OA";

      dayMap.set(slot.date, {
        actualPaid: existing.actualPaid + slot.actual_cost,
        proltSuggested: existing.proltSuggested + slot.rec_cost,
        units: existing.units + slot.slot_kwh,
        actualOaUnits:
          existing.actualOaUnits + (isActualOa ? slot.slot_kwh : 0),
        actualDiscomUnits:
          existing.actualDiscomUnits + (isActualOa ? 0 : slot.slot_kwh),
        recommendedOaUnits:
          existing.recommendedOaUnits +
          (slot.rec_source === "OA" ? slot.slot_kwh : 0),
        recommendedDiscomUnits:
          existing.recommendedDiscomUnits +
          (slot.rec_source === "DISCOM" ? slot.slot_kwh : 0),
      });
    });

    return Array.from(dayMap.entries())
      .sort(
        (a, b) => parseInt(a[0].split("-")[2]) - parseInt(b[0].split("-")[2]),
      )
      .map(([date, values]) => ({
        day: `Day ${parseInt(date.split("-")[2])}`,
        date: date.split("-")[2],
        actualPaid: Math.round(values.actualPaid),
        proltSuggested: Math.round(values.proltSuggested),
        units: Math.round(values.units),
        actualOaUnits: Math.round(values.actualOaUnits),
        actualDiscomUnits: Math.round(values.actualDiscomUnits),
        recommendedOaUnits: Math.round(values.recommendedOaUnits),
        recommendedDiscomUnits: Math.round(values.recommendedDiscomUnits),
      }));
  };

  // Pie chart data - Current
  const getCurrentPieData = () => {
    if (!results) return [];
    return [
      { name: "OA", value: results.actualOaSharePercent },
      { name: "DISCOM", value: results.actualDiscomSharePercent },
    ];
  };

  // Pie chart data - Recommended
  const getRecommendedPieData = () => {
    if (!results) return [];
    return [
      { name: "OA", value: results.oaSharePercent },
      { name: "DISCOM", value: results.discomSharePercent },
    ];
  };

  const { data } = useConfigData();

  const transformedData = getStateAndDiscomList(data);

  const discomOptions = transformedData.getDiscomList[state || ""] || [];

  // Navigate to monthly insights page
  const handleViewMonthlyInsights = () => {
    if (!selectedMonth || !results) return;

    const selectedMonthData = results.monthlySummaries.find(
      (m) => m.monthISO === selectedMonth,
    );
    const monthEntry = monthEntries.find((e) => e.monthISO === selectedMonth);

    if (selectedMonthData) {
      const insightsData = {
        monthISO: selectedMonth,
        actualCost: selectedMonthData.actualCost,
        recCost: selectedMonthData.recCost,
        savings: selectedMonthData.savings,
        savingsPercent: selectedMonthData.savingsPercent,
        oaShare: selectedMonthData.oaShare,
        totalUnits: selectedMonthData.totalUnits,
        tod1: parseFloat(monthEntry?.tod1 || "0"),
        tod2: parseFloat(monthEntry?.tod2 || "0"),
        tod3: parseFloat(monthEntry?.tod3 || "0"),
        tod4: parseFloat(monthEntry?.tod4 || "0"),
        sanctionedLoad: parseFloat(sanctionedLoad) || 0.5,
        category,
        hasOaBill,
      };
      localStorage.setItem("monthlyInsightsData", JSON.stringify(insightsData));
      navigate(`/calculator/insights/${selectedMonth}`);
    }
  };

  // Navigate to overall insights page
  const handleViewOverallInsights = () => {
    if (!results) return;

    const totalTod1 = monthEntries.reduce(
      (sum, e) => sum + (parseFloat(e.tod1) || 0),
      0,
    );
    const totalTod2 = monthEntries.reduce(
      (sum, e) => sum + (parseFloat(e.tod2) || 0),
      0,
    );
    const totalTod3 = monthEntries.reduce(
      (sum, e) => sum + (parseFloat(e.tod3) || 0),
      0,
    );
    const totalTod4 = monthEntries.reduce(
      (sum, e) => sum + (parseFloat(e.tod4) || 0),
      0,
    );

    const insightsData = {
      monthISO: "overall",
      actualCost: results.totalActualCost,
      recCost: results.totalRecCost,
      savings: results.totalSavings,
      savingsPercent: results.savingsPercent,
      oaShare: results.oaSharePercent,
      totalUnits: results.totalUnits,
      tod1: totalTod1,
      tod2: totalTod2,
      tod3: totalTod3,
      tod4: totalTod4,
      sanctionedLoad: parseFloat(sanctionedLoad) || 0.5,
      category,
      hasOaBill,
    };
    localStorage.setItem("monthlyInsightsData", JSON.stringify(insightsData));
    navigate("/calculator/insights/overall");
  };

  // Navigate to Insights Explorer page
  const handleExploreInsights = () => {
    if (!results) return;

    const monthlySummariesWithTod = results.monthlySummaries.map((summary) => {
      const monthEntry = monthEntries.find(
        (e) => e.monthISO === summary.monthISO,
      );
      return {
        monthISO: summary.monthISO,
        monthLabel: summary.monthLabel,
        actualCost: summary.actualCost,
        recCost: summary.recCost,
        savings: summary.savings,
        savingsPercent: summary.savingsPercent,
        oaShare: summary.oaShare,
        totalUnits: summary.totalUnits,
        tod1: parseFloat(monthEntry?.tod1 || "0"),
        tod2: parseFloat(monthEntry?.tod2 || "0"),
        tod3: parseFloat(monthEntry?.tod3 || "0"),
        tod4: parseFloat(monthEntry?.tod4 || "0"),
        actualOaUnits: summary.actualOaUnits || 0,
        actualDiscomUnits: summary.actualDiscomUnits || summary.totalUnits,
        recommendedOaUnits: summary.recommendedOaUnits || 0,
        recommendedDiscomUnits:
          summary.recommendedDiscomUnits || summary.totalUnits,
        billAmount: parseFloat(monthEntry?.billAmount || "0"),
      };
    });

    let totalOaMwh = 0;
    let totalOaSpend = 0;
    if (consumerData && consumerData.monthlyTodConsumptionList) {
      consumerData.monthlyTodConsumptionList.forEach((month: any) => {
        totalOaSpend += month.totalOaBill || 0;
        month.todConsumptionList?.forEach((tod: any) => {
          totalOaMwh += (tod.oaConsumption || 0) / 1000;
        });
      });
    }

    const insightsData = {
      monthlySummaries: monthlySummariesWithTod,
      sanctionedLoad: parseFloat(sanctionedLoad) || 0.5,
      category,
      hasOaBill: hasOaBill || results.hasOaBills,
      totalActualCost: results.totalActualCost,
      totalRecCost: results.totalRecCost,
      totalSavings: results.totalSavings,
      totalUnits: results.totalUnits,
      totalOaMwh,
      totalOaSpend,
    };
    localStorage.setItem("insightsExplorerData", JSON.stringify(insightsData));
    navigate("/insights");
  };

  return (
    <div className="min-h-screen bg-background font-outfit">
      {/* Navigation */}
      <nav className="border-b border-border/40 bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                navigate("/");
              }}
              className="text-foreground hover:text-accent"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <ProltLogo size="lg" />
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/about")}
            >
              About
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/help")}>
              Help
            </Button>
            <NotificationCenter />
            <ThemeToggle />
            <ProfileMenu />
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-muted via-background to-muted/60 border-b border-border/40 py-3">
        <div className="max-w-[1800px] mx-auto px-2">
          <div className="max-w-4xl mx-auto text-center">
            {/* Dynamic Header based on results */}
            {results && results.totalSavings ? (
              <div className="text-center">
                <h1 className="text-xl md:text-2xl font-bold animate-fade-in font-display text-foreground leading-tight">
                  Great news! Your bill could drop by{" "}
                  <span className="text-secondary">
                    {formatCurrency(results.totalSavings)}
                  </span>{" "}
                  <span className="text-secondary font-semibold">
                    ({results.savingsPercent}% reduction)
                  </span>
                  .
                </h1>
                <p className="text-sm text-muted-foreground font-body">
                  Total potential savings across{" "}
                  {results.monthlySummaries.length} month
                  {results.monthlySummaries.length !== 1 ? "s" : ""}.
                </p>
              </div>
            ) : (
              <>
                <h1 className="text-xl md:text-2xl font-bold animate-fade-in font-display text-foreground">
                  Prolt Energy — Savings Calculator
                </h1>
                <p className="text-xs text-muted-foreground font-body">
                  Calculate potential savings with Open Access trading using
                  your actual bill data
                </p>
              </>
            )}

            {/* Section Toggle - Centered */}
            {hasSubmitted &&
              !isCalculating &&
              results &&
              results.monthlySummaries.length >= 1 && (
                <div className="mt-2 flex justify-center">
                  <div className="bg-card/80 backdrop-blur-md rounded-full p-0.5 border border-border/50 inline-flex shadow-sm">
                    <button
                      onClick={() => setCurrentSection("overall")}
                      className={`px-5 py-1.5 rounded-full text-sm font-medium transition-all ${
                        currentSection === "overall"
                          ? "bg-primary text-primary-foreground"
                          : "text-foreground hover:bg-muted"
                      }`}
                    >
                      Overall
                    </button>
                    <button
                      onClick={() => setCurrentSection("monthly")}
                      className={`px-5 py-1.5 rounded-full text-sm font-medium transition-all ${
                        currentSection === "monthly"
                          ? "bg-primary text-primary-foreground"
                          : "text-foreground hover:bg-muted"
                      }`}
                    >
                      Monthly Details
                    </button>
                  </div>
                </div>
              )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1800px] mx-auto px-1 py-4">
        <div className="grid gap-4 lg:grid-cols-12">
          {/* Left Column - Configuration & Inputs - Always visible */}
          <div className="lg:col-span-3 space-y-6">
            <ConsumerMetadataCard
              compact
              metadata={{
                state,
                discom,
                category: category.toLowerCase(),
                voltageLevel,
                sanctionedLoad,
                usesOA: hasOaBill,
                isEditable: true,
              }}
              onChange={(m) => {
                setState(m.state);
                setDiscom(m.discom);
                setCategory(m.category);
                setVoltageLevel(m.voltageLevel);
                setSanctionedLoad(m.sanctionedLoad);
                setHasOaBill(!!m.usesOA);
              }}
            />

            <ManualEntryFlow
              entries={manualEntries as any}
              // Allow UI to control expansion etc. without affecting monthEntries used for calc
              onEntriesChange={setManualEntries}
              onBack={() => {}}
              onPreview={calculateSavings}
              usesOA={hasOaBill}
              compact
            />
            {/* <Card className="bg-card border-border/50">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2 text-foreground font-display">
                    <CalcIcon className="w-5 h-5 text-accent" />
                    Monthly Inputs
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                </CardContent>
              </Card> */}
          </div>

          {/* Center Column - Results */}
          <div
            className={`space-y-4 ${hasSubmitted && !isCalculating && results && results.monthlySummaries.length >= 1 ? (currentSection === "monthly" ? "lg:col-span-9" : "lg:col-span-6") : "lg:col-span-9"}`}
          >
            {/* Progress Animation */}
            {isCalculating && (
              <InlineProgress
                isActive={isCalculating}
                isFinished={isCalculationFinished}
                onCancel={handleProgressCancel}
                onComplete={handleProgressComplete}
              />
            )}

            {/* Pre-Submit Placeholder */}
            {!hasSubmitted && !isCalculating && (
              <Card className="p-12 text-center border-dashed border-2">
                <CalcIcon className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-xl font-semibold mb-2">
                  Ready to Calculate Your Savings
                </h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Enter your configuration and monthly ToD data on the left,
                  then click "Submit & Calculate Savings" to view your
                  personalized analysis.
                </p>
                <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-accent" />
                    <span>Configuration</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-muted" />
                    <span>Monthly Data</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-muted" />
                    <span>Submit</span>
                  </div>
                </div>
              </Card>
            )}

            {/* Summary Cards - Overall shows totals, Monthly shows selected month data */}
            {hasSubmitted && !isCalculating && results && (
              <>
                {/* Month Tabs for Monthly Section */}
                {currentSection === "monthly" && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {results.monthlySummaries.map((m) => (
                      <Button
                        key={m.monthISO}
                        variant={
                          selectedMonth === m.monthISO ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => {
                          setSelectedMonth(m.monthISO);
                        }}
                        className={
                          selectedMonth === m.monthISO
                            ? "bg-accent hover:bg-accent/90"
                            : ""
                        }
                      >
                        {m.monthLabel}
                      </Button>
                    ))}
                  </div>
                )}

                {/* Summary Cards - Show overall for multi-month overall view, otherwise show monthly */}
                {currentSection === "overall" &&
                results.monthlySummaries.length > 1 ? (
                  <SummaryCardsWithSelector
                    totalActualCost={results.totalActualCost}
                    totalRecCost={results.totalRecCost}
                    totalSavings={results.totalSavings}
                    savingsPercent={results.savingsPercent}
                    totalUnits={results.totalUnits}
                    loading={isLoadingConsumerData}
                  />
                ) : currentSection === "monthly" ? (
                  (() => {
                    const monthToShow =
                      results.monthlySummaries.length === 1
                        ? results.monthlySummaries[0].monthISO
                        : selectedMonth;
                    const monthData = results.monthlySummaries.find(
                      (m) => m.monthISO === monthToShow,
                    );

                    if (!monthData) return null;
                    return (
                      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4 items-start">
                        <SummaryCardsWithSelector
                          totalActualCost={
                            monthlySummaryCardData?.actualSpend || 0
                          }
                          totalRecCost={
                            monthlySummaryCardData?.proltOpSpent.toFixed(2) || 0
                          }
                          totalSavings={
                            monthlySummaryCardData?.proltSavings.toFixed(2) || 0
                          }
                          savingsPercent={
                            monthlySummaryCardData?.totalUnitsAnalyzed || 0
                          }
                          totalUnits={monthData.totalUnits}
                          monthDetails={monthlySummaryCardData}
                          loading={isLoadingMonthlyData}
                        />
                        {/* Inline Insights Card for Monthly View */}
                        <Card className="relative overflow-hidden border-secondary/30 bg-gradient-to-br from-secondary/10 via-background to-accent/5 w-full lg:w-[260px]">
                          <div className="absolute top-0 right-0 w-24 h-24 bg-secondary/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
                          <div className="relative px-4 py-3 space-y-2">
                            <div>
                              <div className="flex items-center gap-1.5 mb-1">
                                <Lightbulb className="w-3.5 h-3.5 text-secondary" />
                                <span className="text-[10px] font-semibold text-secondary uppercase tracking-wider">
                                  Explore Insights
                                </span>
                              </div>
                              <h3 className="text-sm font-semibold text-foreground leading-snug">
                                Deep dive into your consumption insights
                              </h3>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              View detailed analysis and optimization
                              opportunities.
                            </p>
                            <Button
                              onClick={handleExploreInsights}
                              size="sm"
                              className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground gap-2 shadow-md hover:shadow-lg transition-all"
                            >
                              {selectedMonth
                                ? `View ${formatMonthLabel(selectedMonth)} Insights`
                                : "View Full Insights"}
                              <TrendingUp className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </Card>
                      </div>
                    );
                  })()
                ) : (
                  (() => {
                    const monthToShow =
                      results.monthlySummaries.length === 1
                        ? results.monthlySummaries[0].monthISO
                        : selectedMonth;
                    const monthData = results.monthlySummaries.find(
                      (m) => m.monthISO === monthToShow,
                    );
                    if (!monthData) return null;
                    return (
                      <SummaryCardsWithSelector
                        totalActualCost={monthData.actualCost}
                        totalRecCost={monthData.recCost}
                        totalSavings={monthData.savings}
                        savingsPercent={monthData.savingsPercent}
                        totalUnits={monthData.totalUnits}
                        loading={isLoadingConsumerData}
                      />
                    );
                  })()
                )}
              </>
            )}

            {/* ==================== OVERALL SECTION ==================== */}
            {/* Show overall when there are one or more months AND user selected overall */}
            {currentSection === "overall" &&
              results &&
              results.monthlySummaries.length >= 1 && (
                <>
                  {/* Monthly Consumption Mix - OA vs DISCOM - Overall Section */}
                  {hasSubmitted &&
                    !isCalculating &&
                    results &&
                    results.monthlySummaries.length > 0 && (
                      <Card className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                              <BarChart3 className="w-5 h-5 text-accent" />
                              Monthly Consumption Mix - DISCOM vs OA
                            </h3>
                            <p className="text-xs text-muted-foreground mt-1">
                              Compare your actual energy source mix with Prolt's
                              recommended distribution
                            </p>
                          </div>
                          {/* Duplicate legend removed - using Legend component below chart */}
                        </div>
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart
                            data={results.monthlySummaries.map((m) => ({
                              monthLabel: m.monthLabel,
                              actualDiscom: m.actualDiscomUnits,
                              actualOa: m.actualOaUnits,
                              recDiscom: m.recommendedDiscomUnits,
                              recOa: m.recommendedOaUnits,
                              totalUnits: m.totalUnits,
                            }))}
                            barCategoryGap="20%"
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="hsl(var(--border))"
                            />
                            <XAxis
                              dataKey="monthLabel"
                              stroke="hsl(var(--muted-foreground))"
                              fontSize={12}
                            />
                            <YAxis
                              stroke="hsl(var(--muted-foreground))"
                              fontSize={12}
                              tickFormatter={(v: number) =>
                                formatIndianNumber(v)
                              }
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "hsl(var(--popover))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "8px",
                                padding: "12px",
                              }}
                              content={({ active, payload, label }) => {
                                if (!active || !payload || payload.length === 0)
                                  return null;
                                const data = payload[0]?.payload;
                                if (!data) return null;

                                const totalUnits = data.totalUnits || 1;
                                const actualOaPct = Math.round(
                                  (data.actualOa / totalUnits) * 100,
                                );
                                const actualDiscomPct = Math.round(
                                  (data.actualDiscom / totalUnits) * 100,
                                );
                                const recOaPct = Math.round(
                                  (data.recOa / totalUnits) * 100,
                                );
                                const recDiscomPct = Math.round(
                                  (data.recDiscom / totalUnits) * 100,
                                );

                                return (
                                  <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                                    <p className="font-semibold text-sm mb-2">
                                      {label}
                                    </p>
                                    <p className="text-xs text-muted-foreground mb-1">
                                      Total: {totalUnits.toLocaleString('en-IN')} kWh
                                    </p>
                                    <div className="space-y-2 mt-2">
                                      <div>
                                        <p className="text-xs font-medium text-muted-foreground">
                                          Actual Mix
                                        </p>
                                        <div className="flex gap-3 text-xs">
                                          <span
                                            style={{
                                              color: "hsl(217, 55%, 70%)",
                                            }}
                                          >
                                            DISCOM:{" "}
                                            {data.actualDiscom.toLocaleString('en-IN')}{" "}
                                            kWh ({actualDiscomPct}%)
                                          </span>
                                          <span
                                            style={{
                                              color: "hsl(142, 55%, 70%)",
                                            }}
                                          >
                                            OA: {data.actualOa.toLocaleString('en-IN')}{" "}
                                            kWh ({actualOaPct}%)
                                          </span>
                                        </div>
                                      </div>
                                      <div>
                                        <p className="text-xs font-medium text-muted-foreground">
                                          Prolt Optimized Mix
                                        </p>
                                        <div className="flex gap-3 text-xs">
                                          <span
                                            style={{
                                              color: "hsl(217, 55%, 45%)",
                                            }}
                                          >
                                            DISCOM:{" "}
                                            {data.recDiscom.toLocaleString('en-IN')}{" "}
                                            kWh ({recDiscomPct}%)
                                          </span>
                                          <span
                                            style={{
                                              color: "hsl(142, 55%, 40%)",
                                            }}
                                          >
                                            OA: {data.recOa.toLocaleString('en-IN')}{" "}
                                            kWh ({recOaPct}%)
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              }}
                            />
                            <Legend
                              wrapperStyle={{
                                fontSize: "11px",
                                paddingTop: "8px",
                              }}
                              formatter={(value) => {
                                const labels: Record<string, string> = {
                                  actualDiscom: "Actual DISCOM",
                                  actualOa: "Actual OA",
                                  recDiscom: "Prolt DISCOM",
                                  recOa: "Prolt OA",
                                };
                                return labels[value] || value;
                              }}
                            />
                            {/* Actual Mix - lighter colors */}
                            <Bar
                              dataKey="actualDiscom"
                              stackId="actual"
                              fill="hsl(217, 55%, 70%)"
                              radius={[0, 0, 0, 0]}
                            />
                            <Bar
                              dataKey="actualOa"
                              stackId="actual"
                              fill="hsl(142, 55%, 70%)"
                              radius={[4, 4, 0, 0]}
                            />
                            {/* Recommended Mix - darker colors */}
                            <Bar
                              dataKey="recDiscom"
                              stackId="recommended"
                              fill="hsl(217, 55%, 45%)"
                              radius={[0, 0, 0, 0]}
                            />
                            <Bar
                              dataKey="recOa"
                              stackId="recommended"
                              fill="hsl(142, 55%, 40%)"
                              radius={[4, 4, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </Card>
                    )}

                  {/* Monthly Comparison & Source Mix */}
                  {hasSubmitted &&
                    !isCalculating &&
                    results &&
                    results.monthlySummaries.length > 0 && (
                      <div className="grid lg:grid-cols-1 gap-6">
                        {/* Spend Comparison Chart - Full Width */}
                        <Card className="p-6">
                          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-accent" />
                            Monthly Spend Comparison
                          </h3>
                          <ResponsiveContainer width="100%" height={160}>
                            <BarChart data={results.monthlySummaries}>
                              <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="hsl(var(--border))"
                              />
                              <XAxis
                                dataKey="monthLabel"
                                stroke="hsl(var(--muted-foreground))"
                                fontSize={12}
                              />
                              <YAxis
                                stroke="hsl(var(--muted-foreground))"
                                fontSize={12}
                                tickFormatter={(value) =>
                                  formatIndianNumber(value)
                                }
                              />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: "hsl(var(--popover))",
                                  border: "1px solid hsl(var(--border))",
                                  borderRadius: "8px",
                                }}
                                formatter={(value: number) =>
                                  formatCurrency(value)
                                }
                              />
                              <Bar
                                dataKey="actualCost"
                                name="Actual"
                                fill={MONTHLY_COLORS.actual}
                                radius={[4, 4, 0, 0]}
                              />
                              <Bar
                                dataKey="recCost"
                                name="Prolt Optimized"
                                fill={MONTHLY_COLORS.recommended}
                                radius={[4, 4, 0, 0]}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </Card>
                      </div>
                    )}

                  {/* Peak Month Analysis - Above Monthly Summary */}
                  {/* {hasSubmitted &&
                    !isCalculating &&
                    results &&
                    results.monthlySummaries.length > 1 && (
                      <Card className="p-6">
                        <div className="flex items-center gap-2 mb-4">
                          <TrendingUp className="w-5 h-5 text-accent" />
                          <h3 className="font-semibold text-lg">
                            Peak Month Analysis
                          </h3>
                        </div>
                        {(() => {
                          const peakMonth = results.monthlySummaries.reduce(
                            (prev, curr) =>
                              curr.actualCost > prev.actualCost ? curr : prev,
                          );
                          const lowestMonth = results.monthlySummaries.reduce(
                            (prev, curr) =>
                              curr.actualCost < prev.actualCost ? curr : prev,
                          );
                          const totalCost = results.monthlySummaries.reduce(
                            (sum, m) => sum + m.actualCost,
                            0,
                          );
                          const peakPercent = Math.round(
                            (peakMonth.actualCost / totalCost) * 100,
                          );
                          return (
                            <div className="grid md:grid-cols-2 gap-4">
                              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                                <p className="text-sm text-muted-foreground mb-1">
                                  Highest Spend Month
                                </p>
                                <p className="text-xl font-bold">
                                  {peakMonth.monthLabel}
                                </p>
                                <p className="text-lg font-semibold text-destructive">
                                  {formatCurrency(peakMonth.actualCost)}
                                </p>
                                <p className="text-xs text-muted-foreground mt-2">
                                  {peakPercent}% of total spend. Potential
                                  savings: {formatCurrency(peakMonth.savings)}
                                </p>
                              </div>
                              <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
                                <p className="text-sm text-muted-foreground mb-1">
                                  Lowest Spend Month
                                </p>
                                <p className="text-xl font-bold">
                                  {lowestMonth.monthLabel}
                                </p>
                                <p className="text-lg font-semibold text-success">
                                  {formatCurrency(lowestMonth.actualCost)}
                                </p>
                                <p className="text-xs text-muted-foreground mt-2">
                                  Replicate this pattern for maximum efficiency
                                </p>
                              </div>
                            </div>
                          );
                        })()}
                      </Card>
                    )} */}

                  {/* Monthly Summary Table */}
                  {/* {results && results.monthlySummaries.length > 1 && (
                    <Card className="p-6">
                      <h3 className="font-semibold text-lg mb-4">
                        Monthly Summary
                      </h3>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Month</TableHead>
                              <TableHead className="text-right">
                                Actual Bill
                              </TableHead>
                              <TableHead className="text-right">
                                Recommended
                              </TableHead>
                              <TableHead className="text-right">
                                Savings
                              </TableHead>
                              <TableHead className="text-right">
                                % Saved
                              </TableHead>
                              <TableHead className="text-right">
                                OA Share
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {results.monthlySummaries.map((summary) => (
                              <TableRow key={summary.monthISO}>
                                <TableCell className="font-medium">
                                  {summary.monthLabel}
                                </TableCell>
                                <TableCell className="text-right">
                                  {formatCurrency(summary.actualCost)}
                                </TableCell>
                                <TableCell className="text-right text-success">
                                  {formatCurrency(summary.recCost)}
                                </TableCell>
                                <TableCell className="text-right text-success">
                                  {formatCurrency(summary.savings)}
                                </TableCell>
                                <TableCell className="text-right">
                                  {summary.savingsPercent}%
                                </TableCell>
                                <TableCell className="text-right">
                                  {summary.oaShare}%
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </Card>
                  )} */}
                </>
              )}

            {/* ==================== MONTHLY SECTION ==================== */}
            {/* Show monthly when user explicitly selects monthly tab */}
            {currentSection === "monthly" &&
              hasSubmitted &&
              !isCalculating &&
              results && (
                <>
                  {/* Source Mix Pie Charts removed from Monthly Section */}

                  {/* Day-Wise Breakdown - Split into 2 Charts */}
                  {(() => {
                    const displayMonth =
                      results.monthlySummaries.length === 1
                        ? results.monthlySummaries[0].monthISO
                        : selectedMonth;
                    if (!displayMonth) return null;
                    const dayData = getDayWiseData();
                    return (
                      <div className="space-y-6">
                        {/* Chart 1: Daily Savings Comparison */}
                        <Card className="p-6">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                              <IndianRupee className="w-5 h-5 text-accent" />
                              Daily Savings Opportunity - {displayMonth}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                              How much you could save each day
                            </p>
                          </div>

                          <div className="overflow-x-auto">
                            <div
                              style={{
                                minWidth: `${Math.max(800, dayData.length * 50)}px`,
                              }}
                            >
                              <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={slotData}>
                                  <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="hsl(var(--border))"
                                  />
                                  <XAxis
                                    dataKey="day"
                                    stroke="hsl(var(--muted-foreground))"
                                    fontSize={10}
                                    angle={-45}
                                    textAnchor="end"
                                    height={50}
                                  />
                                  <YAxis
                                    stroke="hsl(var(--muted-foreground))"
                                    fontSize={11}
                                  />
                                  <Tooltip
                                    content={({ active, payload, label }) => {
                                      if (active && payload && payload.length) {
                                        const data = payload[0]?.payload;
                                        return (
                                          <div className="bg-popover border rounded-lg shadow-lg p-3 text-sm">
                                            <p className="font-medium mb-2">
                                              {label}
                                            </p>
                                            <div className="space-y-1">
                                              <div className="flex justify-between gap-4">
                                                <span className="text-muted-foreground">
                                                  You Paid:
                                                </span>
                                                <span className="font-mono">
                                                  {formatCurrency(
                                                    data?.actualPaid || 0,
                                                  )}
                                                </span>
                                              </div>
                                              <div className="flex justify-between gap-4">
                                                <span className="text-muted-foreground">
                                                  Prolt Suggested:
                                                </span>
                                                <span className="font-mono text-success">
                                                  {formatCurrency(
                                                    data?.proltSuggested || 0,
                                                  )}
                                                </span>
                                              </div>
                                              <div className="flex justify-between gap-4 pt-1 border-t text-success">
                                                <span className="font-semibold">
                                                  Potential Saving:
                                                </span>
                                                <span className="font-mono font-bold">
                                                  {formatCurrency(
                                                    (data?.actualPaid || 0) -
                                                      (data?.proltSuggested ||
                                                        0),
                                                  )}
                                                </span>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      }
                                      return null;
                                    }}
                                  />
                                  <Legend />
                                  <Bar
                                    dataKey="actualPaid"
                                    name="What You Paid"
                                    fill="hsl(0, 72%, 51%)"
                                    radius={[2, 2, 0, 0]}
                                  />
                                  <Bar
                                    dataKey="proltSuggested"
                                    name="Prolt Suggested Cost"
                                    fill="hsl(142, 71%, 45%)"
                                    radius={[2, 2, 0, 0]}
                                  />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        </Card>

                        {/* Chart 2: Energy Source Mix - Actual vs Recommended (Side by Side) */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {/* Part 1: Actual Energy Mix by Day */}
                          <Card className="p-6">
                            <div className="mb-4">
                              <h3 className="font-semibold text-base flex items-center gap-2">
                                <Zap className="w-4 h-4 text-muted-foreground" />
                                How You Actually Purchased
                              </h3>
                              <p className="text-xs text-muted-foreground mt-1">
                                {hasOaBill
                                  ? "Your actual DISCOM + OA energy mix"
                                  : "All energy purchased from DISCOM"}
                              </p>
                            </div>

                            <div className="overflow-x-auto">
                              <div
                                style={{
                                  minWidth: `${Math.max(400, dayData.length * 25)}px`,
                                }}
                              >
                                <ResponsiveContainer width="100%" height={200}>
                                  <BarChart data={slotData}>
                                    <CartesianGrid
                                      strokeDasharray="3 3"
                                      stroke="hsl(var(--border))"
                                    />
                                    <XAxis
                                      dataKey="day"
                                      stroke="hsl(var(--muted-foreground))"
                                      fontSize={9}
                                      angle={-45}
                                      textAnchor="end"
                                      height={45}
                                    />
                                    <YAxis
                                      stroke="hsl(var(--muted-foreground))"
                                      fontSize={10}
                                    />
                                    <Tooltip
                                      content={({ active, payload, label }) => {
                                        if (
                                          active &&
                                          payload &&
                                          payload.length
                                        ) {
                                          const data = payload[0]?.payload;
                                          const oaPercent =
                                            data?.units > 0
                                              ? Math.round(
                                                  (data?.actualOaUnits /
                                                    data?.units) *
                                                    100,
                                                )
                                              : 0;
                                          const discomPercent = 100 - oaPercent;
                                          return (
                                            <div className="bg-popover border rounded-lg shadow-lg p-3 text-sm">
                                              <p className="font-medium mb-2">
                                                {label}
                                              </p>
                                              <div className="space-y-1">
                                                <div className="flex justify-between gap-4">
                                                  <span className="text-muted-foreground">
                                                    Total:
                                                  </span>
                                                  <span className="font-mono font-semibold">
                                                    {data?.units?.toLocaleString('en-IN')}{" "}
                                                    kWh
                                                  </span>
                                                </div>
                                                {hasOaBill && (
                                                  <div className="flex justify-between gap-4">
                                                    <span className="text-muted-foreground">
                                                      From OA:
                                                    </span>
                                                    <span className="font-mono">
                                                      {data?.actualOaUnits?.toLocaleString('en-IN')}{" "}
                                                      kWh ({oaPercent}%)
                                                    </span>
                                                  </div>
                                                )}
                                                <div className="flex justify-between gap-4">
                                                  <span className="text-muted-foreground">
                                                    From DISCOM:
                                                  </span>
                                                  <span className="font-mono">
                                                    {data?.actualDiscomUnits?.toLocaleString('en-IN')}{" "}
                                                    kWh ({discomPercent}%)
                                                  </span>
                                                </div>
                                                <div className="flex justify-between gap-4 pt-1 border-t">
                                                  <span className="text-muted-foreground">
                                                    You Paid:
                                                  </span>
                                                  <span className="font-mono font-semibold">
                                                    {formatCurrency(
                                                      data?.actualPaid,
                                                    )}
                                                  </span>
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        }
                                        return null;
                                      }}
                                    />
                                    <Legend
                                      wrapperStyle={{ fontSize: "10px" }}
                                    />
                                    {hasOaBill && (
                                      <Bar
                                        dataKey="actualOaUnits"
                                        name="OA Energy"
                                        stackId="a"
                                        fill="hsl(200, 50%, 50%)"
                                        radius={[0, 0, 0, 0]}
                                      />
                                    )}
                                    <Bar
                                      dataKey="actualDiscomUnits"
                                      name="DISCOM Energy"
                                      stackId="a"
                                      fill="hsl(220, 45%, 60%)"
                                      radius={[2, 2, 0, 0]}
                                    />
                                  </BarChart>
                                </ResponsiveContainer>
                              </div>
                            </div>
                            <div className="mt-3 p-2 bg-muted/30 rounded text-center">
                              <p className="text-xs text-muted-foreground">
                                Total Paid:{" "}
                                <span className="font-semibold text-foreground">
                                  {formatCurrency(
                                    slotData.reduce(
                                      (s, d) => s + d.actualPaid,
                                      0,
                                    ),
                                  )}
                                </span>
                              </p>
                            </div>
                          </Card>

                          {/* Visual Connector Arrow (hidden on mobile) */}
                          <div
                            className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none"
                            style={{ display: "none" }}
                          >
                            <div className="bg-accent text-accent-foreground px-3 py-1 rounded-full text-xs font-medium shadow-lg">
                              →
                            </div>
                          </div>

                          {/* Part 2: Prolt Recommended Energy Mix by Day */}
                          <Card className="p-6 ring-2 ring-accent/20">
                            <div className="mb-4">
                              <h3 className="font-semibold text-base flex items-center gap-2">
                                <Zap className="w-4 h-4 text-accent" />
                                How You Should Purchase
                                <span className="text-[10px] bg-accent/20 text-accent px-2 py-0.5 rounded-full font-medium">
                                  RECOMMENDED
                                </span>
                              </h3>
                              <p className="text-xs text-muted-foreground mt-1">
                                Prolt's optimal DISCOM + OA mix for savings
                              </p>
                            </div>

                            <div className="overflow-x-auto">
                              <div
                                style={{
                                  minWidth: `${Math.max(400, dayData.length * 25)}px`,
                                }}
                              >
                                <ResponsiveContainer width="100%" height={200}>
                                  <BarChart data={slotData}>
                                    <CartesianGrid
                                      strokeDasharray="3 3"
                                      stroke="hsl(var(--border))"
                                    />
                                    <XAxis
                                      dataKey="day"
                                      stroke="hsl(var(--muted-foreground))"
                                      fontSize={9}
                                      angle={-45}
                                      textAnchor="end"
                                      height={45}
                                    />
                                    <YAxis
                                      stroke="hsl(var(--muted-foreground))"
                                      fontSize={10}
                                    />
                                    <Tooltip
                                      content={({ active, payload, label }) => {
                                        if (
                                          active &&
                                          payload &&
                                          payload.length
                                        ) {
                                          const data = payload[0]?.payload;
                                          const oaPercent =
                                            data?.units > 0
                                              ? Math.round(
                                                  (data?.recommendedOaUnits /
                                                    data?.units) *
                                                    100,
                                                )
                                              : 0;
                                          const discomPercent = 100 - oaPercent;
                                          return (
                                            <div className="bg-popover border rounded-lg shadow-lg p-3 text-sm">
                                              <p className="font-medium mb-2">
                                                {label}
                                              </p>
                                              <div className="space-y-1">
                                                <div className="flex justify-between gap-4">
                                                  <span className="text-muted-foreground">
                                                    Total:
                                                  </span>
                                                  <span className="font-mono font-semibold">
                                                    {data?.units?.toLocaleString('en-IN')}{" "}
                                                    kWh
                                                  </span>
                                                </div>
                                                <div className="flex justify-between gap-4">
                                                  <span className="text-muted-foreground">
                                                    Buy OA:
                                                  </span>
                                                  <span className="font-mono text-success">
                                                    {data?.recommendedOaUnits?.toLocaleString('en-IN')}{" "}
                                                    kWh ({oaPercent}%)
                                                  </span>
                                                </div>
                                                <div className="flex justify-between gap-4">
                                                  <span className="text-muted-foreground">
                                                    Buy DISCOM:
                                                  </span>
                                                  <span className="font-mono">
                                                    {data?.recommendedDiscomUnits?.toLocaleString('en-IN')}{" "}
                                                    kWh ({discomPercent}%)
                                                  </span>
                                                </div>
                                                <div className="flex justify-between gap-4 pt-1 border-t">
                                                  <span className="text-muted-foreground">
                                                    You'd Pay:
                                                  </span>
                                                  <span className="font-mono font-semibold text-success">
                                                    {formatCurrency(
                                                      data?.proltSuggested,
                                                    )}
                                                  </span>
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        }
                                        return null;
                                      }}
                                    />
                                    <Legend
                                      wrapperStyle={{ fontSize: "10px" }}
                                    />
                                    <Bar
                                      dataKey="recommendedOaUnits"
                                      name="Buy from OA"
                                      stackId="a"
                                      fill="hsl(142, 55%, 40%)"
                                      radius={[0, 0, 0, 0]}
                                    />
                                    <Bar
                                      dataKey="recommendedDiscomUnits"
                                      name="Buy from DISCOM"
                                      stackId="a"
                                      fill="hsl(217, 55%, 50%)"
                                      radius={[2, 2, 0, 0]}
                                    />
                                  </BarChart>
                                </ResponsiveContainer>
                              </div>
                            </div>
                            <div className="mt-3 p-2 bg-success/10 rounded text-center">
                              <p className="text-xs text-muted-foreground">
                                You'd Pay:{" "}
                                <span className="font-semibold text-success">
                                  {formatCurrency(
                                    slotData.reduce(
                                      (s, d) => s + d.proltSuggested,
                                      0,
                                    ),
                                  )}
                                </span>
                                <span className="ml-2 text-success font-medium">
                                  (Save{" "}
                                  {formatCurrency(
                                    slotData.reduce(
                                      (s, d) =>
                                        s + (d.actualPaid - d.proltSuggested),
                                      0,
                                    ),
                                  )}
                                  )
                                </span>
                              </p>
                            </div>
                          </Card>
                        </div>

                        {/* Day-wise Table with Units and Source */}
                        <Card className="p-6">
                          <h3 className="font-semibold text-lg mb-4">
                            Prolt Suggested Daily Breakdown
                          </h3>
                          <div className="overflow-x-auto max-h-[300px]">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Day</TableHead>
                                  <TableHead className="text-right">
                                    Total Units
                                  </TableHead>
                                  <TableHead className="text-right">
                                    OA Units
                                  </TableHead>
                                  <TableHead className="text-right">
                                    DISCOM Units
                                  </TableHead>
                                  <TableHead className="text-right">
                                    You Paid
                                  </TableHead>
                                  <TableHead className="text-right">
                                    Prolt Suggested
                                  </TableHead>
                                  <TableHead className="text-right">
                                    Saving
                                  </TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {dailyBreakdownTable &&
                                  dailyBreakdownTable.map((day, idx) => (
                                    <TableRow key={idx}>
                                      <TableCell className="font-medium">
                                        {day.day}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {day.units.toLocaleString('en-IN')}
                                      </TableCell>
                                      <TableCell className="text-right text-success">
                                        {day.recommendedOaUnits.toLocaleString('en-IN')}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {day.recommendedDiscomUnits.toLocaleString('en-IN')}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {formatCurrency(day.actualPaid)}
                                      </TableCell>
                                      <TableCell className="text-right text-success">
                                        {formatCurrency(day.proltSuggested)}
                                      </TableCell>
                                      <TableCell className="text-right text-success font-medium">
                                        {formatCurrency(
                                          day.actualPaid - day.proltSuggested,
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                              </TableBody>
                            </Table>
                          </div>
                        </Card>
                      </div>
                    );
                  })()}

                  {/* 2-Column Grid: Insights and Actions for Monthly Section */}
                  {(() => {
                    const displayMonth =
                      results.monthlySummaries.length === 1
                        ? results.monthlySummaries[0].monthISO
                        : selectedMonth;
                    if (!displayMonth) return null;
                    const monthEntry = monthEntries.find(
                      (e) => e.monthISO === displayMonth,
                    );
                    return (
                      <div className="grid md:grid-cols-2 gap-6">
                        {/* Shiftability Gauge */}
                        {(() => {
                          return (
                            <Card className="p-6">
                              <div className="flex items-center gap-2 mb-4">
                                <BarChart3 className="w-5 h-5 text-accent" />
                                <h3 className="font-semibold">
                                  How Much of Your Load Is Shiftable?
                                </h3>
                              </div>
                              {(() => {
                                const tod1 = parseFloat(
                                  monthEntry?.tod1 || "0",
                                );
                                const tod2 = parseFloat(
                                  monthEntry?.tod2 || "0",
                                );
                                const tod3 = parseFloat(
                                  monthEntry?.tod3 || "0",
                                );
                                const tod4 = parseFloat(
                                  monthEntry?.tod4 || "0",
                                );
                                const total = tod1 + tod2 + tod3 + tod4;
                                const offPeakRatio =
                                  total > 0 ? ((tod3 + tod1) / total) * 100 : 0;
                                const score = Math.round(offPeakRatio * 0.8);
                                const level =
                                  score < 40
                                    ? "Low"
                                    : score > 65
                                      ? "High"
                                      : "Medium";
                                const levelColor =
                                  level === "Low"
                                    ? "text-destructive"
                                    : level === "High"
                                      ? "text-success"
                                      : "text-warning";
                                return (
                                  <div className="text-center">
                                    <div className="text-4xl font-bold mb-2">
                                      {score}
                                      <span className="text-xl text-muted-foreground">
                                        /100
                                      </span>
                                    </div>
                                    <p
                                      className={`font-semibold ${levelColor}`}
                                    >
                                      {level} Flexibility
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-2">
                                      Based on ToD distribution pattern
                                    </p>
                                  </div>
                                );
                              })()}
                            </Card>
                          );
                        })()}

                        {/* Cost vs Consumption - replaced Peak Month Analysis which moved to Overall */}

                        {/* Cost vs Consumption */}
                        <Card className="p-6">
                          <div className="flex items-center gap-2 mb-4">
                            <IndianRupee className="w-5 h-5 text-accent" />
                            <h3 className="font-semibold">
                              Cost vs Consumption
                            </h3>
                          </div>
                          {(() => {
                            console.log(results.monthlySummaries);
                            const monthData = results.monthlySummaries.find(
                              (m) => m.monthISO === displayMonth,
                            );

                            const costPerUnit =
                              monthData && monthData.totalUnits > 0
                                ? (
                                    monthData.actualCost / monthData.totalUnits
                                  ).toFixed(2)
                                : "0";

                            const optCostPerUnit =
                              monthData && monthData.totalUnits > 0
                                ? (
                                    monthData.recCost / monthData.totalUnits
                                  ).toFixed(2)
                                : "0";
                            return (
                              <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="p-3 bg-muted/30 rounded-lg text-center">
                                    <p className="text-xs text-muted-foreground">
                                      Current Rate
                                    </p>
                                    <p className="text-lg font-bold">
                                      ₹{costPerUnit}/kWh
                                    </p>
                                  </div>
                                  <div className="p-3 bg-success/10 rounded-lg text-center">
                                    <p className="text-xs text-muted-foreground">
                                      Optimized Rate
                                    </p>
                                    <p className="text-lg font-bold text-success">
                                      ₹{optCostPerUnit}/kWh
                                    </p>
                                  </div>
                                </div>
                                <p className="text-xs text-muted-foreground text-center">
                                  Total units:{" "}
                                  {(
                                    monthData?.totalUnits || 0
                                  ).toLocaleString('en-IN')}{" "}
                                  kWh
                                </p>
                              </div>
                            );
                          })()}
                        </Card>

                        {/* Download Reports removed - now in InsightsExplorer page */}
                      </div>
                    );
                  })()}
                </>
              )}
          </div>

          {/* Right Column - Sticky Insights Card (in-grid for overall, fixed floating for monthly) */}
          {hasSubmitted &&
            !isCalculating &&
            results &&
            results.monthlySummaries.length >= 1 &&
            currentSection === "overall" && (
              <div className="lg:col-span-3">
                <div className="sticky top-24">
                  <Card className="relative overflow-hidden border-secondary/30 bg-gradient-to-br from-secondary/10 via-background to-accent/5">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-secondary/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
                    <div className="relative px-5 py-4 space-y-3">
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <Lightbulb className="w-3.5 h-3.5 text-secondary" />
                          <span className="text-xs font-semibold text-secondary uppercase tracking-wider">
                            Explore Insights
                          </span>
                        </div>
                        <h3 className="text-base font-semibold text-foreground leading-snug">
                          Deep dive into your consumption insights
                        </h3>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-sm text-muted-foreground">
                          View detailed savings analysis, source mix, daily
                          breakdown
                        </p>
                        <p className="text-sm text-muted-foreground">
                          and optimization opportunities.
                        </p>
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <div className="w-10 h-10 rounded-full bg-secondary/15 flex items-center justify-center">
                          <BarChart3 className="w-5 h-5 text-secondary" />
                        </div>
                        <Button
                          onClick={handleExploreInsights}
                          className="bg-secondary hover:bg-secondary/90 text-secondary-foreground gap-2 shadow-md hover:shadow-lg transition-all"
                        >
                          View Full Insights
                          <TrendingUp className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            )}

          {/* Monthly insights card is now inline with KPI cards above */}
        </div>
      </div>

      {/* Formula Modal */}
      <Dialog open={showFormulaModal} onOpenChange={setShowFormulaModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="w-5 h-5 text-accent" />
              Slot Calculation Details
            </DialogTitle>
            <DialogDescription>
              Transparency into how this slot's costs were calculated
            </DialogDescription>
          </DialogHeader>
          {selectedSlot && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                <div>
                  <p className="text-muted-foreground">Date</p>
                  <p className="font-medium">{selectedSlot.date}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Interval</p>
                  <p className="font-medium font-mono">
                    {selectedSlot.interval}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Slot Energy</p>
                  <p className="font-medium">{selectedSlot.slot_kwh} kWh</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Hour / Block</p>
                  <p className="font-medium">
                    {selectedSlot.hour}:00 / Block {selectedSlot.block}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-3 border rounded-lg">
                  <p className="text-muted-foreground text-xs mb-1">
                    DISCOM Cost Formula
                  </p>
                  <code className="text-xs bg-muted px-2 py-1 rounded">
                    {selectedSlot.slot_kwh} kWh × ₹{selectedSlot.discom_rate}
                    /kWh = ₹{selectedSlot.actual_cost}
                  </code>
                </div>

                <div className="p-3 border rounded-lg">
                  <p className="text-muted-foreground text-xs mb-1">
                    Predicted IEX Price
                  </p>
                  <code className="text-xs bg-muted px-2 py-1 rounded">
                    ₹{selectedSlot.pred_price_kwh}/kWh (from ML model)
                  </code>
                </div>

                <div className="p-3 border rounded-lg border-success/50">
                  <p className="text-muted-foreground text-xs mb-1">
                    Recommended Source:{" "}
                    <span className="text-success font-medium">
                      {selectedSlot.rec_source}
                    </span>
                  </p>
                  <code className="text-xs bg-muted px-2 py-1 rounded">
                    {selectedSlot.rec_source === "OA"
                      ? `OA is cheaper: ₹${selectedSlot.pred_price_kwh} < ₹${selectedSlot.discom_rate}`
                      : `DISCOM is cheaper: ₹${selectedSlot.discom_rate} ≤ ₹${selectedSlot.pred_price_kwh}`}
                  </code>
                </div>

                <div className="p-3 border rounded-lg bg-success/10">
                  <p className="text-muted-foreground text-xs mb-1">
                    Slot Saving
                  </p>
                  <code className="text-xs bg-muted px-2 py-1 rounded">
                    ₹{selectedSlot.actual_cost} - ₹{selectedSlot.rec_cost} = ₹
                    {selectedSlot.slot_saving}
                  </code>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Calculator;
