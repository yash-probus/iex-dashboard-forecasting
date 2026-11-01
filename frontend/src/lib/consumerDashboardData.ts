import {
  ConsumerDashboardData,
  DailyConsumption,
  DeliveryStatus,
  PeakConsumptionPoint,
  EnergyForecast,
  OARecommendation,
  SavingsPotential,
  ConsumerKPIs,
  HourlyUsage,
  DailyUsageWithSavings,
  MonthlyUsageWithSavings,
  PeakPatternData,
  EnhancedConsumerKPIs,
  EnhancedForecast,
  EnhancedConsumerDashboardData,
  MarketPriceSlot,
  FifteenMinuteSlotData,
  TodayUsageDetail,
  OAExecutionStatus,
  DailyDetailData,
  MonthlyUsageDetail,
  MonthlyDetailData,
  YearlyUsageDetail,
  SlotTimelineData,
  DayTimelineData,
  MonthTimelineData,
  EnergyUsageTimeline,
  SavingsAchievedData,
  FutureSavingsData,
  EstimatedBillData,
  PeakPowerToday,
  PeakPowerMonth,
  PeakPowerYear,
  TODSlot,
  TODForecastDay,
  TODForecast7Day,
} from "@/components/consumer/types";

// Get TOD slots based on season
function getTODSlotsForSeason(
  date: Date,
): { name: string; startTime: string; endTime: string; hoursInSlot: number }[] {
  const month = date.getMonth() + 1; // 1-12
  const isSummer = month >= 4 && month <= 9;

  if (isSummer) {
    // Summer (April-September)
    return [
      {
        name: "Off-Peak",
        startTime: "23:00",
        endTime: "06:00",
        hoursInSlot: 7,
      },
      { name: "Normal", startTime: "06:00", endTime: "17:00", hoursInSlot: 11 },
      { name: "Peak", startTime: "17:00", endTime: "23:00", hoursInSlot: 6 },
    ];
  } else {
    // Winter (October-March)
    return [
      {
        name: "Off-Peak",
        startTime: "23:00",
        endTime: "06:00",
        hoursInSlot: 7,
      },
      { name: "Normal", startTime: "06:00", endTime: "17:00", hoursInSlot: 11 },
      { name: "Peak", startTime: "17:00", endTime: "19:00", hoursInSlot: 2 },
      {
        name: "Super Peak",
        startTime: "19:00",
        endTime: "21:00",
        hoursInSlot: 2,
      },
      { name: "Peak", startTime: "21:00", endTime: "23:00", hoursInSlot: 2 },
    ];
  }
}

// Generate TOD forecast for next 7 days
export function generateTODForecast7Days(): TODForecast7Day {
  const today = new Date();
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const days: TODForecastDay[] = [];

  let total7DayPrediction = 0;
  let total7DayHistoricalAvg = 0;

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    const dayLabel =
      i === 0 ? "Today" : i === 1 ? "Tomorrow" : dayNames[dayOfWeek];
    const todSlotDefs = getTODSlotsForSeason(date);

    // Base consumption depends on weekday/weekend
    const baseDailyConsumption = isWeekend ? 800 : 1200; // kWh per day

    const todSlots: TODSlot[] = [];
    let dayPredicted = 0;
    let dayHistorical = 0;

    // Consolidate slots (Winter has 2 Peak periods, combine them)
    const consolidatedSlots = new Map<
      string,
      { name: string; startTime: string; endTime: string; hoursInSlot: number }
    >();
    for (const slot of todSlotDefs) {
      if (consolidatedSlots.has(slot.name)) {
        const existing = consolidatedSlots.get(slot.name)!;
        existing.hoursInSlot += slot.hoursInSlot;
      } else {
        consolidatedSlots.set(slot.name, { ...slot });
      }
    }

    for (const [, slot] of consolidatedSlots) {
      // Distribution weights: Peak uses more energy
      let weight = 1;
      if (slot.name === "Peak") weight = 1.5;
      else if (slot.name === "Super Peak") weight = 1.8;
      else if (slot.name === "Off-Peak") weight = 0.4;

      const slotBaseKwh =
        baseDailyConsumption * (slot.hoursInSlot / 24) * weight;
      const historicalAvgKwh = Math.round(
        slotBaseKwh + (Math.random() * 50 - 25),
      );
      const predictedKwh = Math.round(
        historicalAvgKwh * (0.9 + Math.random() * 0.25),
      );

      todSlots.push({
        name: slot.name,
        startTime: slot.startTime,
        endTime: slot.endTime,
        predictedKwh,
        historicalAvgKwh,
      });

      dayPredicted += predictedKwh;
      dayHistorical += historicalAvgKwh;
    }

    days.push({
      date: date.toISOString().split("T")[0],
      dayLabel,
      todSlots,
      totalPredictedKwh: dayPredicted,
      totalHistoricalAvgKwh: dayHistorical,
    });

    total7DayPrediction += dayPredicted;
    total7DayHistoricalAvg += dayHistorical;
  }

  return {
    days,
    total7DayPrediction,
    total7DayHistoricalAvg,
  };
}

// Generate daily consumption data for current month
function generateDailyConsumption(): DailyConsumption[] {
  const data: DailyConsumption[] = [];
  const today = new Date();
  const daysInMonth = new Date(
    today.getFullYear(),
    today.getMonth() + 1,
    0,
  ).getDate();
  const currentDay = today.getDate();

  for (let day = 1; day <= Math.min(currentDay, daysInMonth); day++) {
    const date = new Date(today.getFullYear(), today.getMonth(), day);
    const dayOfWeek = date.getDay();

    // Weekdays have higher consumption
    const baseConsumption = dayOfWeek === 0 || dayOfWeek === 6 ? 800 : 1200;
    const variation = Math.random() * 400 - 200;
    const totalUnits = Math.round(baseConsumption + variation);

    // OA percentage varies - higher during optimal hours
    const oaPercentage = 0.3 + Math.random() * 0.25;
    const oaUnits = Math.round(totalUnits * oaPercentage);
    const discomUnits = totalUnits - oaUnits;

    data.push({
      date: date.toISOString().split("T")[0],
      discomUnits,
      oaUnits,
      totalUnits,
    });
  }

  return data;
}

