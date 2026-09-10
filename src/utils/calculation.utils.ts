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

export const calculateGrowth = (current: number, previous: number): number => {
  if (!previous || previous === 0) return 0;
  return (current - previous) / previous;
};
