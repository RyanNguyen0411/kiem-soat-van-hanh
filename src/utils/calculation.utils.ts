export const calculateAssigned = (volume: number, assignedRate: number): number => {
  return volume * assignedRate;
};

export const calculateGTC = (volume: number, gtcRate: number): number => {
  return volume * gtcRate;
};

export const calculateBacklog = (volume: number, gtcVolume: number): number => {
  return Math.max(0, volume - gtcVolume);
};

/**
 * Chia an toàn không bao giờ văng ngoại lệ hay sinh ra NaN, Infinity
 */
export const safeDivide = (
  numerator: number | null | undefined, 
  denominator: number | null | undefined, 
  fallback = 0,
  toPercent = false
): number => {
  const num = typeof numerator === 'number' && !isNaN(numerator) ? numerator : 0;
  const den = typeof denominator === 'number' && !isNaN(denominator) ? denominator : 0;
  if (den === 0) return fallback;
  const res = num / den;
  if (!isFinite(res) || isNaN(res)) return fallback;
  return toPercent ? res * 100 : res;
};

/**
 * Chuyển chuỗi hoặc giá trị bất kỳ sang số thực chuẩn, xử lý định dạng tiền tệ/dấu phẩy tiếng Việt
 */
export const parseStrictNumber = (val: any, fallback = 0): number => {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'number') return isNaN(val) ? fallback : val;
  const str = String(val).trim().replace(/\s/g, '').replace(/\./g, '').replace(/,/g, '.');
  const parsed = parseFloat(str);
  return isNaN(parsed) ? fallback : parsed;
};

/**
 * Định dạng số nguyên chuẩn Việt Nam (phân cách hàng nghìn bằng dấu chấm)
 */
export const formatNumberVN = (val: number | null | undefined): string => {
  if (val === null || val === undefined || isNaN(val)) return '0';
  return Math.round(val).toLocaleString('vi-VN');
};

/**
 * Định dạng phần trăm chuẩn (ví dụ: '84.5%')
 */
export const formatPercentVN = (val: number | null | undefined, decimals = 1): string => {
  if (val === null || val === undefined || isNaN(val)) return '0.0%';
  return `${val.toFixed(decimals)}%`;
};

/**
 * Tính tỷ lệ % KPI theo chuẩn AM Huy: SUM(SLĐ GTC) / SUM(Volume)
 * Nếu mẫu số = 0 trả về 'N/A' thay vì 0% để tránh gây hiểu nhầm
 */
export const formatKpiPercentage = (numerator: number, denominator: number, decimals = 1): string => {
  if (!denominator || denominator === 0) return 'N/A';
  return ((numerator / denominator) * 100).toFixed(decimals) + '%';
};

export const calculateGrowth = (current: number, previous: number): number => {
  if (!previous || previous === 0) return 0;
  return (current - previous) / previous;
};