// Generate delivery status
function generateDeliveryStatus(): DeliveryStatus {
  const scheduled = 35000;
  const confirmed = Math.round(scheduled * 0.85);
  const partiallyConfirmed = Math.round(scheduled * 0.08);
  const failed = scheduled - confirmed - partiallyConfirmed;

  return {
    scheduled,
    confirmed,
    partiallyConfirmed,
    failed,
  };
}

// Generate peak consumption data
function generatePeakConsumption(): PeakConsumptionPoint[] {
  const data: PeakConsumptionPoint[] = [];
  const today = new Date();
  const currentDay = today.getDate();

  for (let day = 1; day <= currentDay; day++) {
    const date = new Date(today.getFullYear(), today.getMonth(), day);
    const dayOfWeek = date.getDay();

    // Evening peaks are common
    const peakHours = [
      "18:00-18:15",
      "18:45-19:00",
      "19:00-19:15",
      "19:30-19:45",
      "20:00-20:15",
    ];
    const morningPeaks = ["09:00-09:15", "10:00-10:15", "11:00-11:15"];

    // Monday and Friday tend to have higher peaks
    const basePeak = dayOfWeek === 1 || dayOfWeek === 5 ? 95 : 75;
    const variation = Math.random() * 30;

    data.push({
      day,
      peakKwh: Math.round(basePeak + variation),
      peakTime:
        Math.random() > 0.3
          ? peakHours[Math.floor(Math.random() * peakHours.length)]
          : morningPeaks[Math.floor(Math.random() * morningPeaks.length)],
      date: date.toISOString().split("T")[0],
    });
  }

  return data;
}

// Generate 7-day forecast
function generateForecast(): EnergyForecast[] {
  const data: EnergyForecast[] = [];
  const today = new Date();
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dayOfWeek = date.getDay();

    const baseConsumption = dayOfWeek === 0 || dayOfWeek === 6 ? 850 : 1150;
    const historicalAverage = baseConsumption + Math.random() * 100 - 50;
    const forecastedKwh = baseConsumption + Math.random() * 150 - 75;

    data.push({
      date: date.toISOString().split("T")[0],
      forecastedKwh: Math.round(forecastedKwh),
      historicalAverage: Math.round(historicalAverage),
      dayLabel: i === 0 ? "Today" : i === 1 ? "Tomorrow" : dayNames[dayOfWeek],
    });
  }

  return data;
}

// Generate OA recommendations
function generateRecommendations(): OARecommendation[] {
  const slots = [
    { time: "02:00-02:15", basePrice: 2800 },
    { time: "03:00-03:15", basePrice: 2650 },
    { time: "03:45-04:00", basePrice: 2700 },
    { time: "13:00-13:15", basePrice: 3200 },
    { time: "14:00-14:15", basePrice: 3100 },
    { time: "22:00-22:15", basePrice: 3000 },
  ];

  const discomPrice = 6500; // Rs per MWh

  return slots.map((slot, index) => {
    const priceVariation = Math.random() * 300 - 150;
    const expectedPrice = Math.round(slot.basePrice + priceVariation);
    const suggestedQuantity = Math.round((0.8 + Math.random() * 0.8) * 10) / 10;
    const savingsAmount = Math.round(
      (discomPrice - expectedPrice) * suggestedQuantity,
    );
    const savingsPercent = Math.round(
      ((discomPrice - expectedPrice) / discomPrice) * 100,
    );

    return {
      id: `rec-${index}`,
      timeSlot: slot.time,
      expectedPrice,
      suggestedQuantity,
      discomPrice,
      savingsAmount,
      savingsPercent,
    };
  });
}

// Generate savings potential with scheduled MWh (user-specific)
function generateSavingsPotential(): SavingsPotential[] {
  const data: SavingsPotential[] = [];
  const today = new Date();
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dayOfWeek = date.getDay();

    // Weekdays have more opportunity and higher load
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const scheduledMWh = isWeekend
      ? Math.round((0.8 + Math.random() * 0.4) * 10) / 10
      : Math.round((1.4 + Math.random() * 0.6) * 10) / 10;

    // Savings based on scheduled load and price differential
    const priceDiff = 2500 + Math.random() * 1000; // Rs/MWh savings
    const savingsRs = Math.round(scheduledMWh * priceDiff);

    const allSlots = [
      "02:00-03:00",
      "03:00-04:00",
      "13:00-14:00",
      "22:00-23:00",
    ];
    const numSlots = 2 + Math.floor(Math.random() * 2);
    const bestSlots = allSlots.slice(0, numSlots);

    data.push({
      date: date.toISOString().split("T")[0],
      dayLabel: i === 0 ? "Today" : i === 1 ? "Tomorrow" : dayNames[dayOfWeek],
      savingsRs,
      bestSlots,
      scheduledMWh,
    });
  }

  return data;
}

// NEW: Generate market price slots (market-level opportunity, independent of user)
function generateMarketPriceSlots(): MarketPriceSlot[] {
  const data: MarketPriceSlot[] = [];
  const today = new Date();
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Available low-price time slots
  const cheapSlots = [
    "02:00-04:00",
    "03:00-05:00",
    "04:00-06:00",
    "13:00-15:00",
    "14:00-16:00",
    "23:00-01:00",
  ];

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dayOfWeek = date.getDay();

    // Base price varies by day - weekends typically cheaper
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const basePrice = isWeekend ? 2800 : 3200;
    const lowestPrice = Math.round(basePrice + Math.random() * 600 - 300);

    // Random cheap slot for the day
    const lowestSlotTime =
      cheapSlots[Math.floor(Math.random() * cheapSlots.length)];

    // Opportunity amount based on price differential vs DISCOM
    const discomPrice = 6500; // Rs/MWh
    const opportunityAmount = Math.round(
      (discomPrice - lowestPrice) * (1.5 + Math.random() * 0.8),
    );

    data.push({
      date: date.toISOString().split("T")[0],
      dayLabel: i === 0 ? "Today" : i === 1 ? "Tomorrow" : dayNames[dayOfWeek],
      lowestSlotTime,
      lowestPrice,
      opportunityAmount,
    });
  }

  return data;
}

