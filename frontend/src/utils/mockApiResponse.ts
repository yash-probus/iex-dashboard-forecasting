// @ts-nocheck
export const uploadDiscomBillResponse = {
  peakDemand: 382.5,
  totalDiscomBillAmount: 494471.0,
  todSummary: [
    {
      consumption: "16136",
      rate: "6.800",
      amount: "109724.80",
      tod_id: "TOD-1",
      tod_time: "05-11",
    },
    {
      consumption: "14504",
      rate: "6.800",
      amount: "98627.20",
      tod_id: "TOD-2",
      tod_time: "11-17",
    },
    {
      consumption: "9096",
      rate: "7.820",
      amount: "71130.72",
      tod_id: "TOD-3",
      tod_time: "17-23",
    },
    {
      consumption: "9956",
      rate: "5.780",
      amount: "57545.68",
      tod_id: "TOD-4",
      tod_time: "23-05",
    },
  ],
};


export function transformToPayload(apiResponse) {
  const {
    peakDemand,
    totalDiscomBillAmount,
    todSummary
  } = apiResponse;

  const currentDate = new Date();

  // Month & Year nikaalna
  const monthNames = [
    "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
    "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"
  ];

  const month = monthNames[currentDate.getMonth()];
  const year = currentDate.getFullYear();

  // TOD Consumption List
  const todConsumptionList = todSummary.map((item) => ({
    tod: item.tod_id,
    discomOaConsumption: Number(item.consumption),
    oaConsumption: null// agar alag hai to yahan change karna
  }));

  // Slot-wise data (time range ko dummy ISO date me convert kar rahe hain)
  const oaConsumptionSlotWise = todSummary.map((item) => {
    const [startHour, endHour] = item.tod_time.split("-");

    const startDate = new Date();
    startDate.setHours(Number(startHour), 0, 0);

    const endDate = new Date();
    endDate.setHours(Number(endHour), 0, 0);

    return {
      slotStartDate: startDate.toISOString(),
      slotEndDate: endDate.toISOString(),
      consumption: Number(item.consumption),
      cost: Number(item.amount),
      rate: Number(item.rate)
    };
  });

  return {
    state: "ANDHRA_PRADESH",
    discom: "DVVNL",
    consumerCategory: "INDUSTRIAL",
    voltageLevel: "KV_11",
    sanctionedLoad: 0.1, // isko dynamic bana sakte ho
    monthlyTodConsumptionList: [
      {
        month,
        year,
        peakDemand: Number(peakDemand),
        totalDiscomOaBill: Number(totalDiscomBillAmount),
        totalOaBill: Number(totalDiscomBillAmount), // agar alag hai to change karo
        todConsumptionList,
        oaConsumptionSlotWise
      }
    ],
    oaInfoType: "OA_SLOT"
  };
}