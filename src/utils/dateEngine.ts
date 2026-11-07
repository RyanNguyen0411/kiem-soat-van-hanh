/**
 * Date Engine for GHN Area Operation Control Center
 * Strict validation and formatting for dd/mm/yyyy
 */

export const DATE_REGEX_DD_MM_YYYY = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

export function isValidDateDDMMYYYY(dateStr: string | null | undefined): boolean {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const trimmed = dateStr.trim();
  const match = trimmed.match(DATE_REGEX_DD_MM_YYYY);
  if (!match) return false;

  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);

  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  if (year < 2000 || year > 2100) return false;

  // Validate actual days in month
  const daysInMonth = new Date(year, month, 0).getDate();
  if (day > daysInMonth) return false;

  return true;
}

export function parseDateDDMMYYYY(dateStr: string): Date | null {
  if (!isValidDateDDMMYYYY(dateStr)) return null;
  const [d, m, y] = dateStr.trim().split('/').map(v => parseInt(v, 10));
  return new Date(y, m - 1, d);
}

export function toTimestamp(dateStr: string): number {
  const d = parseDateDDMMYYYY(dateStr);
  return d ? d.getTime() : 0;
}

/**
 * Sort dates from newest to oldest (Gần nhất -> Xa nhất)
 */
export function sortDatesDesc(dates: string[]): string[] {
  return [...dates].sort((a, b) => toTimestamp(b) - toTimestamp(a));
}

/**
 * Get ISO Week number
 */
export function getISOWeekNumber(d: Date): number {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  // Thursday in current week decides the year.
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  // January 4 is always in week 1.
  const week1 = new Date(date.getFullYear(), 0, 4);
  // Adjust to Thursday in week 1 and count number of weeks from date to week1.
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

export interface WeekFilterOption {
  key: string;       // e.g. "2026-W44"
  label: string;     // e.g. "Tuần 44 (26/10 - 01/11/2026)"
  startDate: string; // dd/mm/yyyy
  endDate: string;   // dd/mm/yyyy
  dates: string[];
}

export interface MonthFilterOption {
  key: string;       // e.g. "2026-10"
  label: string;     // e.g. "Tháng 10/2026"
  dates: string[];
}

/**
 * Extract sorted unique months from newest to oldest
 */
export function extractMonths(dates: string[]): MonthFilterOption[] {
  const map: Record<string, { label: string; dates: Set<string>; latestTs: number }> = {};

  dates.forEach(dStr => {
    const d = parseDateDDMMYYYY(dStr);
    if (!d) return;
    const m = d.getMonth() + 1;
    const y = d.getFullYear();
    const key = `${y}-${m < 10 ? '0' + m : m}`;
    if (!map[key]) {
      map[key] = {
        label: `Tháng ${m}/${y}`,
        dates: new Set(),
        latestTs: d.getTime()
      };
    }
    map[key].dates.add(dStr);
    if (d.getTime() > map[key].latestTs) {
      map[key].latestTs = d.getTime();
    }
  });

  return Object.entries(map)
    .sort((a, b) => b[1].latestTs - a[1].latestTs) // newest month first
    .map(([key, val]) => ({
      key,
      label: val.label,
      dates: sortDatesDesc(Array.from(val.dates))
    }));
}

/**
 * Extract sorted unique weeks from newest to oldest
 */
export function extractWeeks(dates: string[]): WeekFilterOption[] {
  const map: Record<string, { 
    weekNum: number;
    year: number;
    dates: Set<string>; 
    minDate: Date; 
    maxDate: Date;
    latestTs: number;
  }> = {};

  dates.forEach(dStr => {
    const d = parseDateDDMMYYYY(dStr);
    if (!d) return;
    const weekNum = getISOWeekNumber(d);
    const year = d.getFullYear();
    const key = `${year}-W${weekNum < 10 ? '0' + weekNum : weekNum}`;

    if (!map[key]) {
      map[key] = {
        weekNum,
        year,
        dates: new Set(),
        minDate: d,
        maxDate: d,
        latestTs: d.getTime()
      };
    }

    map[key].dates.add(dStr);
    if (d.getTime() < map[key].minDate.getTime()) map[key].minDate = d;
    if (d.getTime() > map[key].maxDate.getTime()) map[key].maxDate = d;
    if (d.getTime() > map[key].latestTs) map[key].latestTs = d.getTime();
  });

  const formatDate = (d: Date) => {
    const day = d.getDate();
    const month = d.getMonth() + 1;
    return `${day < 10 ? '0' + day : day}/${month < 10 ? '0' + month : month}`;
  };

  return Object.entries(map)
    .sort((a, b) => b[1].latestTs - a[1].latestTs) // newest week first
    .map(([key, val]) => ({
      key,
      label: `Tuần ${val.weekNum} (${formatDate(val.minDate)} - ${formatDate(val.maxDate)})`,
      startDate: `${formatDate(val.minDate)}/${val.year}`,
      endDate: `${formatDate(val.maxDate)}/${val.year}`,
      dates: sortDatesDesc(Array.from(val.dates))
    }));
}
