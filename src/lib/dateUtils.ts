import { toZonedTime } from "date-fns-tz";
import { format } from "date-fns";

const SYDNEY_TZ = "Australia/Sydney";

/**
 * Convert any date to Sydney timezone
 */
export const getSydneyTime = (date: Date | string): Date => {
  return toZonedTime(new Date(date), SYDNEY_TZ);
};

/**
 * Get current date/time in Sydney timezone
 */
export const getSydneyNow = (): Date => {
  return toZonedTime(new Date(), SYDNEY_TZ);
};

/**
 * Format a date string to Sydney timezone with custom format
 */
export const formatDateSydney = (
  dateString?: string,
  formatStr: string = "dd/MM/yyyy"
): string => {
  if (!dateString) return "—";
  try {
    return format(getSydneyTime(dateString), formatStr);
  } catch {
    return "—";
  }
};

/**
 * Format a date/time string to Sydney timezone with date and time
 */
export const formatDateTimeSydney = (dateString?: string): string => {
  return formatDateSydney(dateString, "dd/MM/yyyy HH:mm:ss");
};

/**
 * Format a date/time string to Sydney timezone with short date and time
 */
export const formatDateTimeShortSydney = (dateString?: string): string => {
  return formatDateSydney(dateString, "MMM d, yyyy h:mm a");
};

/**
 * Get date in YYYY-MM-DD format for Sydney timezone
 */
export const getDateStringSydney = (date: Date): string => {
  const sydneyDate = getSydneyTime(date);
  return format(sydneyDate, "yyyy-MM-dd");
};
