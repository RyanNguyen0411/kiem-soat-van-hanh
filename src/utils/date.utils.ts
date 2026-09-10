import { format, subDays, startOfMonth, endOfMonth, parse, isValid } from 'date-fns';

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export const getCurrentDate = (): Date => {
  return new Date(); // Có thể override khi test
};

export const formatDateDDMMYYYY = (date: Date): string => {
  return format(date, 'dd/MM/yyyy');
};

export const parseCustomDate = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  const parsed = parse(dateStr, 'dd/MM/yyyy', new Date());
  if (isValid(parsed)) return parsed;
  const isoParsed = new Date(dateStr);
  return isValid(isoParsed) ? isoParsed : null;
};

export const getDateRangeContext = (currentDate: Date = getCurrentDate()) => {
  const n = currentDate;
  const n1 = subDays(n, 1);
  const n8 = subDays(n, 8);
  const currentMonthStart = startOfMonth(n);
  const currentMonthEnd = n; // Đến ngày hiện tại, không giả định tương lai
  const prevMonthStart = startOfMonth(subDays(currentMonthStart, 1));
  const prevMonthEnd = endOfMonth(subDays(currentMonthStart, 1));

  return {
    n,
    n1,
    n8,
    currentMonthStart,
    currentMonthEnd,
    prevMonthStart,
    prevMonthEnd,
  };
};
