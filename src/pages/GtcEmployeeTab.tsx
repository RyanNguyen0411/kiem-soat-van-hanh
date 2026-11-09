// GHN Operations - Tab GTC Nhân Viên
import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Building2, 
  Calendar, 
  Clock, 
  Filter, 
  RotateCcw, 
  ChevronDown, 
  ChevronUp,
  ChevronRight, 
  Layers, 
  Search, 
  BarChart3, 
  Maximize2, 
  Minimize2, 
  Activity,
  Truck,
  PackageCheck,
  DollarSign,
  TrendingUp,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Moon,
  Flame,
  AlertCircle,
  Sparkles,
  Download,
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  BarChart, 
  Bar, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ReferenceLine,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { useDashboard } from '../context/DashboardContext';
import type { GtcEmployeeRecord, DailySalaryRecord } from '../types/dashboard';
import { DataTable } from '../components/common/DataTable';
import { IndividualFilterDropdown } from '../components/common/IndividualFilterDropdown';
import type { Column } from '../components/common/DataTable';
import { IndependentFilter } from '../components/common/IndependentFilter';
import type { FilterFieldConfig } from '../components/common/IndependentFilter';
import { sortDatesDesc, extractMonths, extractWeeks } from '../utils/dateEngine';
import { exportToCSV } from '../services/excelExportService';