// Generate KPIs
function generateKPIs(dailyConsumption: DailyConsumption[]): ConsumerKPIs {
  const totalDiscom = dailyConsumption.reduce(
    (sum, d) => sum + d.discomUnits,
    0,
  );
  const totalOA = dailyConsumption.reduce((sum, d) => sum + d.oaUnits, 0);
  const totalEnergy = totalDiscom + totalOA;

  const oaPercentage = Math.round((totalOA / totalEnergy) * 100);

  // Estimated savings based on OA usage
  const avgDiscomRate = 6.5; // Rs/kWh
  const avgOARate = 3.8; // Rs/kWh
  const savingsAchieved = Math.round(totalOA * (avgDiscomRate - avgOARate));

  // Project expected savings for rest of month
  const today = new Date();
  const daysInMonth = new Date(
    today.getFullYear(),
    today.getMonth() + 1,
    0,
  ).getDate();
  const daysRemaining = daysInMonth - today.getDate();
  const avgDailySavings = savingsAchieved / today.getDate();
  const expectedSavings = Math.round(
    savingsAchieved + avgDailySavings * daysRemaining * 1.1,
  );

  const billingEstimate = Math.round(
    totalDiscom * avgDiscomRate +
      totalOA * avgOARate +
      daysRemaining * ((totalEnergy / today.getDate()) * 0.6 * avgDiscomRate),
  );

  return {
    totalEnergyThisMonth: totalEnergy,
    discomEnergy: totalDiscom,
    oaEnergy: totalOA,
    savingsAchieved,
    expectedSavings,
    billingEstimate,
    oaPercentage,
  };
}

// NEW: Generate hourly usage for today (2-hour intervals)
function generateHourlyUsage(): HourlyUsage[] {
  const data: HourlyUsage[] = [];
  const now = new Date();
  const currentHour = now.getHours();

  for (let hour = 0; hour < 24; hour += 2) {
    if (hour > currentHour) break;

    const interval = `${hour.toString().padStart(2, "0")}:00-${(hour + 2).toString().padStart(2, "0")}:00`;

    // Consumption varies by time of day
    let baseKwh = 80;
    if (hour >= 9 && hour < 18)
      baseKwh = 150; // Work hours
    else if (hour >= 18 && hour < 22)
      baseKwh = 120; // Evening
    else baseKwh = 60; // Night

    const kWh = Math.round(baseKwh + Math.random() * 40 - 20);
    const savingsRs = Math.round(kWh * 2.7 * (0.3 + Math.random() * 0.2)); // Savings based on OA

    data.push({ interval, kWh, savingsRs });
  }

  return data;
}

// NEW: Generate daily usage with savings for current month
function generateDailyUsageWithSavings(): DailyUsageWithSavings[] {
  const data: DailyUsageWithSavings[] = [];
  const today = new Date();
  const currentDay = today.getDate();
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  for (let day = 1; day <= currentDay; day++) {
    const date = new Date(today.getFullYear(), today.getMonth(), day);
    const dayOfWeek = date.getDay();

    const baseKwh = dayOfWeek === 0 || dayOfWeek === 6 ? 800 : 1200;
    const kWh = Math.round(baseKwh + Math.random() * 300 - 150);
    const savingsRs = Math.round(kWh * 0.35 * 2.7); // ~35% OA at Rs 2.7/kWh savings

    data.push({
      date: date.toISOString().split("T")[0],
      dayLabel: `${day} ${dayNames[dayOfWeek]}`,
      kWh,
      savingsRs,
    });
  }

  return data;
}

// NEW: Generate monthly usage with savings for current year
function generateMonthlyUsageWithSavings(): MonthlyUsageWithSavings[] {
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const today = new Date();
  const currentMonth = today.getMonth();

  return monthNames.slice(0, currentMonth + 1).map((month, index) => {
    const daysInMonth = new Date(today.getFullYear(), index + 1, 0).getDate();
    const baseDaily = 1000 + Math.random() * 200;
    const kWh = Math.round(baseDaily * daysInMonth);
    const savingsRs = Math.round(kWh * 0.38 * 2.7);

    return { month, kWh, savingsRs };
  });
}

// NEW: Generate peak patterns for Day/Week/Month views
function generatePeakPatternDay(): PeakPatternData[] {
  const hours = [
    "00:00",
    "02:00",
    "04:00",
    "06:00",
    "08:00",
    "10:00",
    "12:00",
    "14:00",
    "16:00",
    "18:00",
    "20:00",
    "22:00",
  ];
  const data = hours.map((hour) => {
    let baseKwh = 50;
    const hourNum = parseInt(hour);
    if (hourNum >= 9 && hourNum < 18) baseKwh = 120;
    else if (hourNum >= 18 && hourNum < 22) baseKwh = 100;

    return {
      label: hour,
      kWh: Math.round(baseKwh + Math.random() * 40),
      isMax: false,
    };
  });

  // Mark max
  const maxIdx = data.reduce(
    (maxI, d, i, arr) => (d.kWh > arr[maxI].kWh ? i : maxI),
    0,
  );
  data[maxIdx].isMax = true;

  return data;
}

function generatePeakPatternWeek(): PeakPatternData[] {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const data = days.map((day, index) => {
    const isWeekend = index >= 5;
    const baseKwh = isWeekend ? 700 : 1100;

    return {
      label: day,
      kWh: Math.round(baseKwh + Math.random() * 200),
      isMax: false,
    };
  });

  const maxIdx = data.reduce(
    (maxI, d, i, arr) => (d.kWh > arr[maxI].kWh ? i : maxI),
    0,
  );
  data[maxIdx].isMax = true;

  return data;
}

function generatePeakPatternMonth(): PeakPatternData[] {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const today = new Date();
  const currentMonth = today.getMonth();

  const data = months.slice(0, currentMonth + 1).map((month) => {
    const baseKwh = 28000 + Math.random() * 8000;

    return {
      label: month,
      kWh: Math.round(baseKwh),
      isMax: false,
    };
  });

  if (data.length > 0) {
    const maxIdx = data.reduce(
      (maxI, d, i, arr) => (d.kWh > arr[maxI].kWh ? i : maxI),
      0,
    );
    data[maxIdx].isMax = true;
  }

  return data;
}

