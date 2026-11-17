import type { BacklogGltRecord } from '../types/dashboard';

export type GltDayGroupKey = 'lt_1d' | '1_3d' | '3_5d' | '5_8d' | 'gt_8d_192h';

export interface GltDayGroupInfo {
  key: GltDayGroupKey;
  label: string;
  shortLabel: string;
  hoursRange: string;
  badgeClass: string;
  isUrgent192h: boolean;
  color: string;
}

export const GLT_DAY_GROUPS: Record<GltDayGroupKey, GltDayGroupInfo> = {
  lt_1d: {
    key: 'lt_1d',
    label: '< 1 ngày',
    shortLabel: '< 1N',
    hoursRange: '0 - 24 giờ',
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800',
    isUrgent192h: false,
    color: '#10B981'
  },
  '1_3d': {
    key: '1_3d',
    label: '1 - 3 ngày',
    shortLabel: '1 - 3N',
    hoursRange: '24 - 72 giờ',
    badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800',
    isUrgent192h: false,
    color: '#F59E0B'
  },
  '3_5d': {
    key: '3_5d',
    label: '3 - 5 ngày',
    shortLabel: '3 - 5N',
    hoursRange: '72 - 120 giờ',
    badgeClass: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 border border-orange-300 dark:border-orange-800',
    isUrgent192h: false,
    color: '#F97316'
  },
  '5_8d': {
    key: '5_8d',
    label: '5 - 8 ngày',
    shortLabel: '5 - 8N',
    hoursRange: '120 - 192 giờ',
    badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800',
    isUrgent192h: false,
    color: '#E11D48'
  },
  gt_8d_192h: {
    key: 'gt_8d_192h',
    label: '> 8 ngày (192h)',
    shortLabel: '> 8N (192h)',
    hoursRange: '> 192 giờ',
    badgeClass: 'bg-red-600 text-white font-black animate-pulse border border-red-700 shadow-2xs',
    isUrgent192h: true,
    color: '#DC2626'
  }
};

/**
 * Phân loại cấp độ tuổi tồn từ giờ sang ngày
 * - lt_1d: 0_6, 6_12, 12_24 (< 24h)
 * - 1_3d: 24_36, 36_48, 48_72 (24 - 72h)
 * - 3_5d: 72_96, 96_120 (72 - 120h)
 * - 5_8d: 120_192 (120 - 192h)
 * - gt_8d_192h: 192 hoặc lớn hơn (> 8 ngày = 192h) -> MỨC ĐỘ KHẨN CẤP NHẤT, XỬ LÝ TRIỆT ĐỂ!
 */
export function classifyGltAging(thoiGianTonDong?: string, canhBao?: string): GltDayGroupInfo {
  const tg = (thoiGianTonDong || '').trim();
  const cb = (canhBao || '').toLowerCase();

  // 1. Nhóm 192h (> 8 ngày = 192h) - MỨC ĐỘ KHẨN CẤP NHẤT, XỬ LÝ TRIỆT ĐỂ!
  // Ưu tiên kiểm tra mốc 192h trước (loại trừ các chuỗi chứa 120 để tránh nhầm với 120_192)
  if (
    tg === '192' || 
    tg === '>192' || 
    tg === '> 192' || 
    tg.startsWith('192') ||
    (tg.includes('192') && !tg.includes('120')) || 
    (cb.includes('192') && !cb.includes('120')) || 
    cb.includes('đơn đã quá hạn')
  ) {
    return GLT_DAY_GROUPS.gt_8d_192h;
  }

  // 2. Nhóm 5-8 ngày (120-192h)
  if (
    tg === '120_192' || 
    tg.startsWith('120') || 
    tg.includes('120_192') || 
    tg.includes('120-192') ||
    cb.includes('120_192') || 
    cb.includes('khẩn cấp quá hạn')
  ) {
    return GLT_DAY_GROUPS['5_8d'];
  }

  // 3. Nhóm 3-5 ngày (72-120h)
  if (
    tg === '72_96' || 
    tg === '96_120' || 
    cb.includes('72_96') || 
    cb.includes('96_120') ||
    cb.includes('báo động quá hạn')
  ) {
    return GLT_DAY_GROUPS['3_5d'];
  }

  // 4. Nhóm 1-3 ngày (24-72h)
  if (
    tg === '24_36' || 
    tg === '36_48' || 
    tg === '48_72' || 
    cb.includes('24_36') || 
    cb.includes('36_48') || 
    cb.includes('48_72')
  ) {
    return GLT_DAY_GROUPS['1_3d'];
  }

  // 5. Nhóm < 1 ngày (0-24h)
  return GLT_DAY_GROUPS.lt_1d;
}

