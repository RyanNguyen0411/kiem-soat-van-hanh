export const normalizeNumber = (value: any): number => {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return isNaN(value) ? 0 : value;
  
  let cleanStr = String(value).trim().replace(/,/g, '');
  if (cleanStr.endsWith('%')) {
    cleanStr = cleanStr.slice(0, -1).trim();
    const num = parseFloat(cleanStr);
    return isNaN(num) ? 0 : num / 100;
  }
  const num = parseFloat(cleanStr);
  return isNaN(num) ? 0 : num;
};

export const normalizePercent = (value: any): number => {
  const num = normalizeNumber(value);
  // Nếu giá trị lớn hơn 1 (ví dụ 85 thay vì 0.85)
  if (num > 1 && num <= 100) return num / 100;
  return num;
};

export const normalizeString = (value: any): string => {
  if (value === null || value === undefined) return '';
  return String(value).trim().replace(/\s+/g, ' ');
};

export const normalizeHeader = (header: string): string => {
  return normalizeString(header).toLowerCase();
};