// NEW: Generate enhanced KPIs
function generateEnhancedKPIs(
  hourlyUsage: HourlyUsage[],
  dailyUsage: DailyUsageWithSavings[],
  monthlyUsage: MonthlyUsageWithSavings[],
): EnhancedConsumerKPIs {
  const usageTillNow = hourlyUsage.reduce((sum, h) => sum + h.kWh, 0);
  const savingsTillNow = hourlyUsage.reduce((sum, h) => sum + h.savingsRs, 0);

  const dailyConsumptionMTD = dailyUsage.reduce((sum, d) => sum + d.kWh, 0);
  const savingsThisMonth = dailyUsage.reduce((sum, d) => sum + d.savingsRs, 0);

  const monthlyConsumptionYTD = monthlyUsage.reduce((sum, m) => sum + m.kWh, 0);
  const savingsThisYear = monthlyUsage.reduce((sum, m) => sum + m.savingsRs, 0);

  // Estimated bills
  const avgRate = 6.5;
  const proltRate = 4.2;
  const today = new Date();
  const daysInMonth = new Date(
    today.getFullYear(),
    today.getMonth() + 1,
    0,
  ).getDate();
  const remainingDays = daysInMonth - today.getDate();
  const avgDailyUsage = dailyConsumptionMTD / today.getDate();
  const projectedTotal = dailyConsumptionMTD + avgDailyUsage * remainingDays;

  const usualBill = Math.round(projectedTotal * avgRate);
  const estimatedBill = Math.round(projectedTotal * proltRate);
  const estimatedSavings = usualBill - estimatedBill;
  const savingsPercent = Math.round((estimatedSavings / usualBill) * 100);

  return {
    usageTillNow,
    savingsTillNow,
    dailyConsumptionMTD,
    savingsThisMonth,
    monthlyConsumptionYTD,
    savingsThisYear,
    estimatedBill,
    usualBill,
    estimatedSavings,
    savingsPercent,
  };
}

// NEW: Generate enhanced forecast with savings
function generateEnhancedForecast(): EnhancedForecast[] {
  const baseData = generateForecast();

  return baseData.map((d) => ({
    ...d,
    expectedSavings: Math.round(d.forecastedKwh * 0.4 * 2.7), // 40% OA at Rs 2.7 savings
  }));
}

// NEW: Generate 15-minute slots with OA execution data
function generateFifteenMinuteSlots(): FifteenMinuteSlotData[] {
  const slots: FifteenMinuteSlotData[] = [];
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      // Only generate slots up to current time
      if (
        hour > currentHour ||
        (hour === currentHour && minute > currentMinute)
      ) {
        break;
      }

      const slotStart = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
      const endMinute = (minute + 15) % 60;
      const endHour = minute === 45 ? hour + 1 : hour;
      const slotEnd = `${endHour.toString().padStart(2, "0")}:${endMinute.toString().padStart(2, "0")}`;

      // Consumption varies by time of day
      let baseKwh = 15;
      if (hour >= 9 && hour < 18)
        baseKwh = 35; // Work hours
      else if (hour >= 18 && hour < 22)
        baseKwh = 28; // Evening
      else baseKwh = 12; // Night

      const usageKwh = baseKwh + Math.random() * 15 - 5;

      // Generate bid data
      const bidPlacedKwh = usageKwh * (0.3 + Math.random() * 0.4);
      const bidPricePerMwh = 2800 + Math.random() * 800;

      // Determine execution status with weighted probability
      const rand = Math.random();
      let executionStatus: OAExecutionStatus;
      let confirmedLoadKwh: number;

      if (rand < 0.65) {
        executionStatus = "confirmed";
        confirmedLoadKwh = bidPlacedKwh;
      } else if (rand < 0.8) {
        executionStatus = "partial";
        confirmedLoadKwh = bidPlacedKwh * (0.4 + Math.random() * 0.3);
      } else if (rand < 0.9) {
        executionStatus = "failed";
        confirmedLoadKwh = 0;
      } else {
        executionStatus = "discom-only";
        confirmedLoadKwh = 0;
      }

      // Calculate savings (difference between DISCOM rate and OA rate)
      const discomRate = 6500; // Rs/MWh
      const savingsRs =
        (confirmedLoadKwh * (discomRate - bidPricePerMwh)) / 1000;

      slots.push({
        slotStart,
        slotEnd,
        slotLabel: `${slotStart}-${slotEnd}`,
        usageKwh: Math.round(usageKwh * 100) / 100,
        bidPlacedKwh: Math.round(bidPlacedKwh * 100) / 100,
        bidPricePerMwh: Math.round(bidPricePerMwh),
        confirmedLoadKwh: Math.round(confirmedLoadKwh * 100) / 100,
        executionStatus,
        savingsRs: Math.round(savingsRs * 100) / 100,
      });
    }

    if (hour > currentHour) break;
  }

  return slots;
}

// NEW: Generate today's usage detail
function generateTodayUsageDetail(): TodayUsageDetail {
  const slots = generateFifteenMinuteSlots();

  const totalUsageTillNow = slots.reduce((sum, s) => sum + s.usageKwh, 0);
  const totalSavingsTillNow = slots.reduce((sum, s) => sum + s.savingsRs, 0);
  const confirmedOAEnergy = slots.reduce(
    (sum, s) => sum + s.confirmedLoadKwh,
    0,
  );
  const totalBidAmountToday = slots.reduce(
    (sum, s) => sum + (s.bidPlacedKwh * s.bidPricePerMwh) / 1000,
    0,
  );

  // Find highest usage slot
  const highestUsageSlot = slots.reduce(
    (max, s) =>
      s.usageKwh > max.kWh ? { time: s.slotLabel, kWh: s.usageKwh } : max,
    { time: "", kWh: 0 },
  );

  // Find lowest price slot
  const lowestPriceSlot = slots.reduce(
    (min, s) =>
      s.bidPricePerMwh < min.price
        ? { time: s.slotLabel, price: s.bidPricePerMwh }
        : min,
    { time: "", price: Infinity },
  );

  return {
    totalUsageTillNow: Math.round(totalUsageTillNow),
    totalSavingsTillNow: Math.round(totalSavingsTillNow),
    confirmedOAEnergy: Math.round(confirmedOAEnergy),
    totalBidAmountToday: Math.round(totalBidAmountToday),
    slots,
    highestUsageSlot,
    lowestPriceSlot,
  };
}

