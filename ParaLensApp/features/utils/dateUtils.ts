/**
 * Format date to YYYY-MM-DD format (backend expected format)
 */
export function formatDateForBackend(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse date from YYYY-MM-DD format (backend format)
 */
export function parseDateFromBackend(dateString: string): Date {
  return new Date(dateString);
}

/**
 * Get current date in YYYY-MM-DD format
 */
export function getCurrentDateFormatted(): string {
  return formatDateForBackend(new Date());
}

/**
 * Validate if date string is in correct YYYY-MM-DD format
 */
export function isValidDateFormat(dateString: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) return false;
  
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

/**
 * Format date for display (e.g., "Jan 15, 2024")
 */
export function formatDateForDisplay(dateString: string): string {
  const date = parseDateFromBackend(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
} 