export interface PostOfficeAgingRow {
  buuCuc: string;
  buuCucShort: string;
  total: number;
  lt_1d: number;      // < 1 ngày
  p_1_3d: number;     // 1 - 3 ngày
  p_3_5d: number;     // 3 - 5 ngày
  p_5_8d: number;     // 5 - 8 ngày
  p_gt_8d_192h: number; // > 8 ngày (192h) - Tách riêng cột khẩn cấp nhất
  overdueRate: number; // % quá hạn (> 3 ngày)
  urgentRate: number;  // % khẩn cấp (> 5 ngày + 192h)
  riskLevel: 'danger' | 'warning' | 'safe';
}

export interface PostOfficeAgingMatrix {
  rows: PostOfficeAgingRow[];
  totals: PostOfficeAgingRow;
}

/**
 * Tính toán Ma Trận Cấp Độ Tuổi Tồn (Quy đổi giờ -> ngày) theo từng Bưu Cục
 */
export function computePostOfficeAgingMatrix(records: BacklogGltRecord[], allBuuCucList: string[]): PostOfficeAgingMatrix {
  const buuCucs = allBuuCucList.length > 0 ? allBuuCucList : [...new Set(records.map(r => r.buuCuc))].filter(Boolean);

  const rows: PostOfficeAgingRow[] = buuCucs.map(bc => {
    const bcRecords = records.filter(r => r.buuCuc === bc);
    const total = bcRecords.length;

    let lt_1d = 0;
    let p_1_3d = 0;
    let p_3_5d = 0;
    let p_5_8d = 0;
    let p_gt_8d_192h = 0;

    for (let i = 0; i < bcRecords.length; i++) {
      const group = classifyGltAging(bcRecords[i].thoiGianTonDong, bcRecords[i].canhBao);
      if (group.key === 'lt_1d') lt_1d++;
      else if (group.key === '1_3d') p_1_3d++;
      else if (group.key === '3_5d') p_3_5d++;
      else if (group.key === '5_8d') p_5_8d++;
      else if (group.key === 'gt_8d_192h') p_gt_8d_192h++;
    }

    const overdueCount = p_3_5d + p_5_8d + p_gt_8d_192h;
    const overdueRate = total > 0 ? (overdueCount / total) * 100 : 0;
    const urgentCount = p_5_8d + p_gt_8d_192h;
    const urgentRate = total > 0 ? (urgentCount / total) * 100 : 0;

    let riskLevel: 'danger' | 'warning' | 'safe' = 'safe';
    if (p_gt_8d_192h > 0 || urgentCount >= 20 || overdueRate >= 15) {
      riskLevel = 'danger';
    } else if (urgentCount > 0 || overdueRate >= 8) {
      riskLevel = 'warning';
    }

    return {
      buuCuc: bc,
      buuCucShort: bc.replace('(LAN) ', ''),
      total,
      lt_1d,
      p_1_3d,
      p_3_5d,
      p_5_8d,
      p_gt_8d_192h,
      overdueRate,
      urgentRate,
      riskLevel
    };
  }).sort((a, b) => b.total - a.total);

  const totals: PostOfficeAgingRow = rows.reduce((acc, cur) => ({
    buuCuc: 'Toàn Khu Vực',
    buuCucShort: 'Toàn Khu Vực',
    total: acc.total + cur.total,
    lt_1d: acc.lt_1d + cur.lt_1d,
    p_1_3d: acc.p_1_3d + cur.p_1_3d,
    p_3_5d: acc.p_3_5d + cur.p_3_5d,
    p_5_8d: acc.p_5_8d + cur.p_5_8d,
    p_gt_8d_192h: acc.p_gt_8d_192h + cur.p_gt_8d_192h,
    overdueRate: 0,
    urgentRate: 0,
    riskLevel: 'danger'
  }), {
    buuCuc: 'Toàn Khu Vực',
    buuCucShort: 'Toàn Khu Vực',
    total: 0,
    lt_1d: 0,
    p_1_3d: 0,
    p_3_5d: 0,
    p_5_8d: 0,
    p_gt_8d_192h: 0,
    overdueRate: 0,
    urgentRate: 0,
    riskLevel: 'danger'
  });

  const totalOverdue = totals.p_3_5d + totals.p_5_8d + totals.p_gt_8d_192h;
  totals.overdueRate = totals.total > 0 ? (totalOverdue / totals.total) * 100 : 0;
  totals.urgentRate = totals.total > 0 ? ((totals.p_5_8d + totals.p_gt_8d_192h) / totals.total) * 100 : 0;
  if (totals.p_gt_8d_192h > 0 || totals.urgentRate >= 5) {
    totals.riskLevel = 'danger';
  } else if (totals.overdueRate >= 8) {
    totals.riskLevel = 'warning';
  } else {
    totals.riskLevel = 'safe';
  }

  return { rows, totals };
}