// NEW: Generate monthly usage detail (MTD) with daily breakdown
function generateMonthlyUsageDetail(): MonthlyUsageDetail {
  const today = new Date();
  const currentDay = today.getDate();
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const days: DailyDetailData[] = [];

  for (let day = 1; day <= currentDay; day++) {
    const date = new Date(today.getFullYear(), today.getMonth(), day);
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Base consumption varies by day
    const baseKwh = isWeekend ? 800 : 1200;
    const usageKwh = Math.round(baseKwh + Math.random() * 400 - 200);

    // OA bid data
    const oaSharePercent = Math.round(30 + Math.random() * 40); // 30-70%
    const bidPlacedKwh = Math.round(usageKwh * (oaSharePercent / 100) * 1.2);
    const avgBidPricePerMwh = Math.round(2800 + Math.random() * 800);

    // Determine execution status based on OA share
    let executionStatus: OAExecutionStatus;
    let confirmedLoadKwh: number;

    const rand = Math.random();
    if (rand < 0.1) {
      executionStatus = "failed";
      confirmedLoadKwh = 0;
    } else if (oaSharePercent >= 50) {
      executionStatus = "confirmed";
      confirmedLoadKwh = Math.round(
        bidPlacedKwh * (0.85 + Math.random() * 0.15),
      );
    } else if (oaSharePercent >= 30) {
      executionStatus = "partial";
      confirmedLoadKwh = Math.round(bidPlacedKwh * (0.5 + Math.random() * 0.3));
    } else {
      executionStatus = "discom-only";
      confirmedLoadKwh = 0;
    }

    // Calculate savings
    const discomRate = 6500;
    const savingsRs = Math.round(
      (confirmedLoadKwh * (discomRate - avgBidPricePerMwh)) / 1000,
    );

    days.push({
      date: date.toISOString().split("T")[0],
      dayLabel: `${day} ${dayNames[dayOfWeek]}`,
      usageKwh,
      bidPlacedKwh,
      avgBidPricePerMwh,
      confirmedLoadKwh,
      executionStatus,
      savingsRs: Math.max(0, savingsRs),
      oaSharePercent,
    });
  }

  // Calculate aggregates
  const totalMonthlyUsage = days.reduce((sum, d) => sum + d.usageKwh, 0);
  const savingsThisMonth = days.reduce((sum, d) => sum + d.savingsRs, 0);
  const confirmedOAEnergy = days.reduce(
    (sum, d) => sum + d.confirmedLoadKwh,
    0,
  );
  const totalBidAmountMonth = days.reduce(
    (sum, d) => sum + (d.bidPlacedKwh * d.avgBidPricePerMwh) / 1000,
    0,
  );

  // Find peak consumption day
  const peakDay = days.reduce(
    (max, d) => (d.usageKwh > max.usageKwh ? d : max),
    days[0],
  );
  const peakConsumptionDay = { date: peakDay.dayLabel, kWh: peakDay.usageKwh };

  // Find best savings day
  const bestDay = days.reduce(
    (max, d) => (d.savingsRs > max.savingsRs ? d : max),
    days[0],
  );
  const bestSavingsDay = {
    date: bestDay.dayLabel,
    savingsRs: bestDay.savingsRs,
  };

  return {
    totalMonthlyUsage,
    savingsThisMonth,
    confirmedOAEnergy,
    totalBidAmountMonth: Math.round(totalBidAmountMonth),
    days,
    peakConsumptionDay,
    bestSavingsDay,
  };
}

// NEW: Generate yearly usage detail (YTD) with monthly breakdown
function generateYearlyUsageDetail(): YearlyUsageDetail {
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const today = new Date();
  const currentMonth = today.getMonth();

  const months: MonthlyDetailData[] = [];

  for (let monthIndex = 0; monthIndex <= currentMonth; monthIndex++) {
    const daysInMonth = new Date(
      today.getFullYear(),
      monthIndex + 1,
      0,
    ).getDate();

    // Base consumption varies by month (seasonal patterns)
    const summerMonths = [3, 4, 5, 6]; // Apr-Jul higher consumption
    const isSummer = summerMonths.includes(monthIndex);
    const baseDaily = isSummer ? 1300 : 1000;
    const usageKwh = Math.round(
      baseDaily * daysInMonth + Math.random() * 5000 - 2500,
    );

    // OA share varies by month
    const oaSharePercent = Math.round(35 + Math.random() * 35); // 35-70%
    const bidPlacedKwh = Math.round(usageKwh * (oaSharePercent / 100) * 1.15);
    const avgBidPricePerMwh = Math.round(2900 + Math.random() * 600);

    // Determine execution status
    let executionStatus: OAExecutionStatus;
    let confirmedLoadKwh: number;

    const rand = Math.random();
    if (rand < 0.08) {
      executionStatus = "failed";
      confirmedLoadKwh = Math.round(bidPlacedKwh * 0.2);
    } else if (oaSharePercent >= 50) {
      executionStatus = "confirmed";
      confirmedLoadKwh = Math.round(
        bidPlacedKwh * (0.85 + Math.random() * 0.15),
      );
    } else if (oaSharePercent >= 35) {
      executionStatus = "partial";
      confirmedLoadKwh = Math.round(
        bidPlacedKwh * (0.55 + Math.random() * 0.25),
      );
    } else {
      executionStatus = "discom-only";
      confirmedLoadKwh = Math.round(bidPlacedKwh * 0.3);
    }

    // Calculate savings
    const discomRate = 6500;
    const savingsRs = Math.round(
      (confirmedLoadKwh * (discomRate - avgBidPricePerMwh)) / 1000,
    );

    months.push({
      month: monthNames[monthIndex],
      monthIndex,
      usageKwh,
      bidPlacedKwh,
      avgBidPricePerMwh,
      confirmedLoadKwh,
      executionStatus,
      savingsRs: Math.max(0, savingsRs),
      oaSharePercent,
    });
  }

  // Calculate aggregates
  const totalYTDUsage = months.reduce((sum, m) => sum + m.usageKwh, 0);
  const savingsThisYear = months.reduce((sum, m) => sum + m.savingsRs, 0);
  const confirmedOAEnergy = months.reduce(
    (sum, m) => sum + m.confirmedLoadKwh,
    0,
  );
  const totalBidAmountYear = months.reduce(
    (sum, m) => sum + (m.bidPlacedKwh * m.avgBidPricePerMwh) / 1000,
    0,
  );

  // Find peak consumption month
  const peakMonth = months.reduce(
    (max, m) => (m.usageKwh > max.usageKwh ? m : max),
    months[0],
  );
  const peakConsumptionMonth = {
    month: peakMonth.month,
    kWh: peakMonth.usageKwh,
  };

  // Find best savings month
  const bestMonth = months.reduce(
    (max, m) => (m.savingsRs > max.savingsRs ? m : max),
    months[0],
  );
  const bestSavingsMonth = {
    month: bestMonth.month,
    savingsRs: bestMonth.savingsRs,
  };

  return {
    totalYTDUsage,
    savingsThisYear,
    confirmedOAEnergy,
    totalBidAmountYear: Math.round(totalBidAmountYear),
    months,
    peakConsumptionMonth,
    bestSavingsMonth,
  };
}

