import type { 
  GtcPostOfficeRecord, 
  GtcEmployeeRecord, 
  DailySalaryRecord, 
  BacklogGltRecord, 
  BacklogLcRecord 
} from '../types/dashboard';

export interface OverviewKPIs {
  totalVolume: number;
  totalSldGTC: number;
  gtcRateTotal: number; // in %
  totalSldGan: number;
  assignedRateTotal: number; // in %
  returnRateTotal: number; // in %
  totalLeadtimeAvg: number;
  totalBacklog: number;
  totalGltBacklog: number;
  totalLcBacklog: number;
  urgentOverdueOrders: number; // > 120h
  totalSalary: number;
  activeEmployeesCount: number;
  activePostOfficesCount: number;
}

export interface PostOfficeSummary {
  buuCuc: string;
  volume: number;
  sldGan: number;
  sldGTC: number;
  gtcRate: number;
  assignedRate: number;
  leadtime: number;
  gltBacklog: number;
  lcBacklog: number;
  totalBacklog: number;
  totalSalary: number;
  status: 'Critical' | 'Warning' | 'Good' | 'Excellent';
}

export interface EmployeeSummary {
  maNV: string;
  tenNV: string;
  buuCuc: string;
  tongDon: number;
  tongDonGTC: number;
  gtcRate: number;
  leadtime: number;
  chuyenDi: number;
  workDays: number;
  tongLuong: number;
  status: 'Critical' | 'Warning' | 'Good' | 'Excellent';
}

export interface DailyTrendPoint {
  ngay: string;
  displayDate: string;
  volume: number;
  sldGTC: number;
  sldGan: number;
  gtcRate: number;
  giaoTinhLuong?: number;
  luongNgay?: number;
}

export function calculateOverviewKPIs(
  gtcBcList: GtcPostOfficeRecord[],
  gtcNvList: GtcEmployeeRecord[],
  hhList: DailySalaryRecord[],
  gltList: BacklogGltRecord[],
  lcList: BacklogLcRecord[]
): OverviewKPIs {
  // Volume & GTC totals strictly according to SUM(SLĐ GTC) / SUM(Volume)
  const totalVolume = gtcBcList.reduce((acc, r) => acc + (r.volume || 0), 0);
  const totalSldGTC = gtcBcList.reduce((acc, r) => acc + (r.sldGTC || 0), 0);
  const totalSldGan = gtcBcList.reduce((acc, r) => acc + (r.sldGan || 0), 0);

  const gtcRateTotal = totalVolume > 0 ? (totalSldGTC / totalVolume) * 100 : 0;
  const assignedRateTotal = totalVolume > 0 ? (totalSldGan / totalVolume) * 100 : 0;

  // Leadtime average weighted by volume
  const totalWeightedLt = gtcBcList.reduce((acc, r) => acc + (r.leadtime || 0) * (r.volume || 0), 0);
  const totalLeadtimeAvg = totalVolume > 0 ? totalWeightedLt / totalVolume : 0;

  // Approximate return rate from GTC Bưu cục
  const totalReturnVol = gtcBcList.reduce((acc, r) => {
    const pct = parseFloat(r.tiLeChuyenTra?.replace('%', '').replace(',', '.') || '0') / 100;
    return acc + (r.volume * pct);
  }, 0);
  const returnRateTotal = totalVolume > 0 ? (totalReturnVol / totalVolume) * 100 : 0;

  // Backlogs: Count unique orders
  const gltUnique = new Set(gltList.map(r => r.maDonHang)).size;
  const lcUnique = new Set(lcList.map(r => r.maDonHang)).size;
  const totalBacklog = gltUnique + lcUnique;

  // Urgent overdue orders (> 120h)
  const urgentOverdueOrders = gltList.filter(
    r => r.thoiGianTonDong === '120_192' || r.thoiGianTonDong === '192'
  ).length;

  // Salary
  const totalSalary = hhList.reduce((acc, r) => acc + (r.tongLuong || 0), 0);

  // Active employees and post offices
  const activeEmployeesCount = new Set(gtcNvList.map(r => r.maNV || r.tenNV)).size;
  const activePostOfficesCount = new Set(gtcBcList.map(r => r.buuCuc)).size;

  return {
    totalVolume,
    totalSldGTC,
    gtcRateTotal,
    totalSldGan,
    assignedRateTotal,
    returnRateTotal,
    totalLeadtimeAvg,
    totalBacklog,
    totalGltBacklog: gltUnique,
    totalLcBacklog: lcUnique,
    urgentOverdueOrders,
    totalSalary,
    activeEmployeesCount,
    activePostOfficesCount
  };
}