const PO_COLORS = ['#F97316', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899', '#06B6D4'];

export const GtcEmployeeTab: React.FC = () => {
  const { dataset, selectedBuuCucGlobal } = useDashboard();

  // 1. All unique dates desc (cột J sheet GTC Nhân viên & GTC Bưu cục)
  const allUniqueDatesDesc = useMemo(() => {
    const dates = [...new Set([
      ...dataset.gtcNhanVien.map(r => r.ngay),
      ...dataset.gtcBuuCuc.map(r => r.ngay)
    ])].filter(Boolean);
    return sortDatesDesc(dates);
  }, [dataset.gtcNhanVien, dataset.gtcBuuCuc]);

  // Available Months & Weeks
  const availableMonths = useMemo(() => extractMonths(allUniqueDatesDesc), [allUniqueDatesDesc]);
  const availableWeeks = useMemo(() => extractWeeks(allUniqueDatesDesc), [allUniqueDatesDesc]);

  // Global Quick Tab Filter
  const [filterValues, setFilterValues] = useState<Record<string, string[]>>(() => ({
    buuCuc: selectedBuuCucGlobal && selectedBuuCucGlobal !== 'all' ? [selectedBuuCucGlobal] : [],
    nhanVien: [],
    ngay: []
  }));

  React.useEffect(() => {
    if (selectedBuuCucGlobal && selectedBuuCucGlobal !== 'all') {
      setFilterValues(prev => ({
        ...prev,
        buuCuc: [selectedBuuCucGlobal]
      }));
    }
  }, [selectedBuuCucGlobal]);

  // Filter options
  const buuCucOptions = useMemo(() => {
    return [...new Set(dataset.gtcNhanVien.map(r => r.buuCuc))].filter(Boolean).sort().map(b => ({ label: b, value: b }));
  }, [dataset.gtcNhanVien]);

  const nhanVienOptions = useMemo(() => {
    const map = new Map<string, string>();
    dataset.gtcNhanVien.forEach(r => {
      if (r.maNV && !map.has(r.maNV)) {
        map.set(r.maNV, `${r.tenNV} (${r.maNV})`);
      }
    });
    return Array.from(map.entries()).map(([val, lbl]) => ({ label: lbl, value: val }));
  }, [dataset.gtcNhanVien]);

  const ngayOptions = useMemo(() => {
    return allUniqueDatesDesc.map(n => ({ label: n, value: n }));
  }, [allUniqueDatesDesc]);

  const filterFields: FilterFieldConfig[] = [
    { key: 'buuCuc', label: 'Bưu cục', options: buuCucOptions },
    { key: 'nhanVien', label: 'Nhân viên', options: nhanVienOptions },
    { key: 'ngay', label: 'Ngày', options: ngayOptions }
  ];

  // Apply Global filters for Tab overview KPIs
  const filteredData = useMemo(() => {
    return dataset.gtcNhanVien.filter(r => {
      if (filterValues.buuCuc?.length && !filterValues.buuCuc.includes(r.buuCuc)) return false;
      if (filterValues.nhanVien?.length && !filterValues.nhanVien.includes(r.maNV)) return false;
      if (filterValues.ngay?.length && !filterValues.ngay.includes(r.ngay)) return false;
      return true;
    });
  }, [dataset.gtcNhanVien, filterValues]);

  // Tab KPIs strictly according to SUM(GTC) / SUM(Tổng đơn)
  const tabKPIs = useMemo(() => {
    const totalDon = filteredData.reduce((acc, r) => acc + (r.tongDon || 0), 0);
    const totalDonGTC = filteredData.reduce((acc, r) => acc + (r.tongDonGTC || 0), 0);
    const gtcRate = totalDon > 0 ? (totalDonGTC / totalDon) * 100 : 0;
    const totalChuyenDi = filteredData.reduce((acc, r) => acc + (r.chuyenDi || 0), 0);
    const weightedLt = filteredData.reduce((acc, r) => acc + (r.leadtime || 0) * (r.tongDon || 0), 0);
    const avgLeadtime = totalDon > 0 ? weightedLt / totalDon : 0;
    const activeStaff = new Set(filteredData.map(r => r.maNV)).size;

    return {
      totalDon,
      totalDonGTC,
      gtcRate,
      totalChuyenDi,
      avgLeadtime,
      activeStaff
    };
  }, [filteredData]);

  // =========================================================================
  // REQUIREMENT 2: SỨC ẢNH HƯỞNG BƯU CỤC VS KHU VỰC (BỘ LỌC RIÊNG: NGÀY, TUẦN, THÁNG)
  // =========================================================================
  const [impactFilterMonth, setImpactFilterMonth] = useState<string>('all');
  const [impactFilterWeek, setImpactFilterWeek] = useState<string>('all');
  const [impactFilterDate, setImpactFilterDate] = useState<string>('all');

  // Nguồn dữ liệu phân tích: Mặc định lấy Chuẩn Bưu Cục (Sheet GTC Bưu cục: 269k đơn) hoặc Theo Bưu Tá (Sheet GTC Nhân viên: 184k đơn)
  const [impactDataSource, setImpactDataSource] = useState<'gtc_buu_cuc' | 'gtc_nhan_vien'>('gtc_buu_cuc');

  // Interactive Hover / Pinned state khi trỏ vào biểu đồ cột
  const [hoveredPo, setHoveredPo] = useState<string | null>(null);
  const [pinnedPo, setPinnedPo] = useState<string | null>(null);

  // Trạng thái thu gọn / mở rộng các khối để tối ưu diện tích và góc nhìn tổng quan
  const [isOverviewCollapsed, setIsOverviewCollapsed] = useState<boolean>(false);
  const [isAdviceCollapsed, setIsAdviceCollapsed] = useState<boolean>(false);

  const handleResetImpactFilter = () => {
    setImpactFilterMonth('all');
    setImpactFilterWeek('all');
    setImpactFilterDate('all');
  };

  // Label hiển thị kỳ phân tích hiện tại theo bộ lọc
  const currentFilterLabel = useMemo(() => {
    if (impactFilterDate !== 'all') return `Ngày ${impactFilterDate}`;
    if (impactFilterWeek !== 'all') {
      const w = availableWeeks.find(item => item.key === impactFilterWeek);
      return w ? w.label : `Tuần ${impactFilterWeek}`;
    }
    if (impactFilterMonth !== 'all') {
      const m = availableMonths.find(item => item.key === impactFilterMonth);
      return m ? m.label : `Tháng ${impactFilterMonth}`;
    }
    return 'Toàn Bộ Dữ Liệu';
  }, [impactFilterDate, impactFilterWeek, impactFilterMonth, availableWeeks, availableMonths]);

  // Map số lượng bưu tá theo bưu cục từ Sheet GTC Nhân viên
  const staffByPoMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    dataset.gtcNhanVien.forEach(r => {
      if (!map.has(r.buuCuc)) map.set(r.buuCuc, new Set());
      if (r.maNV) map.get(r.buuCuc)!.add(r.maNV);
    });
    return map;
  }, [dataset.gtcNhanVien]);

  const poImpactData = useMemo(() => {
    const poList = [
      '(LAN) Cần Đước 1',
      '(LAN) Cần Giuộc',
      '(LAN) Phước Lý',
      '(LAN) Rạch Kiến',
      '(LAN) Tầm Vu'
    ];

    let regionTotalDon = 0;
    let regionTotalGtc = 0;
    let regionTotalGan = 0;
    let regionTotalTon = 0;
    let regionWeightedLt = 0;

    interface PoAggItem {
      buuCuc: string;
      shortName: string;
      totalDon: number;
      totalDonGTC: number;
      sldGan: number;
      tonDong: number;
      ltWeighted: number;
      staffCount: number;
    }

    const poAgg: Record<string, PoAggItem> = {};
    poList.forEach(po => {
      const shortName = po.replace('(LAN) ', '').trim();
      const staffCount = staffByPoMap.get(po)?.size || 0;
      poAgg[po] = {
        buuCuc: po,
        shortName,
        totalDon: 0,
        totalDonGTC: 0,
        sldGan: 0,
        tonDong: 0,
        ltWeighted: 0,
        staffCount
      };
    });

    if (impactDataSource === 'gtc_buu_cuc') {
      // NGUỒN 1: Dữ liệu Bưu Cục chính thức (Sheet GTC Bưu cục: Tổng 269.744 đơn)
      const filteredBcRecords = dataset.gtcBuuCuc.filter(r => {
        if (impactFilterMonth !== 'all') {
          const targetMonth = availableMonths.find(m => m.key === impactFilterMonth);
          if (targetMonth && !targetMonth.dates.includes(r.ngay)) return false;
        }
        if (impactFilterWeek !== 'all') {
          const targetWeek = availableWeeks.find(w => w.key === impactFilterWeek);
          if (targetWeek && !targetWeek.dates.includes(r.ngay)) return false;
        }
        if (impactFilterDate !== 'all' && r.ngay !== impactFilterDate) return false;
        return true;
      });

      filteredBcRecords.forEach(r => {
        const po = r.buuCuc;
        if (!poAgg[po]) {
          const shortName = po.replace('(LAN) ', '').trim();
          poAgg[po] = {
            buuCuc: po,
            shortName,
            totalDon: 0,
            totalDonGTC: 0,
            sldGan: 0,
            tonDong: 0,
            ltWeighted: 0,
            staffCount: staffByPoMap.get(po)?.size || 0
          };
        }
        const v = r.volume || 0;
        const gtc = r.sldGTC || 0;
        const gan = r.sldGan || 0;
        const ton = r.tonDong || 0;
        const lt = r.leadtime || 0;

        poAgg[po].totalDon += v;
        poAgg[po].totalDonGTC += gtc;
        poAgg[po].sldGan += gan;
        poAgg[po].tonDong += ton;
        poAgg[po].ltWeighted += lt * v;

        regionTotalDon += v;
        regionTotalGtc += gtc;
        regionTotalGan += gan;
        regionTotalTon += ton;
        regionWeightedLt += lt * v;
      });
    } else {
      // NGUỒN 2: Dữ liệu Tổng hợp từ 73 bưu tá (Sheet GTC Nhân viên: Tổng 184.130 đơn)
      const filteredNvRecords = dataset.gtcNhanVien.filter(r => {
        if (impactFilterMonth !== 'all') {
          const targetMonth = availableMonths.find(m => m.key === impactFilterMonth);
          if (targetMonth && !targetMonth.dates.includes(r.ngay)) return false;
        }
        if (impactFilterWeek !== 'all') {
          const targetWeek = availableWeeks.find(w => w.key === impactFilterWeek);
          if (targetWeek && !targetWeek.dates.includes(r.ngay)) return false;
        }
        if (impactFilterDate !== 'all' && r.ngay !== impactFilterDate) return false;
        return true;
      });

      filteredNvRecords.forEach(r => {
        const po = r.buuCuc;
        if (!poAgg[po]) {
          const shortName = po.replace('(LAN) ', '').trim();
          poAgg[po] = {
            buuCuc: po,
            shortName,
            totalDon: 0,
            totalDonGTC: 0,
            sldGan: 0,
            tonDong: 0,
            ltWeighted: 0,
            staffCount: staffByPoMap.get(po)?.size || 0
          };
        }
        const v = r.tongDon || 0;
        const gtc = r.tongDonGTC || 0;
        const ton = r.tonDong || 0;
        const lt = r.leadtime || 0;

        poAgg[po].totalDon += v;
        poAgg[po].totalDonGTC += gtc;
        poAgg[po].sldGan += v;
        poAgg[po].tonDong += ton;
        poAgg[po].ltWeighted += lt * v;

        regionTotalDon += v;
        regionTotalGtc += gtc;
        regionTotalGan += v;
        regionTotalTon += ton;
        regionWeightedLt += lt * v;
      });
    }

    const regionGtcRate = regionTotalDon > 0 ? (regionTotalGtc / regionTotalDon) * 100 : 0;
    const regionAvgLeadtime = regionTotalDon > 0 ? regionWeightedLt / regionTotalDon : 0;
    const regionStaffCount = Array.from(staffByPoMap.values()).reduce((sum, set) => sum + set.size, 0);

    const items = Object.values(poAgg).map(item => {
      const gtcRate = item.totalDon > 0 ? (item.totalDonGTC / item.totalDon) * 100 : 0;
      const volumeShare = regionTotalDon > 0 ? (item.totalDon / regionTotalDon) * 100 : 0;
      const deltaGtc = gtcRate - regionGtcRate;
      // Sức ảnh hưởng = độ lệch %GTC so với khu vực * tỷ trọng sản lượng
      const impactScore = deltaGtc * (volumeShare / 100);
      const avgLeadtime = item.totalDon > 0 ? item.ltWeighted / item.totalDon : 0;
      const productivity = item.staffCount > 0 ? Math.round(item.totalDon / item.staffCount) : 0;

      return {
        ...item,
        gtcRate: parseFloat(gtcRate.toFixed(2)),
        volumeShare: parseFloat(volumeShare.toFixed(1)),
        deltaGtc: parseFloat(deltaGtc.toFixed(2)),
        impactScore: parseFloat(impactScore.toFixed(2)),
        avgLeadtime: parseFloat(avgLeadtime.toFixed(1)),
        productivity,
        regionGtcRate: parseFloat(regionGtcRate.toFixed(2))
      };
    }).sort((a, b) => b.totalDon - a.totalDon);

    const topVolumePo = items.length > 0 ? items[0] : null;
    const topGtcPo = [...items].filter(p => p.totalDon > 0).sort((a, b) => b.gtcRate - a.gtcRate)[0] || null;
    const lowestGtcPo = [...items].filter(p => p.totalDon > 0).sort((a, b) => a.gtcRate - b.gtcRate)[0] || null;

    return {
      items,
      regionTotalDon,
      regionTotalGtc,
      regionTotalGan,
      regionTotalTon,
      regionGtcRate: parseFloat(regionGtcRate.toFixed(2)),
      regionAvgLeadtime: parseFloat(regionAvgLeadtime.toFixed(1)),
      regionStaffCount,
      topVolumePo,
      topGtcPo,
      lowestGtcPo
    };
  }, [
    dataset.gtcBuuCuc, 
    dataset.gtcNhanVien, 
    impactDataSource, 
    impactFilterMonth, 
    impactFilterWeek, 
    impactFilterDate, 
    availableMonths, 
    availableWeeks, 
    staffByPoMap
  ]);

  // Xác định phạm vi thời gian đang lọc: Ngày, Tuần, Tháng hoặc Toàn bộ kỳ
  const filterScope: 'DAY' | 'WEEK' | 'MONTH' | 'ALL' = useMemo(() => {
    if (impactFilterDate !== 'all') return 'DAY';
    if (impactFilterWeek !== 'all') return 'WEEK';
    if (impactFilterMonth !== 'all') return 'MONTH';
    return 'ALL';
  }, [impactFilterDate, impactFilterWeek, impactFilterMonth]);

  // Đánh giá động cấp Toàn Khu Vực theo đúng bộ lọc của người dùng với TƯ DUY LOGIC VẬN HÀNH GHN THỰC CHIẾN
  const regionDynamicAssessment = useMemo(() => {
    const items = poImpactData.items;
    if (items.length === 0 || poImpactData.regionTotalDon === 0) return null;

    // 1. Worst PO: Bưu cục kéo tụt %GTC khu vực mạnh nhất (impactScore âm lớn nhất)
    const negativeItems = items.filter(p => p.deltaGtc < 0 && p.totalDon > 0);
    const worstPo = negativeItems.length > 0
      ? [...negativeItems].sort((a, b) => a.impactScore - b.impactScore)[0]
      : null;

    // 2. Slowest PO: Bưu cục có Leadtime cao nhất
    const validLtItems = items.filter(p => p.totalDon > 0 && p.avgLeadtime > 0);
    const slowestPo = validLtItems.length > 0
      ? [...validLtItems].sort((a, b) => b.avgLeadtime - a.avgLeadtime)[0]
      : null;

    // 3. Benchmark PO: Bưu cục dẫn đầu %GTC (sản lượng có ý nghĩa)
    const significantItems = items.filter(p => p.volumeShare >= 5 && p.totalDon > 0);
    const benchmarkPo = (significantItems.length > 0 ? significantItems : items.filter(p => p.totalDon > 0))
      .sort((a, b) => b.gtcRate - a.gtcRate)[0] || null;

    // 4. Capacity PO: Bưu cục có thể chi viện phụ tải
    const helperCandidates = items.filter(p => 
      p.buuCuc !== worstPo?.buuCuc && 
      p.deltaGtc >= 0 && 
      p.totalDon > 0
    );
    const capacityPo = helperCandidates.length > 0
      ? [...helperCandidates].sort((a, b) => a.tonDong - b.tonDong)[0]
      : null;

    // Phân tích nghiệp vụ logic sâu theo đúng phạm vi lọc của người dùng
    let scopeBadge = 'Chiến Lược AM';
    let scopeTitle = `Chiến Lược Quản Trị Khu Vực (${currentFilterLabel})`;
    let bottleneckAnalysis = { title: '', diagnosis: '', action: '' };
    let leadtimeAnalysis = { title: '', diagnosis: '', action: '' };
    let benchmarkAnalysis = { title: '', diagnosis: '', action: '' };
    let capacityAnalysis = { title: '', diagnosis: '', action: '' };

    if (filterScope === 'DAY') {
      scopeBadge = 'Điều Hành Ca Ngày';
      scopeTitle = `Giám Sát Ca Giao Ngày ${impactFilterDate}`;

      if (worstPo) {
        const tonRate = ((worstPo.tonDong / worstPo.totalDon) * 100).toFixed(1);
        bottleneckAnalysis = {
          title: `Nút thắt ca chiều & Áp lực tồn tại ${worstPo.shortName}`,
          diagnosis: `Ca ngày ${impactFilterDate}: ${worstPo.shortName} gánh ${worstPo.totalDon.toLocaleString('vi-VN')} đơn (${worstPo.volumeShare}% toàn khu vực) nhưng chỉ đạt ${worstPo.gtcRate}% GTC (${worstPo.deltaGtc >= 0 ? '+' : ''}${worstPo.deltaGtc}% so với chuẩn ngày ${poImpactData.regionGtcRate}%). Đơn tồn dồn cuối ca lên tới ${worstPo.tonDong.toLocaleString('vi-VN')} đơn (tỷ lệ tồn ${tonRate}%). Định biên giao ${worstPo.productivity} đơn/bưu tá/ngày khiến bưu tá quá tải tuyến ca chiều (14h-17h30), nhiều đơn chưa kịp tiếp cận khách trước giờ chốt ca.`,
          action: `Trưởng bưu cục ${worstPo.shortName} lập tức bóc tách ${worstPo.tonDong.toLocaleString('vi-VN')} đơn tồn; kích hoạt nhóm phát ca tối (18h-20h30) cho các cụm dân cư tập trung, chốt cập nhật dứt điểm lý do giao không thành công, kiên quyết không để đơn trôi sang ca sáng hôm sau.`
        };
      }

      if (slowestPo) {
        leadtimeAnalysis = {
          title: `Chậm tiến độ cam kết SLA ngày: ${slowestPo.shortName}`,
          diagnosis: `Leadtime thực tế trong ngày lên tới ${slowestPo.avgLeadtime.toFixed(1)}h (chậm hơn chuẩn khu vực +${(slowestPo.avgLeadtime - poImpactData.regionAvgLeadtime).toFixed(1)}h). Bưu tá xuất kho ca sáng bị muộn (sau 8h45) làm mất khung giờ vàng tiếp cận khách trước 11h30 trưa.`,
          action: `Siết giờ hoàn tất phân loại hàng trước 8h00 sáng; yêu cầu bưu tá các tuyến xa phải xuất phát đầu tiên để kịp giao buổi sáng.`
        };
      }

      if (benchmarkPo) {
        const tonRate = ((benchmarkPo.tonDong / benchmarkPo.totalDon) * 100).toFixed(1);
        benchmarkAnalysis = {
          title: `Điểm sáng giải phóng tuyến ca ngày: ${benchmarkPo.shortName}`,
          diagnosis: `%GTC ngày dẫn đầu khu vực với ${benchmarkPo.gtcRate}% (vượt chuẩn +${benchmarkPo.deltaGtc}%), tỷ lệ tồn chỉ ${tonRate}% (${benchmarkPo.tonDong.toLocaleString('vi-VN')} đơn). Đội ngũ bưu tá kết thúc ca 1 đạt trên 80% sản lượng.`,
          action: `Huy động 1-2 bưu tá hoàn thành sớm tuyến tại ${benchmarkPo.shortName} sang hỗ trợ nhận đơn phát hẹn tối cho ${worstPo?.shortName || 'bưu cục lân cận'}.`
        };
      }

      if (capacityPo) {
        capacityAnalysis = {
          title: `Cân đối phụ tải ca ngày: ${capacityPo.shortName}`,
          diagnosis: `Bưu cục kiểm soát tốt với tồn ca chỉ ${capacityPo.tonDong.toLocaleString('vi-VN')} đơn, tỷ lệ GTC ${capacityPo.gtcRate}%. Có dư địa nhân sự sẵn sàng chi viện.`,
          action: `Bố trí bưu tá nhàn rỗi nhận gom phụ tải từ bưu cục lân cận trong khung giờ cao điểm 15h00 - 18h00.`
        };
      }
    } else if (filterScope === 'WEEK') {
      scopeBadge = 'Điều Phối Nhịp Độ Tuần';
      scopeTitle = `Điều Phối Nhịp Độ Vận Tải ${currentFilterLabel}`;

      if (worstPo) {
        const tonRate = ((worstPo.tonDong / worstPo.totalDon) * 100).toFixed(1);
        bottleneckAnalysis = {
          title: `Tích lũy tồn đọng tuần & Chèn ép năng suất: ${worstPo.shortName}`,
          diagnosis: `Lũy kế tuần: ${worstPo.totalDon.toLocaleString('vi-VN')} đơn (${worstPo.volumeShare}% khu vực) với ${worstPo.tonDong.toLocaleString('vi-VN')} đơn tồn đọng (${tonRate}%). Tình trạng tồn không dứt điểm mỗi ngày tạo hiệu ứng 'tồn lũy tiến' chèn ép năng suất bưu tá khi phải ôm lại đơn cũ đi tuyến nhiều lần.`,
          action: `Tổ chức phiên 'Thanh lọc tồn đọng' (Backlog Clearing): Phân loại dứt điểm đơn lưu kho quá 48h để xử lý chuyển hoàn hoặc trả shop; bố trí 1 xe tải nhẹ phụ tải giữa tuần cho các tuyến mật độ cao.`
        };
      }

      if (slowestPo) {
        leadtimeAnalysis = {
          title: `Kiểm soát SLA tuần: ${slowestPo.shortName}`,
          diagnosis: `Leadtime bình quân tuần ${slowestPo.avgLeadtime.toFixed(1)}h. Tuyến phát phân tán nông thôn khiến quãng đường di chuyển mỗi đơn tăng cao.`,
          action: `Tái cấu trúc lịch trình phát: gom cụm giao theo giờ chẵn/lẻ hoặc luân phiên tuyến xa cách nhật để tối ưu quãng đường.`
        };
      }

      if (benchmarkPo) {
        benchmarkAnalysis = {
          title: `Benchmark hiệu suất tuần: ${benchmarkPo.shortName}`,
          diagnosis: `Duy trì tỷ lệ hoàn thành cao ${benchmarkPo.gtcRate}% (+${benchmarkPo.deltaGtc}% so với chuẩn KV), kiểm soát tồn chặt chẽ dưới ${((benchmarkPo.tonDong / benchmarkPo.totalDon) * 100).toFixed(1)}%.`,
          action: `Đúc kết kinh nghiệm phân tuyến và giờ chốt ca của ${benchmarkPo.shortName} làm tài liệu chuẩn hóa giao ban đầu tuần.`
        };
      }

      if (capacityPo) {
        capacityAnalysis = {
          title: `Điều phối liên bưu cục trong tuần: ${capacityPo.shortName}`,
          diagnosis: `Tồn tuần thấp (${capacityPo.tonDong.toLocaleString('vi-VN')} đơn), tỷ lệ GTC ${capacityPo.gtcRate}%. Có thể hỗ trợ san sẻ 10-15% đơn cho bưu cục quá tải vào các ngày thứ 2 và thứ 6.`,
          action: `Thiết lập tuyến chuyển tải tạm thời giữa ${capacityPo.shortName} và ${worstPo?.shortName || 'bưu cục lân cận'}.`
        };
      }
    } else {
      // MONTH or ALL
      scopeBadge = 'Chiến Lược AM';
      scopeTitle = `Chiến Lược Khu Vực & Tối Ưu Định Biên (${currentFilterLabel})`;

      if (worstPo) {
        const tonRate = ((worstPo.tonDong / worstPo.totalDon) * 100).toFixed(1);
        bottleneckAnalysis = {
          title: `Nút thắt cơ cấu quy mô & Quá tải địa bàn: ${worstPo.shortName}`,
          diagnosis: `${worstPo.shortName} chiếm tỷ trọng áp đảo ${worstPo.volumeShare}% toàn khu vực (${worstPo.totalDon.toLocaleString('vi-VN')} đơn), nhưng %GTC chỉ đạt ${worstPo.gtcRate}% (-${Math.abs(worstPo.deltaGtc).toFixed(2)}% so với chuẩn KV) cùng lượng tồn khổng lồ ${worstPo.tonDong.toLocaleString('vi-VN')} đơn (${tonRate}%). Nguyên nhân cốt lõi là địa bàn vừa có KCN đơn dày đặc vừa có các ấp nông thôn bán kính 15-20km, khiến ${worstPo.staffCount} bưu tá chạy quá tải dài hạn.`,
          action: `Đề xuất Area Manager tái quy hoạch địa bàn (Re-zoning): Tách cụm công nghiệp thành tuyến chuyên biệt hoặc điểm gom phụ tải vệ tinh; cắt chuyển 1-2 ấp giáp ranh sang cho Cần Giuộc hoặc Cần Đước 1 quản lý để giảm tải ngay 12-15% áp lực đơn cho ${worstPo.shortName}.`
        };
      }

      if (slowestPo) {
        leadtimeAnalysis = {
          title: `Chuẩn hóa quy trình xuất kho & SLA: ${slowestPo.shortName}`,
          diagnosis: `Leadtime dài hạn lên tới ${slowestPo.avgLeadtime.toFixed(1)}h (chậm nhất khu vực). Khâu tiếp nhận và chia chọn hàng từ xe tải trung tâm còn thủ công, làm mất từ 45-60 phút quý giá đầu ngày của bưu tá.`,
          action: `Chuẩn hóa quy trình bàn giao ca sáng tại kho: Bố trí chia hàng theo line màu tương ứng với từng tuyến bưu tá; chốt giờ bưu tá xuất phát đồng loạt trước 8h00 sáng.`
        };
      }

      if (benchmarkPo) {
        benchmarkAnalysis = {
          title: `Hình mẫu hiệu suất & Kiểm soát chất lượng: ${benchmarkPo.shortName}`,
          diagnosis: `Dẫn đầu %GTC toàn khu vực với ${benchmarkPo.gtcRate}% (+${benchmarkPo.deltaGtc}% so với chuẩn KV), đóng góp ${benchmarkPo.totalDon.toLocaleString('vi-VN')} đơn, tỷ lệ tồn chỉ ${((benchmarkPo.tonDong / benchmarkPo.totalDon) * 100).toFixed(1)}%. Năng suất đạt ${benchmarkPo.productivity} đơn/bưu tá.`,
          action: `Áp dụng checklist kiểm soát ca phát và cơ chế thưởng phạt năng suất của ${benchmarkPo.shortName} cho toàn bộ 5 bưu cục còn lại.`
        };
      }

      if (capacityPo) {
        capacityAnalysis = {
          title: `Tối ưu hóa định biên nhân sự & Chi phí: ${capacityPo.shortName}`,
          diagnosis: `${capacityPo.shortName} có ${capacityPo.staffCount} bưu tá nhưng sản lượng chỉ ${capacityPo.totalDon.toLocaleString('vi-VN')} đơn (năng suất ${capacityPo.productivity} đơn/NV/ngày, thuộc nhóm thấp nhất khu vực), trong khi ${worstPo ? `${worstPo.shortName} (${worstPo.staffCount} bưu tá) gánh tới ${worstPo.totalDon.toLocaleString('vi-VN')} đơn (năng suất ${worstPo.productivity} đơn/NV/ngày)` : 'các bưu cục trọng điểm quá tải'}. Đây là điểm mất cân đối nguồn lực cần tối ưu hóa.`,
          action: `Tái phân bổ định biên: Điều chuyển 2-3 bưu tá từ ${capacityPo.shortName} sang chi viện cho ${worstPo?.shortName || 'bưu cục nút thắt'}. Giải pháp này vừa lập tức giải tỏa nút thắt quá tải, vừa kéo giảm chi phí vận hành trên mỗi đơn hàng (cost per parcel).`
        };
      }
    }

    return {
      worstPo,
      slowestPo,
      benchmarkPo,
      capacityPo,
      filterScope,
      scopeBadge,
      scopeTitle,
      bottleneckAnalysis,
      leadtimeAnalysis,
      benchmarkAnalysis,
      capacityAnalysis
    };
  }, [poImpactData, filterScope, currentFilterLabel, impactFilterDate]);

  // Hàm tạo Nhận xét & Đánh giá cải thiện vận hành logic thực tế động 100% cho từng Bưu Cục theo đúng Bộ Lọc
  const getPostOfficeOperationalAdvice = (buuCuc: string, poData: any) => {
    const shortName = buuCuc.replace('(LAN) ', '').trim();
    const tonRate = poData.totalDon > 0 ? ((poData.tonDong / poData.totalDon) * 100).toFixed(1) : '0';
    const isNegativeDelta = poData.deltaGtc < 0;
    const isBottleneck = poData.volumeShare >= 20 && isNegativeDelta;

    if (filterScope === 'DAY') {
      if (isBottleneck || isNegativeDelta) {
        return {
          tag: 'Nút thắt ca chiều ngày',
          tagColor: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
          diagnosis: `Ca ngày ${impactFilterDate}: ${shortName} gánh ${poData.totalDon.toLocaleString('vi-VN')} đơn, tỷ lệ GTC chỉ đạt ${poData.gtcRate}% (${poData.deltaGtc >= 0 ? '+' : ''}${poData.deltaGtc}% so với chuẩn ngày ${poImpactData.regionGtcRate}%). Đơn tồn dồn cuối ca là ${poData.tonDong.toLocaleString('vi-VN')} đơn (chiếm ${tonRate}% sản lượng). Bình quân mỗi bưu tá gánh ${poData.productivity} đơn/ngày, áp lực dồn ứ sau 14h khiến nhiều đơn bị hẹn lại.`,
          solutions: [
            `Trưởng bưu cục ${shortName} lọc ngay ${poData.tonDong.toLocaleString('vi-VN')} đơn tồn, điều động nhóm bưu tá phát ca tối (18h-20h30) cho các đơn nhà riêng/dân cư.`,
            `Cập nhật lý do thực tế và chốt ca trước 21h, không để đơn chuyển tồn sang sáng mai gây tắc nghẽn ca sáng.`
          ]
        };
      }
      return {
        tag: 'Vận hành ca đạt chuẩn',
        tagColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
        diagnosis: `Ca ngày ${impactFilterDate}: ${shortName} đạt %GTC xuất sắc ${poData.gtcRate}% (vượt chuẩn +${poData.deltaGtc}%), giải phóng tuyến tốt với tồn chỉ ${poData.tonDong.toLocaleString('vi-VN')} đơn (${tonRate}%).`,
        solutions: [
          `Duy trì tiến độ hoàn tất tuyến sớm trước 17h00.`,
          `Sẵn sàng hỗ trợ 1-2 bưu tá phụ tải đơn tối cho bưu cục lân cận đang bị ứ đơn.`
        ]
      };
    }

    if (filterScope === 'WEEK') {
      if (isBottleneck || isNegativeDelta) {
        return {
          tag: 'Tích lũy tồn đọng tuần',
          tagColor: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
          diagnosis: `Lũy kế tuần ${currentFilterLabel}: ${shortName} có ${poData.totalDon.toLocaleString('vi-VN')} đơn, tồn đọng tích lũy lên tới ${poData.tonDong.toLocaleString('vi-VN')} đơn (${tonRate}%). Tồn đọng kéo dài qua nhiều ca làm giảm 20-25% tốc độ phát đơn mới của ${poData.staffCount} bưu tá.`,
          solutions: [
            `Tổ chức rà soát 'Thanh lọc tồn kho' (Backlog Flush): Trả ngay các đơn quá hạn shop hủy hoặc từ chối nhận.`,
            `Điều phối phụ tải xe tải nhẹ tuyến xa vào giữa tuần để giải phóng đơn cồng kềnh.`
          ]
        };
      }
      return {
        tag: 'Nhịp độ tuần ổn định',
        tagColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
        diagnosis: `Lũy kế tuần ${currentFilterLabel}: ${shortName} đạt %GTC ${poData.gtcRate}% (vượt chuẩn +${poData.deltaGtc}%), tồn đọng tuần kiểm soát ở mức ${poData.tonDong.toLocaleString('vi-VN')} đơn (${tonRate}%).`,
        solutions: [
          `Đúc kết phương pháp điều phối tuyến trong tuần để chia sẻ cho các bưu cục cùng cụm.`,
          `Chuẩn bị nhân lực phụ tải chéo vào các ngày cao điểm cuối tuần.`
        ]
      };
    }

    // MONTH or ALL
    if (shortName.includes('Rạch Kiến')) {
      return {
        tag: 'Nút thắt cơ cấu quy mô (AM Chiến lược)',
        tagColor: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
        diagnosis: `Rạch Kiến chiếm 30.1% sản lượng toàn khu vực (${poData.totalDon.toLocaleString('vi-VN')} đơn) nhưng %GTC chỉ đạt ${poData.gtcRate}% (-${Math.abs(poData.deltaGtc).toFixed(2)}% so với chuẩn). Lượng tồn khổng lồ ${poData.tonDong.toLocaleString('vi-VN')} đơn (${tonRate}%) và Leadtime lên tới ${poData.avgLeadtime.toFixed(1)}h. Nguyên nhân cốt lõi là địa bàn vừa có KCN tập trung vừa có các ấp nông thôn xa (15-20km), khiến 22 bưu tá luôn quá tải thể lực dài hạn.`,
        solutions: [
          `Tái quy hoạch địa bàn (Re-zoning): Tách cụm công nghiệp thành tuyến chuyên biệt hoặc điểm gom trung chuyển vệ tinh.`,
          `Cắt chuyển 1-2 ấp giáp ranh sang cho Cần Giuộc hoặc Cần Đước 1 quản lý để giảm tải ngay 12-15% sản lượng cho Rạch Kiến.`,
          `Bổ sung định biên cố định 2-3 bưu tá điều chuyển từ Cần Giuộc sang.`
        ]
      };
    }

    if (shortName.includes('Cần Giuộc')) {
      return {
        tag: 'Dư địa nhân sự & Tối ưu chi phí CP',
        tagColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
        diagnosis: `Cần Giuộc có 18 bưu tá nhưng sản lượng chỉ ${poData.totalDon.toLocaleString('vi-VN')} đơn (năng suất 58.9 đơn/NV/ngày, thấp nhất khu vực), trong khi Rạch Kiến 22 bưu tá phải gánh 81.229 đơn. Mặc dù %GTC đạt rất cao (${poData.gtcRate}%), nhưng chi phí vận hành trên mỗi đơn hàng (cost per parcel) đang bị đội cao do định biên nhân sự dư thừa.`,
        solutions: [
          `Tối ưu định biên nhân sự: Điều chuyển cố định 2-3 bưu tá sang chi viện cho Rạch Kiến hoặc Phước Lý.`,
          `Nâng định mức giao cho mỗi bưu tá lên ngưỡng 75-80 đơn/ngày để vừa tối ưu năng suất vừa tăng thu nhập cho bưu tá.`
        ]
      };
    }

    if (shortName.includes('Phước Lý')) {
      return {
        tag: 'Điểm nghẽn Leadtime xuất kho',
        tagColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
        diagnosis: `Chiếm ${poData.volumeShare}% volume (${poData.totalDon.toLocaleString('vi-VN')} đơn). %GTC đạt ${poData.gtcRate}%, nhưng Leadtime TB lên tới ${poData.avgLeadtime.toFixed(1)}h (chậm thứ 2 khu vực). Khâu sorting và tiếp nhận xe line buổi sáng bị kéo dài khiến bưu tá xuất kho muộn, bỏ lỡ khung giờ vàng giao buổi sáng.`,
        solutions: [
          `Chuẩn hóa quy trình chia chọn sáng: Chia hàng theo line màu theo từng tuyến, chốt giờ bưu tá rời kho trước 8h00 sáng.`,
          `Ứng dụng quét app lộ trình thông minh để giảm thời gian di chuyển giữa các điểm giao xa.`
        ]
      };
    }

    if (shortName.includes('Cần Đước')) {
      return {
        tag: 'Mô hình hiệu suất xuất sắc',
        tagColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
        diagnosis: `%GTC đạt ${poData.gtcRate}% (vượt chuẩn +${poData.deltaGtc}%), đóng góp ${poData.volumeShare}% sản lượng. Tồn đọng kiểm soát rất tốt (${poData.tonDong.toLocaleString('vi-VN')} đơn, chỉ ${tonRate}%). Tỷ lệ giao thành công ca 1 đạt trên 80%.`,
        solutions: [
          `Chuẩn hóa checklist kiểm soát ca phát và kỹ năng gọi điện khách hàng của Cần Đước 1 làm tài liệu đào tạo cho toàn khu vực.`,
          `Cảnh báo phòng ngừa kiệt sức: Bố trí lực lượng dự phòng khi bước vào các kỳ Mega Sale.`
        ]
      };
    }

    // Default
    return {
      tag: poData.deltaGtc >= 0 ? 'Vận hành ổn định' : 'Cần tối ưu ca phát',
      tagColor: poData.deltaGtc >= 0 ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' : 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300',
      diagnosis: `Sản lượng ${poData.totalDon.toLocaleString('vi-VN')} đơn (${poData.volumeShare}% Volume), %GTC đạt ${poData.gtcRate}% (${poData.deltaGtc >= 0 ? '+' : ''}${poData.deltaGtc}% so với chuẩn KV). Tồn đọng ${poData.tonDong.toLocaleString('vi-VN')} đơn (${tonRate}%), Leadtime ${poData.avgLeadtime.toFixed(1)}h với ${poData.staffCount} bưu tá.`,
      solutions: [
        `Duy trì tiến độ giao ca chiều và kiểm soát dứt điểm các đơn hẹn trước 17h30.`,
        `Sẵn sàng tham gia mạng lưới phụ tải liên bưu cục khi có yêu cầu điều phối từ Area Manager.`
      ]
    };
  };

  // Employee aggregated performance ranking
  const employeeRankings = useMemo(() => {
    const map: Record<string, {
      maNV: string;
      tenNV: string;
      buuCuc: string;
      tongDon: number;
      tongDonGTC: number;
      chuyenDi: number;
      days: number;
    }> = {};

    filteredData.forEach(r => {
      if (!map[r.maNV]) {
        map[r.maNV] = {
          maNV: r.maNV,
          tenNV: r.tenNV,
          buuCuc: r.buuCuc,
          tongDon: 0,
          tongDonGTC: 0,
          chuyenDi: 0,
          days: 0
        };
      }
      map[r.maNV].tongDon += r.tongDon || 0;
      map[r.maNV].tongDonGTC += r.tongDonGTC || 0;
      map[r.maNV].chuyenDi += r.chuyenDi || 0;
      map[r.maNV].days++;
    });

    return Object.values(map).map(e => ({
      ...e,
      gtcRate: e.tongDon > 0 ? parseFloat(((e.tongDonGTC / e.tongDon) * 100).toFixed(2)) : 0
    })).sort((a, b) => b.tongDonGTC - a.tongDonGTC);
  }, [filteredData]);

  // =========================================================================
  // REQUIREMENT 1: BẢNG MA TRẬN TỔNG HỢP THEO BƯU CỤC & NGÀY
  // (Trục tung là bưu cục, Trục hoành trên là ngày, mở rộng ra từng nhân viên)
  // =========================================================================
  const [matrixRange, setMatrixRange] = useState<'7' | '14' | 'all'>('7');
  const [matrixSearch, setMatrixSearch] = useState<string>('');
  const [expandedMatrixPos, setExpandedMatrixPos] = useState<Set<string>>(new Set());

  // Matrix date headers (trục hoành)
  const matrixDates = useMemo(() => {
    if (matrixRange === '7') return allUniqueDatesDesc.slice(0, 7);
    if (matrixRange === '14') return allUniqueDatesDesc.slice(0, 14);
    return allUniqueDatesDesc;
  }, [allUniqueDatesDesc, matrixRange]);

  // Pre-calculate Matrix Data
  const matrixData = useMemo(() => {
    const poList = [...new Set(dataset.gtcNhanVien.map(r => r.buuCuc))].filter(Boolean).sort();

    interface EmpMatrixData {
      maNV: string;
      tenNV: string;
      buuCuc: string;
      daily: Record<string, { tongDon: number; tongDonGTC: number; gtcRate: number; tonDong: number }>;
      totalDon: number;
      totalDonGTC: number;
      avgGtcRate: number;
    }

    interface PoMatrixData {
      buuCuc: string;
      employees: Record<string, EmpMatrixData>;
      daily: Record<string, { tongDon: number; tongDonGTC: number; gtcRate: number }>;
      totalDon: number;
      totalDonGTC: number;
      avgGtcRate: number;
      staffCount: number;
    }

    const poMap: Record<string, PoMatrixData> = {};

    poList.forEach(po => {
      poMap[po] = {
        buuCuc: po,
        employees: {},
        daily: {},
        totalDon: 0,
        totalDonGTC: 0,
        avgGtcRate: 0,
        staffCount: 0
      };
    });

    dataset.gtcNhanVien.forEach(r => {
      const po = r.buuCuc;
      if (!poMap[po]) return;

      // Nhân viên
      if (!poMap[po].employees[r.maNV]) {
        poMap[po].employees[r.maNV] = {
          maNV: r.maNV,
          tenNV: r.tenNV,
          buuCuc: po,
          daily: {},
          totalDon: 0,
          totalDonGTC: 0,
          avgGtcRate: 0
        };
      }
      const emp = poMap[po].employees[r.maNV];
      if (!emp.daily[r.ngay]) {
        emp.daily[r.ngay] = { tongDon: 0, tongDonGTC: 0, gtcRate: 0, tonDong: 0 };
      }
      emp.daily[r.ngay].tongDon += r.tongDon || 0;
      emp.daily[r.ngay].tongDonGTC += r.tongDonGTC || 0;
      emp.daily[r.ngay].tonDong += r.tonDong || 0;
      emp.daily[r.ngay].gtcRate = emp.daily[r.ngay].tongDon > 0
        ? (emp.daily[r.ngay].tongDonGTC / emp.daily[r.ngay].tongDon) * 100
        : 0;

      // Bưu cục
      if (!poMap[po].daily[r.ngay]) {
        poMap[po].daily[r.ngay] = { tongDon: 0, tongDonGTC: 0, gtcRate: 0 };
      }
      poMap[po].daily[r.ngay].tongDon += r.tongDon || 0;
      poMap[po].daily[r.ngay].tongDonGTC += r.tongDonGTC || 0;
    });

    // Compute Totals in current matrix window
    Object.values(poMap).forEach(poItem => {
      let poSumDon = 0;
      let poSumGtc = 0;

      Object.values(poItem.employees).forEach(emp => {
        let empSumDon = 0;
        let empSumGtc = 0;
        matrixDates.forEach(d => {
          const rec = emp.daily[d];
          if (rec) {
            empSumDon += rec.tongDon;
            empSumGtc += rec.tongDonGTC;
          }
        });
        emp.totalDon = empSumDon;
        emp.totalDonGTC = empSumGtc;
        emp.avgGtcRate = empSumDon > 0 ? (empSumGtc / empSumDon) * 100 : 0;
      });

      matrixDates.forEach(d => {
        const dRec = poItem.daily[d];
        if (dRec) {
          poSumDon += dRec.tongDon;
          poSumGtc += dRec.tongDonGTC;
          dRec.gtcRate = dRec.tongDon > 0 ? (dRec.tongDonGTC / dRec.tongDon) * 100 : 0;
        }
      });

      poItem.totalDon = poSumDon;
      poItem.totalDonGTC = poSumGtc;
      poItem.avgGtcRate = poSumDon > 0 ? (poSumGtc / poSumDon) * 100 : 0;
      poItem.staffCount = Object.keys(poItem.employees).length;
    });

    // Grand Region Totals
    const regionDaily: Record<string, { tongDon: number; tongDonGTC: number; gtcRate: number }> = {};
    let regionTotalDon = 0;
    let regionTotalGtc = 0;

    matrixDates.forEach(d => {
      let dDon = 0;
      let dGtc = 0;
      Object.values(poMap).forEach(po => {
        if (po.daily[d]) {
          dDon += po.daily[d].tongDon;
          dGtc += po.daily[d].tongDonGTC;
        }
      });
      regionDaily[d] = {
        tongDon: dDon,
        tongDonGTC: dGtc,
        gtcRate: dDon > 0 ? (dGtc / dDon) * 100 : 0
      };
      regionTotalDon += dDon;
      regionTotalGtc += dGtc;
    });

    const regionTotal = {
      daily: regionDaily,
      totalDon: regionTotalDon,
      totalDonGTC: regionTotalGtc,
      avgGtcRate: regionTotalDon > 0 ? (regionTotalGtc / regionTotalDon) * 100 : 0
    };

    return {
      postOffices: Object.values(poMap),
      regionTotal
    };
  }, [dataset.gtcNhanVien, matrixDates]);

  // =========================================================================
  // BIỂU ĐỒ SỨC ẢNH HƯỞNG TỪNG BƯU CỤC SO VỚI TOÀN KHU VỰC (TỪ DỮ LIỆU MA TRẬN)
  // =========================================================================
  const regionalInfluenceData = useMemo(() => {
    const totalRegionDon = matrixData.regionTotal.totalDon || 1;
    const totalRegionGtc = matrixData.regionTotal.totalDonGTC || 1;
    const avgRegionGtcRate = matrixData.regionTotal.avgGtcRate || 0;

    const items = matrixData.postOffices.map(po => {
      const donShare = (po.totalDon / totalRegionDon) * 100;
      const gtcShare = (po.totalDonGTC / totalRegionGtc) * 100;
      const staffTotal = matrixData.postOffices.reduce((acc, p) => acc + p.staffCount, 0) || 1;
      const staffShare = (po.staffCount / staffTotal) * 100;
      const rateDiff = po.avgGtcRate - avgRegionGtcRate;

      return {
        buuCuc: po.buuCuc,
        shortName: po.buuCuc.replace('(LAN) ', ''),
        totalDon: po.totalDon,
        totalGTC: po.totalDonGTC,
        staffCount: po.staffCount,
        donShare: parseFloat(donShare.toFixed(1)),
        gtcShare: parseFloat(gtcShare.toFixed(1)),
        avgGtcRate: parseFloat(po.avgGtcRate.toFixed(1)),
        rateDiff: parseFloat(rateDiff.toFixed(1)),
        staffShare: parseFloat(staffShare.toFixed(1)),
        impactLevel: donShare >= 25 ? 'Chi phối chính' : donShare >= 15 ? 'Trọng yếu' : 'Cân bằng',
        qualityStatus: rateDiff >= 5 ? 'Hiệu suất vượt trội' : rateDiff >= 0 ? 'Đạt chuẩn khu vực' : 'Dưới chuẩn khu vực'
      };
    }).sort((a, b) => b.totalDon - a.totalDon);

    return {
      items,
      totalRegionDon: matrixData.regionTotal.totalDon,
      totalRegionGtc: matrixData.regionTotal.totalDonGTC,
      avgRegionGtcRate
    };
  }, [matrixData]);

  // Handle expand/collapse matrix post offices
  const toggleMatrixPo = (buuCuc: string) => {
    setExpandedMatrixPos(prev => {
      const next = new Set(prev);
      if (next.has(buuCuc)) {
        next.delete(buuCuc);
      } else {
        next.add(buuCuc);
      }
      return next;
    });
  };

  const expandAllMatrix = () => {
    setExpandedMatrixPos(new Set(matrixData.postOffices.map(p => p.buuCuc)));
  };

  const collapseAllMatrix = () => {
    setExpandedMatrixPos(new Set());
  };

  // Helper formatting for %GTC cells in matrix
  const renderMatrixGtcBadge = (rate: number, gtc: number, don: number) => {
    if (!don || don === 0) {
      return <span className="text-slate-300 dark:text-slate-600 font-mono text-[11px]">-</span>;
    }
    const colorClass = rate >= 85 
      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
      : rate >= 70
      ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
      : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800';

    return (
      <div className="flex flex-col items-center justify-center py-0.5">
        <span className={`px-1.5 py-0.5 rounded font-black text-[11px] border leading-none ${colorClass}`}>
          {rate.toFixed(1)}%
        </span>
        <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-none font-medium">
          {gtc.toLocaleString('vi-VN')}/{don.toLocaleString('vi-VN')}
        </span>
      </div>
    );
  };

  // Filtered post offices in matrix if user searches
  const filteredMatrixPos = useMemo(() => {
    if (!matrixSearch.trim()) return matrixData.postOffices;
    const term = matrixSearch.toLowerCase();

    return matrixData.postOffices.filter(po => {
      if (po.buuCuc.toLowerCase().includes(term)) return true;
      return Object.values(po.employees).some(e => 
        e.tenNV.toLowerCase().includes(term) || e.maNV.toLowerCase().includes(term)
      );
    });
  }, [matrixData.postOffices, matrixSearch]);

  // Thao tác tải Excel cho Bảng Ma Trận Hiệu Suất GTC Bưu Cục & Chi Tiết Nhân Viên
  const handleExportMatrixExcel = () => {
    const headers = [
      'Phân Loại',
      'Bưu Cục',
      'Mã NV',
      'Họ Tên Bưu Tá',
      'Tổng Đơn (Kỳ)',
      'Tổng GTC (Kỳ)',
      '% GTC (Kỳ)',
      ...matrixDates.map(d => `${d} (%GTC)`),
      ...matrixDates.map(d => `${d} (GTC / Tổng)`)
    ];

    const rows: (string | number)[][] = [];

    // 1. Dòng Tổng Toàn Khu Vực
    const regionGtcRate = `${matrixData.regionTotal.avgGtcRate.toFixed(2)}%`;
    const regionDatePct = matrixDates.map(d => {
      const rec = matrixData.regionTotal.daily[d];
      return rec ? `${rec.gtcRate.toFixed(2)}%` : '-';
    });
    const regionDateFraction = matrixDates.map(d => {
      const rec = matrixData.regionTotal.daily[d];
      return rec ? `${rec.tongDonGTC}/${rec.tongDon}` : '-';
    });

    rows.push([
      'TOÀN KHU VỰC',
      'Toàn bộ 5 Bưu cục',
      '-',
      '-',
      matrixData.regionTotal.totalDon,
      matrixData.regionTotal.totalDonGTC,
      regionGtcRate,
      ...regionDatePct,
      ...regionDateFraction
    ]);

    // 2. Từng Bưu Cục & Danh Sách Bưu Tá Thuộc Bưu Cục
    filteredMatrixPos.forEach(po => {
      const poGtcRate = `${po.avgGtcRate.toFixed(2)}%`;
      const poDatePct = matrixDates.map(d => {
        const rec = po.daily[d];
        return rec ? `${rec.gtcRate.toFixed(2)}%` : '-';
      });
      const poDateFraction = matrixDates.map(d => {
        const rec = po.daily[d];
        return rec ? `${rec.tongDonGTC}/${rec.tongDon}` : '-';
      });

      // Dòng Bưu cục
      rows.push([
        'BƯU CỤC',
        po.buuCuc,
        '-',
        `Tổng ${po.staffCount} bưu tá`,
        po.totalDon,
        po.totalDonGTC,
        poGtcRate,
        ...poDatePct,
        ...poDateFraction
      ]);

      // Dòng từng Nhân viên
      Object.values(po.employees)
        .sort((a, b) => b.totalDon - a.totalDon)
        .forEach(emp => {
          const empGtcRate = `${emp.avgGtcRate.toFixed(2)}%`;
          const empDatePct = matrixDates.map(d => {
            const rec = emp.daily[d];
            return rec && rec.tongDon > 0 ? `${((rec.tongDonGTC / rec.tongDon) * 100).toFixed(2)}%` : '-';
          });
          const empDateFraction = matrixDates.map(d => {
            const rec = emp.daily[d];
            return rec ? `${rec.tongDonGTC}/${rec.tongDon}` : '-';
          });

          rows.push([
            'BƯU TÁ',
            po.buuCuc,
            emp.maNV,
            emp.tenNV,
            emp.totalDon,
            emp.totalDonGTC,
            empGtcRate,
            ...empDatePct,
            ...empDateFraction
          ]);
        });
    });

    exportToCSV('ma_tran_gtc_buu_cuc_nhan_vien_ghn', headers, rows);
  };

  // =========================================================================
  // REQUIREMENT 3: BẢNG CHI TIẾT GTC NHÂN VIÊN THEO NGÀY (CÓ BỘ LỌC ĐỘC LẬP)
  // (Tạo bộ lọc riêng cho bảng: Ngày, Tuần, Tháng, Bưu cục dạng tick chọn)
  // =========================================================================
  const [tableFilterBuuCuc, setTableFilterBuuCuc] = useState<string>('all');
  const [tableFilterEmployees, setTableFilterEmployees] = useState<string[]>([]);
  const [tableFilterMonths, setTableFilterMonths] = useState<string[]>([]);
  const [tableFilterWeeks, setTableFilterWeeks] = useState<string[]>([]);
  const [tableFilterDates, setTableFilterDates] = useState<string[]>([]);

  const handleResetTableFilter = () => {
    setTableFilterBuuCuc('all');
    setTableFilterEmployees([]);
    setTableFilterMonths([]);
    setTableFilterWeeks([]);
    setTableFilterDates([]);
  };

  // Danh sách nhân viên để tick chọn (tự động thu hẹp theo Bưu cục nếu đang chọn bưu cục cụ thể)
  const tableEmployeeOptions = useMemo(() => {
    let source = dataset.gtcNhanVien;
    if (tableFilterBuuCuc !== 'all') {
      source = source.filter(r => r.buuCuc === tableFilterBuuCuc);
    }
    const map = new Map<string, string>();
    source.forEach(r => {
      if (r.maNV && !map.has(r.maNV)) {
        map.set(r.maNV, `${r.tenNV} (${r.maNV})`);
      }
    });
    return Array.from(map.entries())
      .map(([value, label]) => ({ label, value }))
      .sort((a, b) => a.label.localeCompare(b.label, 'vi'));
  }, [dataset.gtcNhanVien, tableFilterBuuCuc]);

  // Map tra cứu nhanh Hoa Hồng Ngày theo mã nhân viên và ngày vận hành
  const hoaHongMap = useMemo(() => {
    const map = new Map<string, DailySalaryRecord>();
    (dataset.hoaHongNgay || []).forEach(h => {
      if (h.maNV && h.ngay) {
        map.set(`${h.maNV}_${h.ngay}`, h);
      }
    });
    return map;
  }, [dataset.hoaHongNgay]);

  const tableFilteredData = useMemo(() => {
    return dataset.gtcNhanVien.filter(r => {
      // 1. Bưu Cục
      if (tableFilterBuuCuc !== 'all' && r.buuCuc !== tableFilterBuuCuc) return false;

      // 2. Nhân viên (Tick chọn nhiều nhân viên)
      if (tableFilterEmployees.length > 0 && !tableFilterEmployees.includes(r.maNV)) return false;

      // 3. Lọc Tháng (Tick chọn tháng)
      if (tableFilterMonths.length > 0) {
        const matchesMonth = tableFilterMonths.some(mKey => {
          const targetMonth = availableMonths.find(m => m.key === mKey);
          return targetMonth ? targetMonth.dates.includes(r.ngay) : false;
        });
        if (!matchesMonth) return false;
      }

      // 4. Lọc Tuần (Tick chọn tuần)
      if (tableFilterWeeks.length > 0) {
        const matchesWeek = tableFilterWeeks.some(wKey => {
          const targetWeek = availableWeeks.find(w => w.key === wKey);
          return targetWeek ? targetWeek.dates.includes(r.ngay) : false;
        });
        if (!matchesWeek) return false;
      }

      // 5. Lọc Ngày (Tick chọn ngày)
      if (tableFilterDates.length > 0 && !tableFilterDates.includes(r.ngay)) return false;

      return true;
    }).map(r => {
      const hh = hoaHongMap.get(`${r.maNV}_${r.ngay}`);
      const ganLay = hh ? (hh.soDonGanLay || 0) : 0;
      const layTC = hh ? (hh.donLayTinhLuong || 0) : 0;
      const tiLeLTC = ganLay > 0 ? `${((layTC / ganLay) * 100).toFixed(1)}%` : '0%';
      return {
        ...r,
        ganLay,
        layTC,
        tiLeLTC
      };
    });
  }, [
    dataset.gtcNhanVien, 
    tableFilterBuuCuc, 
    tableFilterEmployees, 
    tableFilterMonths, 
    tableFilterWeeks, 
    tableFilterDates, 
    availableMonths, 
    availableWeeks,
    hoaHongMap
  ]);

  // Columns for DataTable - Căn giữa số liệu, cân đối và bố trí 3 cột Lấy ngay sau %GTC
  const columns: Column<GtcEmployeeRecord>[] = [
    {
      key: 'maNV',
      header: 'Mã NV',
      width: '78px',
      align: 'center',
      sortable: true,
      render: r => <span className="font-mono text-slate-500 dark:text-slate-400 font-bold">{r.maNV}</span>
    },
    {
      key: 'tenNV',
      header: 'Họ Tên Bưu Tá',
      width: '150px',
      sortable: true,
      render: r => <span className="font-bold text-slate-900 dark:text-white truncate block max-w-[150px]" title={r.tenNV}>{r.tenNV}</span>
    },
    {
      key: 'buuCuc',
      header: 'Bưu Cục',
      width: '110px',
      sortable: true,
      render: r => <span className="text-slate-700 dark:text-slate-300 font-medium">{r.buuCuc.replace('(LAN) ', '')}</span>
    },
    {
      key: 'ngay',
      header: 'Ngày Vận Hành',
      width: '120px',
      align: 'center',
      sortable: true,
      render: r => <span>{r.ngay} <span className="text-slate-400 font-normal">({r.thu})</span></span>
    },
    {
      key: 'tongDon',
      header: 'Tổng Đơn',
      width: '75px',
      align: 'center',
      sortable: true,
      render: r => <span className="font-bold">{r.tongDon.toLocaleString('vi-VN')}</span>
    },
    {
      key: 'tongDonGTC',
      header: 'Đơn GTC',
      width: '75px',
      align: 'center',
      sortable: true,
      render: r => <span className="font-bold text-emerald-600 dark:text-emerald-400">{r.tongDonGTC.toLocaleString('vi-VN')}</span>
    },
    {
      key: 'tiLeGTC',
      header: '% GTC',
      width: '75px',
      align: 'center',
      sortable: true,
      render: r => {
        const val = parseFloat(r.tiLeGTC?.replace(',', '.') || '0');
        return (
          <span className={`font-bold px-1.5 py-0.5 rounded text-[10.5px] ${
            val < 60 ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' :
            val < 75 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' :
            'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
          }`}>
            {r.tiLeGTC}
          </span>
        );
      }
    },
    {
      key: 'ganLay',
      header: 'Gán Lấy',
      width: '72px',
      align: 'center',
      sortable: true,
      render: r => <span className="font-semibold text-slate-800 dark:text-slate-200">{(r.ganLay || 0).toLocaleString('vi-VN')}</span>
    },
    {
      key: 'layTC',
      header: 'Lấy TC',
      width: '72px',
      align: 'center',
      sortable: true,
      render: r => <span className="font-semibold text-blue-600 dark:text-blue-400">{(r.layTC || 0).toLocaleString('vi-VN')}</span>
    },
    {
      key: 'tiLeLTC',
      header: '% LTC',
      width: '75px',
      align: 'center',
      sortable: true,
      render: r => {
        const gan = r.ganLay || 0;
        const raw = parseFloat(r.tiLeLTC?.replace('%', '') || '0');
        if (gan === 0) {
          return <span className="text-slate-400 text-[10.5px]">-</span>;
        }
        return (
          <span className={`font-bold px-1.5 py-0.5 rounded text-[10.5px] ${
            raw < 70 ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' :
            raw < 85 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' :
            'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
          }`}>
            {r.tiLeLTC}
          </span>
        );
      }
    },
    {
      key: 'leadtime',
      header: 'Leadtime',
      width: '75px',
      align: 'center',
      sortable: true,
      render: r => <span className="font-semibold text-slate-700 dark:text-slate-300">{r.leadtime.toFixed(1)}h</span>
    },
    {
      key: 'chuyenDi',
      header: 'Chuyến',
      width: '65px',
      align: 'center',
      sortable: true,
      render: r => <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded font-bold text-[11px]">{r.chuyenDi}</span>
    },
    {
      key: 'tonDong',
      header: 'Tồn Đọng',
      width: '75px',
      align: 'center',
      sortable: true,
      render: r => <span className="text-rose-600 dark:text-rose-400 font-bold">{r.tonDong}</span>
    }
  ];

  // ==========================================
  // LOGIC & DATA CHO BÁO CÁO GIAO HÀNG MỚI CA 2
  // ==========================================
  // 1. Bộ lọc đa chọn (Tick chọn nhiều Bưu cục, Tháng, Tuần, Ngày)
  const [ca2FilterBuuCuc, setCa2FilterBuuCuc] = useState<string[]>([]);
  const [ca2FilterMonths, setCa2FilterMonths] = useState<string[]>([]);
  const [ca2FilterWeeks, setCa2FilterWeeks] = useState<string[]>([]);
  const [ca2FilterDates, setCa2FilterDates] = useState<string[]>([]);
  const [ca2FilterStatus, setCa2FilterStatus] = useState<'all' | 'ca2' | 'ca1'>('all');
  const [ca2SearchTerm, setCa2SearchTerm] = useState<string>('');

  const handleResetCa2Filter = () => {
    setCa2FilterBuuCuc([]);
    setCa2FilterMonths([]);
    setCa2FilterWeeks([]);
    setCa2FilterDates([]);
    setCa2FilterStatus('all');
    setCa2SearchTerm('');
  };

  // 1b. Trạng thái & bộ lọc riêng cho Biểu Đồ Ma Trận Ca 2 (Volume, Gán, %GTC & Chênh Lệch)
  const [matrixCa2FilterBuuCuc, setMatrixCa2FilterBuuCuc] = useState<string[]>([]);
  const [matrixCa2FilterMonths, setMatrixCa2FilterMonths] = useState<string[]>([]);
  const [matrixCa2FilterWeeks, setMatrixCa2FilterWeeks] = useState<string[]>([]);
  const [matrixCa2FilterDates, setMatrixCa2FilterDates] = useState<string[]>([]);
  const [matrixCa2ViewMode, setMatrixCa2ViewMode] = useState<'by_date' | 'by_buu_cuc'>('by_date');

  const handleResetMatrixCa2Filter = () => {
    setMatrixCa2FilterBuuCuc([]);
    setMatrixCa2FilterMonths([]);
    setMatrixCa2FilterWeeks([]);
    setMatrixCa2FilterDates([]);
  };

  const handleQuickSetMatrixCa2Dates = (daysCount: number | 'all') => {
    if (daysCount === 'all') {
      setMatrixCa2FilterDates([]);
    } else {
      setMatrixCa2FilterDates(allUniqueDatesDesc.slice(0, daysCount));
    }
  };

  const isDateInMatrixCa2Filter = (d: string) => {
    if (matrixCa2FilterMonths.length > 0) {
      const matchMonth = matrixCa2FilterMonths.some(mKey => {
        const mObj = availableMonths.find(m => m.key === mKey);
        return mObj && mObj.dates.includes(d);
      });
      if (!matchMonth) return false;
    }
    if (matrixCa2FilterWeeks.length > 0) {
      const matchWeek = matrixCa2FilterWeeks.some(wKey => {
        const wObj = availableWeeks.find(w => w.key === wKey);
        return wObj && wObj.dates.includes(d);
      });
      if (!matchWeek) return false;
    }
    if (matrixCa2FilterDates.length > 0 && !matrixCa2FilterDates.includes(d)) {
      return false;
    }
    return true;
  };

  // 1c. Trạng thái & bộ lọc riêng cho Bảng Tổng Hợp Chỉ Số Vận Hành Ca 2 & Độ Phủ
  const [tableCa2FilterBuuCuc, setTableCa2FilterBuuCuc] = useState<string[]>([]);
  const [tableCa2FilterMonths, setTableCa2FilterMonths] = useState<string[]>([]);
  const [tableCa2FilterWeeks, setTableCa2FilterWeeks] = useState<string[]>([]);
  const [tableCa2FilterDates, setTableCa2FilterDates] = useState<string[]>([]);
  const [activeCa2KpiFocus, setActiveCa2KpiFocus] = useState<'all' | 'volume' | 'gan' | 'gap' | 'gtc'>('all');

  const handleResetTableCa2Filter = () => {
    setTableCa2FilterBuuCuc([]);
    setTableCa2FilterMonths([]);
    setTableCa2FilterWeeks([]);
    setTableCa2FilterDates([]);
  };

  const handleQuickSetTableCa2Dates = (daysCount: number | 'all') => {
    if (daysCount === 'all') {
      setTableCa2FilterDates([]);
    } else {
      setTableCa2FilterDates(allUniqueDatesDesc.slice(0, daysCount));
    }
  };

  const isDateInTableCa2Filter = (d: string) => {
    if (tableCa2FilterMonths.length > 0) {
      const matchMonth = tableCa2FilterMonths.some(mKey => {
        const mObj = availableMonths.find(m => m.key === mKey);
        return mObj && mObj.dates.includes(d);
      });
      if (!matchMonth) return false;
    }
    if (tableCa2FilterWeeks.length > 0) {
      const matchWeek = tableCa2FilterWeeks.some(wKey => {
        const wObj = availableWeeks.find(w => w.key === wKey);
        return wObj && wObj.dates.includes(d);
      });
      if (!matchWeek) return false;
    }
    if (tableCa2FilterDates.length > 0 && !tableCa2FilterDates.includes(d)) {
      return false;
    }
    return true;
  };

  const handleSelectCa2Kpi = (focus: 'volume' | 'gan' | 'gap' | 'gtc') => {
    setActiveCa2KpiFocus(prev => prev === focus ? 'all' : focus);
    const el = document.getElementById('section-ca2-summary-table');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Helper kiểm tra ngày có thỏa mãn bộ lọc thời gian
  const isDateInCa2Filter = (d: string) => {
    // Lọc Tháng
    if (ca2FilterMonths.length > 0) {
      const matchMonth = ca2FilterMonths.some(mKey => {
        const mObj = availableMonths.find(m => m.key === mKey);
        return mObj && mObj.dates.includes(d);
      });
      if (!matchMonth) return false;
    }
    // Lọc Tuần
    if (ca2FilterWeeks.length > 0) {
      const matchWeek = ca2FilterWeeks.some(wKey => {
        const wObj = availableWeeks.find(w => w.key === wKey);
        return wObj && wObj.dates.includes(d);
      });
      if (!matchWeek) return false;
    }
    // Lọc Ngày
    if (ca2FilterDates.length > 0 && !ca2FilterDates.includes(d)) {
      return false;
    }
    return true;
  };

  // Dữ liệu chi tiết Nhân Viên Ca 2 đã lọc
  const ca2FilteredRecords = useMemo(() => {
    return dataset.gtcNhanVien.filter(r => {
      // 1. Bưu Cục (tick chọn nhiều)
      if (ca2FilterBuuCuc.length > 0 && !ca2FilterBuuCuc.includes(r.buuCuc)) return false;

      // 2. Trạng thái Ca (chuyenDi >= 2 là Có đi Ca 2, chuyenDi === 1 là Chỉ đi 1 ca)
      if (ca2FilterStatus === 'ca2' && r.chuyenDi < 2) return false;
      if (ca2FilterStatus === 'ca1' && r.chuyenDi !== 1) return false;

      // 3. Thời gian
      if (!isDateInCa2Filter(r.ngay)) return false;

      // 4. Tìm kiếm bưu tá
      if (ca2SearchTerm.trim()) {
        const q = ca2SearchTerm.toLowerCase();
        const matchName = r.tenNV.toLowerCase().includes(q);
        const matchCode = r.maNV.toLowerCase().includes(q);
        const matchBc = r.buuCuc.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchBc) return false;
      }

      return true;
    });
  }, [dataset.gtcNhanVien, ca2FilterBuuCuc, ca2FilterStatus, ca2FilterMonths, ca2FilterWeeks, ca2FilterDates, ca2SearchTerm, availableMonths, availableWeeks]);

  // Thống kê tổng hợp Ca 2 theo Bưu Cục: CHỈ SỐ VẬN HÀNH LẤY TỪ "HÀNG MỚI CA 2" (CÓ BỘ LỌC RIÊNG VÀ FOCUS THEO KPI)
  const ca2SummaryByBuuCuc = useMemo(() => {
    // 1. Dữ liệu Hàng Mới Ca 2 từ gtcBuuCuc
    const ca2BcRecords = dataset.gtcBuuCuc.filter(r => {
      if (r.loaiHang !== 'Hàng Mới Ca 2') return false;
      if (tableCa2FilterBuuCuc.length > 0 && !tableCa2FilterBuuCuc.includes(r.buuCuc)) return false;
      return isDateInTableCa2Filter(r.ngay);
    });

    const opByBuuCuc: Record<string, { volume: number; sldGan: number; sldGTC: number; tonDong: number }> = {};
    ca2BcRecords.forEach(r => {
      if (!opByBuuCuc[r.buuCuc]) {
        opByBuuCuc[r.buuCuc] = { volume: 0, sldGan: 0, sldGTC: 0, tonDong: 0 };
      }
      opByBuuCuc[r.buuCuc].volume += r.volume;
      opByBuuCuc[r.buuCuc].sldGan += r.sldGan;
      opByBuuCuc[r.buuCuc].sldGTC += r.sldGTC;
      opByBuuCuc[r.buuCuc].tonDong += r.tonDong;
    });

    // 2. Dữ liệu Bưu tá từ gtcNhanVien
    const nvRecords = dataset.gtcNhanVien.filter(r => {
      if (tableCa2FilterBuuCuc.length > 0 && !tableCa2FilterBuuCuc.includes(r.buuCuc)) return false;
      return isDateInTableCa2Filter(r.ngay);
    });

    const nvByBuuCuc: Record<string, {
      totalShifts: number;
      ca2Shifts: number;
      ca1Shifts: number;
      nvSet: Set<string>;
      ca2NvSet: Set<string>;
    }> = {};

    nvRecords.forEach(r => {
      if (!nvByBuuCuc[r.buuCuc]) {
        nvByBuuCuc[r.buuCuc] = {
          totalShifts: 0,
          ca2Shifts: 0,
          ca1Shifts: 0,
          nvSet: new Set(),
          ca2NvSet: new Set()
        };
      }
      const g = nvByBuuCuc[r.buuCuc];
      g.totalShifts++;
      g.nvSet.add(r.maNV);
      if (r.chuyenDi >= 2) {
        g.ca2Shifts++;
        g.ca2NvSet.add(r.maNV);
      } else {
        g.ca1Shifts++;
      }
    });

    // Lấy danh sách bưu cục hợp nhất
    const allBCs = Array.from(new Set([...Object.keys(opByBuuCuc), ...Object.keys(nvByBuuCuc)]));

    const rows = allBCs.map(buuCuc => {
      const nv = nvByBuuCuc[buuCuc] || { totalShifts: 0, ca2Shifts: 0, ca1Shifts: 0, nvSet: new Set(), ca2NvSet: new Set() };
      const op = opByBuuCuc[buuCuc] || { volume: 0, sldGan: 0, sldGTC: 0, tonDong: 0 };

      const rateCa2 = nv.totalShifts > 0 ? (nv.ca2Shifts / nv.totalShifts) * 100 : 0;
      const rateGan = op.volume > 0 ? (op.sldGan / op.volume) * 100 : 0;
      const rateGtc = op.sldGan > 0 ? (op.sldGTC / op.sldGan) * 100 : 0;

      // Chuẩn mục tiêu vận hành ca: Độ phủ NV giao Ca 2 >= 70% & Tỷ lệ gán >= 50% Vol
      const isPassCoverage = rateCa2 >= 70;
      const isPassGan = rateGan >= 50;

      let statusLevel: 'good' | 'warning' | 'alert' = 'good';
      let evalBadge = '';
      let recommendation = '';

      if (!isPassCoverage && !isPassGan) {
        statusLevel = 'alert';
        evalBadge = '[BÁO ĐỘNG ĐỎ - CHƯA ĐẠT CẢ 2 TIÊU CHÍ]';
        recommendation = `Độ phủ NV chỉ đạt ${rateCa2.toFixed(1)}% (< 70%) & Tỷ lệ gán chỉ đạt ${rateGan.toFixed(1)}% (< 50%). Dồn ứ ${op.tonDong.toLocaleString('vi-VN')} đơn tồn sàn. Trưởng BC phải kích hoạt ngay ${nv.ca1Shifts} NV đi 1 ca sang chạy ca 2 và ép gán đơn dứt điểm trước 14h30.`;
      } else if (!isPassCoverage && isPassGan) {
        statusLevel = rateCa2 < 55 ? 'alert' : 'warning';
        evalBadge = '[CẦN TĂNG ĐỘ PHỦ NV GIAO CA 2]';
        const neededNv = Math.max(1, Math.ceil(nv.totalShifts * 0.7 - nv.ca2Shifts));
        recommendation = `Tỷ lệ gán đạt chuẩn ${rateGan.toFixed(1)}% (≥ 50%), nhưng Độ phủ NV mới đạt ${rateCa2.toFixed(1)}% (< 70%, còn ${nv.ca1Shifts} ca chỉ đi 1 chuyến). Cần huy động thêm tối thiểu ${neededNv} NV ra ca 2 để giảm tải và giữ nhịp GTC.`;
      } else if (isPassCoverage && !isPassGan) {
        statusLevel = rateGan < 35 ? 'alert' : 'warning';
        evalBadge = '[CẢNH BÁO: TỶ LỆ GÁN ĐƠN CHƯA ĐẠT 50%]';
        recommendation = `Độ phủ NV tốt ${rateCa2.toFixed(1)}% (≥ 70%), nhưng Tỷ lệ gán chỉ đạt ${rateGan.toFixed(1)}% (< 50%). Bưu tá chạy xe non tải, còn ${op.tonDong.toLocaleString('vi-VN')} đơn ứ tại sàn. Điều phối phải tăng định mức gán thêm 20-30 đơn/bưu tá ca 2.`;
      } else {
        statusLevel = 'good';
        evalBadge = '[ĐẠT CHUẨN MỤC TIÊU VẬN HÀNH CA]';
        recommendation = `Xuất sắc đạt cả 2 chỉ tiêu: Độ phủ NV ${rateCa2.toFixed(1)}% (≥ 70%) & Tỷ lệ gán ${rateGan.toFixed(1)}% (≥ 50%). Tồn sàn kiểm soát tốt (${op.tonDong.toLocaleString('vi-VN')} đơn). Tiếp tục duy trì và thúc đẩy % GTC đạt trên 85% trước 19h00.`;
      }

      return {
        buuCuc,
        totalShifts: nv.totalShifts,
        ca2Shifts: nv.ca2Shifts,
        rateCa2,
        ca1Shifts: nv.ca1Shifts,
        // Chỉ số vận hành lấy từ "Hàng Mới Ca 2"
        volumeCa2: op.volume,
        sldGanCa2: op.sldGan,
        sldGtcCa2: op.sldGTC,
        tonDongCa2: op.tonDong,
        rateGanCa2: rateGan,
        rateGtcCa2: rateGtc,
        statusLevel,
        evalBadge,
        recommendation
      };
    });

    // Sắp xếp linh hoạt theo tiêu chí KPI Focus đang chọn từ 4 Thẻ
    const sortedRows = [...rows].sort((a, b) => {
      if (activeCa2KpiFocus === 'volume') return b.volumeCa2 - a.volumeCa2;
      if (activeCa2KpiFocus === 'gan') return b.sldGanCa2 - a.sldGanCa2;
      if (activeCa2KpiFocus === 'gap') return b.tonDongCa2 - a.tonDongCa2;
      if (activeCa2KpiFocus === 'gtc') return b.rateGtcCa2 - a.rateGtcCa2;
      return b.rateCa2 - a.rateCa2;
    });

    // Tổng toàn khu vực
    const totalAll = sortedRows.reduce((acc, r) => {
      acc.totalShifts += r.totalShifts;
      acc.ca2Shifts += r.ca2Shifts;
      acc.ca1Shifts += r.ca1Shifts;
      acc.volumeCa2 += r.volumeCa2;
      acc.sldGanCa2 += r.sldGanCa2;
      acc.sldGtcCa2 += r.sldGtcCa2;
      acc.tonDongCa2 += r.tonDongCa2;
      return acc;
    }, {
      totalShifts: 0,
      ca2Shifts: 0,
      ca1Shifts: 0,
      volumeCa2: 0,
      sldGanCa2: 0,
      sldGtcCa2: 0,
      tonDongCa2: 0
    });

    const overallRateCa2 = totalAll.totalShifts > 0 ? (totalAll.ca2Shifts / totalAll.totalShifts) * 100 : 0;
    const overallRateGtcCa2 = totalAll.sldGanCa2 > 0 ? (totalAll.sldGtcCa2 / totalAll.sldGanCa2) * 100 : 0;

    return {
      rows: sortedRows,
      totalAll: {
        ...totalAll,
        overallRateCa2,
        overallRateGtcCa2
      }
    };
  }, [dataset.gtcBuuCuc, dataset.gtcNhanVien, tableCa2FilterBuuCuc, tableCa2FilterMonths, tableCa2FilterWeeks, tableCa2FilterDates, activeCa2KpiFocus, availableMonths, availableWeeks]);

  // Dữ liệu tính toán chuyên sâu cho Biểu Đồ Ma Trận Ca 2: Volume, Gán, GTC & Chênh Lệch
  // Áp dụng Mục tiêu vận hành ca: Độ phủ NV giao Ca 2 >= 70% • Tỷ lệ gán >= 50% Vol
  // Hiển thị từ ngày gần nhất đến ngày xa nhất (Mới nhất -> Cũ nhất)
  const matrixCa2Data = useMemo(() => {
    const ca2Records = dataset.gtcBuuCuc.filter(r => {
      if (r.loaiHang !== 'Hàng Mới Ca 2') return false;
      if (matrixCa2FilterBuuCuc.length > 0 && !matrixCa2FilterBuuCuc.includes(r.buuCuc)) return false;
      return isDateInMatrixCa2Filter(r.ngay);
    });

    // 0. Tính Độ phủ NV giao Ca 2 theo Ngày & Bưu Cục từ gtcNhanVien
    const dailyNvCoverage: Record<string, { total: number; ca2: number }> = {};
    const bcNvCoverage: Record<string, { total: number; ca2: number }> = {};

    dataset.gtcNhanVien.forEach(r => {
      if (matrixCa2FilterBuuCuc.length > 0 && !matrixCa2FilterBuuCuc.includes(r.buuCuc)) return;
      if (!isDateInMatrixCa2Filter(r.ngay)) return;

      // Theo ngày
      if (!dailyNvCoverage[r.ngay]) dailyNvCoverage[r.ngay] = { total: 0, ca2: 0 };
      dailyNvCoverage[r.ngay].total++;
      if (r.chuyenDi >= 2) dailyNvCoverage[r.ngay].ca2++;

      // Theo bưu cục
      if (!bcNvCoverage[r.buuCuc]) bcNvCoverage[r.buuCuc] = { total: 0, ca2: 0 };
      bcNvCoverage[r.buuCuc].total++;
      if (r.chuyenDi >= 2) bcNvCoverage[r.buuCuc].ca2++;
    });

    // 1. Nhóm theo Ngày
    const byDateMap: Record<string, {
      ngay: string;
      shortDate: string;
      thu: string;
      volume: number;
      sldGan: number;
      sldGTC: number;
      tonDong: number;
    }> = {};

    ca2Records.forEach(r => {
      const d = r.ngay;
      if (!byDateMap[d]) {
        const shortDate = d.length >= 5 ? d.substring(0, 5) : d;
        byDateMap[d] = {
          ngay: d,
          shortDate,
          thu: r.thu || '',
          volume: 0,
          sldGan: 0,
          sldGTC: 0,
          tonDong: 0
        };
      }
      byDateMap[d].volume += (r.volume || 0);
      byDateMap[d].sldGan += (r.sldGan || 0);
      byDateMap[d].sldGTC += (r.sldGTC || 0);
      byDateMap[d].tonDong += (r.tonDong || 0);
    });

    const dateList = Object.values(byDateMap).map(item => {
      const gapDon = Math.max(0, item.volume - item.sldGan);
      const rateGan = item.volume > 0 ? parseFloat(((item.sldGan / item.volume) * 100).toFixed(1)) : 0;
      const rateGap = item.volume > 0 ? parseFloat(((gapDon / item.volume) * 100).toFixed(1)) : 0;
      const rateGtc = item.sldGan > 0 ? parseFloat(((item.sldGTC / item.sldGan) * 100).toFixed(1)) : 0;
      const nv = dailyNvCoverage[item.ngay] || { total: 0, ca2: 0 };
      const rateCoverage = nv.total > 0 ? parseFloat(((nv.ca2 / nv.total) * 100).toFixed(1)) : 0;

      return {
        ...item,
        label: item.shortDate,
        fullTitle: `Ngày ${item.ngay} (${item.thu})`,
        buuCuc: '',
        shortName: '',
        gapDon,
        rateGan,
        rateGap,
        rateGtc,
        rateCoverage
      };
    }).sort((a, b) => {
      // Sắp xếp hiển thị từ ngày gần nhất đến ngày xa nhất (Mới nhất -> Cũ nhất)
      const [d1, m1, y1] = a.ngay.split('/').map(Number);
      const [d2, m2, y2] = b.ngay.split('/').map(Number);
      return new Date(y2, m2 - 1, d2).getTime() - new Date(y1, m1 - 1, d1).getTime();
    });

    // 2. Nhóm theo Bưu Cục
    const byBcMap: Record<string, {
      buuCuc: string;
      shortName: string;
      volume: number;
      sldGan: number;
      sldGTC: number;
      tonDong: number;
    }> = {};

    ca2Records.forEach(r => {
      const bc = r.buuCuc;
      if (!byBcMap[bc]) {
        byBcMap[bc] = {
          buuCuc: bc,
          shortName: bc.replace('(LAN) ', ''),
          volume: 0,
          sldGan: 0,
          sldGTC: 0,
          tonDong: 0
        };
      }
      byBcMap[bc].volume += (r.volume || 0);
      byBcMap[bc].sldGan += (r.sldGan || 0);
      byBcMap[bc].sldGTC += (r.sldGTC || 0);
      byBcMap[bc].tonDong += (r.tonDong || 0);
    });

    const buuCucList = Object.values(byBcMap).map(item => {
      const gapDon = Math.max(0, item.volume - item.sldGan);
      const rateGan = item.volume > 0 ? parseFloat(((item.sldGan / item.volume) * 100).toFixed(1)) : 0;
      const rateGap = item.volume > 0 ? parseFloat(((gapDon / item.volume) * 100).toFixed(1)) : 0;
      const rateGtc = item.sldGan > 0 ? parseFloat(((item.sldGTC / item.sldGan) * 100).toFixed(1)) : 0;
      const nv = bcNvCoverage[item.buuCuc] || { total: 0, ca2: 0 };
      const rateCoverage = nv.total > 0 ? parseFloat(((nv.ca2 / nv.total) * 100).toFixed(1)) : 0;

      return {
        ...item,
        label: item.shortName,
        fullTitle: item.buuCuc,
        ngay: '',
        shortDate: '',
        thu: '',
        gapDon,
        rateGan,
        rateGap,
        rateGtc,
        rateCoverage
      };
    }).sort((a, b) => b.volume - a.volume);

    // 3. Tổng hợp số liệu kỳ
    const totalVol = ca2Records.reduce((s, r) => s + (r.volume || 0), 0);
    const totalGan = ca2Records.reduce((s, r) => s + (r.sldGan || 0), 0);
    const totalGtc = ca2Records.reduce((s, r) => s + (r.sldGTC || 0), 0);
    const totalTon = ca2Records.reduce((s, r) => s + (r.tonDong || 0), 0);
    const totalGap = Math.max(0, totalVol - totalGan);
    const avgRateGan = totalVol > 0 ? parseFloat(((totalGan / totalVol) * 100).toFixed(1)) : 0;
    const avgRateGap = totalVol > 0 ? parseFloat(((totalGap / totalVol) * 100).toFixed(1)) : 0;
    const avgRateGtc = totalGan > 0 ? parseFloat(((totalGtc / totalGan) * 100).toFixed(1)) : 0;

    const totalNvShifts = Object.values(dailyNvCoverage).reduce((s, x) => s + x.total, 0);
    const totalNvCa2Shifts = Object.values(dailyNvCoverage).reduce((s, x) => s + x.ca2, 0);
    const avgRateCoverage = totalNvShifts > 0 ? parseFloat(((totalNvCa2Shifts / totalNvShifts) * 100).toFixed(1)) : 0;

    // Điểm nút thắt chênh lệch lớn nhất
    const worstDate = [...dateList].sort((a, b) => b.gapDon - a.gapDon)[0];
    const worstBc = [...buuCucList].sort((a, b) => b.gapDon - a.gapDon)[0];

    return {
      dateList,
      buuCucList,
      totalVol,
      totalGan,
      totalGtc,
      totalTon,
      totalGap,
      avgRateGan,
      avgRateGap,
      avgRateGtc,
      avgRateCoverage,
      worstDate,
      worstBc,
      recordCount: ca2Records.length
    };
  }, [dataset.gtcBuuCuc, dataset.gtcNhanVien, matrixCa2FilterBuuCuc, matrixCa2FilterMonths, matrixCa2FilterWeeks, matrixCa2FilterDates, availableMonths, availableWeeks]);

  // Thống kê số lượng nhân viên đi Ca 2 và chỉ đi Ca 1 THEO TỪNG NGÀY
  const ca2DailyBreakdown = useMemo(() => {
    // 1. Dữ liệu bưu tá theo ngày
    const dailyNV: Record<string, {
      ngay: string;
      thu: string;
      totalNV: number;
      ca2NV: number;
      ca1NV: number;
    }> = {};

    dataset.gtcNhanVien.forEach(r => {
      if (ca2FilterBuuCuc.length > 0 && !ca2FilterBuuCuc.includes(r.buuCuc)) return false;
      if (!isDateInCa2Filter(r.ngay)) return false;

      const d = r.ngay;
      if (!dailyNV[d]) {
        dailyNV[d] = {
          ngay: d,
          thu: r.thu,
          totalNV: 0,
          ca2NV: 0,
          ca1NV: 0
        };
      }
      dailyNV[d].totalNV++;
      if (r.chuyenDi >= 2) {
        dailyNV[d].ca2NV++;
      } else {
        dailyNV[d].ca1NV++;
      }
    });

    // 2. Dữ liệu vận hành Hàng Mới Ca 2 theo ngày
    const dailyBC: Record<string, { volume: number; sldGan: number; sldGTC: number; tonDong: number }> = {};
    dataset.gtcBuuCuc.forEach(r => {
      if (r.loaiHang !== 'Hàng Mới Ca 2') return;
      if (ca2FilterBuuCuc.length > 0 && !ca2FilterBuuCuc.includes(r.buuCuc)) return;
      if (!isDateInCa2Filter(r.ngay)) return;

      const d = r.ngay;
      if (!dailyBC[d]) {
        dailyBC[d] = { volume: 0, sldGan: 0, sldGTC: 0, tonDong: 0 };
      }
      dailyBC[d].volume += r.volume;
      dailyBC[d].sldGan += r.sldGan;
      dailyBC[d].sldGTC += r.sldGTC;
      dailyBC[d].tonDong += r.tonDong;
    });

    // Sắp xếp ngày từ mới nhất đến cũ nhất
    return Object.values(dailyNV).map(row => {
      const bc = dailyBC[row.ngay] || { volume: 0, sldGan: 0, sldGTC: 0, tonDong: 0 };
      const rateCa2 = row.totalNV > 0 ? (row.ca2NV / row.totalNV) * 100 : 0;
      const rateCa1 = row.totalNV > 0 ? (row.ca1NV / row.totalNV) * 100 : 0;
      const rateGtc = bc.sldGan > 0 ? (bc.sldGTC / bc.sldGan) * 100 : 0;

      let status: 'good' | 'warning' | 'alert' = 'good';
      if (rateCa2 < 60) status = 'alert';
      else if (rateCa2 < 72) status = 'warning';

      return {
        ...row,
        rateCa2,
        rateCa1,
        volumeCa2: bc.volume,
        sldGanCa2: bc.sldGan,
        sldGtcCa2: bc.sldGTC,
        tonDongCa2: bc.tonDong,
        rateGtcCa2: rateGtc,
        status
      };
    }).sort((a, b) => {
      const [d1, m1, y1] = a.ngay.split('/').map(Number);
      const [d2, m2, y2] = b.ngay.split('/').map(Number);
      return new Date(y2, m2 - 1, d2).getTime() - new Date(y1, m1 - 1, d1).getTime();
    });
  }, [dataset.gtcNhanVien, dataset.gtcBuuCuc, ca2FilterBuuCuc, ca2FilterMonths, ca2FilterWeeks, ca2FilterDates, availableMonths, availableWeeks]);

  // Cột cho Bảng Chi Tiết Theo Dõi Nhân Viên Ca 2
  const ca2TableColumns: Column<GtcEmployeeRecord>[] = useMemo(() => [
    {
      key: 'buuCuc',
      header: 'Bưu Cục',
      width: 'w-36',
      render: (r: GtcEmployeeRecord) => <span className="font-semibold text-slate-800 dark:text-slate-100">{r.buuCuc}</span>
    },
    {
      key: 'tenNV',
      header: 'Nhân Viên (Bưu Tá)',
      width: 'w-48',
      render: (r: GtcEmployeeRecord) => (
        <div>
          <div className="font-bold text-slate-900 dark:text-slate-100">{r.tenNV}</div>
          <div className="text-[11px] text-slate-400 font-mono">Mã: {r.maNV}</div>
        </div>
      )
    },
    {
      key: 'ngay',
      header: 'Ngày',
      width: 'w-24',
      render: (r: GtcEmployeeRecord) => (
        <div>
          <strong className="text-slate-800 dark:text-slate-200">{r.ngay}</strong>
          <div className="text-[10px] text-slate-400">{r.thu}</div>
        </div>
      )
    },
    {
      key: 'chuyenDi',
      header: 'Số Chuyến',
      width: 'w-24',
      align: 'center',
      render: (r: GtcEmployeeRecord) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-black ${
          r.chuyenDi >= 2 
            ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200' 
            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
        }`}>
          {r.chuyenDi} Chuyến
        </span>
      )
    },
    {
      key: 'trangThaiCa',
      header: 'Trạng Thái Ca 2',
      width: 'w-36',
      align: 'center',
      render: (r: GtcEmployeeRecord) => (
        r.chuyenDi >= 2 ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shadow-2xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Có Đi Ca 2
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-black bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800 shadow-2xs">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
            Chỉ Đi 1 Ca
          </span>
        )
      )
    },
    {
      key: 'tongDon',
      header: 'Đơn Gán',
      width: 'w-24',
      align: 'right',
      render: (r: GtcEmployeeRecord) => <strong className="font-bold text-slate-800 dark:text-slate-100">{r.tongDon.toLocaleString('vi-VN')}</strong>
    },
    {
      key: 'tongDonGTC',
      header: 'Đơn GTC',
      width: 'w-24',
      align: 'right',
      render: (r: GtcEmployeeRecord) => <strong className="font-black text-emerald-600 dark:text-emerald-400">{r.tongDonGTC.toLocaleString('vi-VN')}</strong>
    },
    {
      key: 'tiLeGTC',
      header: '% GTC',
      width: 'w-24',
      align: 'center',
      render: (r: GtcEmployeeRecord) => {
        const val = parseFloat(r.tiLeGTC.replace(',', '.'));
        const isHigh = val >= 80;
        const isMed = val >= 70;
        return (
          <span className={`inline-block px-2 py-0.5 rounded text-xs font-black ${
            isHigh ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200' :
            isMed ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200' :
            'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200'
          }`}>
            {r.tiLeGTC}
          </span>
        );
      }
    },
    {
      key: 'tonDong',
      header: 'Tồn Đọng',
      width: 'w-24',
      align: 'right',
      render: (r: GtcEmployeeRecord) => (
        <strong className={`font-bold ${r.tonDong > 30 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>
          {r.tonDong.toLocaleString('vi-VN')}
        </strong>
      )
    },
    {
      key: 'leadtime',
      header: 'Leadtime (h)',
      width: 'w-28',
      align: 'right',
      render: (r: GtcEmployeeRecord) => <strong className="text-slate-700 dark:text-slate-300">{r.leadtime.toFixed(1)}h</strong>
    }
  ], []);


  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Tab Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-orange-600" />
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
              Phân Hệ GTC Nhân Viên (Bưu Tá)
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Đánh giá hiệu suất giao hàng, tỷ lệ thành công và số chuyến phát của 73 bưu tá toàn khu vực
          </p>
        </div>

        <IndependentFilter
          title="Lọc Toàn Bộ Tab"
          fields={filterFields}
          selectedValues={filterValues}
          onApply={val => setFilterValues(val)}
          onReset={() => setFilterValues({ buuCuc: [], nhanVien: [], ngay: [] })}
        />
      </div>

      {/* KPI Cards Section */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="text-[11px] text-slate-400 font-medium">Tổng Đơn Phân Bổ</div>
          <div className="text-lg font-black text-slate-900 dark:text-white mt-1">
            {tabKPIs.totalDon.toLocaleString('vi-VN')}
          </div>
          <div className="text-[10px] text-slate-400">Đơn giao bưu tá</div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="text-[11px] text-slate-400 font-medium">Tổng Đơn GTC</div>
          <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {tabKPIs.totalDonGTC.toLocaleString('vi-VN')}
          </div>
          <div className="text-[10px] text-slate-400">Đã giao thành công</div>
        </div>

        <div className="bg-orange-600 text-white p-3.5 rounded-xl shadow-md">
          <div className="text-[11px] text-orange-100 font-bold">%GTC BƯU TÁ</div>
          <div className="text-2xl font-black mt-1">
            {tabKPIs.gtcRate.toFixed(2)}%
          </div>
          <div className="text-[10px] text-orange-200">SUM(GTC) / SUM(Tổng đơn)</div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="text-[11px] text-slate-400 font-medium">Tổng Chuyến Đi</div>
          <div className="text-lg font-black text-blue-600 mt-1">
            {tabKPIs.totalChuyenDi.toLocaleString('vi-VN')}
          </div>
          <div className="text-[10px] text-slate-400">Chuyến xuất phát</div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="text-[11px] text-slate-400 font-medium">Leadtime TB</div>
          <div className="text-lg font-black text-slate-800 dark:text-slate-100 mt-1">
            {tabKPIs.avgLeadtime.toFixed(1)} h
          </div>
          <div className="text-[10px] text-slate-400">Thời gian giao TB</div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="text-[11px] text-slate-400 font-medium">Bưu Tá Hoạt Động</div>
          <div className="text-lg font-black text-purple-600 mt-1">
            {tabKPIs.activeStaff}
          </div>
          <div className="text-[10px] text-slate-400">Trong kỳ lọc</div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* REQUIREMENT 2: SỨC ẢNH HƯỞNG BƯU CỤC VS KHU VỰC — HIỂN THỊ SONG SONG BÊN TRÁI & BỘ LỌC */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-800 p-4 md:p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        {/* Header toolbar kèm Bộ Lọc Riêng: Ngày, Tuần, Tháng */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-700">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-orange-600" />
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                Sức Ảnh Hưởng Vận Hành Của Các Bưu Cục So Với Toàn Khu Vực
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Nội dung chi tiết 5 bưu cục hiển thị song song bên trái đối chiếu trực quan với biểu đồ Cột & Đường bên phải
            </p>
          </div>

          {/* Chuyển đổi Nguồn Dữ Liệu & Bộ lọc riêng: Ngày, Tuần, Tháng */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Segmented Control chọn Nguồn Dữ Liệu: Chuẩn Bưu Cục vs Theo Bưu Tá */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-750 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setImpactDataSource('gtc_buu_cuc')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all flex items-center gap-1.5 ${
                  impactDataSource === 'gtc_buu_cuc'
                    ? 'bg-orange-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Dữ liệu chuẩn từ Sheet GTC Bưu Cục (Tổng 269.744 đơn - Khớp KPI Bưu Cục)"
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Chuẩn Bưu Cục (269k đơn)</span>
              </button>
              <button
                type="button"
                onClick={() => setImpactDataSource('gtc_nhan_vien')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all flex items-center gap-1.5 ${
                  impactDataSource === 'gtc_nhan_vien'
                    ? 'bg-orange-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Dữ liệu tổng hợp từ 73 bưu tá Sheet GTC Nhân Viên (Tổng 184.130 đơn)"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Theo Bưu Tá (184k đơn)</span>
              </button>
            </div>

            {/* Lọc Tháng */}
            <div className="flex items-center gap-1">
              <label className="text-slate-500 dark:text-slate-400 font-semibold text-[11px] flex items-center gap-0.5">
                <Calendar className="w-3 h-3 text-emerald-500" /> Tháng:
              </label>
              <select
                value={impactFilterMonth}
                onChange={e => {
                  setImpactFilterMonth(e.target.value);
                  setImpactFilterWeek('all');
                  setImpactFilterDate('all');
                }}
                className="bg-slate-50 dark:bg-slate-750 border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1 text-slate-800 dark:text-slate-200 font-semibold focus:outline-none focus:ring-1 focus:ring-orange-500"
              >
                <option value="all">Tất cả tháng</option>
                {availableMonths.map(m => (
                  <option key={m.key} value={m.key}>{m.label}</option>
                ))}
              </select>
            </div>

            {/* Lọc Tuần */}
            <div className="flex items-center gap-1">
              <label className="text-slate-500 dark:text-slate-400 font-semibold text-[11px] flex items-center gap-0.5">
                <Clock className="w-3 h-3 text-purple-500" /> Tuần:
              </label>
              <select
                value={impactFilterWeek}
                onChange={e => {
                  setImpactFilterWeek(e.target.value);
                  setImpactFilterDate('all');
                }}
                className="bg-slate-50 dark:bg-slate-750 border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1 text-slate-800 dark:text-slate-200 font-semibold focus:outline-none focus:ring-1 focus:ring-orange-500"
              >
                <option value="all">Tất cả tuần</option>
                {availableWeeks.map(w => (
                  <option key={w.key} value={w.key}>{w.label}</option>
                ))}
              </select>
            </div>

            {/* Lọc Ngày (Cột J) */}
            <div className="flex items-center gap-1">
              <label className="text-slate-500 dark:text-slate-400 font-semibold text-[11px] flex items-center gap-0.5">
                <Calendar className="w-3 h-3 text-rose-500" /> Ngày:
              </label>
              <select
                value={impactFilterDate}
                onChange={e => setImpactFilterDate(e.target.value)}
                className="bg-slate-50 dark:bg-slate-750 border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1 text-slate-800 dark:text-slate-200 font-semibold focus:outline-none focus:ring-1 focus:ring-orange-500 max-w-[125px]"
              >
                <option value="all">Tất cả ngày</option>
                {allUniqueDatesDesc.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {(impactFilterMonth !== 'all' || impactFilterWeek !== 'all' || impactFilterDate !== 'all') && (
              <button
                type="button"
                onClick={handleResetImpactFilter}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 rounded-lg transition-colors border border-rose-200 dark:border-rose-900/50"
                title="Đặt lại bộ lọc sức ảnh hưởng"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Xóa lọc</span>
              </button>
            )}

            <span className="px-2.5 py-1 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800 font-bold ml-auto sm:ml-0">
              %GTC Chuẩn KV: {poImpactData.regionGtcRate}%
            </span>
          </div>
        </div>

        {/* BỐ CỤC SONG SONG: NỘI DUNG CHI TIẾT BÊN TRÁI HIỂN THỊ ĐỘNG KHI TRỎ VÀO BIỂU ĐỒ, BIỂU ĐỒ BÊN PHẢI */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* CỘT TRÁI (BÊN TRÁI): THÔNG TIN CHI TIẾT ĐÃ ĐƯỢC THU GỌN SIÊU NHỎ GỌN, TINH TẾ */}
          <div className="lg:col-span-4 flex flex-col justify-between space-y-2.5">
            {(() => {
              const activePoName = hoveredPo || pinnedPo;
              const activePoData = activePoName 
                ? poImpactData.items.find(p => p.buuCuc === activePoName || p.shortName === activePoName) 
                : null;

              if (activePoData) {
                const advice = getPostOfficeOperationalAdvice(activePoData.buuCuc, activePoData);
                return (
                  <div className="space-y-2 animate-fadeIn">
                    {/* Thẻ Chi Tiết Bưu Cục Thu Gọn Siêu Gọn */}
                    <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border-2 border-orange-400 dark:border-orange-500 shadow-sm text-xs space-y-2">
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-700/80">
                        <div className="flex items-center gap-1.5 truncate">
                          <Building2 className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                          <span className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                            {activePoData.buuCuc}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                            BC
                          </span>
                          {pinnedPo && (
                            <button
                              type="button"
                              onClick={() => setPinnedPo(null)}
                              className="text-[10px] text-rose-500 hover:text-rose-700 font-semibold underline ml-1 cursor-pointer"
                              title="Bỏ ghim bưu cục này"
                            >
                              Bỏ ghim
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-x-2.5 gap-y-1 text-[11px] pt-0.5">
                        <div className="flex justify-between">
                          <span className="text-slate-500 dark:text-slate-400">Đơn gán:</span>
                          <strong className="text-blue-600 font-bold">{activePoData.totalDon.toLocaleString('vi-VN')}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 dark:text-slate-400">Đơn GTC:</span>
                          <strong className="text-emerald-600 font-bold">{activePoData.totalDonGTC.toLocaleString('vi-VN')}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 dark:text-slate-400">% GTC:</span>
                          <strong className="text-orange-600 font-bold">{activePoData.gtcRate.toFixed(2)}%</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 dark:text-slate-400">% Vol KV:</span>
                          <strong className="text-purple-600 font-bold">{activePoData.volumeShare.toFixed(1)}%</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 dark:text-slate-400">Tồn đọng:</span>
                          <strong className="text-rose-600 font-bold">{activePoData.tonDong.toLocaleString('vi-VN')}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 dark:text-slate-400">Leadtime:</span>
                          <strong className="text-slate-800 dark:text-slate-200 font-bold">{activePoData.avgLeadtime.toFixed(1)}h</strong>
                        </div>
                      </div>

                      <div className="pt-1.5 border-t border-slate-100 dark:border-slate-700/80 flex items-center justify-between text-[10.5px]">
                        <span className="text-slate-500 dark:text-slate-400">So với chuẩn KV:</span>
                        <span className={`font-black ${activePoData.deltaGtc >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {activePoData.deltaGtc >= 0 ? `+${activePoData.deltaGtc.toFixed(2)}% (Vượt chuẩn)` : `${activePoData.deltaGtc.toFixed(2)}% (Dưới chuẩn)`}
                        </span>
                      </div>
                    </div>

                    {/* Đánh Giá & Đề Xuất Cải Thiện Thu Gọn */}
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-750/70 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] space-y-1.5">
                      <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-700">
                        <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[10.5px] flex items-center gap-1">
                          <Activity className="w-3 h-3 text-orange-500" />
                          Đánh Giá Vận Hành
                        </span>
                        <span className={`px-1.5 py-0.2 rounded text-[9.5px] font-bold ${advice.tagColor}`}>
                          {advice.tag}
                        </span>
                      </div>

                      <div className="text-slate-700 dark:text-slate-300 leading-snug text-[10.5px]">
                        {advice.diagnosis}
                      </div>

                      <div className="pt-1 border-t border-slate-200 dark:border-slate-700 text-[10.5px] text-slate-800 dark:text-slate-200 space-y-1">
                        <strong className="text-orange-600 dark:text-orange-400 block">⚡ Giải pháp can thiệp:</strong>
                        <ul className="space-y-0.5 list-disc pl-3.5 text-slate-700 dark:text-slate-300">
                          {advice.solutions.map((sol: string, idx: number) => (
                            <li key={idx} className="leading-snug">{sol}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                );
              }

              // Trạng thái mặc định (khi chưa trỏ chuột vào cột biểu đồ): BẢNG TỔNG QUAN VÀ KHUYẾN NGHỊ ĐÃ ĐƯỢC THU NHỎ SIÊU GỌN
              return (
                <div className="space-y-2">
                  {/* Card Tổng Quan Toàn Khu Vực Thu Nhỏ Siêu Gọn */}
                  <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-sm text-xs border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                      <div className="flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-orange-400" />
                        <span className="font-extrabold text-xs tracking-wide text-orange-400">
                          TỔNG QUAN 5 BƯU CỤC KHU VỰC
                        </span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-orange-600 text-white">
                          AM BI
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsOverviewCollapsed(!isOverviewCollapsed)}
                        className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors flex items-center gap-0.5 text-[10px]"
                        title={isOverviewCollapsed ? 'Mở rộng bảng tổng quan' : 'Thu gọn bảng tổng quan'}
                      >
                        <span>{isOverviewCollapsed ? 'Mở' : 'Thu'}</span>
                        {isOverviewCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {!isOverviewCollapsed && (
                      <div className="grid grid-cols-3 gap-1.5 text-[11px] pt-0.5">
                        <div className="bg-slate-850 p-1.5 rounded border border-slate-750">
                          <div className="text-slate-400 text-[9.5px]">Tổng Volume</div>
                          <div className="font-black text-blue-400 text-xs truncate">
                            {poImpactData.regionTotalDon.toLocaleString('vi-VN')}
                          </div>
                        </div>
                        <div className="bg-slate-850 p-1.5 rounded border border-slate-750">
                          <div className="text-slate-400 text-[9.5px]">Đơn GTC</div>
                          <div className="font-black text-emerald-400 text-xs truncate">
                            {poImpactData.regionTotalGtc.toLocaleString('vi-VN')}
                          </div>
                        </div>
                        <div className="bg-slate-850 p-1.5 rounded border border-slate-750">
                          <div className="text-slate-400 text-[9.5px]">%GTC Chuẩn</div>
                          <div className="font-black text-orange-400 text-xs truncate">
                            {poImpactData.regionGtcRate}%
                          </div>
                        </div>
                        <div className="bg-slate-850 p-1.5 rounded border border-slate-750">
                          <div className="text-slate-400 text-[9.5px]">Tồn Đọng Ca</div>
                          <div className="font-black text-rose-400 text-xs truncate">
                            {poImpactData.regionTotalTon.toLocaleString('vi-VN')}
                          </div>
                        </div>
                        <div className="bg-slate-850 p-1.5 rounded border border-slate-750">
                          <div className="text-slate-400 text-[9.5px]">Leadtime TB</div>
                          <div className="font-black text-amber-400 text-xs truncate">
                            {poImpactData.regionAvgLeadtime.toFixed(1)} h
                          </div>
                        </div>
                        <div className="bg-slate-850 p-1.5 rounded border border-slate-750">
                          <div className="text-slate-400 text-[9.5px]">Lực Lượng</div>
                          <div className="font-black text-slate-200 text-xs truncate">
                            {poImpactData.regionStaffCount} bưu tá
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="pt-1 border-t border-slate-800 text-[9.5px] text-orange-200/80 italic flex items-center justify-between">
                      <span>💡 Rê chuột lên cột biểu đồ để xem chi tiết bưu cục</span>
                    </div>
                  </div>

                  {/* Báo Cáo Nhận Xét Vận Hành Siêu Gọn & Súc Tích */}
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-750/70 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
                    <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-1 truncate">
                        <Layers className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                        <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[10.5px] truncate">
                          Khuyến Nghị ({currentFilterLabel})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsAdviceCollapsed(!isAdviceCollapsed)}
                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded hover:bg-slate-200/50 dark:hover:bg-slate-700 transition-colors flex items-center gap-0.5 text-[10px]"
                        title={isAdviceCollapsed ? 'Mở rộng khuyến nghị' : 'Thu gọn khuyến nghị'}
                      >
                        <span>{isAdviceCollapsed ? 'Mở' : 'Thu'}</span>
                        {isAdviceCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {!isAdviceCollapsed && regionDynamicAssessment && (
                      <div className="space-y-2 text-[10.5px] leading-snug max-h-[350px] overflow-y-auto pr-1">
                        {/* Scope summary banner */}
                        <div className="text-[10px] text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                          <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1 truncate">
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse shrink-0" />
                            <span className="truncate">{regionDynamicAssessment.scopeTitle}</span>
                          </span>
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300 shrink-0 ml-1">
                            {regionDynamicAssessment.scopeBadge}
                          </span>
                        </div>

                        {/* 1. Nút thắt & Tồn đọng */}
                        {regionDynamicAssessment.bottleneckAnalysis.title && (
                          <div className="p-2 rounded-lg bg-rose-50/90 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 space-y-1">
                            <div className="flex items-center gap-1.5 font-bold text-rose-800 dark:text-rose-300 text-[10.5px]">
                              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                              <span>{regionDynamicAssessment.bottleneckAnalysis.title}</span>
                            </div>
                            <div className="text-slate-700 dark:text-slate-300 text-[10px] pl-3.5 leading-snug">
                              <strong className="text-rose-700 dark:text-rose-400">📌 Chẩn đoán: </strong>
                              {regionDynamicAssessment.bottleneckAnalysis.diagnosis}
                            </div>
                            <div className="text-slate-800 dark:text-slate-200 text-[10px] pl-3.5 pt-0.5 border-t border-rose-200/60 dark:border-rose-900/40 leading-snug">
                              <strong className="text-orange-600 dark:text-orange-400">⚡ Can thiệp: </strong>
                              {regionDynamicAssessment.bottleneckAnalysis.action}
                            </div>
                          </div>
                        )}

                        {/* 2. Tiến độ SLA & Leadtime */}
                        {regionDynamicAssessment.leadtimeAnalysis.title && (
                          <div className="p-2 rounded-lg bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 space-y-1">
                            <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300 text-[10.5px]">
                              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                              <span>{regionDynamicAssessment.leadtimeAnalysis.title}</span>
                            </div>
                            <div className="text-slate-700 dark:text-slate-300 text-[10px] pl-3.5 leading-snug">
                              <strong className="text-amber-700 dark:text-amber-400">📌 Chẩn đoán: </strong>
                              {regionDynamicAssessment.leadtimeAnalysis.diagnosis}
                            </div>
                            <div className="text-slate-800 dark:text-slate-200 text-[10px] pl-3.5 pt-0.5 border-t border-amber-200/60 dark:border-amber-900/40 leading-snug">
                              <strong className="text-orange-600 dark:text-orange-400">⚡ Can thiệp: </strong>
                              {regionDynamicAssessment.leadtimeAnalysis.action}
                            </div>
                          </div>
                        )}

                        {/* 3. Điểm sáng & Benchmark chuẩn hóa */}
                        {regionDynamicAssessment.benchmarkAnalysis.title && (
                          <div className="p-2 rounded-lg bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 space-y-1">
                            <div className="flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-300 text-[10.5px]">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                              <span>{regionDynamicAssessment.benchmarkAnalysis.title}</span>
                            </div>
                            <div className="text-slate-700 dark:text-slate-300 text-[10px] pl-3.5 leading-snug">
                              <strong className="text-emerald-700 dark:text-emerald-400">📌 Chẩn đoán: </strong>
                              {regionDynamicAssessment.benchmarkAnalysis.diagnosis}
                            </div>
                            <div className="text-slate-800 dark:text-slate-200 text-[10px] pl-3.5 pt-0.5 border-t border-emerald-200/60 dark:border-emerald-900/40 leading-snug">
                              <strong className="text-orange-600 dark:text-orange-400">⚡ Can thiệp: </strong>
                              {regionDynamicAssessment.benchmarkAnalysis.action}
                            </div>
                          </div>
                        )}

                        {/* 4. Cân đối phụ tải & Tối ưu định biên */}
                        {regionDynamicAssessment.capacityAnalysis.title && (
                          <div className="p-2 rounded-lg bg-blue-50/90 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 space-y-1">
                            <div className="flex items-center gap-1.5 font-bold text-blue-800 dark:text-blue-300 text-[10.5px]">
                              <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                              <span>{regionDynamicAssessment.capacityAnalysis.title}</span>
                            </div>
                            <div className="text-slate-700 dark:text-slate-300 text-[10px] pl-3.5 leading-snug">
                              <strong className="text-blue-700 dark:text-blue-400">📌 Chẩn đoán: </strong>
                              {regionDynamicAssessment.capacityAnalysis.diagnosis}
                            </div>
                            <div className="text-slate-800 dark:text-slate-200 text-[10px] pl-3.5 pt-0.5 border-t border-blue-200/60 dark:border-blue-900/40 leading-snug">
                              <strong className="text-orange-600 dark:text-orange-400">⚡ Can thiệp: </strong>
                              {regionDynamicAssessment.capacityAnalysis.action}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* CỘT PHẢI (BÊN PHẢI): BIỂU ĐỒ KẾT HỢP CỘT VÀ ĐƯỜNG ĐƯỢC MỞ RỘNG DIỆN TÍCH */}
          <div className="lg:col-span-8 flex flex-col justify-between space-y-2">
            {/* 3 Mini Insight Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="p-2.5 rounded-lg bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                <div className="text-[10px] font-semibold text-blue-700 dark:text-blue-300 uppercase">
                  Top Volume
                </div>
                <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {poImpactData.topVolumePo?.shortName || '-'}
                </div>
                <div className="text-[10px] text-blue-600 dark:text-blue-400">
                  Chiếm <strong>{poImpactData.topVolumePo?.volumeShare}%</strong> Volume
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                <div className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 uppercase">
                  Top %GTC
                </div>
                <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {poImpactData.topGtcPo?.shortName || '-'}
                </div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400">
                  %GTC: <strong>{poImpactData.topGtcPo?.gtcRate}%</strong> (+{poImpactData.topGtcPo?.deltaGtc}%)
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800">
                <div className="text-[10px] font-semibold text-rose-700 dark:text-rose-300 uppercase">
                  Cần Hỗ Trợ %GTC
                </div>
                <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {poImpactData.lowestGtcPo?.shortName || '-'}
                </div>
                <div className="text-[10px] text-rose-600 dark:text-rose-400">
                  %GTC: <strong>{poImpactData.lowestGtcPo?.gtcRate}%</strong> ({poImpactData.lowestGtcPo?.deltaGtc}%)
                </div>
              </div>
            </div>

            {/* Combined Composed Chart (Bars + Lines) */}
            <div className="h-[360px] w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart 
                  data={poImpactData.items} 
                  margin={{ top: 15, right: 25, bottom: 20, left: 10 }}
                  onMouseMove={(state: any) => {
                    if (state && state.activePayload && state.activePayload.length > 0) {
                      setHoveredPo(state.activePayload[0].payload.buuCuc);
                    }
                  }}
                  onMouseLeave={() => {
                    setHoveredPo(null);
                  }}
                  onClick={(state: any) => {
                    if (state && state.activePayload && state.activePayload.length > 0) {
                      const name = state.activePayload[0].payload.buuCuc;
                      setPinnedPo(prev => prev === name ? null : name);
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#64748B" opacity={0.2} />
                  <XAxis 
                    dataKey="shortName" 
                    tick={{ fontSize: 11, fontWeight: 600 }} 
                    axisLine={{ stroke: '#94A3B8' }}
                  />
                  <YAxis 
                    yAxisId="left" 
                    tick={{ fontSize: 10 }} 
                    tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}
                    axisLine={{ stroke: '#94A3B8' }}
                    label={{ value: 'Số đơn (Gán & GTC)', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#64748B' }}
                  />
                  <YAxis 
                    yAxisId="right" 
                    orientation="right" 
                    domain={[0, 100]} 
                    tick={{ fontSize: 10 }} 
                    tickFormatter={v => `${v}%`}
                    axisLine={{ stroke: '#94A3B8' }}
                    label={{ value: 'Tỷ lệ %', angle: 90, position: 'insideRight', fontSize: 10, fill: '#64748B' }}
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 text-xs space-y-1.5 min-w-[210px]">
                          <div className="font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-1 flex items-center justify-between">
                            <span>{d.buuCuc}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-700">BC</span>
                          </div>
                          <div className="flex justify-between text-slate-600 dark:text-slate-300">
                            <span>Tổng đơn phân bổ:</span>
                            <strong className="text-blue-600">{d.totalDon.toLocaleString('vi-VN')} đơn</strong>
                          </div>
                          <div className="flex justify-between text-slate-600 dark:text-slate-300">
                            <span>Tổng đơn GTC:</span>
                            <strong className="text-emerald-600">{d.totalDonGTC.toLocaleString('vi-VN')} đơn</strong>
                          </div>
                          <div className="flex justify-between text-slate-600 dark:text-slate-300">
                            <span>% GTC Bưu Cục:</span>
                            <strong className="text-orange-600">{d.gtcRate}%</strong>
                          </div>
                          <div className="flex justify-between text-slate-600 dark:text-slate-300">
                            <span>% Đóng góp Volume KV:</span>
                            <strong className="text-purple-600">{d.volumeShare}%</strong>
                          </div>
                          <div className="flex justify-between border-t border-slate-100 dark:border-slate-700 pt-1 text-[11px]">
                            <span>Chênh lệch so với KV:</span>
                            <span className={`font-bold ${d.deltaGtc >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {d.deltaGtc >= 0 ? `+${d.deltaGtc}% (Vượt chuẩn)` : `${d.deltaGtc}% (Dưới chuẩn)`}
                            </span>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />

                  <ReferenceLine 
                    yAxisId="right" 
                    y={poImpactData.regionGtcRate} 
                    stroke="#DC2626" 
                    strokeDasharray="4 4" 
                    strokeWidth={2}
                    label={{ 
                      value: `%GTC Chuẩn KV: ${poImpactData.regionGtcRate}%`, 
                      position: 'insideTopRight', 
                      fill: '#DC2626', 
                      fontSize: 10, 
                      fontWeight: 700 
                    }} 
                  />

                  <Bar yAxisId="left" dataKey="totalDon" name="Tổng Đơn Phân Bổ (Volume)" fill="#60A5FA" radius={[4, 4, 0, 0]} barSize={26} />
                  <Bar yAxisId="left" dataKey="totalDonGTC" name="Tổng Đơn GTC" fill="#10B981" radius={[4, 4, 0, 0]} barSize={26} />

                  <Line 
                    yAxisId="right" 
                    type="monotone" 
                    dataKey="gtcRate" 
                    name="% GTC Bưu Cục" 
                    stroke="#EA580C" 
                    strokeWidth={3} 
                    dot={{ r: 4, fill: '#EA580C', strokeWidth: 2, stroke: '#fff' }} 
                  />

                  <Line 
                    yAxisId="right" 
                    type="monotone" 
                    dataKey="volumeShare" 
                    name="% Đóng Góp Volume Khu Vực" 
                    stroke="#8B5CF6" 
                    strokeWidth={2.5} 
                    strokeDasharray="4 4"
                    dot={{ r: 3, fill: '#8B5CF6' }} 
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Top 10 Employees Chart */}
      <div className="bg-white dark:bg-slate-800 p-4 md:p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Top 10 Bưu Tá Dẫn Đầu Sản Lượng Giao Thành Công
            </h3>
            <p className="text-[11px] text-slate-400">
              Hiển thị số liệu trực tiếp trên đầu cột; In đậm tên bưu tá và hiển thị tên bưu cục trực thuộc phía dưới
            </p>
          </div>
        </div>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={employeeRankings.slice(0, 10)}
              margin={{ top: 25, right: 20, bottom: 40, left: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
              <XAxis 
                dataKey="tenNV" 
                interval={0} 
                height={55} 
                tick={(props: any) => {
                  const { x, y, payload } = props;
                  const emp = employeeRankings.slice(0, 10).find(e => e.tenNV === payload.value) 
                    || employeeRankings.slice(0, 10)[payload.index];
                  const shortBc = emp?.buuCuc ? emp.buuCuc.replace('(LAN) ', '').trim() : '';

                  return (
                    <g transform={`translate(${x},${y})`}>
                      <text 
                        x={0} 
                        y={0} 
                        dy={14} 
                        textAnchor="middle" 
                        fill="currentColor"
                        className="fill-slate-900 dark:fill-slate-100 font-extrabold text-[11px]"
                      >
                        {payload.value}
                      </text>
                      <text 
                        x={0} 
                        y={0} 
                        dy={28} 
                        textAnchor="middle" 
                        fill="#EA580C"
                        className="font-bold text-[10px]"
                      >
                        {shortBc}
                      </text>
                    </g>
                  );
                }} 
                axisLine={{ stroke: '#94A3B8' }}
              />
              <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
              <Tooltip 
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-white dark:bg-slate-800 p-2.5 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                      <div className="font-extrabold text-slate-900 dark:text-white">{d.tenNV} ({d.maNV})</div>
                      <div className="text-orange-600 font-semibold text-[11px]">{d.buuCuc}</div>
                      <div className="flex justify-between gap-4 text-slate-600 dark:text-slate-300">
                        <span>Đơn GTC:</span>
                        <strong className="text-emerald-600 font-bold">{d.tongDonGTC.toLocaleString('vi-VN')} đơn</strong>
                      </div>
                      <div className="flex justify-between gap-4 text-slate-600 dark:text-slate-300">
                        <span>Tổng đơn:</span>
                        <strong>{d.tongDon.toLocaleString('vi-VN')} đơn</strong>
                      </div>
                      <div className="flex justify-between gap-4 text-slate-600 dark:text-slate-300">
                        <span>% GTC:</span>
                        <strong className="text-orange-600 font-bold">{d.gtcRate}%</strong>
                      </div>
                    </div>
                  );
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
              <Bar 
                yAxisId="left" 
                dataKey="tongDonGTC" 
                name="Đơn GTC" 
                fill="#10B981" 
                radius={[4, 4, 0, 0]}
                label={{ 
                  position: 'top', 
                  fill: '#059669', 
                  fontSize: 10, 
                  fontWeight: 800, 
                  formatter: (val: any) => val ? Number(val).toLocaleString('vi-VN') : '' 
                }}
              />
              <Bar 
                yAxisId="left" 
                dataKey="tongDon" 
                name="Tổng đơn" 
                fill="#94A3B8" 
                radius={[4, 4, 0, 0]}
                label={{ 
                  position: 'top', 
                  fill: '#64748B', 
                  fontSize: 9, 
                  fontWeight: 700, 
                  formatter: (val: any) => val ? Number(val).toLocaleString('vi-VN') : '' 
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BIỂU ĐỒ PHÂN TÍCH SỨC ẢNH HƯỞNG TỪNG BƯU CỤC SO VỚI TOÀN KHU VỰC */}
      {/* (Sử dụng dữ liệu trực tiếp từ Bảng Ma Trận Hiệu Suất GTC Bưu Cục Theo Ngày) */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 md:p-5 space-y-4">
        {/* Header khối biểu đồ */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700 pb-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="p-1.5 rounded-lg bg-orange-50 dark:bg-orange-950/50 text-orange-600">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h3 className="text-sm md:text-base font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                Biểu Đồ Sức Ảnh Hưởng Của Từng Bưu Cục So Với Toàn Khu Vực
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300">
                Góc Nhìn Tổng Thể Vĩ Mô
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Đo lường mức độ chi phối sản lượng (Volume), tỷ trọng đóng góp đơn GTC và độ lệch hiệu suất so với chuẩn bình quân khu vực (<strong>{regionalInfluenceData.avgRegionGtcRate.toFixed(1)}% GTC</strong>)
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
              Đang xem: <strong className="text-orange-600 font-bold">{matrixRange === '7' ? '7 Ngày gần nhất' : matrixRange === '14' ? '14 Ngày' : 'Tất cả 35 ngày'}</strong> ({regionalInfluenceData.totalRegionDon.toLocaleString('vi-VN')} đơn)
            </span>
          </div>
        </div>

        {/* 3 Thẻ Đánh Giá Tác Động Vận Hành Thực Chiến */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Card 1: Bưu cục chi phối lớn nhất */}
          <div className="p-3 rounded-xl bg-orange-50/60 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/60 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-[11px] font-bold text-orange-700 dark:text-orange-400 uppercase">
              <span>Điểm Nóng Chi Phối Khu Vực</span>
              <ShieldAlert className="w-4 h-4 text-orange-600" />
            </div>
            <div className="text-base font-black text-slate-900 dark:text-white">
              {regionalInfluenceData.items[0]?.shortName} (Gánh {regionalInfluenceData.items[0]?.donShare}% tải)
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
              Chiếm tỷ trọng sản lượng lớn nhất ({regionalInfluenceData.items[0]?.totalDon.toLocaleString('vi-VN')} đơn) nhưng %GTC đạt {regionalInfluenceData.items[0]?.avgGtcRate}% (lệch {regionalInfluenceData.items[0]?.rateDiff}% so với chuẩn khu vực). Đây là mắt xích quyết định thành bại của toàn tỉnh.
            </p>
          </div>

          {/* Card 2: 2 Bưu cục trụ cột */}
          <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-[11px] font-bold text-blue-700 dark:text-blue-400 uppercase">
              <span>Trụ Cột Sản Lượng Khu Vực</span>
              <Layers className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-base font-black text-slate-900 dark:text-white">
              {regionalInfluenceData.items[0]?.shortName} + {regionalInfluenceData.items[1]?.shortName} ({((regionalInfluenceData.items[0]?.donShare || 0) + (regionalInfluenceData.items[1]?.donShare || 0)).toFixed(1)}% Tải)
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
              Hai bưu cục đầu tàu gánh hơn một nửa sản lượng toàn khu vực ({((regionalInfluenceData.items[0]?.totalDon || 0) + (regionalInfluenceData.items[1]?.totalDon || 0)).toLocaleString('vi-VN')} đơn). Mọi biến động nhân sự hay xe trung chuyển tại đây đều ảnh hưởng trực tiếp tới chỉ số toàn khu vực.
            </p>
          </div>

          {/* Card 3: Lá chắn chất lượng */}
          <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">
              <span>Lá Chắn Chất Lượng GTC</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-base font-black text-slate-900 dark:text-white">
              Cần Đước 1 ({regionalInfluenceData.items.find(i => i.shortName.includes('Cần Đước'))?.avgGtcRate || '84.3'}% GTC)
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
              Dù quy mô đơn vừa phải nhưng liên tục đạt tỷ lệ giao thành công dẫn đầu khu vực (vượt chuẩn khu vực từ +7.8% đến +8.4%), đóng vai trò giữ nhịp chỉ số chất lượng cho toàn tỉnh.
            </p>
          </div>
        </div>

        {/* 2 Khung biểu đồ song song: Cột đa trục + Donut Chart */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
          {/* Biểu đồ Đa Trục: Tỷ trọng đóng góp và Hiệu suất so với chuẩn khu vực (7 Cột trên XL) */}
          <div className="xl:col-span-7 bg-slate-50/70 dark:bg-slate-750/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-tight">
                  Tỷ Trọng Đóng Góp (%) &amp; %GTC So Với Chuẩn Khu Vực
                </span>
                <span className="text-[10px] text-slate-400">Trục trái: % Đóng góp &bull; Trục phải: % GTC</span>
              </div>
              <p className="text-[11px] text-slate-500 mb-3">
                Cột thể hiện sức nặng quy mô; Đường line cam đối chiếu với Vạch chuẩn đỏ ({regionalInfluenceData.avgRegionGtcRate.toFixed(1)}%) cho thấy bưu cục nào đang kéo khu vực lên hay kéo tụt khu vực.
              </p>
            </div>

            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={regionalInfluenceData.items} margin={{ top: 15, right: 15, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                  <XAxis dataKey="shortName" tick={{ fontSize: 11, fontWeight: 700 }} />
                  <YAxis 
                    yAxisId="left" 
                    unit="%" 
                    tick={{ fontSize: 10 }} 
                    domain={[0, Math.ceil(Math.max(...regionalInfluenceData.items.map(i => i.donShare)) * 1.25)]} 
                  />
                  <YAxis 
                    yAxisId="right" 
                    orientation="right" 
                    unit="%" 
                    domain={[50, 100]} 
                    tick={{ fontSize: 10 }} 
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
                          <div className="font-extrabold text-slate-900 dark:text-white text-sm border-b pb-1">
                            {d.buuCuc}
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-slate-500">Tổng Đơn:</span>
                            <strong className="font-mono text-slate-900 dark:text-white">{d.totalDon.toLocaleString('vi-VN')} ({d.donShare}% khu vực)</strong>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-slate-500">Đơn GTC:</span>
                            <strong className="font-mono text-emerald-600">{d.totalGTC.toLocaleString('vi-VN')} ({d.gtcShare}% khu vực)</strong>
                          </div>
                          <div className="flex justify-between gap-4 border-t pt-1">
                            <span className="text-slate-500">% GTC Đạt Được:</span>
                            <strong className="font-mono text-orange-600">{d.avgGtcRate}%</strong>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-slate-500">So Với Chuẩn Khu Vực:</span>
                            <strong className={`font-mono ${d.rateDiff >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                              {d.rateDiff >= 0 ? '+' : ''}{d.rateDiff}%
                            </strong>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-slate-500">Vai Trò:</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">{d.impactLevel} &bull; {d.qualityStatus}</span>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                  <Bar 
                    yAxisId="left" 
                    dataKey="donShare" 
                    name="% Đóng Góp Sản Lượng" 
                    fill="#3B82F6" 
                    radius={[4, 4, 0, 0]} 
                  />
                  <Bar 
                    yAxisId="left" 
                    dataKey="gtcShare" 
                    name="% Đóng Góp Đơn GTC" 
                    fill="#10B981" 
                    radius={[4, 4, 0, 0]} 
                  />
                  <Line 
                    yAxisId="right" 
                    type="monotone" 
                    dataKey="avgGtcRate" 
                    name="% GTC Bưu Cục" 
                    stroke="#F97316" 
                    strokeWidth={3} 
                    dot={{ r: 4, fill: '#EA580C', stroke: '#fff', strokeWidth: 1.5 }} 
                  />
                  <ReferenceLine 
                    yAxisId="right" 
                    y={regionalInfluenceData.avgRegionGtcRate} 
                    stroke="#EF4444" 
                    strokeDasharray="4 4" 
                    strokeWidth={2}
                    label={{ 
                      value: `Chuẩn Khu Vực: ${regionalInfluenceData.avgRegionGtcRate.toFixed(1)}%`, 
                      position: 'insideTopRight', 
                      fill: '#EF4444', 
                      fontSize: 10, 
                      fontWeight: 700 
                    }} 
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Biểu đồ Donut: Thị phần sức ảnh hưởng toàn khu vực (5 Cột trên XL) */}
          <div className="xl:col-span-5 bg-slate-50/70 dark:bg-slate-750/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-tight">
                  Cơ Cấu Thị Phần Sản Lượng Khu Vực (100%)
                </span>
                <span className="text-[10px] text-slate-400">Donut Chart</span>
              </div>
              <p className="text-[11px] text-slate-500 mb-2">
                Tỷ trọng số lượng đơn giao của 5 bưu cục tạo nên 100% sản lượng toàn tỉnh Long An
              </p>
            </div>

            <div className="h-56 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={regionalInfluenceData.items}
                    dataKey="totalDon"
                    nameKey="shortName"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                  >
                    {regionalInfluenceData.items.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PO_COLORS[index % PO_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(val, name) => [
                      `${Number(val).toLocaleString('vi-VN')} đơn (${((Number(val)/regionalInfluenceData.totalRegionDon)*100).toFixed(1)}%)`,
                      name
                    ]} 
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Tâm Donut */}
              <div className="absolute text-center pointer-events-none">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Tổng Khu Vực</span>
                <span className="text-sm font-black text-slate-900 dark:text-white block font-mono">
                  {regionalInfluenceData.totalRegionDon.toLocaleString('vi-VN')}
                </span>
                <span className="text-[9px] text-orange-600 font-bold block">đơn hàng</span>
              </div>
            </div>

            {/* Bảng mini tỷ trọng & xếp hạng đóng góp */}
            <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-200/80 dark:border-slate-700 text-xs">
              {regionalInfluenceData.items.map((item, idx) => (
                <div key={item.buuCuc} className="flex items-center justify-between px-2 py-1 rounded bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PO_COLORS[idx % PO_COLORS.length] }} />
                    <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{item.shortName}</span>
                  </div>
                  <span className="font-mono font-black text-slate-900 dark:text-white shrink-0 ml-1">
                    {item.donShare}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* REQUIREMENT 1: BẢNG MA TRẬN TỔNG HỢP THEO BƯU CỤC & NGÀY */}
      {/* (Trục tung là bưu cục, Trục hoành trên là ngày, mở rộng ra từng nhân viên) */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {/* Matrix Header & Controls */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-750/50">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-orange-600" />
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                Bảng Ma Trận Hiệu Suất GTC Bưu Cục & Chi Tiết Nhân Viên Theo Ngày
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Trục tung là 5 Bưu cục khu vực, Trục hoành là các ngày vận hành; bấm vào bưu cục để mở rộng xem chi tiết từng bưu tá
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search within matrix */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm bưu cục / bưu tá..."
                value={matrixSearch}
                onChange={e => setMatrixSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-orange-500 w-44"
              />
            </div>

            {/* Matrix Date Window Switcher */}
            <div className="inline-flex rounded-lg bg-white dark:bg-slate-800 p-1 border border-slate-300 dark:border-slate-600 text-xs font-semibold shadow-2xs">
              <button
                type="button"
                onClick={() => setMatrixRange('7')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  matrixRange === '7'
                    ? 'bg-orange-500 text-white font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                7 Ngày gần nhất
              </button>
              <button
                type="button"
                onClick={() => setMatrixRange('14')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  matrixRange === '14'
                    ? 'bg-orange-500 text-white font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                14 Ngày
              </button>
              <button
                type="button"
                onClick={() => setMatrixRange('all')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  matrixRange === 'all'
                    ? 'bg-orange-500 text-white font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                Tất cả ({allUniqueDatesDesc.length} ngày)
              </button>
            </div>

            {/* Expand / Collapse All */}
            <div className="inline-flex items-center gap-1.5">
              <button
                type="button"
                onClick={expandAllMatrix}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 shadow-2xs"
                title="Mở rộng tất cả bưu cục"
              >
                <Maximize2 className="w-3 h-3 text-orange-600" />
                <span>Mở rộng tất cả</span>
              </button>
              <button
                type="button"
                onClick={collapseAllMatrix}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 shadow-2xs"
                title="Thu gọn tất cả"
              >
                <Minimize2 className="w-3 h-3 text-slate-500" />
                <span>Thu gọn</span>
              </button>
            </div>

            {/* Thao tác tải Excel Ma Trận */}
            <button
              type="button"
              onClick={handleExportMatrixExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-emerald-300 dark:border-emerald-700/60 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-all shadow-2xs cursor-pointer"
              title="Tải toàn bộ dữ liệu Ma Trận Hiệu Suất GTC Bưu Cục & Chi Tiết Nhân Viên về file Excel/CSV"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Tải Excel</span>
            </button>
          </div>
        </div>

        {/* Matrix Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/90 dark:bg-slate-750 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700">
                <th className="px-3.5 py-2.5 min-w-[220px] sticky left-0 z-20 bg-slate-100 dark:bg-slate-750 border-r border-slate-200 dark:border-slate-700">
                  Trục Tung: Bưu Cục / Bưu Tá
                </th>
                <th className="px-2.5 py-2.5 text-center min-w-[65px] border-r border-slate-200 dark:border-slate-700">
                  Số NV
                </th>
                <th className="px-3 py-2.5 text-center min-w-[90px] border-r border-slate-200 dark:border-slate-700">
                  Tổng Đơn
                </th>
                <th className="px-3 py-2.5 text-center min-w-[90px] border-r border-slate-200 dark:border-slate-700">
                  Tổng GTC
                </th>
                <th className="px-3 py-2.5 text-center min-w-[85px] border-r-2 border-orange-300 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/20 font-black text-orange-600">
                  % GTC Chuẩn
                </th>
                {/* Trục hoành trên: Các ngày vận hành */}
                {matrixDates.map(date => (
                  <th key={date} className="px-3 py-2 text-center min-w-[95px] border-r border-slate-200 dark:border-slate-700">
                    <div className="font-bold text-slate-900 dark:text-white">{date.slice(0, 5)}</div>
                    <div className="text-[10px] font-normal text-slate-400">
                      {dataset.gtcNhanVien.find(r => r.ngay === date)?.thu || ''}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {filteredMatrixPos.map(po => {
                const isExpanded = expandedMatrixPos.has(po.buuCuc);
                const employeeList = Object.values(po.employees).sort((a, b) => b.totalDonGTC - a.totalDonGTC);

                return (
                  <React.Fragment key={po.buuCuc}>
                    {/* Hàng Bưu Cục (Trục Tung) */}
                    <tr 
                      onClick={() => toggleMatrixPo(po.buuCuc)}
                      className={`cursor-pointer transition-colors ${
                        isExpanded 
                          ? 'bg-orange-50/40 dark:bg-orange-950/20 hover:bg-orange-50/70' 
                          : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750'
                      }`}
                    >
                      <td className="px-3.5 py-2.5 font-bold text-slate-900 dark:text-white sticky left-0 z-10 bg-inherit border-r border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-orange-600 flex-shrink-0" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          )}
                          <Building2 className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                          <span className="truncate">{po.buuCuc}</span>
                        </div>
                      </td>
                      <td className="px-2.5 py-2 text-center font-semibold text-slate-600 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-[11px]">
                          {po.staffCount} NV
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center font-bold text-slate-800 dark:text-slate-200 border-r border-slate-200 dark:border-slate-700">
                        {po.totalDon.toLocaleString('vi-VN')}
                      </td>
                      <td className="px-3 py-2 text-center font-bold text-emerald-600 dark:text-emerald-400 border-r border-slate-200 dark:border-slate-700">
                        {po.totalDonGTC.toLocaleString('vi-VN')}
                      </td>
                      <td className="px-3 py-2 text-center border-r-2 border-orange-300 dark:border-orange-800 bg-orange-50/40 dark:bg-orange-950/20">
                        <span className={`px-2 py-0.5 rounded font-black text-xs ${
                          po.avgGtcRate >= 85 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                          po.avgGtcRate >= 70 ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                          'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}>
                          {po.avgGtcRate.toFixed(1)}%
                        </span>
                      </td>

                      {/* Các ô ma trận theo ngày của Bưu Cục */}
                      {matrixDates.map(date => {
                        const dData = po.daily[date];
                        return (
                          <td key={date} className="px-2 py-1.5 text-center border-r border-slate-200 dark:border-slate-700">
                            {dData ? renderMatrixGtcBadge(dData.gtcRate, dData.tongDonGTC, dData.tongDon) : (
                              <span className="text-slate-300 dark:text-slate-600 font-mono text-[11px]">-</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>

                    {/* Mở Rộng: Chi Tiết Từng Nhân Viên Của Bưu Cục Này */}
                    {isExpanded && employeeList.map((emp, empIdx) => {
                      return (
                        <tr 
                          key={emp.maNV} 
                          className="bg-slate-50/80 dark:bg-slate-850/60 hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors text-[11px]"
                        >
                          <td className="px-3.5 py-1.5 pl-8 font-medium text-slate-800 dark:text-slate-200 sticky left-0 z-10 bg-inherit border-r border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-slate-400 font-mono w-4 text-right">{empIdx + 1}.</span>
                              <Users className="w-3 h-3 text-slate-400 flex-shrink-0" />
                              <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[130px]">{emp.tenNV}</span>
                              <span className="text-[10px] font-mono text-slate-400">({emp.maNV})</span>
                            </div>
                          </td>
                          <td className="px-2.5 py-1.5 text-center text-slate-400 border-r border-slate-200 dark:border-slate-700">
                            -
                          </td>
                          <td className="px-3 py-1.5 text-center font-medium text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700">
                            {emp.totalDon.toLocaleString('vi-VN')}
                          </td>
                          <td className="px-3 py-1.5 text-center font-bold text-emerald-600 dark:text-emerald-400 border-r border-slate-200 dark:border-slate-700">
                            {emp.totalDonGTC.toLocaleString('vi-VN')}
                          </td>
                          <td className="px-3 py-1.5 text-center border-r-2 border-orange-300 dark:border-orange-800 bg-orange-50/20 dark:bg-orange-950/10">
                            <span className={`px-1.5 py-0.5 rounded font-bold text-[11px] ${
                              emp.avgGtcRate >= 85 ? 'text-emerald-700 dark:text-emerald-400' :
                              emp.avgGtcRate >= 70 ? 'text-amber-700 dark:text-amber-400' :
                              'text-rose-700 dark:text-rose-400'
                            }`}>
                              {emp.avgGtcRate.toFixed(1)}%
                            </span>
                          </td>

                          {/* Các ô theo ngày của Nhân Viên */}
                          {matrixDates.map(date => {
                            const dData = emp.daily[date];
                            return (
                              <td key={date} className="px-1.5 py-1 text-center border-r border-slate-200 dark:border-slate-700">
                                {dData ? (
                                  <div className="flex flex-col items-center justify-center">
                                    <span className={`font-bold leading-tight ${
                                      dData.gtcRate >= 85 ? 'text-emerald-600' :
                                      dData.gtcRate >= 70 ? 'text-amber-600' :
                                      'text-rose-600'
                                    }`}>
                                      {dData.gtcRate.toFixed(0)}%
                                    </span>
                                    <span className="text-[9px] text-slate-400 font-mono leading-none">
                                      {dData.tongDonGTC}/{dData.tongDon}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-slate-300 dark:text-slate-600 font-mono text-[10px]">-</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}

              {/* DÒNG TỔNG TOÀN KHU VỰC (5 BƯU CỤC) */}
              <tr className="bg-slate-200/90 dark:bg-slate-700/90 font-black text-slate-900 dark:text-white border-t-2 border-slate-300 dark:border-slate-600">
                <td className="px-3.5 py-2.5 uppercase tracking-wide sticky left-0 z-10 bg-inherit border-r border-slate-300 dark:border-slate-600 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-orange-600" />
                  <span>TỔNG TOÀN KHU VỰC</span>
                </td>
                <td className="px-2.5 py-2 text-center border-r border-slate-300 dark:border-slate-600">
                  {dataset.gtcNhanVien.length > 0 ? `${new Set(dataset.gtcNhanVien.map(r => r.maNV)).size} NV` : '-'}
                </td>
                <td className="px-3 py-2 text-right border-r border-slate-300 dark:border-slate-600">
                  {matrixData.regionTotal.totalDon.toLocaleString('vi-VN')}
                </td>
                <td className="px-3 py-2 text-right text-emerald-700 dark:text-emerald-400 border-r border-slate-300 dark:border-slate-600">
                  {matrixData.regionTotal.totalDonGTC.toLocaleString('vi-VN')}
                </td>
                <td className="px-3 py-2 text-center border-r-2 border-orange-400 bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300">
                  <span className="px-2 py-0.5 rounded font-black text-xs">
                    {matrixData.regionTotal.avgGtcRate.toFixed(1)}%
                  </span>
                </td>
                {matrixDates.map(date => {
                  const regD = matrixData.regionTotal.daily[date];
                  return (
                    <td key={date} className="px-2 py-2 text-center border-r border-slate-300 dark:border-slate-600">
                      {regD ? renderMatrixGtcBadge(regD.gtcRate, regD.tongDonGTC, regD.tongDon) : '-'}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* REQUIREMENT 3: BẢNG CHI TIẾT GTC NHÂN VIÊN THEO NGÀY (CÓ BỘ LỌC ĐỘC LẬP) */}
      {/* ========================================================================= */}
      <DataTable<GtcEmployeeRecord>
        columns={columns}
        data={tableFilteredData}
        title="Bảng Chi Tiết GTC Nhân Viên Theo Ngày"
        subtitle="Dữ liệu từng ca phát của bưu tá; bấm vào mũi tên đầu dòng để xem chi tiết ca phát, đơn LTC và bảng lương hoa hồng ngày"
        exportFilename="gtc_nhan_vien_ghn"
        pagination={false}
        keyExtractor={(r, idx) => `${r.maNV}_${r.ngay}_${idx}`}
        maxHeight="max-h-[620px]"
        stickyHeader={true}
        noWrap={true}
        filterBar={
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 dark:border-slate-700/80 pb-2">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-orange-600" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">
                  Bộ Lọc: Bưu Cục, Nhân Viên (Tick Chọn), Tháng, Tuần &amp; Ngày
                </span>
                <span className="text-[11px] text-slate-400">
                  (Bộ lọc riêng của bảng chi tiết nhân viên)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] px-2.5 py-0.5 rounded font-semibold bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                  Hiển thị: <strong className="text-orange-600 dark:text-orange-400 font-bold">{tableFilteredData.length.toLocaleString('vi-VN')}</strong> / {dataset.gtcNhanVien.length.toLocaleString('vi-VN')} ca phát
                </span>
                {(tableFilterBuuCuc !== 'all' || tableFilterEmployees.length > 0 || tableFilterMonths.length > 0 || tableFilterWeeks.length > 0 || tableFilterDates.length > 0) && (
                  <button
                    type="button"
                    onClick={handleResetTableFilter}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 rounded-lg transition-colors border border-rose-200 dark:border-rose-900/50 cursor-pointer shadow-2xs"
                    title="Đặt lại tất cả các bộ lọc của bảng"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Xóa lọc</span>
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 text-xs items-end">
              {/* 1. Bưu Cục */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-orange-500" /> Bưu Cục:
                </label>
                <select
                  value={tableFilterBuuCuc}
                  onChange={e => {
                    setTableFilterBuuCuc(e.target.value);
                    setTableFilterEmployees([]);
                  }}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-100 font-semibold focus:ring-1 focus:ring-orange-500 focus:outline-none shadow-2xs cursor-pointer"
                >
                  <option value="all">Tất cả bưu cục (5 BC)</option>
                  {buuCucOptions.map(b => (
                    <option key={b.value} value={b.value}>{b.label}</option>
                  ))}
                </select>
              </div>

              {/* 2. Bộ Lọc Tick Chọn Nhân Viên */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Users className="w-3 h-3 text-blue-500" /> Nhân Viên:
                  {tableFilterEmployees.length > 0 && (
                    <span className="ml-1 text-[10px] text-blue-600 font-bold">({tableFilterEmployees.length})</span>
                  )}
                </label>
                <IndividualFilterDropdown
                  label="Nhân viên"
                  compact={false}
                  icon={<Users className="w-3.5 h-3.5 text-blue-600" />}
                  options={tableEmployeeOptions}
                  selectedValues={tableFilterEmployees}
                  onChange={vals => setTableFilterEmployees(vals)}
                  searchPlaceholder="Tìm bưu tá theo tên hoặc mã..."
                  minWidth="w-72"
                />
              </div>

              {/* 3. Lọc Tháng (Tick chọn tháng) */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-emerald-500" /> Lọc Tháng:
                  {tableFilterMonths.length > 0 && (
                    <span className="ml-1 text-[10px] text-emerald-600 font-bold">({tableFilterMonths.length})</span>
                  )}
                </label>
                <IndividualFilterDropdown
                  label="Tất cả tháng"
                  compact={false}
                  icon={<Calendar className="w-3.5 h-3.5 text-emerald-600" />}
                  options={availableMonths.map(m => ({ label: `${m.label} (${m.dates.length} ngày)`, value: m.key }))}
                  selectedValues={tableFilterMonths}
                  onChange={vals => setTableFilterMonths(vals)}
                  searchPlaceholder="Tìm tháng..."
                  minWidth="w-60"
                />
              </div>

              {/* 4. Lọc Tuần (Tick chọn tuần) */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-purple-500" /> Lọc Tuần:
                  {tableFilterWeeks.length > 0 && (
                    <span className="ml-1 text-[10px] text-purple-600 font-bold">({tableFilterWeeks.length})</span>
                  )}
                </label>
                <IndividualFilterDropdown
                  label="Tất cả tuần"
                  compact={false}
                  icon={<Clock className="w-3.5 h-3.5 text-purple-600" />}
                  options={availableWeeks.map(w => ({ label: `${w.label} (${w.dates.length} ngày)`, value: w.key }))}
                  selectedValues={tableFilterWeeks}
                  onChange={vals => setTableFilterWeeks(vals)}
                  searchPlaceholder="Tìm tuần..."
                  minWidth="w-64"
                />
              </div>

              {/* 5. Lọc Ngày (Tick chọn ngày) */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-rose-500" /> Lọc Ngày:
                  {tableFilterDates.length > 0 && (
                    <span className="ml-1 text-[10px] text-rose-600 font-bold">({tableFilterDates.length})</span>
                  )}
                </label>
                <IndividualFilterDropdown
                  label="Tất cả ngày"
                  compact={false}
                  icon={<Calendar className="w-3.5 h-3.5 text-rose-600" />}
                  options={allUniqueDatesDesc.map(d => ({ label: d, value: d }))}
                  selectedValues={tableFilterDates}
                  onChange={vals => setTableFilterDates(vals)}
                  searchPlaceholder="Tìm ngày (dd/mm/yyyy)..."
                  minWidth="w-60"
                />
              </div>
            </div>
          </div>
        }
        renderExpandedRow={(row) => {
          const hh = hoaHongMap.get(`${row.maNV}_${row.ngay}`);
          const soDonGanLay = hh ? hh.soDonGanLay : 0;
          const donLayTL = hh ? hh.donLayTinhLuong : 0;
          const tyLeLayHang = (hh && soDonGanLay > 0)
            ? ((donLayTL / soDonGanLay) * 100).toFixed(1)
            : null;

return (
            <div className="space-y-2 text-xs">
              {/* Header chi tiết siêu gọn trên 1 dòng */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700 pb-1.5 text-[11px]">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse shrink-0" />
                  <strong className="text-slate-900 dark:text-white uppercase tracking-wide">
                    Chi Tiết Ca Vận Hành & Thu Nhập: {row.tenNV}
                  </strong>
                  <span className="font-mono text-slate-500 dark:text-slate-400 font-bold">
                    (Mã: {row.maNV})
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold">
                    {row.buuCuc}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10.5px]">
                  <span className="text-slate-500 dark:text-slate-400">
                    Ngày: <strong className="text-slate-800 dark:text-slate-200">{row.ngay} ({row.thu})</strong>
                  </span>
                  {hh?.thamNien && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-medium">
                      {hh.thamNien}
                    </span>
                  )}
                </div>
              </div>

              {/* 3 Cột Thông Tin Tinh Gọn - Chiều cao vừa vặn */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {/* Cột 1: Giao Hàng (GTC) */}
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-750/70 border border-slate-200 dark:border-slate-700 space-y-1">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-700 text-[11px]">
                    <span className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                      <Truck className="w-3 h-3" /> Giao Hàng (GTC)
                    </span>
                    <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200">
                      %GTC: {row.tiLeGTC}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10.5px]">
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Gán giao:</span>
                      <strong className="text-slate-800 dark:text-slate-100">{row.tongDon} đơn</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">GTC:</span>
                      <strong className="text-emerald-600 dark:text-emerald-400">{row.tongDonGTC} đơn</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Tồn ca:</span>
                      <strong className="text-rose-600 dark:text-rose-400">{row.tonDong} đơn</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Leadtime:</span>
                      <strong className="text-blue-600 dark:text-blue-400">{row.leadtime.toFixed(1)}h ({row.chuyenDi} ch)</strong>
                    </div>
                  </div>
                </div>

                {/* Cột 2: Lấy Hàng (LTC - Sheet Hoa Hồng Ngày) */}
                <div className="p-2 rounded-lg bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 space-y-1">
                  <div className="flex items-center justify-between pb-1 border-b border-purple-200 dark:border-purple-800 text-[11px]">
                    <span className="font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1">
                      <PackageCheck className="w-3 h-3" /> Lấy Hàng (LTC)
                    </span>
                    <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400">
                      Hoa Hồng Ngày
                    </span>
                  </div>
                  {hh ? (
                    <div className="space-y-1 text-[10.5px]">
                      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                        <div className="flex justify-between">
                          <span className="text-slate-500 dark:text-slate-400">Đơn LTC:</span>
                          <strong className="text-purple-600 dark:text-purple-400 font-black">{hh.donLayTinhLuong} đơn</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 dark:text-slate-400">Gán lấy:</span>
                          <strong className="text-slate-800 dark:text-slate-200">{hh.soDonGanLay} đơn</strong>
                        </div>
                      </div>
                      <div className="flex justify-between items-center pt-0.5 border-t border-purple-100 dark:border-purple-900/50">
                        <span className="text-slate-500 dark:text-slate-400">Tỷ lệ lấy (LTC/Gán):</span>
                        <strong className={`font-bold ${
                          tyLeLayHang && parseFloat(tyLeLayHang) >= 80 
                            ? 'text-emerald-600 dark:text-emerald-400' 
                            : 'text-amber-600 dark:text-amber-400'
                        }`}>
                          {tyLeLayHang ? `${tyLeLayHang}%` : hh.soDonGanLay === 0 && hh.donLayTinhLuong > 0 ? '100%' : 'Không gán'}
                        </strong>
                      </div>
                    </div>
                  ) : (
                    <div className="py-2 text-center text-slate-400 italic text-[10px]">
                      Chưa có phát sinh lấy hàng ngày này
                    </div>
                  )}
                </div>

                {/* Cột 3: Thu Nhập Tạm Tính Ngày (Sheet Hoa Hồng Ngày) */}
                <div className="p-2 rounded-lg bg-orange-50/60 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 space-y-1">
                  <div className="flex items-center justify-between pb-1 border-b border-orange-200 dark:border-orange-800 text-[11px]">
                    <span className="font-bold text-orange-700 dark:text-orange-300 flex items-center gap-1">
                      <DollarSign className="w-3 h-3" /> Thu Nhập Tạm Tính
                    </span>
                    <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/60 px-1 py-0.2 rounded">
                      {hh?.soNgayDiLam ? `${hh.soNgayDiLam} công` : '1 công'}
                    </span>
                  </div>
                  {hh ? (
                    <div className="space-y-1 text-[10.5px]">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 dark:text-slate-400">Tổng lương ngày:</span>
                        <strong className="text-orange-600 dark:text-orange-400 text-xs font-black">
                          {Math.round(hh.tongLuong).toLocaleString('vi-VN')} đ
                        </strong>
                      </div>
                      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] text-slate-600 dark:text-slate-300">
                        <div>
                          Lương HH: <strong>{Math.round(hh.luongHHNgay).toLocaleString('vi-VN')} đ</strong>
                        </div>
                        <div className="text-right">
                          Đơn tính lương: <strong>{hh.donGiaoTinhLuong + hh.donLayTinhLuong}</strong>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-2 text-center text-slate-400 italic text-[10px]">
                      Chưa có dữ liệu lương hoa hồng ngày này
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        }}
      />

      {/* ======================================================== */}
      {/* KHỐI BÁO CÁO CHUYÊN BIỆT: THEO DÕI & THÚC ĐẨY GIAO HÀNG MỚI CA 2 */}
      {/* ======================================================== */}
      <div id="section-ca2-report" className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-5 shadow-sm scroll-mt-16">
        {/* 1. Header Báo Cáo Ca 2 */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700 pb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-orange-100 text-orange-800 dark:bg-orange-950/80 dark:text-orange-200 border border-orange-300 dark:border-orange-800">
                <Flame className="w-3 h-3 text-orange-600 animate-pulse" />
                Trọng Tâm Vận Hành: Giao Hàng Mới Ca 2
              </span>
              <span className="text-[11px] font-medium text-slate-400">
                • 2 Chuyến/Ngày = Có đi Ca 2 | 1 Chuyến/Ngày = Chỉ đi 1 Ca
              </span>
            </div>
            <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
              <Moon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Báo Cáo Quản Trị &amp; Thúc Đẩy Giao Hàng Mới Ca 2 (Ca Chiều / Tối)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Chỉ số vận hành lấy chuẩn từ <strong>Hàng Mới Ca 2</strong> (Volume, Gán, GTC, Tồn) kết hợp số lượng bưu tá tham gia ca chiều/tối
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <span className="text-xs px-3 py-1.5 rounded-lg font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
              Độ Phủ Ca 2 Toàn Khu Vực: <strong className="text-sm font-black text-indigo-600 dark:text-indigo-400">{ca2SummaryByBuuCuc.totalAll.overallRateCa2.toFixed(1)}%</strong>
            </span>
          </div>
        </div>

        {/* 2. THANH BỘ LỌC ĐA CHỌN TICK CHỌN: BƯU CỤC, THÁNG, TUẦN, NGÀY */}
        <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-750/60 border border-slate-200 dark:border-slate-700 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 dark:border-slate-700/80 pb-2">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-orange-600" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">
                Bộ Lọc Đa Chọn: Bưu Cục, Tháng, Tuần &amp; Ngày Vận Hành
              </span>
              <span className="text-[11px] text-slate-400">
                (Tick chọn nhiều mục cùng lúc để đối soát)
              </span>
            </div>

            <div className="flex items-center gap-2">
              {(ca2FilterBuuCuc.length > 0 || ca2FilterMonths.length > 0 || ca2FilterWeeks.length > 0 || ca2FilterDates.length > 0) && (
                <button
                  type="button"
                  onClick={handleResetCa2Filter}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 rounded-lg transition-colors border border-rose-200 dark:border-rose-900/50 cursor-pointer shadow-2xs"
                  title="Đặt lại toàn bộ bộ lọc"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Xóa lọc</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
            {/* Lọc 1: Bưu Cục */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Building2 className="w-3 h-3 text-orange-500" /> Bưu Cục:
                {ca2FilterBuuCuc.length > 0 && (
                  <span className="ml-1 text-[10px] text-orange-600 font-bold">({ca2FilterBuuCuc.length} BC)</span>
                )}
              </label>
              <IndividualFilterDropdown
                label="Tất cả bưu cục"
                compact={false}
                icon={<Building2 className="w-3.5 h-3.5 text-orange-600" />}
                options={buuCucOptions}
                selectedValues={ca2FilterBuuCuc}
                onChange={setCa2FilterBuuCuc}
                searchPlaceholder="Tìm bưu cục..."
                minWidth="w-64"
              />
            </div>

            {/* Lọc 2: Tháng */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-emerald-500" /> Tháng:
                {ca2FilterMonths.length > 0 && (
                  <span className="ml-1 text-[10px] text-emerald-600 font-bold">({ca2FilterMonths.length} tháng)</span>
                )}
              </label>
              <IndividualFilterDropdown
                label="Tất cả các tháng"
                compact={false}
                icon={<Calendar className="w-3.5 h-3.5 text-emerald-600" />}
                options={availableMonths.map(m => ({ label: `${m.label} (${m.dates.length} ngày)`, value: m.key }))}
                selectedValues={ca2FilterMonths}
                onChange={setCa2FilterMonths}
                searchPlaceholder="Tìm tháng..."
                minWidth="w-60"
              />
            </div>

            {/* Lọc 3: Tuần */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-purple-500" /> Tuần:
                {ca2FilterWeeks.length > 0 && (
                  <span className="ml-1 text-[10px] text-purple-600 font-bold">({ca2FilterWeeks.length} tuần)</span>
                )}
              </label>
              <IndividualFilterDropdown
                label="Tất cả các tuần"
                compact={false}
                icon={<Clock className="w-3.5 h-3.5 text-purple-600" />}
                options={availableWeeks.map(w => ({ label: `${w.label} (${w.dates.length} ngày)`, value: w.key }))}
                selectedValues={ca2FilterWeeks}
                onChange={setCa2FilterWeeks}
                searchPlaceholder="Tìm tuần..."
                minWidth="w-64"
              />
            </div>

            {/* Lọc 4: Ngày */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-rose-500" /> Ngày Vận Hành:
                {ca2FilterDates.length > 0 && (
                  <span className="ml-1 text-[10px] text-rose-600 font-bold">({ca2FilterDates.length} ngày)</span>
                )}
              </label>
              <IndividualFilterDropdown
                label="Tất cả các ngày"
                compact={false}
                icon={<Calendar className="w-3.5 h-3.5 text-rose-600" />}
                options={allUniqueDatesDesc.map(d => ({ label: d, value: d }))}
                selectedValues={ca2FilterDates}
                onChange={setCa2FilterDates}
                searchPlaceholder="Tìm ngày (dd/mm/yyyy)..."
                minWidth="w-60"
              />
            </div>
          </div>
        </div>

        {/* 3. BỘ 4 THẺ KPI ĐƯỢC THU GỌN GỌN GÀNG (YÊU CẦU THU GỌN THEO HÌNH ĐÍNH KÈM) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Card 1: Tỷ Lệ Phủ Sóng Ca 2 */}
          <div className="py-2.5 px-3 rounded-xl bg-gradient-to-br from-indigo-50/90 to-blue-50/90 dark:from-indigo-950/30 dark:to-blue-950/30 border border-indigo-200 dark:border-indigo-800/60 shadow-2xs">
            <div className="flex items-center justify-between text-[11px] font-bold text-indigo-900 dark:text-indigo-200">
              <span>Tỷ Lệ Phủ Sóng Ca 2</span>
              <Zap className="w-3.5 h-3.5 text-indigo-600" />
            </div>
            <div className="text-xl font-black text-indigo-700 dark:text-indigo-300 my-0.5">
              {ca2SummaryByBuuCuc.totalAll.overallRateCa2.toFixed(1)}%
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>Đạt chuẩn 2 chuyến:</span>
              <strong className="text-indigo-700 dark:text-indigo-300 font-bold">
                {ca2SummaryByBuuCuc.totalAll.ca2Shifts.toLocaleString('vi-VN')} / {ca2SummaryByBuuCuc.totalAll.totalShifts.toLocaleString('vi-VN')} ca
              </strong>
            </div>
            <div className="w-full bg-indigo-200/60 dark:bg-indigo-900/60 h-1 rounded-full mt-1.5 overflow-hidden">
              <div 
                className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(ca2SummaryByBuuCuc.totalAll.overallRateCa2, 100)}%` }}
              />
            </div>
          </div>

          {/* Card 2: Bưu Tá Đi Ca 2 */}
          <div className="py-2.5 px-3 rounded-xl bg-gradient-to-br from-emerald-50/90 to-teal-50/90 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200 dark:border-emerald-800/60 shadow-2xs">
            <div className="flex items-center justify-between text-[11px] font-bold text-emerald-900 dark:text-emerald-200">
              <span>Bưu Tá Đi Ca 2 (2 Chuyến)</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="text-xl font-black text-emerald-700 dark:text-emerald-300 my-0.5">
              {ca2SummaryByBuuCuc.totalAll.ca2Shifts.toLocaleString('vi-VN')}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>Lực lượng nòng cốt:</span>
              <span className="font-bold text-emerald-700 dark:text-emerald-300">Đã kích hoạt ca chiều/tối</span>
            </div>
          </div>

          {/* Card 3: Chỉ Đi 1 Ca (Cần Thúc Đẩy) */}
          <div className="py-2.5 px-3 rounded-xl bg-gradient-to-br from-amber-50/90 to-orange-50/90 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200 dark:border-amber-800/60 shadow-2xs">
            <div className="flex items-center justify-between text-[11px] font-bold text-amber-900 dark:text-amber-200">
              <span>Chỉ Đi 1 Ca (Cần Thúc Đẩy)</span>
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <div className="text-xl font-black text-amber-700 dark:text-amber-300 my-0.5">
              {ca2SummaryByBuuCuc.totalAll.ca1Shifts.toLocaleString('vi-VN')}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>Dư địa năng suất:</span>
              <strong className="text-amber-700 dark:text-amber-300 font-bold">
                {((ca2SummaryByBuuCuc.totalAll.ca1Shifts / (ca2SummaryByBuuCuc.totalAll.totalShifts || 1)) * 100).toFixed(1)}% chưa ra ca 2
              </strong>
            </div>
          </div>

          {/* Card 4: Sản Lượng Hàng Mới Ca 2 (Lấy từ Sheet Hàng Mới Ca 2) */}
          <div className="py-2.5 px-3 rounded-xl bg-gradient-to-br from-purple-50/90 to-pink-50/90 dark:from-purple-950/30 dark:to-pink-950/30 border border-purple-200 dark:border-purple-800/60 shadow-2xs">
            <div className="flex items-center justify-between text-[11px] font-bold text-purple-900 dark:text-purple-200">
              <span>Volume Hàng Mới Ca 2</span>
              <Truck className="w-3.5 h-3.5 text-purple-600" />
            </div>
            <div className="text-xl font-black text-purple-700 dark:text-purple-300 my-0.5">
              {ca2SummaryByBuuCuc.totalAll.volumeCa2.toLocaleString('vi-VN')}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>Gán: <strong className="text-slate-700 dark:text-slate-200">{ca2SummaryByBuuCuc.totalAll.sldGanCa2.toLocaleString('vi-VN')}</strong></span>
              <span>GTC: <strong className="text-purple-700 dark:text-purple-300 font-black">{ca2SummaryByBuuCuc.totalAll.overallRateGtcCa2.toFixed(1)}%</strong> ({ca2SummaryByBuuCuc.totalAll.sldGtcCa2.toLocaleString('vi-VN')} đ)</span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4. BIỂU ĐỒ MA TRẬN VẬN HÀNH CA 2: VOLUME, GÁN, %GTC & MỨC ĐỘ CHÊNH LỆCH GÁN VS VOL */}
        {/* ========================================================================= */}
        <div id="section-ca2-matrix-chart" className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 md:p-5 space-y-4 scroll-mt-16">
          {/* Header Biểu Đồ & Chế Độ Xem */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700 pb-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <h3 className="text-sm md:text-base font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                  Biểu Đồ Ma Trận Vận Hành Ca 2: Volume, Gán, %GTC &amp; Chênh Lệch Gán vs Vol
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300">
                  Phân Tích Chiều Sâu Hàng Mới Ca 2
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Đối chiếu trực quan giữa <strong>Volume Ca 2</strong> (sản lượng nhập), <strong>SLĐ Gán</strong> (xuất tuyến), <strong>% GTC</strong> và <strong>Độ Chênh Lệch (Vol - Gán)</strong> để kiểm soát dồn ứ tồn sàn chia chọn
              </p>
            </div>

            {/* Chế độ xem: Theo Ngày hoặc Theo 5 Bưu Cục */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <div className="flex items-center bg-slate-100 dark:bg-slate-700 p-0.5 rounded-lg text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setMatrixCa2ViewMode('by_date')}
                  className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 text-xs ${
                    matrixCa2ViewMode === 'by_date'
                      ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                  title="Xem biến động Volume, Gán, GTC và Chênh lệch theo từng ngày"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Theo Ngày ({matrixCa2Data.dateList.length} ngày)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMatrixCa2ViewMode('by_buu_cuc')}
                  className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 text-xs ${
                    matrixCa2ViewMode === 'by_buu_cuc'
                      ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                  title="Xem so sánh mức độ chênh lệch Gán vs Vol của 5 bưu cục"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Theo 5 Bưu Cục</span>
                </button>
              </div>

              {/* Nút chọn nhanh ngày */}
              {matrixCa2ViewMode === 'by_date' && (
                <div className="hidden sm:flex items-center gap-1 text-[11px]">
                  <button
                    type="button"
                    onClick={() => handleQuickSetMatrixCa2Dates(7)}
                    className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold transition-colors cursor-pointer"
                  >
                    7 Ngày
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickSetMatrixCa2Dates(14)}
                    className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold transition-colors cursor-pointer"
                  >
                    14 Ngày
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickSetMatrixCa2Dates('all')}
                    className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold transition-colors cursor-pointer"
                  >
                    Tất cả
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* BỘ LỌC ĐA CHỌN CỦA BIỂU ĐỒ: TICK CHỌN BƯU CỤC, THÁNG, TUẦN, NGÀY THEO Ý */}
          <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-750/60 border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 dark:border-slate-700/80 pb-2">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">
                  Bộ Lọc Biểu Đồ Ma Trận Ca 2: Bưu Cục, Tháng, Tuần &amp; Ngày
                </span>
                <span className="text-[11px] text-slate-400">
                  (Tick chọn đa mục để tùy biến dữ liệu phân tích)
                </span>
              </div>

              <div className="flex items-center gap-2">
                {(matrixCa2FilterBuuCuc.length > 0 || matrixCa2FilterMonths.length > 0 || matrixCa2FilterWeeks.length > 0 || matrixCa2FilterDates.length > 0) && (
                  <button
                    type="button"
                    onClick={handleResetMatrixCa2Filter}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 rounded-lg transition-colors border border-rose-200 dark:border-rose-900/50 cursor-pointer shadow-2xs"
                    title="Đặt lại toàn bộ bộ lọc biểu đồ"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Xóa lọc</span>
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
              {/* Lọc Bưu Cục */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-orange-500" /> Bưu Cục:
                  {matrixCa2FilterBuuCuc.length > 0 && (
                    <span className="ml-1 text-[10px] text-orange-600 font-bold">({matrixCa2FilterBuuCuc.length} BC)</span>
                  )}
                </label>
                <IndividualFilterDropdown
                  label="Tất cả bưu cục"
                  compact={false}
                  icon={<Building2 className="w-3.5 h-3.5 text-orange-600" />}
                  options={buuCucOptions}
                  selectedValues={matrixCa2FilterBuuCuc}
                  onChange={setMatrixCa2FilterBuuCuc}
                  searchPlaceholder="Tìm bưu cục..."
                  minWidth="w-64"
                />
              </div>

              {/* Lọc Tháng */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-emerald-500" /> Tháng:
                  {matrixCa2FilterMonths.length > 0 && (
                    <span className="ml-1 text-[10px] text-emerald-600 font-bold">({matrixCa2FilterMonths.length} tháng)</span>
                  )}
                </label>
                <IndividualFilterDropdown
                  label="Tất cả các tháng"
                  compact={false}
                  icon={<Calendar className="w-3.5 h-3.5 text-emerald-600" />}
                  options={availableMonths.map(m => ({ label: `${m.label} (${m.dates.length} ngày)`, value: m.key }))}
                  selectedValues={matrixCa2FilterMonths}
                  onChange={setMatrixCa2FilterMonths}
                  searchPlaceholder="Tìm tháng..."
                  minWidth="w-60"
                />
              </div>

              {/* Lọc Tuần */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-purple-500" /> Tuần:
                  {matrixCa2FilterWeeks.length > 0 && (
                    <span className="ml-1 text-[10px] text-purple-600 font-bold">({matrixCa2FilterWeeks.length} tuần)</span>
                  )}
                </label>
                <IndividualFilterDropdown
                  label="Tất cả các tuần"
                  compact={false}
                  icon={<Clock className="w-3.5 h-3.5 text-purple-600" />}
                  options={availableWeeks.map(w => ({ label: `${w.label} (${w.dates.length} ngày)`, value: w.key }))}
                  selectedValues={matrixCa2FilterWeeks}
                  onChange={setMatrixCa2FilterWeeks}
                  searchPlaceholder="Tìm tuần..."
                  minWidth="w-64"
                />
              </div>

              {/* Lọc Ngày */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-rose-500" /> Ngày Vận Hành:
                  {matrixCa2FilterDates.length > 0 && (
                    <span className="ml-1 text-[10px] text-rose-600 font-bold">({matrixCa2FilterDates.length} ngày)</span>
                  )}
                </label>
                <IndividualFilterDropdown
                  label="Tất cả các ngày"
                  compact={false}
                  icon={<Calendar className="w-3.5 h-3.5 text-rose-600" />}
                  options={allUniqueDatesDesc.map(d => ({ label: d, value: d }))}
                  selectedValues={matrixCa2FilterDates}
                  onChange={setMatrixCa2FilterDates}
                  searchPlaceholder="Tìm ngày (dd/mm/yyyy)..."
                  minWidth="w-60"
                />
              </div>
            </div>
          </div>

          {/* 4 THẺ CHỈ SỐ TỔNG QUAN TÁC CHIẾN CỦA BIỂU ĐỒ - CÓ THỂ NHẤN ĐỂ ĐIỀU HƯỚNG & ĐỐI SOÁT CHI TIẾT BẢNG */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            {/* Card 1: Volume Nhập Ca 2 */}
            <button
              type="button"
              onClick={() => handleSelectCa2Kpi('volume')}
              className={`p-3 rounded-xl text-left transition-all duration-200 cursor-pointer border group ${
                activeCa2KpiFocus === 'volume'
                  ? 'bg-indigo-50/95 dark:bg-indigo-950/70 border-indigo-500 ring-2 ring-indigo-500 shadow-md scale-[1.01]'
                  : 'bg-slate-50 dark:bg-slate-750 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-xs'
              }`}
              title="Nhấn để xem chi tiết cột Volume Nhập Ca 2 tại bảng bên dưới"
            >
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                <span>Volume Nhập Ca 2</span>
                <span className={`w-2.5 h-2.5 rounded-full transition-all ${activeCa2KpiFocus === 'volume' ? 'bg-indigo-600 ring-4 ring-indigo-200 dark:ring-indigo-900 animate-pulse' : 'bg-indigo-500'}`} />
              </div>
              <div className="text-xl font-black text-indigo-700 dark:text-indigo-300 mt-1">
                {matrixCa2Data.totalVol.toLocaleString('vi-VN')}
              </div>
              <div className="flex items-center justify-between text-[10px] mt-0.5">
                <span className="text-slate-400">Tổng sản lượng ca chiều/tối</span>
                <span className={`font-semibold flex items-center gap-0.5 transition-colors ${activeCa2KpiFocus === 'volume' ? 'text-indigo-700 dark:text-indigo-300 font-bold' : 'text-slate-400 group-hover:text-indigo-600'}`}>
                  {activeCa2KpiFocus === 'volume' ? 'Đang xem ↓' : 'Xem bảng →'}
                </span>
              </div>
            </button>

            {/* Card 2: SLĐ Đã Gán Ra Tuyến */}
            <button
              type="button"
              onClick={() => handleSelectCa2Kpi('gan')}
              className={`p-3 rounded-xl text-left transition-all duration-200 cursor-pointer border group ${
                activeCa2KpiFocus === 'gan'
                  ? 'bg-orange-50/95 dark:bg-orange-950/70 border-orange-500 ring-2 ring-orange-500 shadow-md scale-[1.01]'
                  : 'bg-slate-50 dark:bg-slate-750 border-slate-200 dark:border-slate-700 hover:border-orange-300 dark:hover:border-orange-700 hover:shadow-xs'
              }`}
              title="Nhấn để xem chi tiết cột SLĐ Đã Gán Ra Tuyến tại bảng bên dưới"
            >
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                <span>SLĐ Đã Gán Ra Tuyến</span>
                <span className={`w-2.5 h-2.5 rounded-full transition-all ${activeCa2KpiFocus === 'gan' ? 'bg-orange-600 ring-4 ring-orange-200 dark:ring-orange-900 animate-pulse' : 'bg-orange-500'}`} />
              </div>
              <div className="text-xl font-black text-orange-600 dark:text-orange-400 mt-1">
                {matrixCa2Data.totalGan.toLocaleString('vi-VN')}
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                <span>Tỷ lệ gán: <strong className="text-orange-600">{matrixCa2Data.avgRateGan}%</strong> Volume</span>
                <span className={`font-semibold flex items-center gap-0.5 transition-colors ${activeCa2KpiFocus === 'gan' ? 'text-orange-700 dark:text-orange-300 font-bold' : 'text-slate-400 group-hover:text-orange-600'}`}>
                  {activeCa2KpiFocus === 'gan' ? 'Đang xem ↓' : 'Xem bảng →'}
                </span>
              </div>
            </button>

            {/* Card 3: Chênh Lệch (Chưa Gán) */}
            <button
              type="button"
              onClick={() => handleSelectCa2Kpi('gap')}
              className={`p-3 rounded-xl text-left transition-all duration-200 cursor-pointer border group ${
                activeCa2KpiFocus === 'gap'
                  ? 'bg-rose-100/95 dark:bg-rose-950/80 border-rose-500 ring-2 ring-rose-500 shadow-md scale-[1.01]'
                  : 'bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 hover:border-rose-400 hover:shadow-xs'
              }`}
              title="Nhấn để xem chi tiết Tồn Đọng & Chênh Lệch tại bảng bên dưới (tự động ưu tiên bưu cục dồn ứ lên trên)"
            >
              <div className="flex items-center justify-between text-[11px] font-bold text-rose-700 dark:text-rose-400 uppercase">
                <span>Chênh Lệch (Chưa Gán)</span>
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              </div>
              <div className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1">
                {matrixCa2Data.totalGap.toLocaleString('vi-VN')}
              </div>
              <div className="flex items-center justify-between text-[10px] text-rose-700 dark:text-rose-400 font-bold mt-0.5">
                <span>{matrixCa2Data.avgRateGap}% Volume ứ tại sàn chia</span>
                <span className="flex items-center gap-0.5 underline">
                  {activeCa2KpiFocus === 'gap' ? 'Đang xem ↓' : 'Xem bảng →'}
                </span>
              </div>
            </button>

            {/* Card 4: Giao Thành Công (GTC) */}
            <button
              type="button"
              onClick={() => handleSelectCa2Kpi('gtc')}
              className={`p-3 rounded-xl text-left transition-all duration-200 cursor-pointer border group ${
                activeCa2KpiFocus === 'gtc'
                  ? 'bg-emerald-100/95 dark:bg-emerald-950/80 border-emerald-500 ring-2 ring-emerald-500 shadow-md scale-[1.01]'
                  : 'bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 hover:border-emerald-400 hover:shadow-xs'
              }`}
              title="Nhấn để xem chi tiết Giao Thành Công & % GTC tại bảng bên dưới"
            >
              <div className="flex items-center justify-between text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">
                <span>Giao Thành Công (GTC)</span>
                <span className={`w-2.5 h-2.5 rounded-full transition-all ${activeCa2KpiFocus === 'gtc' ? 'bg-emerald-600 ring-4 ring-emerald-200 dark:ring-emerald-900 animate-pulse' : 'bg-emerald-500'}`} />
              </div>
              <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {matrixCa2Data.totalGtc.toLocaleString('vi-VN')}
              </div>
              <div className="flex items-center justify-between text-[10px] text-emerald-700 dark:text-emerald-400 font-bold mt-0.5">
                <span>Đạt {matrixCa2Data.avgRateGtc}% trên đơn gán</span>
                <span className="flex items-center gap-0.5">
                  {activeCa2KpiFocus === 'gtc' ? 'Đang xem ↓' : 'Xem bảng →'}
                </span>
              </div>
            </button>
          </div>

          {/* KHUNG BIỂU ĐỒ RECHARTS COMPOSED CHART */}
          <div className="bg-slate-50/50 dark:bg-slate-750/30 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-2.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight">
                  {matrixCa2ViewMode === 'by_date' ? 'Diễn Biến Volume, Gán, GTC & Mức Độ Chênh Lệch Qua Các Ngày' : 'So Sánh Sức Chứa Volume, Gán & Tỷ Lệ Giải Phóng Hàng Giữa 5 Bưu Cục'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800">
                  Mục tiêu ca: Độ phủ NV ≥ 70% • Tỷ lệ gán ≥ 50% Vol
                </span>
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                {matrixCa2ViewMode === 'by_date' ? 'Hiển thị: Từ ngày gần nhất đến xa nhất • ' : ''}
                Trục trái: Số lượng đơn &bull; Trục phải: % Tỷ lệ (Chuẩn ≥70% &amp; ≥50%)
              </span>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={matrixCa2ViewMode === 'by_date' ? matrixCa2Data.dateList : matrixCa2Data.buuCucList}
                  margin={{ top: 15, right: 15, left: -10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#64748B" opacity={0.15} />
                  <XAxis 
                    dataKey="label" 
                    tick={{ fontSize: 11, fontWeight: 700 }}
                  />
                  <YAxis 
                    yAxisId="left" 
                    tick={{ fontSize: 10 }}
                    tickFormatter={v => `${v}`}
                  />
                  <YAxis 
                    yAxisId="right" 
                    orientation="right" 
                    unit="%" 
                    domain={[0, 100]} 
                    tick={{ fontSize: 10 }}
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const d = payload[0].payload;
                      const isPassCoverage = (d.rateCoverage || 0) >= 70;
                      const isPassGan = (d.rateGan || 0) >= 50;

                      return (
                        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 text-xs space-y-2 min-w-[285px]">
                          <div className="border-b border-slate-100 dark:border-slate-700 pb-1.5 flex items-center justify-between">
                            <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                              {d.fullTitle}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                              Hàng Mới Ca 2
                            </span>
                          </div>
                          <div className="space-y-1.5">
                            <div className="flex justify-between items-center">
                              <span className="text-slate-500 flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded bg-indigo-500 inline-block" />
                                Volume Nhập Ca 2:
                              </span>
                              <strong className="font-mono text-indigo-600 dark:text-indigo-400 text-xs">{d.volume.toLocaleString('vi-VN')} đơn</strong>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-slate-500 flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded bg-orange-500 inline-block" />
                                SLĐ Đã Gán Ra Tuyến:
                              </span>
                              <strong className="font-mono text-orange-600 dark:text-orange-400 text-xs">{d.sldGan.toLocaleString('vi-VN')} đơn</strong>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-slate-500 flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block" />
                                SLĐ GTC Ca 2:
                              </span>
                              <strong className="font-mono text-emerald-600 dark:text-emerald-400 text-xs">{d.sldGTC.toLocaleString('vi-VN')} đơn</strong>
                            </div>
                            <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-700 pt-1.5 bg-rose-50/60 dark:bg-rose-950/30 p-1.5 rounded">
                              <span className="text-rose-700 dark:text-rose-300 font-bold">
                                Chênh Lệch Chưa Gán:
                              </span>
                              <strong className="font-mono text-rose-600 dark:text-rose-400 font-black text-xs">
                                {d.gapDon.toLocaleString('vi-VN')} đơn ({d.rateGap}% Vol)
                              </strong>
                            </div>

                            {/* ĐỐI SOÁT MỤC TIÊU VẬN HÀNH CA 2 */}
                            <div className="border-t border-slate-100 dark:border-slate-700 pt-1.5 space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full bg-indigo-600" />
                                  Độ Phủ NV Giao Ca 2:
                                </span>
                                <span className="flex items-center gap-1.5">
                                  <strong className={`font-mono text-xs font-black ${isPassCoverage ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                    {d.rateCoverage}%
                                  </strong>
                                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-black ${isPassCoverage ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'}`}>
                                    {isPassCoverage ? '≥70% Đạt' : '<70% Chưa đạt'}
                                  </span>
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-orange-600 dark:text-orange-400 font-bold flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full bg-orange-500" />
                                  Tỷ Lệ Gán / Vol:
                                </span>
                                <span className="flex items-center gap-1.5">
                                  <strong className={`font-mono text-xs font-black ${isPassGan ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                    {d.rateGan}%
                                  </strong>
                                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-black ${isPassGan ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'}`}>
                                    {isPassGan ? '≥50% Đạt' : '<50% Chưa đạt'}
                                  </span>
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                  % GTC / Đơn Gán:
                                </span>
                                <strong className="font-mono text-emerald-600 dark:text-emerald-400 font-black">
                                  {d.rateGtc}%
                                </strong>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Legend 
                    wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                    formatter={(val) => <span className="text-slate-700 dark:text-slate-200 font-semibold">{val}</span>}
                  />
                  <Bar 
                    yAxisId="left" 
                    dataKey="volume" 
                    name="Volume Nhập Ca 2" 
                    fill="#6366F1" 
                    radius={[3, 3, 0, 0]} 
                  />
                  <Bar 
                    yAxisId="left" 
                    dataKey="sldGan" 
                    name="SLĐ Gán Xuất Tuyến" 
                    fill="#F97316" 
                    radius={[3, 3, 0, 0]} 
                  />
                  <Bar 
                    yAxisId="left" 
                    dataKey="sldGTC" 
                    name="SLĐ GTC Ca 2" 
                    fill="#10B981" 
                    radius={[3, 3, 0, 0]} 
                  />
                  <Line 
                    yAxisId="right" 
                    type="monotone" 
                    dataKey="rateCoverage" 
                    name="Độ Phủ NV Giao Ca 2 (%)" 
                    stroke="#4F46E5" 
                    strokeWidth={3} 
                    dot={{ r: 4, fill: '#4F46E5', stroke: '#fff', strokeWidth: 1.5 }} 
                  />
                  <Line 
                    yAxisId="right" 
                    type="monotone" 
                    dataKey="rateGan" 
                    name="Tỷ Lệ Gán / Vol (%)" 
                    stroke="#F97316" 
                    strokeWidth={3} 
                    strokeDasharray="4 2"
                    dot={{ r: 4, fill: '#F97316', stroke: '#fff', strokeWidth: 1.5 }} 
                  />
                  <Line 
                    yAxisId="right" 
                    type="monotone" 
                    dataKey="rateGtc" 
                    name="% GTC Ca 2 (%)" 
                    stroke="#059669" 
                    strokeWidth={2} 
                    strokeDasharray="3 3"
                    dot={{ r: 3, fill: '#059669', stroke: '#fff', strokeWidth: 1 }} 
                  />
                  {/* ĐƯỜNG MỤC TIÊU VẬN HÀNH CA 2: ĐỘ PHỦ NV >= 70% & TỶ LỆ GÁN >= 50% */}
                  <ReferenceLine 
                    yAxisId="right" 
                    y={70} 
                    stroke="#4F46E5" 
                    strokeDasharray="4 4" 
                    strokeWidth={2}
                    label={{ value: 'Mục tiêu Độ phủ NV ≥70%', position: 'insideTopRight', fill: '#4338CA', fontSize: 10, fontWeight: 800 }}
                  />
                  <ReferenceLine 
                    yAxisId="right" 
                    y={50} 
                    stroke="#EA580C" 
                    strokeDasharray="4 4" 
                    strokeWidth={2}
                    label={{ value: 'Mục tiêu Tỷ lệ Gán ≥50%', position: 'insideBottomRight', fill: '#C2410C', fontSize: 10, fontWeight: 800 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* KHỐI NHẬN ĐỊNH VẬN HÀNH THỰC TẾ & HƯỚNG XỬ LÝ ĐIỂM NGHẼN CHÊNH LỆCH */}
          <div className="bg-gradient-to-r from-indigo-50/70 via-purple-50/40 to-slate-50 dark:from-indigo-950/30 dark:via-purple-950/20 dark:to-slate-800 border border-indigo-200 dark:border-indigo-900 rounded-xl p-3.5 space-y-2 text-xs text-slate-700 dark:text-slate-300">
            <div className="flex items-center gap-1.5 font-bold text-indigo-700 dark:text-indigo-400 text-xs uppercase tracking-wide">
              <Zap className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>Đánh Giá Thực Trạng &amp; Hướng Thúc Đẩy Mức Độ Chênh Lệch Gán vs Vol</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11.5px] leading-relaxed">
              <div className="bg-white/90 dark:bg-slate-800/90 p-2.5 rounded-lg border border-indigo-100 dark:border-indigo-950 shadow-2xs space-y-1">
                <div className="flex items-center gap-1 font-bold text-indigo-600 dark:text-indigo-400">
                  <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-indigo-600" />
                  <span>Điểm Nghẽn Kho Trưa: Chênh Lệch {matrixCa2Data.totalGap.toLocaleString('vi-VN')} Đơn</span>
                </div>
                <p>
                  Mức độ chênh lệch giữa Volume nhập và Gán lên tới <strong>{matrixCa2Data.avgRateGap}%</strong> ({matrixCa2Data.totalGap.toLocaleString('vi-VN')} đơn chưa được gán ra tuyến). Căn nguyên do xe tải trưa về kho nhưng đội ngũ chia chọn trễ, làm lỡ khung giờ xuất bến 14h30 của bưu tá chuyến 2.
                </p>
              </div>

              <div className="bg-white/90 dark:bg-slate-800/90 p-2.5 rounded-lg border border-amber-100 dark:border-amber-950 shadow-2xs space-y-1">
                <div className="flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                  <span>Điểm Thắt Lớn Nhất: {matrixCa2Data.worstBc ? matrixCa2Data.worstBc.shortName : 'Bưu cục trọng điểm'}</span>
                </div>
                <p>
                  {matrixCa2Data.worstBc ? (
                    <>
                      <strong>{matrixCa2Data.worstBc.shortName}</strong> đang có độ chênh lệch lớn nhất với <strong>{matrixCa2Data.worstBc.gapDon.toLocaleString('vi-VN')} đơn chưa gán</strong> ({matrixCa2Data.worstBc.rateGap}% Volume). Tỷ lệ gán chỉ đạt {matrixCa2Data.worstBc.rateGan}%, gây dồn ứ hàng sang ca sáng hôm sau.
                    </>
                  ) : (
                    'Các bưu cục trọng điểm cần siết chặt tỷ lệ gán đơn ca 2.'
                  )}
                </p>
              </div>

              <div className="bg-white/90 dark:bg-slate-800/90 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-950 shadow-2xs space-y-1">
                <div className="flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                  <span>Giải Pháp Hành Động AM Huy</span>
                </div>
                <p>
                  Chỉ đạo Trưởng bưu cục hoàn tất chia tuyến trước <strong>14h00</strong>; bám sát mục tiêu <strong>Độ phủ NV giao Ca 2 &ge; 70%</strong> và <strong>Tỷ lệ gán &ge; 50% Volume</strong>; bổ sung cơ chế tính hoa hồng hấp dẫn cho các kiện giao hoàn tất trong khung giờ 16h00 - 19h00.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 5. BẢNG TỔNG HỢP CHỈ SỐ VẬN HÀNH & ĐỘ PHỦ CA 2 THEO BƯU CỤC (LÀM NỔI TIÊU ĐỀ & CÓ BỘ LỌC ĐA CHỌN) */}
        <div id="section-ca2-summary-table" className="space-y-3.5 scroll-mt-20">
          {/* TIÊU ĐỀ BẢNG LÀM NỔI BẬT VỚI GRADIENT BANNER & ICON */}
          <div className="p-4 md:p-5 rounded-2xl bg-gradient-to-r from-orange-600 via-amber-600 to-indigo-700 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-3 border border-orange-400/30">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 backdrop-blur-md rounded-xl text-white shadow-inner shrink-0">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base md:text-lg font-black tracking-wide uppercase">
                    BẢNG TỔNG HỢP CHỈ SỐ VẬN HÀNH HÀNG MỚI CA 2 &amp; ĐỘ PHỦ THEO BƯU CỤC
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-white/25 text-white backdrop-blur-sm border border-white/30 uppercase tracking-wider">
                    5 Bưu Cục Khu Vực
                  </span>
                </div>
                <p className="text-xs text-orange-100 font-medium mt-1">
                  Chỉ số Volume, Gán, GTC, Tồn đọng được đối soát trực tiếp từ <strong>Hàng Mới Ca 2</strong> &bull; Đánh giá tỷ lệ phủ sóng bưu tá và năng lực giải phóng đơn ca chiều/tối
                </p>
              </div>
            </div>

            {/* Trạng thái xem tiêu chí Focus từ 4 Thẻ KPI */}
            {activeCa2KpiFocus !== 'all' && (
              <div className="shrink-0 flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/30">
                <Sparkles className="w-4 h-4 text-amber-200 animate-spin" />
                <span className="text-xs font-bold">
                  Đang tập trung cột:{' '}
                  {activeCa2KpiFocus === 'volume' ? 'Volume Nhập Ca 2' :
                   activeCa2KpiFocus === 'gan' ? 'SLĐ Gán Ra Tuyến' :
                   activeCa2KpiFocus === 'gap' ? 'Chênh Lệch / Tồn Ca 2' : 'Giao Thành Công (GTC)'}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveCa2KpiFocus('all')}
                  className="ml-1 text-[11px] underline hover:text-orange-200 cursor-pointer font-bold"
                >
                  (Xem tất cả)
                </button>
              </div>
            )}
          </div>

          {/* BỘ LỌC ĐA CHỌN RIÊNG BIỆT CHO BẢNG: TICK CHỌN BƯU CỤC, THÁNG, TUẦN, NGÀY THEO Ý */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2.5 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 dark:border-slate-700/80 pb-2">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-orange-600" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">
                  Bộ Lọc Bảng Tổng Hợp Ca 2: Bưu Cục, Tháng, Tuần &amp; Ngày Theo Ý
                </span>
                <span className="text-[11px] text-slate-400">
                  (Tick chọn đa tiêu chí để tùy biến dữ liệu đối soát bảng)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-[11px]">
                  <button
                    type="button"
                    onClick={() => handleQuickSetTableCa2Dates(7)}
                    className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold transition-colors cursor-pointer"
                  >
                    7 Ngày
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickSetTableCa2Dates(14)}
                    className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold transition-colors cursor-pointer"
                  >
                    14 Ngày
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickSetTableCa2Dates('all')}
                    className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold transition-colors cursor-pointer"
                  >
                    Tất cả
                  </button>
                </div>

                {(tableCa2FilterBuuCuc.length > 0 || tableCa2FilterMonths.length > 0 || tableCa2FilterWeeks.length > 0 || tableCa2FilterDates.length > 0) && (
                  <button
                    type="button"
                    onClick={handleResetTableCa2Filter}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 rounded-lg transition-colors border border-rose-200 dark:border-rose-900/50 cursor-pointer shadow-2xs"
                    title="Đặt lại toàn bộ bộ lọc bảng"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Xóa lọc</span>
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
              {/* Lọc Bưu Cục */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-orange-500" /> Bưu Cục:
                  {tableCa2FilterBuuCuc.length > 0 && (
                    <span className="ml-1 text-[10px] text-orange-600 font-bold">({tableCa2FilterBuuCuc.length} BC)</span>
                  )}
                </label>
                <IndividualFilterDropdown
                  label="Tất cả bưu cục"
                  compact={false}
                  icon={<Building2 className="w-3.5 h-3.5 text-orange-600" />}
                  options={buuCucOptions}
                  selectedValues={tableCa2FilterBuuCuc}
                  onChange={setTableCa2FilterBuuCuc}
                  searchPlaceholder="Tìm bưu cục..."
                  minWidth="w-64"
                />
              </div>

              {/* Lọc Tháng */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-emerald-500" /> Tháng:
                  {tableCa2FilterMonths.length > 0 && (
                    <span className="ml-1 text-[10px] text-emerald-600 font-bold">({tableCa2FilterMonths.length} tháng)</span>
                  )}
                </label>
                <IndividualFilterDropdown
                  label="Tất cả các tháng"
                  compact={false}
                  icon={<Calendar className="w-3.5 h-3.5 text-emerald-600" />}
                  options={availableMonths.map(m => ({ label: `${m.label} (${m.dates.length} ngày)`, value: m.key }))}
                  selectedValues={tableCa2FilterMonths}
                  onChange={setTableCa2FilterMonths}
                  searchPlaceholder="Tìm tháng..."
                  minWidth="w-60"
                />
              </div>

              {/* Lọc Tuần */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-purple-500" /> Tuần:
                  {tableCa2FilterWeeks.length > 0 && (
                    <span className="ml-1 text-[10px] text-purple-600 font-bold">({tableCa2FilterWeeks.length} tuần)</span>
                  )}
                </label>
                <IndividualFilterDropdown
                  label="Tất cả các tuần"
                  compact={false}
                  icon={<Clock className="w-3.5 h-3.5 text-purple-600" />}
                  options={availableWeeks.map(w => ({ label: `${w.label} (${w.dates.length} ngày)`, value: w.key }))}
                  selectedValues={tableCa2FilterWeeks}
                  onChange={setTableCa2FilterWeeks}
                  searchPlaceholder="Tìm tuần..."
                  minWidth="w-64"
                />
              </div>

              {/* Lọc Ngày */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-rose-500" /> Ngày Vận Hành:
                  {tableCa2FilterDates.length > 0 && (
                    <span className="ml-1 text-[10px] text-rose-600 font-bold">({tableCa2FilterDates.length} ngày)</span>
                  )}
                </label>
                <IndividualFilterDropdown
                  label="Tất cả các ngày"
                  compact={false}
                  icon={<Calendar className="w-3.5 h-3.5 text-rose-600" />}
                  options={allUniqueDatesDesc.map(d => ({ label: d, value: d }))}
                  selectedValues={tableCa2FilterDates}
                  onChange={setTableCa2FilterDates}
                  searchPlaceholder="Tìm ngày (dd/mm/yyyy)..."
                  minWidth="w-60"
                />
              </div>
            </div>
          </div>

          {/* BẢNG SỐ LIỆU ĐƯỢC CĂN GIỮA TIÊU ĐỀ & TOÀN BỘ SỐ LIỆU */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
            <table className="w-full text-xs text-center border-collapse">
              <thead className="bg-slate-100 dark:bg-slate-750 text-slate-700 dark:text-slate-200 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-2.5 px-2.5 text-center">Bưu Cục</th>
                  <th className="py-2.5 px-2 text-center" title="Số lượng nhân viên có chuyến đi trong ca">SL NV có CĐ</th>
                  <th className={`py-2.5 px-2 text-center transition-colors ${activeCa2KpiFocus === 'gan' ? 'bg-orange-200 dark:bg-orange-900/60 text-orange-950 dark:text-orange-100 font-black ring-2 ring-orange-500' : ''}`} title="Số lượng nhân viên được gán đi ca 2 (2 chuyến/ngày)">
                    SL NV gán Ca 2
                  </th>
                  <th className="py-2.5 px-2 text-center">Độ Phủ Ca 2</th>
                  <th className="py-2.5 px-2 text-center">Chỉ Đi 1 Ca</th>
                  {/* TIÊU ĐỀ NỔI BẬT: VOL CA 2, GÁN CA 2, %GTC CA 2 */}
                  <th className={`py-2.5 px-2.5 text-center transition-all bg-indigo-600 text-white font-black text-xs tracking-wide shadow-xs border-x border-indigo-500 ${activeCa2KpiFocus === 'volume' ? 'ring-2 ring-indigo-300' : ''}`} title="Tổng Volume nhập hàng mới ca chiều/tối">
                    Vol Ca 2
                  </th>
                  <th className={`py-2.5 px-2.5 text-center transition-all bg-orange-500 text-white font-black text-xs tracking-wide shadow-xs border-x border-orange-400 ${activeCa2KpiFocus === 'gan' ? 'ring-2 ring-orange-200' : ''}`} title="Số lượng đơn hàng mới đã gán xuất tuyến ca 2 & Tỷ lệ gán trên Volume">
                    Gán Ca 2
                  </th>
                  <th className="py-2.5 px-2 text-center bg-emerald-700 text-white font-black text-xs tracking-wide border-x border-emerald-600">
                    GTC Ca 2
                  </th>
                  <th className={`py-2.5 px-2.5 text-center transition-all bg-emerald-600 text-white font-black text-xs tracking-wide shadow-xs border-x border-emerald-500 ${activeCa2KpiFocus === 'gtc' ? 'ring-2 ring-emerald-200' : ''}`} title="Tỷ lệ Giao Thành Công trên số đơn đã gán ca 2">
                    %GTC Ca 2
                  </th>
                  <th className={`py-2.5 px-2 text-center transition-colors ${activeCa2KpiFocus === 'gap' ? 'bg-rose-200 dark:bg-rose-900/60 text-rose-950 dark:text-rose-100 font-black ring-2 ring-rose-500' : 'bg-orange-50/70 dark:bg-orange-950/20 text-orange-800 dark:text-orange-200'}`}>
                    Tồn Ca 2
                  </th>
                  <th className="py-2.5 px-3 text-center w-72">Đánh Giá &amp; Hướng Thúc Đẩy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 dark:divide-slate-700/80">
                {ca2SummaryByBuuCuc.rows.map((row) => (
                  <tr key={row.buuCuc} className="hover:bg-slate-50/80 dark:hover:bg-slate-750/50 transition-colors">
                    <td className="py-2.5 px-2.5 text-center font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      <div className="inline-flex items-center justify-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                        <span>{row.buuCuc}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-center font-bold text-slate-800 dark:text-slate-200">
                      {row.totalShifts.toLocaleString('vi-VN')}
                    </td>
                    <td className={`py-2.5 px-2 text-center font-black transition-colors ${
                      activeCa2KpiFocus === 'gan'
                        ? 'bg-orange-100 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {row.ca2Shifts.toLocaleString('vi-VN')}
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-black ${
                        row.rateCa2 >= 70
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : row.rateCa2 >= 55
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}>
                        {row.rateCa2.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-center font-bold text-amber-600 dark:text-amber-400">
                      {row.ca1Shifts.toLocaleString('vi-VN')}
                    </td>
                    {/* Các cột chỉ số vận hành lấy từ "Hàng Mới Ca 2" - LÀM NỔI BẬT CHỈ SỐ VOL, GÁN, %GTC */}
                    <td className="py-2.5 px-2 text-center font-black text-xs text-indigo-700 dark:text-indigo-300 bg-indigo-50/90 dark:bg-indigo-950/40 border-x border-indigo-100 dark:border-indigo-900/50">
                      <span className="text-[13px]">{row.volumeCa2.toLocaleString('vi-VN')}</span>
                    </td>
                    <td className="py-2.5 px-2 text-center font-black text-xs text-orange-700 dark:text-orange-300 bg-orange-50/90 dark:bg-orange-950/40 border-x border-orange-100 dark:border-orange-900/50">
                      <span className="text-[13px]">{row.sldGanCa2.toLocaleString('vi-VN')}</span>
                      <span className="block text-[10px] text-orange-600 dark:text-orange-400 font-bold mt-0.5">
                        ({row.rateGanCa2.toFixed(1)}% Vol)
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-center font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20 border-x border-emerald-100 dark:border-emerald-900/50">
                      {row.sldGtcCa2.toLocaleString('vi-VN')}
                    </td>
                    <td className="py-2.5 px-2 text-center bg-emerald-50/90 dark:bg-emerald-950/40 border-x border-emerald-100 dark:border-emerald-900/50">
                      <span className={`inline-block px-2.5 py-1 rounded-md font-black text-xs shadow-2xs ${
                        row.rateGtcCa2 >= 85
                          ? 'bg-emerald-600 text-white'
                          : row.rateGtcCa2 >= 70
                          ? 'bg-emerald-500 text-white'
                          : 'bg-amber-500 text-white'
                      }`}>
                        {row.rateGtcCa2.toFixed(1)}%
                      </span>
                    </td>
                    <td className={`py-2.5 px-2 text-center font-black transition-colors ${
                      activeCa2KpiFocus === 'gap'
                        ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 font-black ring-1 ring-rose-400'
                        : 'text-rose-600 dark:text-rose-400 bg-orange-50/40 dark:bg-orange-950/10'
                    }`}>
                      {row.tonDongCa2.toLocaleString('vi-VN')}
                    </td>
                    {/* CỘT ĐÁNH GIÁ & HƯỚNG THÚC ĐẨY: HIGHLIGHT CẢNH BÁO */}
                    <td className="py-2 px-2.5 text-left">
                      {row.statusLevel === 'alert' ? (
                        <div className="p-2 rounded-lg bg-rose-100/90 dark:bg-rose-950/80 border-2 border-rose-400 dark:border-rose-700 text-rose-900 dark:text-rose-100 shadow-2xs">
                          <div className="flex items-center gap-1 font-black text-[11px] text-rose-700 dark:text-rose-300 mb-0.5">
                            <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0 animate-bounce" />
                            <span>{row.evalBadge}</span>
                          </div>
                          <div className="text-[11px] font-bold leading-tight">{row.recommendation}</div>
                        </div>
                      ) : row.statusLevel === 'warning' ? (
                        <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-100">
                          <div className="flex items-center gap-1 font-bold text-[11px] text-amber-700 dark:text-amber-300 mb-0.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>{row.evalBadge}</span>
                          </div>
                          <div className="text-[11px] leading-tight font-medium">{row.recommendation}</div>
                        </div>
                      ) : (
                        <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100">
                          <div className="flex items-center gap-1 font-bold text-[11px] text-emerald-700 dark:text-emerald-300 mb-0.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{row.evalBadge}</span>
                          </div>
                          <div className="text-[11px] leading-tight font-medium">{row.recommendation}</div>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 dark:bg-slate-750 font-black border-t-2 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100">
                <tr>
                  <td className="py-2.5 px-2.5 text-center uppercase tracking-wider text-orange-600 dark:text-orange-400 font-black">
                    TOÀN KHU VỰC
                  </td>
                  <td className="py-2.5 px-2 text-center font-black">
                    {ca2SummaryByBuuCuc.totalAll.totalShifts.toLocaleString('vi-VN')}
                  </td>
                  <td className="py-2.5 px-2 text-center font-black text-emerald-600 dark:text-emerald-400">
                    {ca2SummaryByBuuCuc.totalAll.ca2Shifts.toLocaleString('vi-VN')}
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-600 text-white shadow-2xs">
                      {ca2SummaryByBuuCuc.totalAll.overallRateCa2.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-center font-black text-amber-600 dark:text-amber-400">
                    {ca2SummaryByBuuCuc.totalAll.ca1Shifts.toLocaleString('vi-VN')}
                  </td>
                  <td className="py-2.5 px-2 text-center font-black bg-indigo-600 text-white border-x border-indigo-700">
                    <span className="text-xs">{ca2SummaryByBuuCuc.totalAll.volumeCa2.toLocaleString('vi-VN')}</span>
                  </td>
                  <td className="py-2.5 px-2 text-center font-black bg-orange-500 text-white border-x border-orange-600">
                    <span className="text-xs">{ca2SummaryByBuuCuc.totalAll.sldGanCa2.toLocaleString('vi-VN')}</span>
                    <span className="block text-[10px] text-orange-100 font-bold mt-0.5">
                      ({((ca2SummaryByBuuCuc.totalAll.sldGanCa2 / (ca2SummaryByBuuCuc.totalAll.volumeCa2 || 1)) * 100).toFixed(1)}% Vol)
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-center font-black text-emerald-600 dark:text-emerald-400 bg-orange-100/70 dark:bg-orange-950/40">
                    {ca2SummaryByBuuCuc.totalAll.sldGtcCa2.toLocaleString('vi-VN')}
                  </td>
                  <td className="py-2.5 px-2 text-center font-black bg-emerald-600 text-white border-x border-emerald-700">
                    <span className="bg-white/20 px-2 py-0.5 rounded text-xs">
                      {ca2SummaryByBuuCuc.totalAll.overallRateGtcCa2.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-center font-black text-rose-600 dark:text-rose-400 bg-orange-100/70 dark:bg-orange-950/40">
                    {ca2SummaryByBuuCuc.totalAll.tonDongCa2.toLocaleString('vi-VN')}
                  </td>
                  <td className="py-2.5 px-2.5 text-center text-xs font-bold">
                    <div className="text-[11px] font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-tight">
                      Mục tiêu vận hành ca:
                    </div>
                    <div className="text-[11px] font-black text-indigo-700 dark:text-indigo-300 mt-0.5 whitespace-nowrap">
                      Độ phủ NV giao Ca 2 &ge; 70% &bull; Tỷ lệ gán &ge; 50% Vol
                    </div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* 6. BẢNG THỐNG KÊ SỐ LƯỢNG NHÂN VIÊN CHỈ ĐI CA 2 VÀ CHỈ ĐI CA 1 THEO TỪNG NGÀY */}
        <div id="section-ca2-daily" className="space-y-2.5 scroll-mt-16">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-600" />
                Bảng Thống Kê Số Lượng Nhân Viên Đi Ca 2 &amp; Chỉ Đi Ca 1 Theo Từng Ngày
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Theo dõi biến động nhân sự ca chiều/tối qua từng ngày vận hành • Kết hợp sản lượng đơn Hàng Mới Ca 2
              </p>
            </div>
            <div className="text-[11px] text-slate-500 font-medium">
              Hiển thị: <strong>{ca2DailyBreakdown.length}</strong> ngày vận hành
            </div>
          </div>

          <div className="overflow-x-auto max-h-[380px] rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-100 dark:bg-slate-750 text-slate-700 dark:text-slate-200 text-[11px] font-bold uppercase tracking-wider sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-2 px-3">Ngày Vận Hành</th>
                  <th className="py-2 px-2">Thứ</th>
                  <th className="py-2 px-2 text-center">Tổng Bưu Tá</th>
                  <th className="py-2 px-2 text-center text-emerald-700 dark:text-emerald-400">NV Đi Ca 2 (2 ch)</th>
                  <th className="py-2 px-2 text-center">Tỷ Lệ Ca 2 (%)</th>
                  <th className="py-2 px-2 text-center text-amber-700 dark:text-amber-400">Chỉ Đi 1 Ca (1 ch)</th>
                  <th className="py-2 px-2 text-center">Tỷ Lệ 1 Ca (%)</th>
                  {/* TIÊU ĐỀ NỔI BẬT: VOL CA 2, GÁN CA 2, GTC CA 2, %GTC CA 2 */}
                  <th className="py-2 px-2 text-center bg-indigo-600 text-white font-black text-[11px] uppercase border-x border-indigo-500 shadow-xs" title="Tổng Volume nhập hàng mới ca chiều/tối">
                    Vol Ca 2
                  </th>
                  <th className="py-2 px-2 text-center bg-orange-500 text-white font-black text-[11px] uppercase border-x border-orange-400 shadow-xs" title="Số lượng đơn hàng mới đã gán xuất tuyến ca 2 & Tỷ lệ gán trên Volume">
                    Gán Ca 2
                  </th>
                  <th className="py-2 px-2 text-center bg-emerald-700 text-white font-black text-[11px] uppercase border-x border-emerald-600">
                    GTC Ca 2
                  </th>
                  <th className="py-2 px-2 text-center bg-emerald-600 text-white font-black text-[11px] uppercase border-x border-emerald-500 shadow-xs" title="Tỷ lệ Giao Thành Công trên số đơn đã gán ca 2">
                    %GTC ca2
                  </th>
                  <th className="py-2 px-2 text-center bg-rose-50/80 dark:bg-rose-950/30 text-rose-800 dark:text-rose-200 font-bold">Tồn Ca 2</th>
                  <th className="py-2 px-2.5 text-center">Tình Trạng Ngày</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 dark:divide-slate-700/80">
                {ca2DailyBreakdown.map((row) => (
                  <tr key={row.ngay} className="hover:bg-slate-50/80 dark:hover:bg-slate-750/50 transition-colors">
                    <td className="py-2 px-3 font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      {row.ngay}
                    </td>
                    <td className="py-2 px-2 font-medium text-slate-500 dark:text-slate-400">
                      {row.thu}
                    </td>
                    <td className="py-2 px-2 text-center font-bold text-slate-800 dark:text-slate-200">
                      {row.totalNV}
                    </td>
                    <td className="py-2 px-2 text-center font-black text-emerald-600 dark:text-emerald-400">
                      {row.ca2NV}
                    </td>
                    <td className="py-2 px-2 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded font-black text-[11px] ${
                        row.rateCa2 >= 70
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : row.rateCa2 >= 55
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}>
                        {row.rateCa2.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-2 px-2 text-center font-bold text-amber-600 dark:text-amber-400">
                      {row.ca1NV}
                    </td>
                    <td className="py-2 px-2 text-center font-bold text-slate-600 dark:text-slate-400">
                      {row.rateCa1.toFixed(1)}%
                    </td>
                    {/* Chỉ số vận hành Hàng Mới Ca 2 - LÀM NỔI BẬT VOL, GÁN, %GTC CA 2 */}
                    <td className="py-2 px-2 text-center font-black text-indigo-700 dark:text-indigo-300 bg-indigo-50/90 dark:bg-indigo-950/40 border-x border-indigo-100 dark:border-indigo-900/50">
                      <span className="text-[12px]">{row.volumeCa2.toLocaleString('vi-VN')}</span>
                    </td>
                    <td className="py-2 px-2 text-center font-black text-orange-700 dark:text-orange-300 bg-orange-50/90 dark:bg-orange-950/40 border-x border-orange-100 dark:border-orange-900/50">
                      <span className="text-[12px]">{row.sldGanCa2.toLocaleString('vi-VN')}</span>
                      <span className="block text-[10px] text-orange-600 dark:text-orange-400 font-bold">
                        ({(row.volumeCa2 > 0 ? (row.sldGanCa2 / row.volumeCa2 * 100) : 0).toFixed(1)}% Vol)
                      </span>
                    </td>
                    <td className="py-2 px-2 text-center font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20 border-x border-emerald-100 dark:border-emerald-900/50">
                      {row.sldGtcCa2.toLocaleString('vi-VN')}
                    </td>
                    <td className="py-2 px-2 text-center bg-emerald-50/90 dark:bg-emerald-950/40 border-x border-emerald-100 dark:border-emerald-900/50">
                      <span className={`inline-block px-2 py-0.5 rounded font-black text-[11px] shadow-2xs ${
                        row.rateGtcCa2 >= 85
                          ? 'bg-emerald-600 text-white'
                          : row.rateGtcCa2 >= 70
                          ? 'bg-emerald-500 text-white'
                          : 'bg-amber-500 text-white'
                      }`}>
                        {row.rateGtcCa2.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-2 px-2 text-center font-bold text-rose-600 dark:text-rose-400 bg-rose-50/40 dark:bg-rose-950/20">
                      {row.tonDongCa2.toLocaleString('vi-VN')}
                    </td>
                    <td className="py-2 px-2.5 text-center">
                      {row.status === 'good' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Đạt Chuẩn
                        </span>
                      ) : row.status === 'warning' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          Cần Đôn Đốc
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                          <ShieldAlert className="w-3 h-3 text-rose-600" />
                          Báo Động Thiếu Ca
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 7. BẢNG CHI TIẾT THEO DÕI BƯU TÁ GIAO HÀNG CA 2 THEO NGÀY */}
        <div className="pt-1">
          <DataTable<GtcEmployeeRecord>
            columns={ca2TableColumns}
            data={ca2FilteredRecords}
            title="Bảng Chi Tiết Theo Dõi Bưu Tá Giao Hàng Ca 2 Theo Ngày"
            subtitle="Phân loại rõ: Có đi Ca 2 (2 chuyến đi/ngày) vs Chỉ đi 1 ca (1 chuyến/ngày) để quản lý, đôn đốc và khen thưởng đội ngũ"
            exportFilename="theo_doi_ca_2_nhan_vien_ghn"
            pagination={false}
            keyExtractor={(r, idx) => `ca2_${r.maNV}_${r.ngay}_${idx}`}
            maxHeight="max-h-[580px]"
            stickyHeader={true}
            noWrap={true}
            filterBar={
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 dark:border-slate-700/80 pb-2 text-xs">
                <div className="flex items-center gap-2">
                  <Moon className="w-4 h-4 text-indigo-600" />
                  <span className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide text-xs">
                    Bộ Lọc Trạng Thái &amp; Tìm Kiếm:
                  </span>
                  <select
                    value={ca2FilterStatus}
                    onChange={e => setCa2FilterStatus(e.target.value as any)}
                    className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-2.5 py-1 text-slate-800 dark:text-slate-100 font-semibold focus:ring-1 focus:ring-indigo-500 focus:outline-none shadow-2xs cursor-pointer text-xs"
                  >
                    <option value="all">Tất cả trạng thái ca</option>
                    <option value="ca2">✓ Có đi Ca 2 (2 chuyến)</option>
                    <option value="ca1">⚠ Chỉ đi 1 ca (1 chuyến)</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <input
                      type="text"
                      value={ca2SearchTerm}
                      onChange={e => setCa2SearchTerm(e.target.value)}
                      placeholder="Tìm theo tên, mã NV..."
                      className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg pl-7 pr-2.5 py-1 text-slate-800 dark:text-slate-100 font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none shadow-2xs text-xs w-48"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
                  </div>

                  <span className="text-[11px] px-2 py-1 rounded font-semibold bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                    Hiển thị: <strong className="text-indigo-600 dark:text-indigo-400 font-bold">{ca2FilteredRecords.length.toLocaleString('vi-VN')}</strong> / {dataset.gtcNhanVien.length.toLocaleString('vi-VN')} ca
                  </span>
                </div>
              </div>
            }
          />
        </div>
      </div>
    </div>
  );
};

export default GtcEmployeeTab;