// NEW: Generate 15-minute slot timeline data for the hero chart
function generateSlotTimelineData(): SlotTimelineData[] {
  const slots: SlotTimelineData[] = [];
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const discomRatePerKwh = 6.5; // Rs/kWh

  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const slotStart = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
      const endMinute = (minute + 15) % 60;
      const endHour = minute === 45 ? hour + 1 : hour;
      const slotEnd = `${endHour.toString().padStart(2, "0")}:${endMinute.toString().padStart(2, "0")}`;

      // Check if this is a future slot
      const isFutureSlot =
        hour > currentHour || (hour === currentHour && minute > currentMinute);

      // Required load varies by time of day (actual usage - orange line)
      let baseKwh = 15;
      if (hour >= 9 && hour < 18)
        baseKwh = 35; // Work hours
      else if (hour >= 18 && hour < 22)
        baseKwh = 28; // Evening
      else baseKwh = 12; // Night

      // For future slots, required load is 0 (no actual usage yet)
      // But bid placed and confirmed load are shown for the full day (already planned/bought)
      const requiredLoadKwh = isFutureSlot
        ? 0
        : baseKwh + Math.random() * 15 - 5;

      // Calculate the expected load for bid planning (same pattern as actual)
      const expectedLoadKwh = baseKwh + Math.random() * 15 - 5;

      // Bid placed (yellow line) - planned for the entire day
      const bidPlacedKwh = expectedLoadKwh * (0.5 + Math.random() * 0.3);
      const bidPricePerMwh = 2800 + Math.random() * 800;

      // Determine execution and confirmed load (teal line)
      // For future slots, show planned/confirmed OA delivery (already bought by trader)
      let executionStatus: OAExecutionStatus;
      let confirmedLoadKwh: number;

      const rand = Math.random();
      if (isFutureSlot) {
        // Future slots show planned OA delivery (already confirmed by trader)
        if (rand < 0.75) {
          executionStatus = "confirmed";
          confirmedLoadKwh = bidPlacedKwh;
        } else if (rand < 0.9) {
          executionStatus = "partial";
          confirmedLoadKwh = bidPlacedKwh * (0.6 + Math.random() * 0.3);
        } else {
          executionStatus = "confirmed";
          confirmedLoadKwh = bidPlacedKwh * 0.95;
        }
      } else {
        // Past/current slots show actual execution results
        if (rand < 0.65) {
          executionStatus = "confirmed";
          confirmedLoadKwh = bidPlacedKwh;
        } else if (rand < 0.8) {
          executionStatus = "partial";
          confirmedLoadKwh = bidPlacedKwh * (0.4 + Math.random() * 0.3);
        } else if (rand < 0.9) {
          executionStatus = "failed";
          confirmedLoadKwh = 0;
        } else {
          executionStatus = "discom-only";
          confirmedLoadKwh = 0;
        }
      }

      // Calculate costs
      const discomLoad = requiredLoadKwh - confirmedLoadKwh;
      const costWithoutProlt = requiredLoadKwh * discomRatePerKwh;
      const oaCost = confirmedLoadKwh * (bidPricePerMwh / 1000);
      const discomCost = discomLoad * discomRatePerKwh;
      const costWithProlt = oaCost + discomCost;
      const savingsRs = costWithoutProlt - costWithProlt;

      slots.push({
        slotStart,
        slotEnd,
        slotLabel: `${slotStart}-${slotEnd}`,
        requiredLoadKwh: Math.round(requiredLoadKwh * 100) / 100,
        bidPlacedKwh: Math.round(bidPlacedKwh * 100) / 100,
        confirmedLoadKwh: Math.round(confirmedLoadKwh * 100) / 100,
        executionStatus,
        bidPricePerMwh: Math.round(bidPricePerMwh),
        costWithoutProlt: Math.round(costWithoutProlt * 100) / 100,
        costWithProlt: Math.round(costWithProlt * 100) / 100,
        savingsRs: Math.round(Math.max(0, savingsRs) * 100) / 100,
      });
    }
  }

  return slots;
}

// NEW: Generate daily timeline data for month view
function generateDayTimelineData(): DayTimelineData[] {
  const data: DayTimelineData[] = [];
  const today = new Date();
  const currentDay = today.getDate();
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  for (let day = 1; day <= currentDay; day++) {
    const date = new Date(today.getFullYear(), today.getMonth(), day);
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    const baseKwh = isWeekend ? 800 : 1200;
    const totalLoadKwh = Math.round(baseKwh + Math.random() * 400 - 200);
    const totalBidKwh = Math.round(totalLoadKwh * (0.4 + Math.random() * 0.3));
    const totalConfirmedKwh = Math.round(
      totalBidKwh * (0.7 + Math.random() * 0.25),
    );
    const totalSavingsRs = Math.round(totalConfirmedKwh * 2.7);

    data.push({
      date: date.toISOString().split("T")[0],
      dayLabel: `${day} ${dayNames[dayOfWeek]}`,
      totalLoadKwh,
      totalBidKwh,
      totalConfirmedKwh,
      totalSavingsRs,
    });
  }

  return data;
}

