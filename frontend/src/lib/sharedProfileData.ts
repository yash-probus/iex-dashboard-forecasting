// Shared profile data between ConsumerHome and ConsumerProfile for demo mode
// This ensures both pages show the same data

import { IndustryFormData, createEmptyIndustryFormData } from "./profileUtils";

export interface SharedProfileData {
  full_name: string;
  email: string;
  phone: string;
  gst_number: string;
  gst_verified: boolean;
  gst_legal_name: string;
  gst_principal_address: string;
  uses_open_access: boolean | null;
  oa_start_date: string;
  trader_company_name: string;
  trader_rm_name: string;
  trader_contact_phone: string;
  trader_contact_email: string;
  has_prolt_meter: boolean | null;
  prolt_meter_number: string;
  meter_ticket_submitted: boolean;
  profile_completion_percentage: number;
}

export interface SharedDemoData {
  profile: SharedProfileData;
  industries: IndustryFormData[];
  profileId: string;
  customerId: string;
}

// Default demo data for Uttar Pradesh - shared between pages
// This is partially complete to show profile completion in action
export const getSharedDemoData = (): SharedDemoData => {
  const profile: SharedProfileData = {
    full_name: "Rajesh Kumar",
    email: "rajesh.kumar@sharmasteel.in",
    phone: "9876543210",
    gst_number: "09AAAAA0000A1Z5",
    gst_verified: true,
    gst_legal_name: "Sharma Steel Industries Pvt Ltd",
    gst_principal_address: "Plot 45, Industrial Area, Lucknow",
    uses_open_access: true,
    oa_start_date: "2024-06-01",
    trader_company_name: "Tata Power Trading",
    trader_rm_name: "", // Missing - contributes to partial completion
    trader_contact_phone: "",
    trader_contact_email: "",
    has_prolt_meter: null, // Not yet decided - contributes to partial completion
    prolt_meter_number: "",
    meter_ticket_submitted: false,
    profile_completion_percentage: 65,
  };

  const industries: IndustryFormData[] = [
    {
      ...createEmptyIndustryFormData(),
      industry_name: "Sharma Steel Industries",
      address: "Plot 45, Industrial Area, Sector 62",
      address_line_2: "",
      city_town: "Lucknow",
      state: "UTTAR_PRADESH",
      district: "Lucknow",
      pin_code: "", // Missing - contributes to partial completion
      discom: "MVVNL (Uttar Pradesh)",
      voltage_level: "33 kV",
      tariff: "", // Missing - contributes to partial completion
      sanctioned_load: "2500 kVA",
      consumer_number: "1234567890",
      meter_number: "UP12345678",
      contact_name: "Rajesh Kumar",
      contact_phone: "9876543210",
      contact_email: "", // Missing - optional but adds points
      is_primary: true,
    },
  ];

  return {
    profile,
    industries,
    profileId: "demo",
    customerId: "PROLT-C-DEMO2024",
  };
};