export function calculatePostOfficeSummaries(
  gtcBcList: GtcPostOfficeRecord[],
  hhList: DailySalaryRecord[],
  gltList: BacklogGltRecord[],
  lcList: BacklogLcRecord[]
): PostOfficeSummary[] {
  const normBc = (bc?: string): string => {
    if (!bc) return '';
    const trimmed = bc.trim();
    if (trimmed === '(LAN) Cần Đước' || trimmed === 'Cần Đước') return '(LAN) Cần Đước 1';
    return trimmed;
  };

  const map: Record<string, {
    volume: number;
    sldGan: number;
    sldGTC: number;
    weightedLeadtime: number;
  }> = {};

  gtcBcList.forEach(r => {
    const po = normBc(r.buuCuc);
    if (!po) return;
    if (!map[po]) {
      map[po] = { volume: 0, sldGan: 0, sldGTC: 0, weightedLeadtime: 0 };
    }
    map[po].volume += r.volume || 0;
    map[po].sldGan += r.sldGan || 0;
    map[po].sldGTC += r.sldGTC || 0;
    map[po].weightedLeadtime += (r.leadtime || 0) * (r.volume || 0);
  });

  // GLT Backlog by Post office
  const gltMap: Record<string, number> = {};
  gltList.forEach(r => {
    const po = normBc(r.buuCuc);
    if (po) gltMap[po] = (gltMap[po] || 0) + 1;
  });

  // LC Backlog by Post office
  const lcMap: Record<string, number> = {};
  lcList.forEach(r => {
    const po = normBc(r.tenBC);
    if (po) lcMap[po] = (lcMap[po] || 0) + 1;
  });

  // Salary by Post office
  const salaryMap: Record<string, number> = {};
  hhList.forEach(r => {
    const po = normBc(r.tenBC);
    if (po) salaryMap[po] = (salaryMap[po] || 0) + (r.tongLuong || 0);
  });

  return Object.entries(map).map(([buuCuc, data]) => {
    const gtcRate = data.volume > 0 ? (data.sldGTC / data.volume) * 100 : 0;
    const assignedRate = data.volume > 0 ? (data.sldGan / data.volume) * 100 : 0;
    const leadtime = data.volume > 0 ? data.weightedLeadtime / data.volume : 0;
    const gltBacklog = gltMap[buuCuc] || 0;
    const lcBacklog = lcMap[buuCuc] || 0;
    const totalBacklog = gltBacklog + lcBacklog;
    const totalSalary = salaryMap[buuCuc] || 0;

    let status: PostOfficeSummary['status'] = 'Good';
    if (gtcRate < 62 || gltBacklog > 3000) status = 'Critical';
    else if (gtcRate < 66 || gltBacklog > 1500) status = 'Warning';
    else if (gtcRate >= 70) status = 'Excellent';

    return {
      buuCuc,
      volume: data.volume,
      sldGan: data.sldGan,
      sldGTC: data.sldGTC,
      gtcRate,
      assignedRate,
      leadtime,
      gltBacklog,
      lcBacklog,
      totalBacklog,
      totalSalary,
      status
    };
  }).sort((a, b) => b.volume - a.volume);
}