// NEW: Generate monthly timeline data for year view
function generateMonthTimelineData(): MonthTimelineData[] {
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const today = new Date();
  const currentMonth = today.getMonth();

  return monthNames.slice(0, currentMonth + 1).map((month, index) => {
    const daysInMonth = new Date(today.getFullYear(), index + 1, 0).getDate();
    const summerMonths = [3, 4, 5, 6];
    const isSummer = summerMonths.includes(index);
    const baseDaily = isSummer ? 1300 : 1000;

    const totalLoadKwh = Math.round(
      baseDaily * daysInMonth + Math.random() * 5000 - 2500,
    );
    const totalBidKwh = Math.round(
      totalLoadKwh * (0.45 + Math.random() * 0.25),
    );
    const totalConfirmedKwh = Math.round(
      totalBidKwh * (0.75 + Math.random() * 0.2),
    );
    const totalSavingsRs = Math.round(totalConfirmedKwh * 2.7);

    return {
      month,
      monthIndex: index,
      totalLoadKwh,
      totalBidKwh,
      totalConfirmedKwh,
      totalSavingsRs,
    };
  });
}

// NEW: Generate peak power data with duration
function generatePeakPowerData(
  slotData: SlotTimelineData[],
  dailyData: DayTimelineData[],
  monthlyData: MonthTimelineData[],
): {
  peakPowerToday: PeakPowerToday;
  peakPowerThisMonth: PeakPowerMonth;
  peakPowerThisYear: PeakPowerYear;
} {
  // Peak power today - find highest load and calculate duration
  const peakSlots = slotData.filter((s) => s.requiredLoadKwh > 0);
  const maxLoadToday = Math.max(...peakSlots.map((s) => s.requiredLoadKwh), 0);
  const peakThreshold = maxLoadToday * 0.85; // 85% of peak counts as "peak duration"

  // Find consecutive slots at peak level
  let peakStartSlot: SlotTimelineData | null = null;
  let peakEndSlot: SlotTimelineData | null = null;
  let peakSlotCount = 0;

  for (const slot of slotData) {
    if (slot.requiredLoadKwh >= peakThreshold) {
      if (!peakStartSlot) peakStartSlot = slot;
      peakEndSlot = slot;
      peakSlotCount++;
    }
  }

  const peakDurationMinutes = peakSlotCount * 15;
  const peakDurationFormatted =
    peakDurationMinutes >= 60
      ? `${Math.floor(peakDurationMinutes / 60)}h ${peakDurationMinutes % 60}m`
      : `${peakDurationMinutes} minutes`;

  // Peak power this month
  const peakDayData = dailyData.reduce(
    (max, d) => (d.totalLoadKwh > max.totalLoadKwh ? d : max),
    dailyData[0] || { totalLoadKwh: 0, dayLabel: "" },
  );
  const avgDailyHours = 6 + Math.random() * 4; // 6-10 hours of high load per day
  const totalPeakHoursMonth =
    Math.round(dailyData.length * avgDailyHours * 10) / 10;

  // Peak power this year
  const peakMonthData = monthlyData.reduce(
    (max, m) => (m.totalLoadKwh > max.totalLoadKwh ? m : max),
    monthlyData[0] || { totalLoadKwh: 0, month: "" },
  );
  const totalPeakHoursYear = Math.round(
    monthlyData.length * 30 * avgDailyHours,
  );

  return {
    peakPowerToday: {
      power: Math.round(maxLoadToday * 4 * 10) / 10, // Convert kWh to approximate kW (assuming 15-min slot)
      duration: peakDurationFormatted,
      startTime: peakStartSlot?.slotStart || "10:30",
      endTime: peakEndSlot?.slotEnd || "11:15",
    },
    peakPowerThisMonth: {
      power: Math.round((peakDayData.totalLoadKwh / 24) * 1.5 * 10) / 10, // Peak kW based on daily average
      totalHours: totalPeakHoursMonth,
      peakDate: peakDayData.dayLabel || "15th",
    },
    peakPowerThisYear: {
      power: Math.round((peakMonthData.totalLoadKwh / 30 / 24) * 1.6 * 10) / 10,
      totalHours: totalPeakHoursYear,
      peakMonth: peakMonthData.month || "November",
    },
  };
}

// NEW: Generate complete energy usage timeline
function generateEnergyUsageTimeline(): EnergyUsageTimeline {
  const slotData = generateSlotTimelineData();
  const dailyData = generateDayTimelineData();
  const monthlyData = generateMonthTimelineData();

  // Find peak slot today
  const peakSlot = slotData.reduce(
    (max, s) =>
      s.requiredLoadKwh > max.kWh
        ? { time: s.slotLabel, kWh: s.requiredLoadKwh }
        : max,
    { time: "", kWh: 0 },
  );

  // Find cheapest slot today
  const cheapestSlot = slotData.reduce(
    (min, s) =>
      s.bidPricePerMwh < min.price
        ? { time: s.slotLabel, price: s.bidPricePerMwh }
        : min,
    { time: "", price: Infinity },
  );

  // Find peak day this month
  const peakDay = dailyData.reduce(
    (max, d) =>
      d.totalLoadKwh > max.kWh
        ? { date: d.dayLabel, kWh: d.totalLoadKwh }
        : max,
    { date: "", kWh: 0 },
  );

  // Find peak month this year
  const peakMonth = monthlyData.reduce(
    (max, m) =>
      m.totalLoadKwh > max.kWh ? { month: m.month, kWh: m.totalLoadKwh } : max,
    { month: "", kWh: 0 },
  );

  // Calculate lifetime stats
  const totalLifetimeLoad = monthlyData.reduce(
    (sum, m) => sum + m.totalLoadKwh,
    0,
  );
  const totalLifetimeSavings = monthlyData.reduce(
    (sum, m) => sum + m.totalSavingsRs,
    0,
  );

  // Generate peak power data with duration
  const peakPowerData = generatePeakPowerData(slotData, dailyData, monthlyData);

  return {
    slotData,
    dailyData,
    monthlyData,
    lifetime: {
      totalLoadKwh: totalLifetimeLoad,
      totalSavingsRs: totalLifetimeSavings,
      monthsActive: monthlyData.length,
    },
    peakSlotToday: peakSlot,
    cheapestSlotToday:
      cheapestSlot.price === Infinity
        ? { time: "03:00-03:15", price: 2800 }
        : cheapestSlot,
    peakDayThisMonth: peakDay,
    peakMonthThisYear: peakMonth,
    peakPowerToday: peakPowerData.peakPowerToday,
    peakPowerThisMonth: peakPowerData.peakPowerThisMonth,
    peakPowerThisYear: peakPowerData.peakPowerThisYear,
  };
}

