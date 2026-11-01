// Profile utility functions

export interface ConsumerProfile {
  id: string;
  user_id: string;
  customer_id: string;
  full_name: string;
  email: string;
  phone: string;
  has_parent_company: boolean;
  parent_company_name: string | null;
  gst_number: string | null;
  gst_verified: boolean;
  gst_legal_name: string | null;
  gst_principal_address: string | null;
  profile_completion_percentage: number;
  has_prolt_meter: boolean | null;
  prolt_meter_number: string | null;
  onboarding_completed: boolean;
  uses_open_access: boolean | null;
  oa_duration: string | null;
  oa_start_date: string | null;
  trader_company_name: string | null;
  trader_rm_name: string | null;
  trader_contact_name: string | null;
  trader_contact_phone: string | null;
  trader_contact_email: string | null;
  discom_meter_number: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConsumerIndustry {
  id: string;
  profile_id: string;
  industry_name: string;
  address: string;
  address_line_2: string | null;
  city_town: string | null;
  state: string;
  district: string | null;
  pin_code: string | null;
  division: string | null;
  sub_division: string | null;
  discom: string;
  voltage_level: string | null;
  tariff: string | null;
  sanctioned_load: string | null;
  consumer_number: string | null;
  meter_number: string | null;
  is_primary: boolean;
  // Factory Contact Details
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_alternate_phone: string | null;
  contact_whatsapp: string | null;
  // Billing Address
  billing_address_same: boolean;
  billing_address_line_1: string | null;
  billing_address_line_2: string | null;
  billing_city_town: string | null;
  billing_district: string | null;
  billing_state: string | null;
  billing_pin_code: string | null;
  created_at: string;
  updated_at: string;
}

export interface MeterRequestTicket {
  id: string;
  profile_id: string;
  ticket_number: string;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// State codes for Customer ID generation (GST State Codes)
export const STATE_CODES: Record<string, string> = {
  "Jammu and Kashmir": "01",
  "Himachal Pradesh": "02",
  Punjab: "03",
  Chandigarh: "04",
  Uttarakhand: "05",
  Haryana: "06",
  Delhi: "07",
  Rajasthan: "08",
  "Uttar Pradesh": "09",
  Bihar: "10",
  Sikkim: "11",
  "Arunachal Pradesh": "12",
  Nagaland: "13",
  Manipur: "14",
  Mizoram: "15",
  Tripura: "16",
  Meghalaya: "17",
  Assam: "18",
  "West Bengal": "19",
  Jharkhand: "20",
  Odisha: "21",
  Chhattisgarh: "22",
  "Madhya Pradesh": "23",
  Gujarat: "24",
  "Dadra and Nagar Haveli and Daman and Diu": "26",
  Maharashtra: "27",
  "Andhra Pradesh": "28",
  Karnataka: "29",
  Goa: "30",
  Lakshadweep: "31",
  Kerala: "32",
  "Tamil Nadu": "33",
  Puducherry: "34",
  "Andaman and Nicobar Islands": "35",
  Telangana: "36",
  Ladakh: "38",
};

// Generate unique customer ID in format: CUST-{StateCode}-{Year}-{5-digit sequence}
export const generateCustomerId = (state: string = "Uttar Pradesh"): string => {
  const stateCode = STATE_CODES[state] || "00";
  const year = new Date().getFullYear();
  const sequence = String(Math.floor(Math.random() * 99999) + 1).padStart(
    5,
    "0",
  );
  return `CUST-${stateCode}-${year}-${sequence}`;
};

// Generate unique ticket number
export const generateTicketNumber = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `PROLT-MR-${timestamp}${random}`;
};

// Simplified industry type for form data (Connection Details)
export interface IndustryFormData {
  id?: string;
  industry_name: string; // Factory/Connection Name
  ownership_type: string; // Private, Government, Semi Government, Group
  address: string; // Address Line 1
  address_line_2: string;
  city_town: string;
  state: string;
  district: string;
  pin_code: string;
  division: string;
  sub_division: string;
  discom: string;
  voltage_level: string; // Supply Voltage
  tariff: string;
  sanctioned_load: string;
  consumer_number: string; // Account No.
  meter_number: string;
  is_primary?: boolean;
  bill_source?: string;
  // Location coordinates (optional) - combined as single string
  latitude?: string;
  longitude?: string;
  // Factory Contact Details
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  contact_alternate_phone: string;
  contact_whatsapp: string;
  // Billing Address
  billing_address_same: boolean;
  billing_address_line_1: string;
  billing_address_line_2: string;
  billing_city_town: string;
  billing_district: string;
  billing_state: string;
  billing_pin_code: string;
}

// Ownership types for factories
export const OWNERSHIP_TYPES = [
  "Private",
  "Government",
  "Semi Government",
  "Group",
];

// Create empty connection details form data
export const createEmptyIndustryFormData = (): IndustryFormData => ({
  industry_name: "",
  ownership_type: "Private", // Default to Private
  address: "",
  address_line_2: "",
  city_town: "",
  state: "",
  district: "",
  pin_code: "",
  division: "",
  sub_division: "",
  discom: "",
  voltage_level: "",
  tariff: "",
  sanctioned_load: "",
  consumer_number: "",
  meter_number: "",
  latitude: "",
  longitude: "",
  contact_name: "",
  contact_email: "",
  contact_phone: "",
  contact_alternate_phone: "",
  contact_whatsapp: "",
  billing_address_same: true, // Default to checked
  billing_address_line_1: "",
  billing_address_line_2: "",
  billing_city_town: "",
  billing_district: "",
  billing_state: "",
  billing_pin_code: "",
});

// Calculate profile completion percentage - Starting from 0% to 100%
// Each field contributes to the total completion
export const calculateProfileCompletion = (
  profile: Partial<ConsumerProfile>,
  industries: IndustryFormData[],
): number => {
  let totalPoints = 0;
  const maxPoints = 100;

  const industry = industries[0];

  // Connection Details (45 points total)
  if (industry?.industry_name) totalPoints += 5; // Factory Name
  if (industry?.address) totalPoints += 5; // Address
  if (industry?.state) totalPoints += 4; // State
  if (industry?.discom) totalPoints += 5; // DISCOM
  if (industry?.voltage_level) totalPoints += 3; // Supply Voltage
  if (industry?.tariff) totalPoints += 3; // Tariff
  if (industry?.sanctioned_load) totalPoints += 5; // Sanctioned Load
  if (industry?.consumer_number) totalPoints += 5; // Account No.
  if (industry?.meter_number) totalPoints += 5; // Meter No.
  if (industry?.city_town) totalPoints += 2; // City/Town
  if (industry?.district) totalPoints += 1; // District
  if (industry?.pin_code) totalPoints += 2; // Pin Code

  // Factory Contact Details (15 points total)
  if (industry?.contact_name) totalPoints += 7; // Contact Name
  if (industry?.contact_phone) totalPoints += 5; // Phone
  if (industry?.contact_email) totalPoints += 3; // Email (optional but adds points)

  // GST Verification (15 points total)
  if (profile.gst_number) totalPoints += 8; // GST entered
  if (profile.gst_verified) totalPoints += 7; // GST verified

  // OA Status (15 points total)
  if (
    profile.uses_open_access !== null &&
    profile.uses_open_access !== undefined
  ) {
    totalPoints += 8; // OA answered
    if (profile.uses_open_access === true) {
      if (profile.oa_start_date) totalPoints += 4; // OA start date
      if (profile.trader_company_name) totalPoints += 3; // Trader info
    } else {
      totalPoints += 7; // No OA = still complete
    }
  }

  // Meter Setup (10 points total)
  if (
    profile.has_prolt_meter !== null &&
    profile.has_prolt_meter !== undefined
  ) {
    totalPoints += 5; // Meter decision made
    if (profile.has_prolt_meter && profile.prolt_meter_number) {
      totalPoints += 5; // Meter number entered
    } else if (!profile.has_prolt_meter) {
      totalPoints += 5; // No meter = still complete
    }
  }

  // Ensure we don't exceed 100%
  return Math.min(maxPoints, totalPoints);
};

// Indian states list
export const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

// Major DISCOMs in India
export const DISCOMS = [
  "BSES Rajdhani (Delhi)",
  "BSES Yamuna (Delhi)",
  "Tata Power Delhi",
  "MSEDCL (Maharashtra)",
  "BESCOM (Karnataka)",
  "APSPDCL (Andhra Pradesh)",
  "APEPDCL (Andhra Pradesh)",
  "TSSPDCL (Telangana)",
  "TSNPDCL (Telangana)",
  "TANGEDCO (Tamil Nadu)",
  "UGVCL (Gujarat)",
  "MGVCL (Gujarat)",
  "PGVCL (Gujarat)",
  "DGVCL (Gujarat)",
  "UPPCL (Uttar Pradesh)",
  "PVVNL (Uttar Pradesh)",
  "MVVNL (Uttar Pradesh)",
  "DVVNL (Uttar Pradesh)",
  "PuVVNL (Uttar Pradesh)",
  "NPCL (Uttar Pradesh)",
  "KESCO (Uttar Pradesh)",
  "WBSEDCL (West Bengal)",
  "CESC (Kolkata)",
  "JBVNL (Jharkhand)",
  "NBPDCL (Bihar)",
  "SBPDCL (Bihar)",
  "CSPDCL (Chhattisgarh)",
  "MPMKVVCL (Madhya Pradesh)",
  "MPPMKVVCL (Madhya Pradesh)",
  "MPWZ (Madhya Pradesh)",
  "DHBVN (Haryana)",
  "UHBVN (Haryana)",
  "PSPCL (Punjab)",
  "JVVNL (Rajasthan)",
  "AVVNL (Rajasthan)",
  "JdVVNL (Rajasthan)",
  "KEDL (Kerala)",
  "GESCOM (Karnataka)",
  "HESCOM (Karnataka)",
  "MESCOM (Karnataka)",
  "CESC (Karnataka)",
  "HPSEBL (Himachal Pradesh)",
  "UPCL (Uttarakhand)",
  "APDCL (Assam)",
  "TSECL (Tripura)",
  "MePDCL (Meghalaya)",
  "Other",
];

// Uttar Pradesh specific DISCOMs (5 companies)
export const UP_DISCOMS = [
  "UPPCL (Uttar Pradesh)",
  "PVVNL (Uttar Pradesh)",
  "MVVNL (Uttar Pradesh)",
  "DVVNL (Uttar Pradesh)",
  "PuVVNL (Uttar Pradesh)",
  "NPCL (Uttar Pradesh)",
  "KESCO (Uttar Pradesh)",
];

// Maharashtra specific DISCOMs
export const MAHARASHTRA_DISCOMS = [
  "MSEDCL (Maharashtra)",
  "BEST (Mumbai)",
  "Tata Power Mumbai",
  "Adani Electricity Mumbai",
  "MKVDC (Maharashtra)",
];

// Available states for selection (UP and Maharashtra)
export const AVAILABLE_STATES = ["Uttar Pradesh", "Maharashtra"];

// Uttar Pradesh Districts (76 districts)
export const UP_DISTRICTS = [
  "Agra",
  "Aligarh",
  "Ambedkar Nagar",
  "Amethi",
  "Amroha",
  "Auraiya",
  "Ayodhya",
  "Azamgarh",
  "Budaun",
  "Bagpat",
  "Bahraich",
  "Ballia",
  "Balrampur",
  "Banda",
  "Barabanki",
  "Bareilly",
  "Basti",
  "Bhadohi",
  "Bijnor",
  "Bulandshahr",
  "Chandauli",
  "Chitrakoot",
  "Deoria",
  "Etah",
  "Etawah",
  "Farrukhabad",
  "Fatehpur",
  "Firozabad",
  "Gautam Buddha Nagar",
  "Ghaziabad",
  "Ghazipur",
  "Gonda",
  "Gorakhpur",
  "Hamirpur",
  "Hapur",
  "Hardoi",
  "Hathras",
  "Jalaun",
  "Jaunpur",
  "Jhansi",
  "Kannauj",
  "Kanpur Dehat",
  "Kanpur Nagar",
  "Kasganj",
  "Kaushambi",
  "Kushinagar",
  "Lakhimpur Kheri",
  "Lalitpur",
  "Lucknow",
  "Maharajganj",
  "Mahoba",
  "Mainpuri",
  "Mathura",
  "Mau",
  "Meerut",
  "Mirzapur",
  "Moradabad",
  "Muzaffarnagar",
  "Pilibhit",
  "Pratapgarh",
  "Prayagraj",
  "Rae Bareli",
  "Rampur",
  "Saharanpur",
  "Sant Kabir Nagar",
  "Sambhal",
  "Shahjahanpur",
  "Shamli",
  "Shravasti",
  "Siddharthnagar",
  "Sitapur",
  "Sonbhadra",
  "Sultanpur",
  "Unnao",
  "Varanasi",
];

// Maharashtra Districts (36 districts)
export const MAHARASHTRA_DISTRICTS = [
  "Ahmednagar",
  "Akola",
  "Amravati",
  "Aurangabad",
  "Beed",
  "Bhandara",
  "Buldhana",
  "Chandrapur",
  "Dhule",
  "Gadchiroli",
  "Gondia",
  "Hingoli",
  "Jalgaon",
  "Jalna",
  "Kolhapur",
  "Latur",
  "Mumbai City",
  "Mumbai Suburban",
  "Nagpur",
  "Nanded",
  "Nandurbar",
  "Nashik",
  "Osmanabad",
  "Palghar",
  "Parbhani",
  "Pune",
  "Raigad",
  "Ratnagiri",
  "Sangli",
  "Satara",
  "Sindhudurg",
  "Solapur",
  "Thane",
  "Wardha",
  "Washim",
  "Yavatmal",
];

// UP Cities/Towns (200+ cities)
export const UP_CITIES = [
  "Agra",
  "Ahmedabad",
  "Ajaigarh",
  "Akbarpur",
  "Aliganj",
  "Aligarh",
  "Amethi",
  "Amroha",
  "Anpara",
  "Anupshahr",
  "Anūpnagar",
  "Aonla",
  "Arrah",
  "Atrauli",
  "Auraiya",
  "Ayodhya",
  "Azamgarh",
  "Baberu",
  "Baghpat",
  "Bah",
  "Baheri",
  "Bahraich",
  "Bajpur",
  "Ballia",
  "Balrampur",
  "Banda",
  "Bansdih",
  "Bansgaon",
  "Bansi",
  "Bara Banki",
  "Baraut",
  "Bareilly",
  "Barsana",
  "Basai",
  "Baseri",
  "Basti",
  "Bayana",
  "Bettiah",
  "Bhabua",
  "Bhadohi",
  "Bhind",
  "Bidhuna",
  "Bijnor",
  "Bikapur",
  "Bilari",
  "Bilaspur",
  "Bilgram",
  "Bilhaur",
  "Bina",
  "Bindki",
  "Bisalpur",
  "Bisauli",
  "Biswan",
  "Budaun",
  "Budhana",
  "Bulandshahr",
  "Buxar",
  "Chakia",
  "Chandauli",
  "Chanderi",
  "Chapra",
  "Charkhari",
  "Chhata",
  "Chhatarpur",
  "Chhibramau",
  "Chinhat",
  "Chitrakoot",
  "Chunar",
  "Dadri",
  "Dalmau",
  "Dataganj",
  "Datia",
  "Deeg",
  "Delhi",
  "Deoband",
  "Deoria",
  "Dibiyapur",
  "Domriaganj",
  "Dudhi",
  "Etah",
  "Etawah",
  "Etmadpur",
  "Faizabad",
  "Faridabad",
  "Farrukhabad",
  "Fatehpur",
  "Fatehpur Sikri",
  "Firozabad",
  "Gajraula",
  "Ganaur",
  "Garautha",
  "Garhmukteshwar",
  "Gauriganj",
  "Ghatampur",
  "Ghaziabad",
  "Ghazipur",
  "Ghosi",
  "Gokul",
  "Gonda",
  "Gorakhpur",
  "Goshainganj",
  "Govardhan",
  "Greater Noida",
  "Gunnaur",
  "Gyanpur",
  "Haidargarh",
  "Hamirpur",
  "Handia",
  "Hapur",
  "Hardoi",
  "Haridwar",
  "Hasanpur",
  "Hastinapur",
  "Hata",
  "Hathras",
  "Iglas",
  "Jahangirabad",
  "Jalalabad",
  "Jalaun",
  "Jalesar",
  "Jansath",
  "Jasrana",
  "Jatara",
  "Jaunpur",
  "Jhansi",
  "Jhusi",
  "Kadipur",
  "Kairana",
  "Kaisarganj",
  "Kalpi",
  "Kaman",
  "Kannauj",
  "Kanpur",
  "Karchana",
  "Karera",
  "Karhal",
  "Karnal",
  "Karwi",
  "Kasganj",
  "Kashipur",
  "Khaga",
  "Khair",
  "Khalilabad",
  "Khurja",
  "Kichha",
  "Kirakat",
  "Kiraoli",
  "Konch",
  "Kosi",
  "Kulpahar",
  "Kunda",
  "Kushinagar",
  "Lakhimpur",
  "Lalitpur",
  "Lucknow",
  "Machhlishahr",
  "Maharajganj",
  "Mahoba",
  "Mahrauni",
  "Mainpuri",
  "Malihabad",
  "Manjhanpur",
  "Mariahu",
  "Mathura",
  "Mau",
  "Mau Ranipur",
  "Maudaha",
  "Mawana",
  "Meerut",
  "Meja",
  "Milak",
  "Mirzapur",
  "Misrikh",
  "Modinagar",
  "Mohanlalganj",
  "Moradabad",
  "Moth",
  "Mughal Sarai",
  "Muhamdi",
  "Muhammadabad",
  "Muradnagar",
  "Musafirkhana",
  "Muzaffarnagar",
  "Nagina",
  "Najibabad",
  "Nakur",
  "Nanpara",
  "Naraini",
  "Naugarh",
  "Nawabganj",
  "Nighasan",
  "Noida",
  "Nowgong",
  "Orai",
  "Orchha",
  "Padrauna",
  "Palia Kalan",
  "Patti",
  "Pawayan",
  "Phulpur",
  "Pilibhit",
  "Pipraich",
  "Pratapgarh",
  "Prayagraj",
  "Pukhrayan",
  "Puranpur",
  "Purwa",
  "Raebareli",
  "Ramnagar",
  "Rampur",
  "Rasra",
  "Rath",
  "Robertsganj",
  "Rudrapur",
  "Sadabad",
  "Safipur",
  "Sagri",
  "Saharanpur",
  "Sahaswan",
  "Saidpur",
  "Saifai",
  "Salempur",
  "Salon",
  "Sambhal",
  "Sandila",
  "Sardhana",
  "Sarnath",
  "Shahabad",
  "Shahganj",
  "Shahjahanpur",
  "Shamli",
  "Shikohabad",
  "Shravasti",
  "Siddharthanagar",
  "Sidhauli",
  "Sikandarabad",
  "Sikandra Rao",
  "Singrauli",
  "Sirathu",
  "Sitapur",
  "Sonauli",
  "Soraon",
  "Suar",
  "Sultanpur",
  "Tanda",
  "Tarabganj",
  "Teonthar",
  "Thakurdwara",
  "Tilhar",
  "Unchagaon",
  "Unnao",
  "Utraula",
  "Varanasi",
  "Vindhyachal",
  "Vrindavan",
  "Zamania",
];

// Maharashtra Cities/Towns
export const MAHARASHTRA_CITIES = [
  "Mumbai",
  "Pune",
  "Nagpur",
  "Thane",
  "Nashik",
  "Aurangabad",
  "Solapur",
  "Kolhapur",
  "Amravati",
  "Navi Mumbai",
  "Sangli",
  "Malegaon",
  "Jalgaon",
  "Akola",
  "Latur",
  "Dhule",
  "Ahmednagar",
  "Chandrapur",
  "Parbhani",
  "Jalna",
  "Bhusawal",
  "Panvel",
  "Satara",
  "Beed",
  "Yavatmal",
  "Kamptee",
  "Gondia",
  "Wardha",
  "Ratnagiri",
  "Ichalkaranji",
  "Nandurbar",
  "Vasai",
  "Virar",
  "Ulhasnagar",
  "Mira-Bhayandar",
  "Bhiwandi",
  "Kalyan",
  "Dombivli",
  "Ambernath",
  "Badlapur",
  "Pimpri-Chinchwad",
  "Shirdi",
  "Baramati",
  "Shirpur",
  "Udgir",
  "Hinganghat",
  "Washim",
  "Buldana",
  "Osmanabad",
  "Nanded",
  "Hingoli",
  "Sindhudurg",
  "Raigad",
  "Palghar",
  "Bhandara",
  "Gadchiroli",
];

// Helper function to get districts for a state
export const getDistrictsForState = (state: string): string[] => {
  switch (state) {
    case "Uttar Pradesh":
      return UP_DISTRICTS;
    case "Maharashtra":
      return MAHARASHTRA_DISTRICTS;
    default:
      return [];
  }
};

// Helper function to get cities for a state
export const getCitiesForState = (state: string): string[] => {
  switch (state) {
    case "Uttar Pradesh":
      return UP_CITIES;
    case "Maharashtra":
      return MAHARASHTRA_CITIES;
    default:
      return [];
  }
};

// Helper function to get DISCOMs for a state
export const getDiscomsForState = (state: string): string[] => {
  switch (state) {
    case "Uttar Pradesh":
      return UP_DISCOMS;
    case "Maharashtra":
      return MAHARASHTRA_DISCOMS;
    default:
      return [];
  }
};

// Supply Voltage levels (renamed from Voltage Levels)
export const SUPPLY_VOLTAGES = [
  "LT (Low Tension)",
  "11 kV",
  "33 kV",
  "66 kV",
  "132 kV",
  "220 kV",
  "400 kV",
];

// Keep old name for backward compatibility
export const VOLTAGE_LEVELS = SUPPLY_VOLTAGES;

// Validate GST number format
export const validateGSTNumber = (gst: string): boolean => {
  // GST format: 2 digit state code + 10 digit PAN + 1 digit entity number + 1 check digit + 1 default 'Z'
  const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return gstRegex.test(gst.toUpperCase());
};

// PAN Entity Types
export const PAN_ENTITY_TYPES: Record<string, string> = {
  P: "Individual/Person",
  C: "Company",
  F: "Firm",
  H: "HUF",
  T: "Trust",
  A: "AOP",
};

// Validate PAN number format
// Format: AAAAA9999A
// - Characters 1-3: Random alphabetic (AAA to ZZZ)
// - Character 4: Entity type (P/C/F/H/T/A)
// - Character 5: First letter of holder's last name/entity name
// - Characters 6-9: Sequential number (0001 to 9999)
// - Character 10: Alphabetic check digit
export const validatePANNumber = (
  pan: string,
): { valid: boolean; message: string } => {
  if (!pan) return { valid: true, message: "" };

  const panUpper = pan.toUpperCase();

  // PAN format: 5 letters + 4 digits + 1 letter
  const panRegex = /^[A-Z]{3}[PCFHTA][A-Z][0-9]{4}[A-Z]$/;

  if (panUpper.length < 10) {
    return {
      valid: false,
      message: `PAN must be 10 characters (currently ${panUpper.length})`,
    };
  }

  if (!panRegex.test(panUpper)) {
    return {
      valid: false,
      message: "Invalid PAN format. Expected: AAAAA9999A (e.g., ABCCS1234K)",
    };
  }

  // Validate 4th character is valid entity type
  const entityChar = panUpper.charAt(3);
  if (!["P", "C", "F", "H", "T", "A"].includes(entityChar)) {
    return {
      valid: false,
      message: `Invalid entity type "${entityChar}". Must be P, C, F, H, T, or A`,
    };
  }

  return { valid: true, message: "" };
};

// Generate dummy PAN number for company
export const generateDummyPAN = (): string => {
  return "ABCCS1234K"; // Demo PAN for Company (C), entity name starting with S (Sharma)
};

// Validate phone number format (Indian)
export const validatePhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^(\+91)?[6-9][0-9]{9}$/;
  return phoneRegex.test(phone.replace(/\s/g, ""));
};

// Validate email format
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Format phone number for display
export const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  if (cleaned.length === 12 && cleaned.startsWith("91")) {
    return `+91 ${cleaned.slice(2, 7)} ${cleaned.slice(7)}`;
  }
  return phone;
};
