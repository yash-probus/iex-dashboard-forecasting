/**
 * Formats an ISO date string into a professional presentation format.
 * Returns '—' if the date is null or invalid.
 * Example output: "08 Jun 2026"
 */
export const formatOverviewDate = (dateString: string | Date | null): string => {
  if (!dateString) return '—';
  
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  if (isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(date);
};

/**
 * Formats a 1-96 timeblock integer into a time range string.
 * Example output for block 1: "00:00-00:15"
 */
export const formatTimeblock = (block: number | null | undefined): string => {
  if (block == null || block < 1 || block > 96) return '—';
  
  const startMinutes = (block - 1) * 15;
  const endMinutes = block * 15;

  const startHour = String(Math.floor(startMinutes / 60)).padStart(2, '0');
  const startMin = String(startMinutes % 60).padStart(2, '0');
  
  let endHour = String(Math.floor(endMinutes / 60)).padStart(2, '0');
  const endMin = String(endMinutes % 60).padStart(2, '0');
  
  // Format 24:00 for the last block
  if (endMinutes === 1440) {
    endHour = '24';
  }

  return `${startHour}:${startMin}-${endHour}:${endMin}`;
};