// NEW: Generate savings achieved data - cumulative till date
function generateSavingsAchievedData(
  dailyUsage: DailyUsageWithSavings[],
): SavingsAchievedData {
  const today = new Date();
  const dayOfMonth = today.getDate();
  const daysInMonth = new Date(
    today.getFullYear(),
    today.getMonth() + 1,
    0,
  ).getDate();

  // Generate daily savings for the month (simulate gradual increase)
  const avgDailySavings = 4500; // Average daily savings in Rs
  const monthlyBreakdown: { day: number; cumulative: number }[] = [];
  let cumulative = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    // Weekends have less savings, weekdays have more
    const dayOfWeek = new Date(
      today.getFullYear(),
      today.getMonth(),
      day,
    ).getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const dailySavings = isWeekend
      ? Math.round(avgDailySavings * 0.7 + Math.random() * 1000)
      : Math.round(avgDailySavings + Math.random() * 2000 - 500);

    cumulative += dailySavings;
    monthlyBreakdown.push({ day, cumulative });
  }

  // Calculate savings till today (actual data up to current day)
  const savingsTillToday =
    monthlyBreakdown.find((d) => d.day === dayOfMonth)?.cumulative || 0;
  const savingsThisMonth =
    monthlyBreakdown[monthlyBreakdown.length - 1]?.cumulative || 0;

  // Year-to-date savings (simulated - assume avg monthly savings * months passed)
  const monthsPassed = today.getMonth() + 1;
  const avgMonthlySavings = savingsThisMonth;
  const savingsThisYear = Math.round(
    avgMonthlySavings * (monthsPassed - 1) + savingsTillToday,
  );

  // Lifetime savings (assume started ~18 months ago)
  const monthsActive = 18;
  const lifetimeSavings = Math.round(
    avgMonthlySavings * (monthsActive - 1) + savingsTillToday,
  );

  // Calculate comparison values
  const totalUsage = dailyUsage.reduce((sum, d) => sum + d.kWh, 0);
  const avgDiscomRate = 6.5;
  const withoutProlt = Math.round(totalUsage * avgDiscomRate);
  const withProlt = withoutProlt - savingsTillToday;
  const percentLower =
    withoutProlt > 0 ? Math.round((savingsTillToday / withoutProlt) * 100) : 0;

  return {
    savedAmount: savingsTillToday,
    percentLower,
    withoutProlt,
    withProlt,
    savingsTillToday,
    savingsThisMonth,
    savingsThisYear,
    lifetimeSavings,
    dayOfMonth,
    daysInMonth,
    monthlyBreakdown,
  };
}

// NEW: Generate future savings data
function generateFutureSavingsData(): FutureSavingsData {
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const today = new Date();

  const dailyForecast = [];
  let totalPotential = 0;

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    const baseSavings = isWeekend ? 3500 : 5500;
    const savingsRs = Math.round(baseSavings + Math.random() * 2000 - 1000);
    totalPotential += savingsRs;

    dailyForecast.push({
      day: i === 0 ? "Today" : i === 1 ? "Tomorrow" : dayNames[dayOfWeek],
      savingsRs,
    });
  }

  return {
    potentialSavings: totalPotential,
    percentReduction: Math.round(25 + Math.random() * 15),
    dailyForecast,
  };
}

// NEW: Generate estimated bill data
function generateEstimatedBillData(
  enhancedKpis: EnhancedConsumerKPIs,
): EstimatedBillData {
  return {
    estimatedBill: enhancedKpis.estimatedBill,
    usualBill: enhancedKpis.usualBill,
    percentLower: enhancedKpis.savingsPercent,
    estimatedSavings: enhancedKpis.estimatedSavings,
  };
}

// NEW: Generate enhanced dashboard data
function generateEnhancedData(): EnhancedConsumerDashboardData {
  const hourlyUsage = generateHourlyUsage();
  const dailyUsageWithSavings = generateDailyUsageWithSavings();
  const monthlyUsageWithSavings = generateMonthlyUsageWithSavings();
  const savingsPotential = generateSavingsPotential();
  const marketPriceSlots = generateMarketPriceSlots();
  const todayUsageDetail = generateTodayUsageDetail();
  const monthlyUsageDetail = generateMonthlyUsageDetail();
  const yearlyUsageDetail = generateYearlyUsageDetail();

  return {
    enhancedKpis: generateEnhancedKPIs(
      hourlyUsage,
      dailyUsageWithSavings,
      monthlyUsageWithSavings,
    ),
    hourlyUsage,
    dailyUsageWithSavings,
    monthlyUsageWithSavings,
    peakPatternDay: generatePeakPatternDay(),
    peakPatternWeek: generatePeakPatternWeek(),
    peakPatternMonth: generatePeakPatternMonth(),
    enhancedForecast: generateEnhancedForecast(),
    savingsPotential,
    totalPotentialSavings7Days: savingsPotential.reduce(
      (sum, s) => sum + s.savingsRs,
      0,
    ),
    marketPriceSlots,
    totalMarketOpportunity7Days: marketPriceSlots.reduce(
      (sum, s) => sum + s.opportunityAmount,
      0,
    ),
    todayUsageDetail,
    monthlyUsageDetail,
    yearlyUsageDetail,
  };
}

// Main function to generate all dashboard data
export function generateConsumerDashboardData(): ConsumerDashboardData {
  const dailyConsumption = generateDailyConsumption();
  const enhanced = generateEnhancedData();
  const dailyUsageWithSavings = generateDailyUsageWithSavings();

  return {
    kpis: generateKPIs(dailyConsumption),
    dailyConsumption,
    deliveryStatus: generateDeliveryStatus(),
    peakConsumption: generatePeakConsumption(),
    forecast: generateForecast(),
    recommendations: generateRecommendations(),
    savingsPotential: generateSavingsPotential(),
    enhanced,
    energyTimeline: generateEnergyUsageTimeline(),
    savingsAchieved: generateSavingsAchievedData(dailyUsageWithSavings),
    futureSavings: generateFutureSavingsData(),
    estimatedBillData: generateEstimatedBillData(enhanced.enhancedKpis),
  };
}