export interface CustomerAgingRow {
  khachHang: string;
  partnerName: string;
  categoryBadge: string;
  total: number;
  sharePct: number;    // % trên tổng tồn GLT
  lt_1d: number;      // < 1 ngày
  p_1_3d: number;     // 1 - 3 ngày
  p_3_5d: number;     // 3 - 5 ngày
  p_5_8d: number;     // 5 - 8 ngày
  p_gt_8d_192h: number; // > 8 ngày (192h)
  overdueCount: number; // Tổng đơn quá hạn (> 3 ngày)
  overdueRate: number;  // % đơn quá hạn của khách hàng này
  slaPressure: 'Rất Cao (Khẩn)' | 'Cao' | 'Trung Bình' | 'Kiểm Soát Tốt';
}

export interface CustomerAgingMatrix {
  rows: CustomerAgingRow[];
  totals: CustomerAgingRow;
  chartData: Array<{
    name: string;
    khachHang: string;
    total: number;
    lt_1d: number;
    p_1_3d: number;
    p_3_5d: number;
    p_5_8d: number;
    p_gt_8d_192h: number;
    overdueRate: number;
    urgent192h: number;
  }>;
}

/**
 * Tính toán Bảng Kê Chi Tiết & Biểu Đồ Cột Kết Hợp Đường cho Nhóm Khách Hàng
 */
