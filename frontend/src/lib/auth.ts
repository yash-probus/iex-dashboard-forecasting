// Mock authentication utilities for demo prototype

export type UserType = 'consumer' | 'trader';

export interface CalculationHistoryEntry {
  id: number;
  date: string;
  months: string[];
  totalSavings: number;
  savingsPercent: number;
  metadata: {
    state: string;
    discom?: string;
    category: string;
    voltageLevel: string;
    sanctionedLoad: string;
    usesOA?: boolean;
  };
  entries: any[];
  results?: any;
}

// Check if user is authenticated
export function isAuthenticated(): boolean {
  return localStorage.getItem('isLoggedIn') === 'true';
}

// Set authentication state
export function setAuthenticated(value: boolean): void {
  localStorage.setItem('isLoggedIn', value ? 'true' : 'false');
}

// Get user type (consumer or trader)
export function getUserType(): UserType {
  return (localStorage.getItem('userType') as UserType) || 'consumer';
}

// Set user type
export function setUserType(type: UserType): void {
  localStorage.setItem('userType', type);
}

// Clear authentication
export function clearAuth(): void {
  localStorage.removeItem('isLoggedIn');
  localStorage.removeItem('userType');
}

// Get the single active calculation
export function getActiveCalculation(): CalculationHistoryEntry | null {
  try {
    const data = localStorage.getItem('activeCalculation');
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

// Save a single active calculation (overwrites any previous)
export function saveActiveCalculation(entry: Omit<CalculationHistoryEntry, 'id' | 'date'>): void {
  try {
    const cleanedEntry = { ...entry };
    if (cleanedEntry.results) {
      cleanedEntry.results = {
        ...cleanedEntry.results,
        slotData: [],
      };
    }
    
    const newEntry: CalculationHistoryEntry = {
      ...cleanedEntry,
      id: Date.now(),
      date: new Date().toISOString(),
    };
    
    localStorage.setItem('activeCalculation', JSON.stringify(newEntry));
  } catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.warn('localStorage quota exceeded, clearing active calculation');
      localStorage.removeItem('activeCalculation');
    }
  }
}

// Clear the active calculation
export function clearActiveCalculation(): void {
  localStorage.removeItem('activeCalculation');
}

// Format month labels from ISO strings
export function formatHistoryMonths(months: string[]): string {
  if (!months || months.length === 0) return 'No data';
  
  const formatMonth = (iso: string) => {
    const [year, month] = iso.split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  };
  
  if (months.length === 1) return formatMonth(months[0]);
  return `${formatMonth(months[0])} - ${formatMonth(months[months.length - 1])}`;
}

// Application status types
export type ApplicationStatusStep = 'submitted' | 'contact_scheduled' | 'under_processing' | 'ready_for_installation' | 'installation' | 'active';

export interface StatusHistoryEntry {
  status: ApplicationStatusStep;
  updatedAt: string;
}

export interface ApplicationStatus {
  applicationId: string;
  status: ApplicationStatusStep;
  statusHistory: StatusHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

// Generate unique application ID
export function generateApplicationId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `PROLT-APP-${timestamp}${random}`;
}

// Get application status from localStorage
export function getApplicationStatus(): ApplicationStatus | null {
  try {
    const data = localStorage.getItem('applicationStatus');
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

// Save application status to localStorage
export function saveApplicationStatus(status: ApplicationStatus): void {
  localStorage.setItem('applicationStatus', JSON.stringify(status));
}

// Clear application status (for testing/reset)
export function clearApplicationStatus(): void {
  localStorage.removeItem('applicationStatus');
}

// ========== Support Ticket System ==========

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  category: string;
  categoryLabel: string;
  description: string;
  status: 'open' | 'pending' | 'in_progress' | 'closed';
  createdAt: string;
  updatedAt: string;
}

// Generate unique support ticket ID
export function generateSupportTicketId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `PROLT-SUP-${timestamp}${random}`;
}

// Get all support tickets from localStorage
export function getSupportTickets(): SupportTicket[] {
  try {
    const data = localStorage.getItem('supportTickets');
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

// Save a new support ticket
export function saveSupportTicket(ticket: Omit<SupportTicket, 'id' | 'ticketNumber' | 'createdAt' | 'updatedAt'>): SupportTicket {
  const tickets = getSupportTickets();
  const now = new Date().toISOString();
  
  const newTicket: SupportTicket = {
    ...ticket,
    id: crypto.randomUUID(),
    ticketNumber: generateSupportTicketId(),
    createdAt: now,
    updatedAt: now,
  };
  
  tickets.unshift(newTicket);
  localStorage.setItem('supportTickets', JSON.stringify(tickets));
  
  return newTicket;
}

// Update ticket status
export function updateTicketStatus(ticketId: string, status: SupportTicket['status']): void {
  const tickets = getSupportTickets();
  const index = tickets.findIndex(t => t.id === ticketId);
  
  if (index !== -1) {
    tickets[index].status = status;
    tickets[index].updatedAt = new Date().toISOString();
    localStorage.setItem('supportTickets', JSON.stringify(tickets));
  }
}

// Delete a support ticket
export function deleteSupportTicket(ticketId: string): boolean {
  const tickets = getSupportTickets();
  const filteredTickets = tickets.filter(t => t.id !== ticketId);
  
  if (filteredTickets.length !== tickets.length) {
    localStorage.setItem('supportTickets', JSON.stringify(filteredTickets));
    return true;
  }
  return false;
}