export function calculateEmployeeSummaries(
  gtcNvList: GtcEmployeeRecord[],
  hhList: DailySalaryRecord[]
): EmployeeSummary[] {
  const map: Record<string, {
    maNV: string;
    tenNV: string;
    buuCuc: string;
    tongDon: number;
    tongDonGTC: number;
    weightedLeadtime: number;
    chuyenDi: number;
    daysCount: number;
  }> = {};

  gtcNvList.forEach(r => {
    const key = r.maNV || r.tenNV;
    if (!map[key]) {
      map[key] = {
        maNV: r.maNV,
        tenNV: r.tenNV,
        buuCuc: r.buuCuc,
        tongDon: 0,
        tongDonGTC: 0,
        weightedLeadtime: 0,
        chuyenDi: 0,
        daysCount: 0
      };
    }
    map[key].tongDon += r.tongDon || 0;
    map[key].tongDonGTC += r.tongDonGTC || 0;
    map[key].weightedLeadtime += (r.leadtime || 0) * (r.tongDon || 0);
    map[key].chuyenDi += r.chuyenDi || 0;
    map[key].daysCount++;
  });

  // Match salary by maNV
  const salaryMap: Record<string, { tongLuong: number; workDays: number }> = {};
  hhList.forEach(r => {
    if (!salaryMap[r.maNV]) {
      salaryMap[r.maNV] = { tongLuong: 0, workDays: 0 };
    }
    salaryMap[r.maNV].tongLuong += r.tongLuong || 0;
    salaryMap[r.maNV].workDays += r.soNgayDiLam || 1;
  });

  return Object.values(map).map(e => {
    const gtcRate = e.tongDon > 0 ? (e.tongDonGTC / e.tongDon) * 100 : 0;
    const leadtime = e.tongDon > 0 ? e.weightedLeadtime / e.tongDon : 0;
    const salaryInfo = salaryMap[e.maNV] || { tongLuong: 0, workDays: e.daysCount };

    let status: EmployeeSummary['status'] = 'Good';
    if (gtcRate < 60) status = 'Critical';
    else if (gtcRate < 72) status = 'Warning';
    else if (gtcRate >= 82) status = 'Excellent';

    return {
      maNV: e.maNV,
      tenNV: e.tenNV,
      buuCuc: e.buuCuc,
      tongDon: e.tongDon,
      tongDonGTC: e.tongDonGTC,
      gtcRate,
      leadtime,
      chuyenDi: e.chuyenDi,
      workDays: salaryInfo.workDays,
      tongLuong: salaryInfo.tongLuong,
      status
    };
  }).sort((a, b) => b.tongDonGTC - a.tongDonGTC);
}

export function calculateDailyTrends(
  gtcBcList: GtcPostOfficeRecord[],
  hhList: DailySalaryRecord[]
): DailyTrendPoint[] {
  const map: Record<string, {
    volume: number;
    sldGTC: number;
    sldGan: number;
  }> = {};

  gtcBcList.forEach(r => {
    if (!r.ngay) return;
    if (!map[r.ngay]) {
      map[r.ngay] = { volume: 0, sldGTC: 0, sldGan: 0 };
    }
    map[r.ngay].volume += r.volume || 0;
    map[r.ngay].sldGTC += r.sldGTC || 0;
    map[r.ngay].sldGan += r.sldGan || 0;
  });

  const salaryMap: Record<string, { giaoTL: number; luong: number }> = {};
  hhList.forEach(r => {
    if (!r.ngay) return;
    if (!salaryMap[r.ngay]) {
      salaryMap[r.ngay] = { giaoTL: 0, luong: 0 };
    }
    salaryMap[r.ngay].giaoTL += r.donGiaoTinhLuong || 0;
    salaryMap[r.ngay].luong += r.tongLuong || 0;
  });

  // Sort dates dd/MM/yyyy: GẦN NHẤT ĐẾN XA NHẤT (Newest to Oldest) theo yêu cầu
  const parseDate = (d: string) => {
    const parts = d.split('/');
    if (parts.length === 3) {
      return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0])).getTime();
    }
    return 0;
  };

  return Object.keys(map)
    .sort((a, b) => parseDate(b) - parseDate(a)) // GẦN NHẤT ĐẾN XA NHẤT
    .map(ngay => {
      const data = map[ngay];
      const sal = salaryMap[ngay] || { giaoTL: 0, luong: 0 };
      const gtcRate = data.volume > 0 ? (data.sldGTC / data.volume) * 100 : 0;
      return {
        ngay,
        displayDate: ngay.slice(0, 5), // '15/10'
        volume: data.volume,
        sldGTC: data.sldGTC,
        sldGan: data.sldGan,
        gtcRate: parseFloat(gtcRate.toFixed(2)),
        giaoTinhLuong: sal.giaoTL,
        luongNgay: sal.luong
      };
    });
}
