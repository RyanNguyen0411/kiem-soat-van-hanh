export const calculateAssigned = (volume: number, assignedRate: number): number => {
  return volume * assignedRate;
};

export const calculateGTC = (volume: number, gtcRate: number): number => {
  return volume * gtcRate;
};

export const calculateBacklog = (volume: number, gtcVolume: number): number => {
  return Math.max(0, volume - gtcVolume);
};

export const safeDivide = (numerator: number, denominator: number): number => {
  if (!denominator || denominator === 0) return 0;
  return numerator / denominator;
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