export function computeCustomerAgingMatrix(records: BacklogGltRecord[], totalGlt: number): CustomerAgingMatrix {
  const map: Record<string, BacklogGltRecord[]> = {};

  records.forEach(r => {
    const kh = (r.khachHang || 'OTHER').trim().toUpperCase();
    if (!map[kh]) map[kh] = [];
    map[kh].push(r);
  });

  const totalAll = totalGlt > 0 ? totalGlt : records.length;

  const rows: CustomerAgingRow[] = Object.entries(map).map(([kh, list]) => {
    const total = list.length;
    const sharePct = totalAll > 0 ? (total / totalAll) * 100 : 0;

    let lt_1d = 0;
    let p_1_3d = 0;
    let p_3_5d = 0;
    let p_5_8d = 0;
    let p_gt_8d_192h = 0;

    for (let i = 0; i < list.length; i++) {
      const g = classifyGltAging(list[i].thoiGianTonDong, list[i].canhBao);
      if (g.key === 'lt_1d') lt_1d++;
      else if (g.key === '1_3d') p_1_3d++;
      else if (g.key === '3_5d') p_3_5d++;
      else if (g.key === '5_8d') p_5_8d++;
      else if (g.key === 'gt_8d_192h') p_gt_8d_192h++;
    }

    const overdueCount = p_3_5d + p_5_8d + p_gt_8d_192h;
    const overdueRate = total > 0 ? (overdueCount / total) * 100 : 0;

    let partnerName = kh;
    let categoryBadge = 'Khách Sàn';
    if (kh === 'TTS') {
      partnerName = 'TikTok Shop (TTS)';
      categoryBadge = 'Sàn TMĐT #1';
    } else if (kh === 'SHOPEE') {
      partnerName = 'Shopee E-Commerce';
      categoryBadge = 'Sàn TMĐT #2';
    } else if (kh === 'OTHER') {
      partnerName = 'Khách Lẻ / Shop Ngoài Sàn';
      categoryBadge = 'Shop Ruột';
    } else if (kh.includes('BULKY')) {
      partnerName = `${kh} (Hàng Cồng Kềnh)`;
      categoryBadge = 'Cồng Kềnh';
    } else if (kh.includes('REVERSE')) {
      partnerName = `${kh} (Hàng Chuyển Hoàn)`;
      categoryBadge = 'Chuyển Hoàn';
    }

    let slaPressure: CustomerAgingRow['slaPressure'] = 'Kiểm Soát Tốt';
    if (p_gt_8d_192h > 0 || overdueRate >= 20 || (kh === 'TTS' && overdueCount >= 50)) {
      slaPressure = 'Rất Cao (Khẩn)';
    } else if (overdueRate >= 10 || p_5_8d > 0) {
      slaPressure = 'Cao';
    } else if (overdueRate >= 5) {
      slaPressure = 'Trung Bình';
    }

    return {
      khachHang: kh,
      partnerName,
      categoryBadge,
      total,
      sharePct,
      lt_1d,
      p_1_3d,
      p_3_5d,
      p_5_8d,
      p_gt_8d_192h,
      overdueCount,
      overdueRate,
      slaPressure
    };
  }).sort((a, b) => b.total - a.total);

  const totals: CustomerAgingRow = rows.reduce((acc, cur) => ({
    khachHang: 'TẤT CẢ KHÁCH HÀNG',
    partnerName: 'Toàn Bộ Đối Tác Khách Hàng',
    categoryBadge: 'Toàn Khu Vực',
    total: acc.total + cur.total,
    sharePct: 100,
    lt_1d: acc.lt_1d + cur.lt_1d,
    p_1_3d: acc.p_1_3d + cur.p_1_3d,
    p_3_5d: acc.p_3_5d + cur.p_3_5d,
    p_5_8d: acc.p_5_8d + cur.p_5_8d,
    p_gt_8d_192h: acc.p_gt_8d_192h + cur.p_gt_8d_192h,
    overdueCount: acc.overdueCount + cur.overdueCount,
    overdueRate: 0,
    slaPressure: 'Rất Cao (Khẩn)'
  }), {
    khachHang: 'TẤT CẢ KHÁCH HÀNG',
    partnerName: 'Toàn Bộ Đối Tác Khách Hàng',
    categoryBadge: 'Toàn Khu Vực',
    total: 0,
    sharePct: 100,
    lt_1d: 0,
    p_1_3d: 0,
    p_3_5d: 0,
    p_5_8d: 0,
    p_gt_8d_192h: 0,
    overdueCount: 0,
    overdueRate: 0,
    slaPressure: 'Rất Cao (Khẩn)'
  });

  totals.overdueRate = totals.total > 0 ? (totals.overdueCount / totals.total) * 100 : 0;

  const chartData = rows.map(r => ({
    name: r.khachHang,
    khachHang: r.khachHang,
    total: r.total,
    lt_1d: r.lt_1d,
    p_1_3d: r.p_1_3d,
    p_3_5d: r.p_3_5d,
    p_5_8d: r.p_5_8d,
    p_gt_8d_192h: r.p_gt_8d_192h,
    overdueRate: Number(r.overdueRate.toFixed(1)),
    urgent192h: r.p_gt_8d_192h
  }));

  return { rows, totals, chartData };
}
