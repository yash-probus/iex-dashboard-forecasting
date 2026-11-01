/**
 * API Endpoints Configuration
 *
 * Centralized location for all API endpoint URLs.
 * Each endpoint can specify which service it belongs to.
 * This makes it easy to manage endpoints across multiple microservices.
 */

// Service identifiers
export type ServiceType = "PRIMARY" | "SERVICE_2" | "SERVICE_3";

// Endpoint definition with optional service specification
export interface Endpoint {
  path: string;
  service?: ServiceType; // Defaults to 'PRIMARY' if not specified
}

export const API_ENDPOINTS = {
  // User Registration & Authentication (Primary Service - Port 7070)
  AUTH: {
    REGISTRATION_REQUEST: {
      path: "/api/user-registration/registration-request",
      service: "PRIMARY" as ServiceType,
    },
    SEND_OTP: {
      path: "/api/user-registration/send-otp",
      service: "PRIMARY" as ServiceType,
    },
    VERIFY_REGISTRATION: {
      path: "/api/user-registration/verify-registration-request",
      service: "PRIMARY" as ServiceType,
    },
    LOGIN: {
      path: "/api/auth/login",
      service: "PRIMARY" as ServiceType,
    },
    LOGOUT: {
      path: "/api/auth/logout",
      service: "PRIMARY" as ServiceType,
    },
    REFRESH_TOKEN: {
      path: "/api/auth/refresh",
      service: "PRIMARY" as ServiceType,
    },
    USER_PROFILE: {
      path: "/api/auth/me",
      service: "PRIMARY" as ServiceType,
    },
  },

  // Captcha endpoints (Primary Service - Port 7070)
  CAPTCHA: {
    LOGIN: {
      path: "/api/captcha/login",
      service: "PRIMARY" as ServiceType,
    },
    REGISTRATION: {
      path: "/api/captcha/registration",
      service: "PRIMARY" as ServiceType,
    },
  },

  PASSWORD: {
    RESET_REQUEST: {
      path: "/api/user/reset-password-request",
      service: "PRIMARY" as ServiceType,
    },
    RESET_OTP_SENT: {
      path: "/api/user/send-reset-password-otp",
      service: "PRIMARY" as ServiceType,
    },
    RESET_PASSWORD: {
      path: "/api/user/reset-password",
      service: "PRIMARY" as ServiceType,
    },
  },

  // Add more endpoint categories as needed
  // Example for a different service on port 7071:
  // ANALYTICS: {
  //   GET_DASHBOARD: {
  //     path: '/api/analytics/dashboard',
  //     service: 'SERVICE_2' as ServiceType,
  //   },
  //   GET_REPORTS: {
  //     path: '/api/analytics/reports',
  //     service: 'SERVICE_2' as ServiceType,
  //   },
  // },

  // Example for service on port 7072:
  // NOTIFICATIONS: {
  //   GET_ALL: {
  //     path: '/api/notifications',
  //     service: 'SERVICE_3' as ServiceType,
  //   },
  //   MARK_READ: (id: string) => ({
  //     path: `/api/notifications/${id}/read`,
  //     service: 'SERVICE_3' as ServiceType,
  //   }),
  // },
  SAVING_CALCULATOR: {
    SAVE_TOD_CONSUMPTION: {
      path: "/api/smart-savings-calculator/save-tod-consumption-details",
      service: "PRIMARY" as ServiceType,
    },
    LANDING_GUEST_SAVE_ESTIMATOR: {
      path: "/api/guest-estimator/generate-estimate",
      service: "PRIMARY" as ServiceType,
    },
    SAVE_CONSUMER_AND_TOD_CONSUMPTION: {
      path: "/api/smart-savings-calculator/save-consumer-and-tod-consumption-details",
      service: "PRIMARY" as ServiceType,
    },
    USER_ALL_RUN_ID: {
      path: "/api/smart-savings-calculator/user-run",
      service: "PRIMARY" as ServiceType,
    },
    COMPLETE_OVERVIEW_REPORT_FULL: {
      path: "/api/bill-overview/complete-overview",
      service: "PRIMARY" as ServiceType,
    },
    COMPLETE_CALC_DASH_OVERVIEW_REPORT_FULL: {
      path: "/api/bill-overview/dashboard-overview",
      service: "PRIMARY" as ServiceType,
    },
    COMPLETE_MONTHLY_REPORT_FULL: {
      path: "/api/bill-overview/get-monthly-overview",
      service: "PRIMARY" as ServiceType,
    },
    CONSUMER_CONFIG_DATA_INFO: {
      path: "/api/smart-savings-calculator/user-run-info",
      service: "PRIMARY" as ServiceType,
    },
    CONSUMER_TOD_CONSUMPTION_BY_RUN_ID: {
      path: "/api/smart-savings-calculator/user-tod-bill",
      service: "PRIMARY" as ServiceType,
    },
    GET_MONTH_DATA: {
      path: "/api/bill-overview/cards",
      service: "PRIMARY" as ServiceType,
    },
    UPLOAD_BILL_FOR_TOD_CALCULATION: {
      path: "/api/bill-overview/upload-discom-bill",
      service: "PRIMARY" as ServiceType,
    },
    UPLOAD_BILL_FOR_OA_CALCULATION: {
      path: "/api/bill-overview/upload-oa-bill",
      service: "PRIMARY" as ServiceType,
    },
    COST_VS_CONSIMPTION_DATA: {
      path: "/api/bill-overview/monthly-cost-vs-consumption",
      service: "PRIMARY" as ServiceType,
    },
  },

  // Profile Connection Details
  CONSUMER_CALCULATION_FOR_PROFILE: {
    GET_CONNECTION_DETAILS: {
      path: "/api/user-connection-details",
      service: "PRIMARY" as ServiceType,
    },
    POST_CONNECTION_DETAILS: {
      path: "/api/user-connection-details/add-update",
      service: "PRIMARY" as ServiceType,
    },
  },

  CONSUMER_HOME: {
    GET_CONSUMER_CONNECTION_DATA: {
      path: "/api/user-connection-details",
      service: "PRIMARY" as ServiceType,
    },
    GET_ENERGY_USAGE_TIMELINE_DATA: {
      path: "/api/meter-data/energy-usage-pattern",
      service: "PRIMARY" as ServiceType,
    },
    GET_LOAD_CONSUMED_TOD_WISE: {
      path: "/api/consumer-dashboard/load-consumed/todwise",
      service: "PRIMARY" as ServiceType,
    },
    GET_DEMAND_FORECAST_AND_OPTIMIZATION: {
      path: "/api/consumer-dashboard/forecast-data",
      service: "PRIMARY" as ServiceType,
    },
    GET_LOAD_CONSUMED_DATA: {
      path: "/api/consumer-dashboard/load-consumed",
      service: "PRIMARY" as ServiceType,
    },
    GET_USER_MODIFIED_FORECAST_DATA: {
      path: "/api/bid/latest",
      service: "PRIMARY" as ServiceType,
    },
  },

  BID_MANAGE_DATA: {
    GET_TOD_ID_LIST: {
      path: "/api/bid/tod-ids",
      service: "PRIMARY" as ServiceType,
    },
    GET_BID_HISTORY_LIST: {
      path: "/api/bid/history",
      service: "PRIMARY" as ServiceType,
    },
    GET_BID_DETAILS_BY_BID_ID: {
      path: "/api/bid/get-bids",
      service: "PRIMARY" as ServiceType,
    },
    POST_BID_FOR_SLOTS: {
      path: "/api/bid/submit",
      service: "PRIMARY" as ServiceType,
    },
    DOWNLOAD_BID_HISTORY_DATA_BY_BID_ID: {
      path: "/api/bid/download-bids",
      service: "PRIMARY" as ServiceType,
    },
  },

  LOOKUP_DATA: {
    GET_STATE_AND_DSICOM_LOOKUP: {
      path: "/api/lookup/indian-state-discom",
      service: "PRIMARY" as ServiceType,
    },
    GET_TOD_CONFIG: {
      path: "/api/lookup/tod-ids",
      service: "PRIMARY" as ServiceType,
    },
    GET_USER_RECENT_CALCULATION: {
      path: "/api/smart-savings-calculator/user-run-summary",
      service: "PRIMARY" as ServiceType,
    },
    GET_CONSUMER_CATEGORY_LOOKUP: {
      path: "/api/lookup/consumer-category",
      service: "PRIMARY" as ServiceType,
    },
    GET_VOLTAGE_LEVEL_LOOKUP: {
      path: "/api/lookup/voltage-level",
      service: "PRIMARY" as ServiceType,
    },
    GET_HV_CATEGORY_LOOKUP: {
      path: "/api/lookup/hv-category",
      service: "PRIMARY" as ServiceType,
    },
  },

  USER_ONBOARDING: {
    POST_USER_ONBOARDING: {
      path: "/api/user-onboarding-request",
      service: "PRIMARY" as ServiceType,
    },
    GET_USER_ONBOARDING: {
      path: "/api/user-onboarding-request",
      service: "PRIMARY" as ServiceType,
    },
  },

  MONTHLY_CALCULATOR_GRAPH_DATA: {
    GET_MONTHLY_DAY_WISE_DATA: {
      path: "/api/bill-overview/monthly-day-wise-spent",
      service: "PRIMARY" as ServiceType,
    },
    GET_MONTHLY_DAY_WISE_ACTUAL_CONSUMPTION: {
      path: "/api/bill-overview/monthly-day-wise-consumption-actual",
      service: "PRIMARY" as ServiceType,
    },
    GET_MONTHLY_DAY_WISE_PROLT_CONSUMPTION: {
      path: "/api/bill-overview/monthly-day-wise-consumption-prolt",
      service: "PRIMARY" as ServiceType,
    },
    GET_DAILY_BREAKDOWN_DATA: {
      path: "/api/bill-overview/monthly-day-wise-prolt-suggested-breakdown",
      service: "PRIMARY" as ServiceType,
    },
  },

  METER_INSIGHT_DATA: {
    GET_METER_DETAILS_DATA: {
      path: "/api/meter-data/meter-details",
      service: "PRIMARY" as ServiceType,
    },
    GET_METER_INSTANT_DATA: {
      path: "/api/meter-data/instant-latest",
      service: "PRIMARY" as ServiceType,
    },
    GET_POWER_CONSUMPTION_TREND_DATA: {
      path: "/api/meter-data/power-consumption-trend",
      service: "PRIMARY" as ServiceType,
    },
    GET_METER_PROFILE_DATA: {
      path: "/api/meter-data/meter-profile-data",
      service: "PRIMARY" as ServiceType,
    },
    // Graphs data
    GET_TOD_CONSUMPTION_DATA_KVAH: {
      path: "/api/meter-data/monthly-tod-power-consumption",
      service: "PRIMARY" as ServiceType,
    },
    GET_DAILY_CONSUMPTION_DATA_KVAH: {
      path: "/api/meter-data/daily-consumption-kvah",
      service: "PRIMARY" as ServiceType,
    },
    GET_BILLING_PEAK_DEMAND_DATA: {
      path: "/api/meter-data/billing-peak-demand-last-12-months",
      service: "PRIMARY" as ServiceType,
    },
    GET_BILLING_ENERGY_VAH_DATA: {
      path: "/api/meter-data/billing-energy-vah-last-12-months",
      service: "PRIMARY" as ServiceType,
    },
    GET_DAILY_PEAK_DEAMAND_DATA: {
      path: "/api/meter-data/daily-peak-demand",
      service: "PRIMARY" as ServiceType,
    },
  },

  // Bill Insights
  BILL_INSIGHTS: {
    GET_DISCOM_BILL_DETAILS: {
      path: "/api/bill-insight/discom-bill-details",
      service: "PRIMARY" as ServiceType,
    },
    GET_DISCOM_BILL_CONSUMPTION: {
      path: "/api/bill-insight/discom-bill-consumption-breakdown",
      service: "PRIMARY" as ServiceType,
    },
    GET_DISCOM_BILL_AMOUNT: {
      path: "/api/bill-insight/discom-bill-amount-breakdown",
      service: "PRIMARY" as ServiceType,
    },
    GET_DISCOM_BILL_TOD: {
      path: "/api/bill-insight/discom-bill-tod-calculation",
      service: "PRIMARY" as ServiceType,
    },
    GET_DISCOM_BILL_ACTIVE_CALENDAR: {
      path: "/api/bill-insight/discom-bill-available-periods",
      service: "PRIMARY" as ServiceType,
    },
  },
  // OA Insights
  OA_INSIGHTS: {
    GET_OA_MONTHLY_BILL_DETAILS: {
      // path: "http://192.168.2.63:7070/api/bill-insight/oa-bill-insight-monthly-detail",
      path: "/api/bill-insight/oa-bill-insight-monthly-detail",
      service: "PRIMARY" as ServiceType,
    },
    GET_OA_DAILY_BILL_DETAILS: {
      // path: "http://192.168.2.63:7070/api/bill-insight/oa-bill-insight-daily-detail",
      path: "/api/bill-insight/oa-bill-insight-daily-detail",
      service: "PRIMARY" as ServiceType,
    },
    GET_OA_AVAILABLE_CALENDARS: {
      // path: "http://192.168.2.63:7070/api/bill-insight/oa-bill-insight-available-periods",
      path: "/api/bill-insight/oa-bill-insight-available-periods",

      service: "PRIMARY" as ServiceType,
    },
  },
  // Reports
  REPORTS: {
    ENERGY_PROCUREMENT_DOWNLOAD: {
      path: "/api/report/tod-wise-energy-procurement/download",
      service: "PRIMARY" as ServiceType,
    },
    ENERGY_PROCUREMENT_DOWNLOAD_MONTHLY: {
      path: "/api/report/tod-wise-energy-procurement/monthly/download",
      service: "PRIMARY" as ServiceType,
    },
    GET_ENERGY_PROCUREMENT_AVAILABLE_DAYS: {
      path: "/api/report/tod-wise-energy-procurement/dates/availability",
      service: "PRIMARY" as ServiceType,
    },
    GET_ENERGY_PROCUREMENT_AVAILABLE_MONTH: {
      path: "/api/report/tod-wise-energy-procurement/monthly/availability",
      service: "PRIMARY" as ServiceType,
    },
    GET_DAILY_CONSUMPTION_AVAILABLE_MONTH: {
      path: "/api/report/tod-wise-monthly-consumption/availability",
      service: "PRIMARY" as ServiceType,
    },
    GET_DAILY_CONSUMPTION_AVAILABLE_DAYS: {
      path: "/api/report/daily-consumption-kvah/view",
      service: "PRIMARY" as ServiceType,
    },
    DAILY_CONSUMPTION_DOWNLOAD: {
      path: "/api/report/daily-consumption-kvah/download",
      service: "PRIMARY" as ServiceType,
    },
    DAILY_CONSUMPTION_DOWNLOAD_MONTHLY: {
      path: "/api/report/tod-wise-monthly-consumption/download",
      service: "PRIMARY" as ServiceType,
    },
    GET_SLOT_WISE_AVAILABLE_MONTH_LIST: {
      path: "/api/bid/obligation-report-details/availability",
      service: "PRIMARY" as ServiceType,
    },
    GET_SLOT_WISE_PROCUREMENT_REPORT_DATA: {
      path: "/api/bid/obligation-report-details",
      service: "PRIMARY" as ServiceType,
    },
    DOWNLOAD_SLOT_WISE_PROCUREMENT_REPORT_DATA: {
      path: "/api/bid/obligation-report-download",
      service: "PRIMARY" as ServiceType,
    },
    SLOT_WISE_BID_RESULT_DATA_DAOWNLOAD: {
      path: "/api/report/bid-results/daily/download",
      service: "PRIMARY" as ServiceType,
    },
  },
  DOWNLOAD_DATA: {
    LOAD_CONSUMED_DATA: {
      path: "/api/consumer-dashboard/load-consumed/download",
      service: "PRIMARY" as ServiceType,
    },
  },
  INVOICE_DETAILS: {
    GET_INVOICE_DATA_LIST_FOR_TRADE: {
      path: "/api/trade/invoices/consumer/list",
      service: "PRIMARY" as ServiceType,
    },
    DOWNLOAD_CONSUMER_INVOICE_STATEMENT: {
      path: "/api/trade/invoices/consumer/download",
      service: "PRIMARY" as ServiceType,
    },
  },
};

export default API_ENDPOINTS;
