import { ChartEmptyState } from '../components/common/ChartEmptyState';
import React, { useState, useMemo, useRef } from 'react';
import { 
  PackageX, 
  Building2, 
  Layers, 
  Activity, 
  AlertTriangle, 
  Clock, 
  RotateCcw,
  AlertOctagon,
  CheckCircle2,
  ShoppingBag,
  ShieldAlert,
  Lightbulb,
  TrendingUp,
  Store,
  Flame,
  Zap,
  PhoneCall,
  Truck,
  Timer,
  ChevronUp,
  ChevronDown,
  Send
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ComposedChart,
  Line
} from 'recharts';
import { useDashboard } from '../context/DashboardContext';
import { useAuth } from '../context/AuthContext';
import type { BacklogGltRecord } from '../types/dashboard';
import { normalizeOrderId, dedupeGltRecords, computeGltBacklogBreakdown } from '../services/kpiEngine';
import { DataTable } from '../components/common/DataTable';
import type { Column } from '../components/common/DataTable';
import { IndividualFilterDropdown } from '../components/common/IndividualFilterDropdown';
import { 
  classifyGltAging, 
  computePostOfficeAgingMatrix, 
  computeCustomerAgingMatrix
} from '../utils/gltAgingEngine';

export const BacklogGltTab: React.FC = () => {
  const { dataset, selectedBuuCucGlobal, setSelectedBuuCucGlobal } = useDashboard();
  const { currentUser } = useAuth();
  const isStaff = currentUser?.role === 'post_office_staff';
  const assignedPo = currentUser?.assignedPostOffice;

  const lastPushedBcRef = React.useRef<string>(isStaff && assignedPo ? assignedPo : (selectedBuuCucGlobal || 'all'));

  // Independent Filter state (Đồng bộ với bưu cục được chọn)
  const [filterValues, setFilterValues] = useState<Record<string, string[]>>(() => ({
    buuCuc: isStaff && assignedPo ? [assignedPo] : (selectedBuuCucGlobal && selectedBuuCucGlobal !== 'all' ? [selectedBuuCucGlobal] : []),
    loaiDon: [],
    trangThai: [],
    canhBao: [],
    thoiGianTonDong: []
  }));

  React.useEffect(() => {
    if (isStaff && assignedPo) {
      setFilterValues(prev => ({ ...prev, buuCuc: [assignedPo] }));
      return;
    }
    if (selectedBuuCucGlobal !== lastPushedBcRef.current) {
      lastPushedBcRef.current = selectedBuuCucGlobal || 'all';
      setFilterValues(prev => ({
        ...prev,
        buuCuc: selectedBuuCucGlobal && selectedBuuCucGlobal !== 'all' ? [selectedBuuCucGlobal] : []
      }));
    }
  }, [selectedBuuCucGlobal, isStaff, assignedPo]);

  // Options
  const buuCucOptions = useMemo(() => {
    if (isStaff && assignedPo) return [{ label: assignedPo, value: assignedPo }];
    return [...new Set(dataset.tonDongGlt.map(r => r.buuCuc))].filter(Boolean).map(b => ({ label: b, value: b }));
  }, [dataset.tonDongGlt, isStaff, assignedPo]);

  const loaiDonOptions = useMemo(() => {
    return [...new Set(dataset.tonDongGlt.map(r => r.loaiDon))].filter(Boolean).map(l => ({ label: l, value: l }));
  }, [dataset.tonDongGlt]);

  const trangThaiOptions = useMemo(() => {
    return [...new Set(dataset.tonDongGlt.map(r => r.trangThai))].filter(Boolean).map(s => ({ label: s, value: s }));
  }, [dataset.tonDongGlt]);

  const canhBaoOptions = useMemo(() => {
    return [...new Set(dataset.tonDongGlt.map(r => r.canhBao))].filter(Boolean).map(c => ({ label: c, value: c }));
  }, [dataset.tonDongGlt]);

  const thoiGianOptions = useMemo(() => {
    return [...new Set(dataset.tonDongGlt.map(r => r.thoiGianTonDong))].filter(Boolean).map(t => ({ label: `${t} giờ`, value: t }));
  }, [dataset.tonDongGlt]);

  const totalActiveFilters = useMemo(() => {
    return (filterValues.buuCuc?.length || 0) +
      (filterValues.loaiDon?.length || 0) +
      (filterValues.trangThai?.length || 0) +
      (filterValues.canhBao?.length || 0) +
      (filterValues.thoiGianTonDong?.length || 0);
  }, [filterValues]);

  const handleResetAllFilters = () => {
    setFilterValues({
      buuCuc: isStaff && assignedPo ? [assignedPo] : [],
      loaiDon: [],
      trangThai: [],
      canhBao: [],
      thoiGianTonDong: []
    });
    if (!isStaff) {
      lastPushedBcRef.current = 'all';
      setSelectedBuuCucGlobal('all');
    }
  };

  // Apply filters & deduplicate by unique normalized maDonHang
  const matchedRawRows = useMemo(() => {
    const result: BacklogGltRecord[] = [];
    for (const r of dataset.tonDongGlt) {
      if (filterValues.buuCuc?.length && !filterValues.buuCuc.includes(r.buuCuc)) continue;
      if (filterValues.loaiDon?.length && !filterValues.loaiDon.includes(r.loaiDon)) continue;
      if (filterValues.trangThai?.length && !filterValues.trangThai.includes(r.trangThai)) continue;
      if (filterValues.canhBao?.length && !filterValues.canhBao.includes(r.canhBao)) continue;
      if (filterValues.thoiGianTonDong?.length && !filterValues.thoiGianTonDong.includes(r.thoiGianTonDong)) continue;
      result.push(r);
    }
    return result;
  }, [dataset.tonDongGlt, filterValues]);

  const gltBreakdown = useMemo(() => {
    return computeGltBacklogBreakdown(matchedRawRows);
  }, [matchedRawRows]);

  const filteredData = useMemo(() => {
    return dedupeGltRecords(matchedRawRows);
  }, [matchedRawRows]);

  // State chọn nhóm KPI làm menu điều hướng danh sách chi tiết
  type KpiGroup = 'all' | 'giao' | 'lay' | 'tra' | 'uutien' | 'chuacochuyen' | 'overdue' | 'tts' | 'urgent192h' | string;
  const [selectedKpi, setSelectedKpi] = useState<KpiGroup>('all');
  const [showKpiCards, setShowKpiCards] = useState<boolean>(true);
  const tableRef = useRef<HTMLDivElement>(null);

  const handleKpiCardClick = (kpi: KpiGroup) => {
    setSelectedKpi(prev => (prev === kpi ? 'all' : kpi));
    setTimeout(() => {
      tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  };

  const selectedKpiLabel = useMemo(() => {
    if (selectedKpi.startsWith('customer:')) {
      const cust = selectedKpi.replace('customer:', '');
      return `Đơn Hàng Đối Tác / Sàn: ${cust}`;
    }
    switch (selectedKpi) {
      case 'giao': return 'Đơn Giao Tồn';
      case 'lay': return 'Đơn Lấy Tồn';
      case 'tra': return 'Đơn Trả Tồn';
      case 'uutien': return 'Ưu Tiên Giao / Đã Trễ';
      case 'chuacochuyen': return 'Chưa Có Chuyến Đi';
      case 'overdue': return 'Quá Hạn > 120h';
      case 'tts': return 'Đơn Hàng TikTok Shop (TTS)';
      case 'urgent192h': return '🚨 Đơn Khẩn Cấp > 8 Ngày (192h) - Xử Lý Triệt Để';
      default: return 'Tổng Tồn GLT (Snapshot Hiện Hành)';
    }
  }, [selectedKpi]);

  // Tab KPIs — Chuẩn hóa đếm mã đơn duy nhất (Set<normalizeOrderId(maDonHang)>) và phân tách đủ 4 nhóm GLT + nhóm 192h khẩn cấp nhất
  const tabKPIs = useMemo(() => {
    let chuaCoChuyen = 0;
    let urgentOverdue = 0;
    let ttsCount = 0;
    let urgent192hCount = 0;

    for (let i = 0; i < filteredData.length; i++) {
      const r = filteredData[i];
      if ((r.trangThai || '').includes('Chưa có chuyến')) {
        chuaCoChuyen++;
      }
      if (r.thoiGianTonDong === '120_192' || r.thoiGianTonDong === '192') {
        urgentOverdue++;
      }
      if (r.khachHang === 'TTS') {
        ttsCount++;
      }
      const aging = classifyGltAging(r.thoiGianTonDong, r.canhBao);
      if (aging.isUrgent192h) {
        urgent192hCount++;
      }
    }

    return {
      totalCount: gltBreakdown.totalUnique,
      donGiao: gltBreakdown.giao,
      donLay: gltBreakdown.lay,
      donTra: gltBreakdown.tra,
      donUuTienTre: gltBreakdown.uuTienTre,
      donUuTienDaTre: gltBreakdown.uuTienDaTre,
      donUuTienTrongNgay: gltBreakdown.uuTienTrongNgay,
      businessConflictCount: gltBreakdown.businessConflictCount,
      secondaryDiffCount: gltBreakdown.secondaryDiffCount,
      exactDuplicateCount: gltBreakdown.exactDuplicateCount,
      duplicateRowsIgnored: gltBreakdown.duplicateRowsIgnored,
      emptyOrderIdRowsIgnored: gltBreakdown.emptyOrderIdRowsIgnored,
      chuaCoChuyen,
      urgentOverdue,
      ttsCount,
      urgent192hCount
    };
  }, [filteredData, gltBreakdown]);

  // Dữ liệu bảng chi tiết được liên kết với Menu KPI
  const tableData = useMemo(() => {
    if (selectedKpi.startsWith('customer:')) {
      const cust = selectedKpi.replace('customer:', '').trim().toUpperCase();
      return filteredData.filter(r => (r.khachHang || 'OTHER').trim().toUpperCase() === cust);
    }
    if (selectedKpi === 'giao') {
      return filteredData.filter(r => r.loaiDon === 'Giao');
    }
    if (selectedKpi === 'lay') {
      return filteredData.filter(r => r.loaiDon === 'Lấy');
    }
    if (selectedKpi === 'tra') {
      return filteredData.filter(r => r.loaiDon === 'Trả');
    }
    if (selectedKpi === 'uutien') {
      return filteredData.filter(r => {
        const loaiLower = (r.loaiDon || '').toLowerCase();
        return loaiLower.includes('ưu tiên') || loaiLower.includes('trễ');
      });
    }
    if (selectedKpi === 'chuacochuyen') {
      return filteredData.filter(r => r.trangThai.includes('Chưa có chuyến'));
    }
    if (selectedKpi === 'overdue') {
      return filteredData.filter(r => r.thoiGianTonDong === '120_192' || r.thoiGianTonDong === '192');
    }
    if (selectedKpi === 'tts') {
      return filteredData.filter(r => r.khachHang === 'TTS');
    }
    if (selectedKpi === 'urgent192h') {
      return filteredData.filter(r => classifyGltAging(r.thoiGianTonDong, r.canhBao).isUrgent192h);
    }
    return filteredData;
  }, [filteredData, selectedKpi]);

  // Chart data: Backlog by Post Office (đếm mã đơn duy nhất)
  const poBacklogData = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    filteredData.forEach(r => {
      const id = normalizeOrderId(r.maDonHang);
      if (!r.buuCuc || !id) return;
      if (!map[r.buuCuc]) map[r.buuCuc] = new Set();
      map[r.buuCuc].add(id);
    });
    return Object.entries(map)
      .map(([buuCuc, set]) => ({ buuCuc, count: set.size }))
      .sort((a, b) => b.count - a.count);
  }, [filteredData]);

  // Chart data: Backlog by Type (đếm mã đơn duy nhất)
  const typeBacklogData = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    filteredData.forEach(r => {
      const id = normalizeOrderId(r.maDonHang);
      if (!r.loaiDon || !id) return;
      if (!map[r.loaiDon]) map[r.loaiDon] = new Set();
      map[r.loaiDon].add(id);
    });
    return Object.entries(map).map(([name, set]) => ({ name, value: set.size }));
  }, [filteredData]);

  const TYPE_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  // =========================================================================
  // BÁO CÁO 1: MA TRẬN PHÂN CẤP ĐỘ TUỔI TỒN QUY ĐỔI GIỜ -> NGÀY (CÓ CỘT 192H)
  // =========================================================================
  const agingMatrixData = useMemo(() => {
    const buuCucList = [...new Set(dataset.tonDongGlt.map(r => r.buuCuc))].filter(Boolean);
    return computePostOfficeAgingMatrix(filteredData, buuCucList);
  }, [dataset.tonDongGlt, filteredData]);

  // Tương thích ngược cho các điểm cần alertMatrixData
  const alertMatrixData = useMemo(() => {
    return {
      rows: agingMatrixData.rows.map(r => ({
        buuCuc: r.buuCuc,
        buuCucShort: r.buuCucShort,
        total: r.total,
        hangMoi: r.lt_1d,
        tonDong: r.p_1_3d,
        canhBao: r.p_3_5d,
        khanCap: r.p_5_8d + r.p_gt_8d_192h,
        riskRate: r.overdueRate,
        riskLevel: r.riskLevel
      })),
      totals: {
        buuCuc: agingMatrixData.totals.buuCuc,
        buuCucShort: agingMatrixData.totals.buuCucShort,
        total: agingMatrixData.totals.total,
        hangMoi: agingMatrixData.totals.lt_1d,
        tonDong: agingMatrixData.totals.p_1_3d,
        canhBao: agingMatrixData.totals.p_3_5d,
        khanCap: agingMatrixData.totals.p_5_8d + agingMatrixData.totals.p_gt_8d_192h,
        riskRate: agingMatrixData.totals.overdueRate,
        riskLevel: agingMatrixData.totals.riskLevel
      }
    };
  }, [agingMatrixData]);

  // =========================================================================
  // BÁO CÁO 2: BẢNG KÊ CHI TIẾT & BIỂU ĐỒ CỘT KẾT HỢP ĐƯỜNG NHÓM KHÁCH HÀNG
  // =========================================================================
  const customerAgingDetailed = useMemo(() => {
    return computeCustomerAgingMatrix(filteredData, tabKPIs.totalCount);
  }, [filteredData, tabKPIs.totalCount]);


  // =========================================================================
  // MA TRẬN & CẢNH BÁO TRỌNG TÂM: ĐƠN HÀNG TIKTOK SHOP (TTS)
  // =========================================================================
  const ttsAlertMatrixData = useMemo(() => {
    const buuCucList = [...new Set(dataset.tonDongGlt.map(r => r.buuCuc))].filter(Boolean);
    const rows = buuCucList.map(bc => {
      const bcAll = filteredData.filter(r => r.buuCuc === bc);
      const ttsRecords = bcAll.filter(r => r.khachHang === 'TTS');
      const totalTts = ttsRecords.length;
      const ttsShare = bcAll.length > 0 ? (totalTts / bcAll.length) * 100 : 0;
      
      const noTrip = ttsRecords.filter(r => (r.trangThai || '').includes('Chưa có chuyến')).length;
      const noTripPct = totalTts > 0 ? (noTrip / totalTts) * 100 : 0;
      
      const priorityLate = ttsRecords.filter(r => (r.loaiDon || '').includes('Ưu tiên') || (r.loaiDon || '').includes('trễ')).length;
      
      const warning = ttsRecords.filter(r => (r.canhBao || '').includes('Cảnh báo')).length;
      const urgent = ttsRecords.filter(r => (r.canhBao || '').includes('Khẩn cấp')).length;
      const overdue48h = warning + urgent;
      const overdue48hPct = totalTts > 0 ? (overdue48h / totalTts) * 100 : 0;

      let riskLevel: 'danger' | 'warning' | 'safe' = 'safe';
      if (urgent > 20 || noTrip > 500 || overdue48h > 50) {
        riskLevel = 'danger';
      } else if (overdue48h > 20 || priorityLate > 50) {
        riskLevel = 'warning';
      }

      return {
        buuCuc: bc,
        buuCucShort: bc.replace('(LAN) ', ''),
        totalBc: bcAll.length,
        totalTts,
        ttsShare,
        noTrip,
        noTripPct,
        priorityLate,
        overdue48h,
        overdue48hPct,
        urgent,
        riskLevel
      };
    }).sort((a, b) => b.totalTts - a.totalTts);

    const totals = rows.reduce((acc, cur) => ({
      buuCuc: 'Toàn Khu Vực',
      buuCucShort: 'Toàn Khu Vực',
      totalBc: acc.totalBc + cur.totalBc,
      totalTts: acc.totalTts + cur.totalTts,
      ttsShare: 0,
      noTrip: acc.noTrip + cur.noTrip,
      noTripPct: 0,
      priorityLate: acc.priorityLate + cur.priorityLate,
      overdue48h: acc.overdue48h + cur.overdue48h,
      overdue48hPct: 0,
      urgent: acc.urgent + cur.urgent,
      riskLevel: 'danger' as const
    }), {
      buuCuc: 'Toàn Khu Vực',
      buuCucShort: 'Toàn Khu Vực',
      totalBc: 0,
      totalTts: 0,
      ttsShare: 0,
      noTrip: 0,
      noTripPct: 0,
      priorityLate: 0,
      overdue48h: 0,
      overdue48hPct: 0,
      urgent: 0,
      riskLevel: 'danger' as const
    });

    totals.ttsShare = totals.totalBc > 0 ? (totals.totalTts / totals.totalBc) * 100 : 0;
    totals.noTripPct = totals.totalTts > 0 ? (totals.noTrip / totals.totalTts) * 100 : 0;
    totals.overdue48hPct = totals.totalTts > 0 ? (totals.overdue48h / totals.totalTts) * 100 : 0;

    return { rows, totals };
  }, [dataset.tonDongGlt, filteredData]);

  const handleFilterTtsBuuCuc = (buuCuc?: string) => {
    setSelectedKpi('tts');
    if (buuCuc) {
      setFilterValues(prev => ({
        ...prev,
        buuCuc: [buuCuc]
      }));
    }
    setTimeout(() => {
      tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  };

  // Columns for DataTable (Cố định cột Mã Đơn Hàng và Bưu Cục bên trái khi cuộn ngang)
  const columns: Column<BacklogGltRecord>[] = [
    {
      key: 'maDonHang',
      header: 'Mã Đơn Hàng',
      width: '135px',
      sticky: 'left',
      stickyLeft: '0px',
      headerClassName: 'bg-slate-200/90 dark:bg-slate-700',
      render: r => <span className="font-mono font-bold text-orange-600 select-all">{r.maDonHang}</span>
    },
    {
      key: 'buuCuc',
      header: 'Bưu Cục',
      width: '140px',
      sticky: 'left',
      stickyLeft: '135px',
      headerClassName: 'bg-slate-200/90 dark:bg-slate-700',
      render: r => <span className="font-bold text-slate-800 dark:text-slate-100">{r.buuCuc}</span>
    },
    {
      key: 'loaiDon',
      header: 'Loại Đơn',
      render: r => (
        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
          r.loaiDon.includes('trễ') ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' :
          r.loaiDon === 'Lấy' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' :
          r.loaiDon === 'Trả' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' :
          'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
        }`}>
          {r.loaiDon}
        </span>
      )
    },
    {
      key: 'khachHang',
      header: 'Khách Hàng',
      render: r => <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">{r.khachHang}</span>
    },
    {
      key: 'phuongXa',
      header: 'Địa Bàn (Phường/Xã)',
      render: r => <span className="text-[11px] truncate block max-w-xs">{r.phuongXa}</span>
    },
    {
      key: 'trangThai',
      header: 'Trạng Thái Chuyến Đi',
      render: r => (
        <span className={`text-[11px] ${r.trangThai.includes('Chưa có chuyến') ? 'text-red-600 font-bold' : 'text-slate-600 dark:text-slate-300'}`}>
          {r.trangThai}
        </span>
      )
    },
    {
      key: 'thoiGianTonDong',
      header: 'Tuổi Tồn (Cấp Độ)',
      align: 'center',
      render: r => {
        const aging = classifyGltAging(r.thoiGianTonDong, r.canhBao);
        return (
          <div className="flex flex-col items-center gap-0.5">
            <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded font-mono font-bold text-[11px] text-slate-800 dark:text-slate-200">
              {r.thoiGianTonDong}h
            </span>
            <span className={`px-1.5 py-0.2 rounded text-[9.5px] font-bold ${aging.badgeClass}`}>
              {aging.isUrgent192h ? '🚨 ' + aging.shortLabel : aging.shortLabel}
            </span>
          </div>
        );
      }
    },
    {
      key: 'canhBao',
      header: 'Mức Cảnh Báo',
      render: r => {
        const isUrgent = r.canhBao.includes('quá hạn') || r.canhBao.includes('Báo động') || r.canhBao.includes('Khẩn cấp');
        return (
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
            isUrgent ? 'bg-red-600 text-white animate-pulse' :
            r.canhBao.includes('Tồn đọng') ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
            'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
          }`}>
            {r.canhBao}
          </span>
        );
      }
    }
  ];

  return (
    <div className="relative">
      {/* =========================================================================
          CỐ ĐỊNH HEADER & MENU CỦA TAB (TƯƠNG TỰ TAB GTC BƯU CỤC - BẤM VÀO ĐỂ XEM CHI TIẾT)
          (Menu của tab - cố định ở đỉnh, khi lăn để xem data thì không bị mất đi)
         ========================================================================= */}
      <div className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm transition-all">
        {/* Hàng 1: Tiêu đề & 5 Dropdown Bộ Lọc */}
        <div className="py-1 px-3 md:px-6 border-b border-slate-100 dark:border-slate-800/80">
          <div className="w-full max-w-[1600px] mx-auto flex flex-col xl:flex-row xl:items-center justify-between gap-1.5">
            <div className="min-w-0 shrink-0">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <PackageX className="w-4 h-4 text-rose-600 shrink-0" />
                  <h2 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider whitespace-nowrap">
                    Phân Hệ Tồn Đọng GLT (Giao - Lấy - Trả)
                  </h2>
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 whitespace-nowrap">
                    {tabKPIs.totalCount.toLocaleString('vi-VN')} đơn duy nhất (Snapshot hiện hành)
                  </span>
                </div>

                {/* NÚT THU GỌN / XEM 7 THẺ KPI (TỐI ƯU VIEW TRÊN ĐIỆN THOẠI) */}
                <button
                  type="button"
                  onClick={() => setShowKpiCards(prev => !prev)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-semibold border border-slate-200 dark:border-slate-700 transition-all cursor-pointer whitespace-nowrap shadow-2xs"
                  title={showKpiCards ? "Thu gọn 7 thẻ KPI tồn đọng để tối ưu không gian xem trên điện thoại" : "Mở rộng xem 7 thẻ KPI"}
                >
                  {showKpiCards ? (
                    <>
                      <ChevronUp className="w-3.5 h-3.5 text-rose-600" />
                      <span>Thu gọn thẻ KPI</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3.5 h-3.5 text-rose-600" />
                      <span>Xem 7 thẻ KPI ({tabKPIs.totalCount.toLocaleString('vi-VN')})</span>
                    </>
                  )}
                </button>

                {/* NÚT BÁO CÁO TELEGRAM TỒN ĐỌNG 120H & 192H (Ẩn đối với nhân viên) */}
                {!isStaff && (
                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new CustomEvent('open-telegram-report', { detail: { reportType: 'glt' } }))}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#229ED9] hover:bg-[#1e8ec3] text-white font-extrabold text-[11px] shadow-sm transition-all cursor-pointer whitespace-nowrap active:scale-95 border border-[#229ED9]/50"
                    title="Xuất và gửi báo cáo Telegram Tồn Đọng 120h & 192h cho 5 bưu cục"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Báo Cáo Telegram</span>
                  </button>
                )}
              </div>
            </div>

            {/* CÁC BỘ LỌC RIÊNG BIỆT (TÁCH RỜI - COMPACT TỐI ƯU KHÔNG GIAN) */}
            <div className="flex flex-wrap xl:flex-nowrap items-center gap-1.5 shrink-0">
              {/* 1. Lọc Bưu Cục (Chặn không cho chọn bưu cục khác nếu là tài khoản nhân viên) */}
              {!isStaff ? (
                <IndividualFilterDropdown
                  label="Bưu cục"
                  compact={true}
                  icon={<Building2 className="w-3.5 h-3.5" />}
                  options={buuCucOptions}
                  selectedValues={filterValues.buuCuc || []}
                  onChange={vals => {
                    setFilterValues(prev => ({ ...prev, buuCuc: vals }));
                    const targetBc = vals.length === 1 ? vals[0] : 'all';
                    lastPushedBcRef.current = targetBc;
                    setSelectedBuuCucGlobal(targetBc);
                  }}
                  searchPlaceholder="Tìm bưu cục..."
                  minWidth="w-56"
                />
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-100 dark:bg-orange-950/60 border border-orange-300 dark:border-orange-500/50 rounded-lg text-xs font-bold text-orange-700 dark:text-orange-300 shadow-2xs">
                  <Building2 className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                  <span>{assignedPo || filterValues.buuCuc?.[0]}</span>
                </div>
              )}

              {/* 2. Lọc Loại Đơn */}
              <IndividualFilterDropdown
                label="Loại đơn"
                compact={true}
                icon={<Layers className="w-3.5 h-3.5" />}
                options={loaiDonOptions}
                selectedValues={filterValues.loaiDon || []}
                onChange={vals => setFilterValues(prev => ({ ...prev, loaiDon: vals }))}
                searchPlaceholder="Tìm loại đơn..."
                minWidth="w-52"
              />

              {/* 3. Lọc Trạng Thái */}
              <IndividualFilterDropdown
                label="Trạng thái"
                compact={true}
                icon={<Activity className="w-3.5 h-3.5" />}
                options={trangThaiOptions}
                selectedValues={filterValues.trangThai || []}
                onChange={vals => setFilterValues(prev => ({ ...prev, trangThai: vals }))}
                searchPlaceholder="Tìm trạng thái..."
                minWidth="w-56"
              />

              {/* 4. Lọc Cảnh Báo */}
              <IndividualFilterDropdown
                label="Cảnh báo"
                compact={true}
                icon={<AlertTriangle className="w-3.5 h-3.5" />}
                options={canhBaoOptions}
                selectedValues={filterValues.canhBao || []}
                onChange={vals => setFilterValues(prev => ({ ...prev, canhBao: vals }))}
                searchPlaceholder="Tìm mức cảnh báo..."
                minWidth="w-52"
              />

              {/* 5. Lọc Tuổi Tồn */}
              <IndividualFilterDropdown
                label="Tuổi tồn"
                compact={true}
                icon={<Clock className="w-3.5 h-3.5" />}
                options={thoiGianOptions}
                selectedValues={filterValues.thoiGianTonDong || []}
                onChange={vals => setFilterValues(prev => ({ ...prev, thoiGianTonDong: vals }))}
                searchPlaceholder="Tìm thời gian tồn..."
                minWidth="w-48"
              />

              {/* Nút Đặt Lại nếu có filter active */}
              {totalActiveFilters > 0 && (
                <button
                  type="button"
                  onClick={handleResetAllFilters}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 transition-all cursor-pointer whitespace-nowrap"
                  title="Đặt lại toàn bộ bộ lọc"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Đặt lại ({totalActiveFilters})</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* THANH ĐIỀU HÀNH & NÚT THU GỌN / MỞ RỘNG 7 THẺ KPI (ĐẶT TRỰC DIỆN NGAY TRÊN 7 THẺ KPI) */}
        <div className="py-1 px-3 md:px-6 bg-slate-100/90 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 transition-all">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0"></span>
            <span className="text-[11px] font-black uppercase text-slate-700 dark:text-slate-200 tracking-wider truncate">
              {showKpiCards ? '7 Thẻ Điều Hướng Tồn Đọng GLT' : `7 Thẻ KPI (${tabKPIs.totalCount.toLocaleString('vi-VN')} đơn tồn)`}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowKpiCards(prev => !prev)}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer whitespace-nowrap active:scale-95 shrink-0"
            title={showKpiCards ? "Thu gọn 7 thẻ KPI tồn đọng để tối ưu không gian xem trên điện thoại" : "Mở rộng xem 7 thẻ KPI"}
          >
            {showKpiCards ? (
              <>
                <span>Thu gọn 7 thẻ KPI</span>
                <ChevronUp className="w-4 h-4 stroke-[2.5]" />
              </>
            ) : (
              <>
                <span>Mở rộng xem 7 thẻ KPI</span>
                <ChevronDown className="w-4 h-4 stroke-[2.5]" />
              </>
            )}
          </button>
        </div>

        {/* Hàng 2: Menu Thẻ KPI Tồn Đọng GLT (Bổ sung Thẻ 192h Khẩn Cấp Nhất - Xử Lý Triệt Để) */}
        {showKpiCards && (
          <div className="py-1.5 px-3 md:px-6 bg-slate-50/70 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800 animate-in fade-in duration-150">
            <div className="w-full max-w-[1600px] mx-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-1.5">
            {/* 1. Tổng Tồn GLT (Snapshot hiện hành) */}
            <button
              type="button"
              onClick={() => handleKpiCardClick('all')}
              title="Nhấn để xem toàn bộ danh sách đơn tồn GLT (Snapshot hiện hành - đếm theo mã đơn duy nhất)"
              className={`px-2 py-1.5 rounded-lg border text-left transition-all group cursor-pointer ${
                selectedKpi === 'all'
                  ? 'bg-rose-600 text-white border-rose-600 ring-2 ring-rose-400/40 shadow-xs'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-rose-300 dark:hover:border-slate-600 hover:shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-tight">
                <span className={selectedKpi === 'all' ? 'text-rose-100' : 'text-slate-500 dark:text-slate-400'}>
                  Tổng Tồn GLT
                </span>
                <span className={`text-[9px] ${selectedKpi === 'all' ? 'text-white font-bold' : 'text-slate-400 group-hover:text-rose-600'} transition-colors`}>
                  {selectedKpi === 'all' ? 'Đang lọc ↓' : 'Xem ↓'}
                </span>
              </div>
              <div className={`text-sm lg:text-base font-black mt-0.5 truncate ${selectedKpi === 'all' ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                {tabKPIs.totalCount.toLocaleString('vi-VN')}
              </div>
              <div className={`text-[9px] truncate ${selectedKpi === 'all' ? 'text-rose-200' : 'text-slate-400'}`}>
                Snapshot đơn duy nhất
              </div>
            </button>

            {/* 2. Đơn Giao Tồn */}
            <button
              type="button"
              onClick={() => handleKpiCardClick('giao')}
              title="Nhấn để xem chi tiết danh sách Đơn Giao Tồn"
              className={`px-2 py-1.5 rounded-lg border text-left transition-all group cursor-pointer ${
                selectedKpi === 'giao'
                  ? 'bg-blue-50/90 dark:bg-blue-950/60 border-blue-500 ring-2 ring-blue-500/40 shadow-xs'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-slate-600 hover:shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-tight">
                <span className={selectedKpi === 'giao' ? 'text-blue-700 dark:text-blue-300' : 'text-slate-500 dark:text-slate-400'}>
                  Đơn Giao Tồn
                </span>
                <span className={`text-[9px] ${selectedKpi === 'giao' ? 'text-blue-600 font-bold' : 'text-slate-400 group-hover:text-blue-600'} transition-colors`}>
                  {selectedKpi === 'giao' ? 'Đang lọc ↓' : 'Xem ↓'}
                </span>
              </div>
              <div className="text-sm lg:text-base font-black text-blue-600 mt-0.5 truncate">
                {tabKPIs.donGiao.toLocaleString('vi-VN')}
              </div>
              <div className="text-[9px] text-slate-400 truncate">
                {((tabKPIs.donGiao / tabKPIs.totalCount) * 100 || 0).toFixed(1)}% cơ cấu GLT
              </div>
            </button>

            {/* 3. Ưu Tiên Giao / Đã Trễ */}
            <button
              type="button"
              onClick={() => handleKpiCardClick('uutien')}
              title={`Nhấn để xem chi tiết Đơn Ưu Tiên Giao / Đã Trễ (Đã trễ: ${tabKPIs.donUuTienDaTre.toLocaleString('vi-VN')} | Trong ngày: ${tabKPIs.donUuTienTrongNgay.toLocaleString('vi-VN')})`}
              className={`px-2 py-1.5 rounded-lg border text-left transition-all group cursor-pointer ${
                selectedKpi === 'uutien'
                  ? 'bg-red-50/90 dark:bg-red-950/60 border-red-500 ring-2 ring-red-500/40 shadow-xs'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-red-300 dark:hover:border-slate-600 hover:shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-tight">
                <span className={selectedKpi === 'uutien' ? 'text-red-700 dark:text-red-300' : 'text-slate-500 dark:text-slate-400'}>
                  Ưu Tiên / Đã Trễ
                </span>
                <span className={`text-[9px] ${selectedKpi === 'uutien' ? 'text-red-600 font-bold' : 'text-slate-400 group-hover:text-red-600'} transition-colors`}>
                  {selectedKpi === 'uutien' ? 'Đang lọc ↓' : 'Xem ↓'}
                </span>
              </div>
              <div className="text-sm lg:text-base font-black text-red-600 mt-0.5 truncate">
                {tabKPIs.donUuTienTre.toLocaleString('vi-VN')}
              </div>
              <div className="text-[9px] text-red-500 font-medium truncate">
                Trễ: {tabKPIs.donUuTienDaTre.toLocaleString('vi-VN')}
              </div>
            </button>

            {/* 4. Đơn Lấy Tồn */}
            <button
              type="button"
              onClick={() => handleKpiCardClick('lay')}
              title="Nhấn để xem chi tiết danh sách Đơn Lấy Tồn"
              className={`px-2 py-1.5 rounded-lg border text-left transition-all group cursor-pointer ${
                selectedKpi === 'lay'
                  ? 'bg-emerald-50/90 dark:bg-emerald-950/60 border-emerald-500 ring-2 ring-emerald-500/40 shadow-xs'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-slate-600 hover:shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-tight">
                <span className={selectedKpi === 'lay' ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-500 dark:text-slate-400'}>
                  Đơn Lấy Tồn
                </span>
                <span className={`text-[9px] ${selectedKpi === 'lay' ? 'text-emerald-600 font-bold' : 'text-slate-400 group-hover:text-emerald-600'} transition-colors`}>
                  {selectedKpi === 'lay' ? 'Đang lọc ↓' : 'Xem ↓'}
                </span>
              </div>
              <div className="text-sm lg:text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5 truncate">
                {tabKPIs.donLay.toLocaleString('vi-VN')}
              </div>
              <div className="text-[9px] text-slate-400 truncate">
                {((tabKPIs.donLay / tabKPIs.totalCount) * 100 || 0).toFixed(1)}% cơ cấu GLT
              </div>
            </button>

            {/* 5. Đơn Trả Tồn */}
            <button
              type="button"
              onClick={() => handleKpiCardClick('tra')}
              title="Nhấn để xem chi tiết danh sách Đơn Trả Tồn"
              className={`px-2 py-1.5 rounded-lg border text-left transition-all group cursor-pointer ${
                selectedKpi === 'tra'
                  ? 'bg-sky-50/90 dark:bg-sky-950/60 border-sky-500 ring-2 ring-sky-500/40 shadow-xs'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-sky-300 dark:hover:border-slate-600 hover:shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-tight">
                <span className={selectedKpi === 'tra' ? 'text-sky-700 dark:text-sky-300' : 'text-slate-500 dark:text-slate-400'}>
                  Đơn Trả Tồn
                </span>
                <span className={`text-[9px] ${selectedKpi === 'tra' ? 'text-sky-600 font-bold' : 'text-slate-400 group-hover:text-sky-600'} transition-colors`}>
                  {selectedKpi === 'tra' ? 'Đang lọc ↓' : 'Xem ↓'}
                </span>
              </div>
              <div className="text-sm lg:text-base font-black text-sky-600 dark:text-sky-400 mt-0.5 truncate">
                {tabKPIs.donTra.toLocaleString('vi-VN')}
              </div>
              <div className="text-[9px] text-slate-400 truncate">
                {((tabKPIs.donTra / tabKPIs.totalCount) * 100 || 0).toFixed(1)}% cơ cấu GLT
              </div>
            </button>

            {/* 6. Chưa Có Chuyến Đi */}
            <button
              type="button"
              onClick={() => handleKpiCardClick('chuacochuyen')}
              title="Nhấn để xem chi tiết Đơn Hàng Chưa Có Chuyến Đi"
              className={`px-2 py-1.5 rounded-lg border text-left transition-all group cursor-pointer ${
                selectedKpi === 'chuacochuyen'
                  ? 'bg-amber-50/90 dark:bg-amber-950/60 border-amber-500 ring-2 ring-amber-500/40 shadow-xs'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-slate-600 hover:shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-tight">
                <span className={selectedKpi === 'chuacochuyen' ? 'text-amber-700 dark:text-amber-300' : 'text-slate-500 dark:text-slate-400'}>
                  Chưa Có Chuyến Đi
                </span>
                <span className={`text-[9px] ${selectedKpi === 'chuacochuyen' ? 'text-amber-600 font-bold' : 'text-slate-400 group-hover:text-amber-600'} transition-colors`}>
                  {selectedKpi === 'chuacochuyen' ? 'Đang lọc ↓' : 'Xem ↓'}
                </span>
              </div>
              <div className="text-sm lg:text-base font-black text-amber-600 mt-0.5 truncate">
                {tabKPIs.chuaCoChuyen.toLocaleString('vi-VN')}
              </div>
              <div className="text-[9px] text-slate-400 truncate">
                Đang lưu giữ tại kho
              </div>
            </button>

            {/* 7. Trọng Điểm: TikTok Shop (TTS) */}
            <button
              type="button"
              onClick={() => handleKpiCardClick('tts')}
              title="Nhấn để xem riêng danh sách các đơn hàng TikTok Shop (TTS)"
              className={`px-2 py-1.5 rounded-lg border text-left transition-all group cursor-pointer ${
                selectedKpi === 'tts'
                  ? 'bg-purple-600 text-white border-purple-600 ring-2 ring-purple-400/40 shadow-xs'
                  : 'bg-white dark:bg-slate-800 border-purple-300 dark:border-purple-900/70 hover:border-purple-500 dark:hover:border-purple-700 hover:shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-tight">
                <span className={selectedKpi === 'tts' ? 'text-purple-100 flex items-center gap-1 font-extrabold' : 'text-purple-700 dark:text-purple-300 flex items-center gap-1 font-bold'}>
                  <Flame className="w-3 h-3 text-amber-400 fill-amber-400" />
                  <span>Trọng Điểm TTS</span>
                </span>
                <span className={`text-[9px] ${selectedKpi === 'tts' ? 'text-white font-bold' : 'text-purple-500 group-hover:text-purple-700'} transition-colors`}>
                  {selectedKpi === 'tts' ? 'Đang lọc ↓' : 'Xem ↓'}
                </span>
              </div>
              <div className={`text-sm lg:text-base font-black mt-0.5 truncate ${selectedKpi === 'tts' ? 'text-white' : 'text-purple-600 dark:text-purple-400'}`}>
                {tabKPIs.ttsCount.toLocaleString('vi-VN')}
              </div>
              <div className={`text-[9px] font-semibold truncate ${selectedKpi === 'tts' ? 'text-purple-200' : 'text-purple-500/80'}`}>
                {((tabKPIs.ttsCount / tabKPIs.totalCount) * 100 || 0).toFixed(1)}% toàn khu vực
              </div>
            </button>

            {/* 8. KHẨN CẤP NHẤT: NHÓM 192H (> 8 NGÀY) - CẦN XỬ LÝ TRIỆT ĐỂ */}
            <button
              type="button"
              onClick={() => handleKpiCardClick('urgent192h')}
              title="Bấm để lọc riêng danh sách các đơn rơi vào nhóm 192h (> 8 ngày) - Mức độ khẩn cấp nhất toàn mạng lưới, cần xử lý triệt để!"
              className={`px-2 py-1.5 rounded-lg border text-left transition-all group cursor-pointer ${
                selectedKpi === 'urgent192h'
                  ? 'bg-red-700 text-white border-red-800 ring-2 ring-red-400 shadow-md animate-pulse'
                  : 'bg-red-50 dark:bg-red-950/60 border-red-300 dark:border-red-900 hover:border-red-500 hover:shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-tight">
                <span className={selectedKpi === 'urgent192h' ? 'text-white flex items-center gap-1' : 'text-red-700 dark:text-red-400 flex items-center gap-1'}>
                  <AlertOctagon className="w-3 h-3 text-red-500 animate-pulse" />
                  <span>Tồn 192h (&gt;8N)</span>
                </span>
                <span className={`text-[8.5px] px-1 py-0.2 rounded font-black ${
                  selectedKpi === 'urgent192h' ? 'bg-white text-red-700' : 'bg-red-600 text-white'
                }`}>
                  TRIỆT ĐỂ
                </span>
              </div>
              <div className={`text-sm lg:text-base font-black mt-0.5 truncate ${selectedKpi === 'urgent192h' ? 'text-white' : 'text-red-600 dark:text-red-400'}`}>
                {tabKPIs.urgent192hCount.toLocaleString('vi-VN')}
              </div>
              <div className={`text-[9px] font-bold truncate ${selectedKpi === 'urgent192h' ? 'text-red-100' : 'text-red-600/90'}`}>
                Khẩn cấp nhất 🚨
              </div>
            </button>
          </div>
        </div>
        )}
      </div>

      <div className="p-3 md:p-5 space-y-4 max-w-[1600px] mx-auto">
        {/* Row Charts: Backlog by Post Office & Backlog by Order Type */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Số Lượng Đơn Tồn GLT Theo Bưu Cục
                </h3>
                <p className="text-[11px] text-slate-400">Phát hiện bưu cục đang có áp lực tồn lớn nhất</p>
              </div>
            </div>
            <div className="h-64">
              {poBacklogData.length === 0 ? (
                <ChartEmptyState 
                  title="Không có đơn tồn theo bưu cục" 
                  subtitle="Không tìm thấy số lượng đơn tồn GLT cho bưu cục theo bộ lọc hiện tại" 
                  heightClass="h-64" 
                />
              ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={poBacklogData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                  <XAxis dataKey="buuCuc" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${v}`} />
                  <Tooltip formatter={(v: any) => [`${Number(v).toLocaleString('vi-VN')} đơn`, 'Tồn GLT']} />
                  <Bar dataKey="count" fill="#EF4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Cơ Cấu Loại Đơn Tồn
                </h3>
                <p className="text-[11px] text-slate-400">Phân bố tỷ trọng loại vận đơn</p>
              </div>
            </div>
            <div className="h-64">
              {typeBacklogData.length === 0 || typeBacklogData.every(d => d.value === 0) ? (
                <ChartEmptyState 
                  title="Không có dữ liệu cơ cấu loại đơn" 
                  subtitle="Không tìm thấy đơn tồn để phân loại theo bộ lọc hiện tại" 
                  heightClass="h-64" 
                />
              ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={typeBacklogData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {typeBacklogData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={TYPE_COLORS[index % TYPE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => [`${Number(v).toLocaleString('vi-VN')} đơn`, 'Số lượng']} />
                  <Legend wrapperStyle={{ fontSize: 9, paddingTop: 4 }} />
                </PieChart>
              </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* =========================================================================
            BÁO CÁO 1: THỐNG KÊ & BIỂU ĐỒ CẤP ĐỘ TUỔI TỒN QUY ĐỔI THEO NGÀY & BƯU CỤC
           ========================================================================= */}
        <div id="section-alert-report" className="bg-white dark:bg-slate-800 p-4 md:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4 scroll-mt-16">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-700">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                  Báo Cáo 1: Phân Cấp Độ Tồn Đọng Quy Đổi Theo Ngày &amp; Bưu Cục
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                  Quy Đổi Giờ → Ngày
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-600 text-white animate-pulse">
                  🚨 TÁCH RIÊNG CỘT 192H
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Đo lường chi tiết đơn hàng theo 5 cấp độ ngày: <strong>&lt; 1 ngày (&lt;24h)</strong>, <strong>1-3 ngày (24-72h)</strong>, <strong>3-5 ngày (72-120h)</strong>, <strong>5-8 ngày (120-192h)</strong> và <strong>&gt; 8 ngày (192h - Khẩn cấp nhất, cần xử lý triệt để)</strong>.
              </p>
            </div>
            <div className="text-right flex items-center gap-2 sm:flex-col sm:items-end">
              <span className="text-xs text-slate-400">Đơn 192h (&gt;8 ngày) khẩn cấp:</span>
              <span className="text-sm font-black text-red-600 bg-red-50 dark:bg-red-950/60 px-2 py-0.5 rounded border border-red-300 dark:border-red-900">
                {agingMatrixData.totals.p_gt_8d_192h.toLocaleString('vi-VN')} đơn (Triệt để)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
            {/* Bảng Ma Trận Chi Tiết Cấp Độ Ngày (100% không thanh trượt ngang, tách riêng cột 192h) */}
            <div className="xl:col-span-8 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xs">
              <table className="w-full text-left border-collapse text-[11px] sm:text-xs">
                <thead className="bg-slate-100 dark:bg-slate-750 text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 font-bold">
                  <tr>
                    <th className="px-2 py-2 w-[16%]">Bưu Cục</th>
                    <th className="px-1.5 py-2 text-right text-emerald-600 dark:text-emerald-400 w-[10%]">
                      <span className="block font-bold">&lt; 1 ngày</span>
                      <span className="text-[9.5px] font-normal opacity-75">(&lt;24h)</span>
                    </th>
                    <th className="px-1.5 py-2 text-right text-amber-600 w-[10%]">
                      <span className="block font-bold">1 - 3 ngày</span>
                      <span className="text-[9.5px] font-normal opacity-75">(24-72h)</span>
                    </th>
                    <th className="px-1.5 py-2 text-right text-orange-600 w-[10%]">
                      <span className="block font-bold">3 - 5 ngày</span>
                      <span className="text-[9.5px] font-normal opacity-75">(72-120h)</span>
                    </th>
                    <th className="px-1.5 py-2 text-right text-rose-600 w-[10%]">
                      <span className="block font-bold">5 - 8 ngày</span>
                      <span className="text-[9.5px] font-normal opacity-75">(120-192h)</span>
                    </th>
                    {/* CỘT TÁCH RIÊNG DÀNH CHO NHÓM 192H (> 8 NGÀY) - KHẨN CẤP NHẤT */}
                    <th className="px-1.5 py-2 text-right bg-red-600/10 dark:bg-red-950/50 border-x-2 border-red-500 text-red-700 dark:text-red-400 font-black w-[13%]">
                      <div className="flex items-center justify-end gap-1">
                        <AlertOctagon className="w-3.5 h-3.5 text-red-600 animate-pulse" />
                        <span className="block uppercase text-[10.5px]">&gt; 8 ngày (192h)</span>
                      </div>
                      <span className="text-[9px] font-extrabold text-red-600 block leading-tight">XỬ LÝ TRIỆT ĐỂ</span>
                    </th>
                    <th className="px-2 py-2 text-right text-slate-900 dark:text-white font-black w-[11%]">Tổng Tồn</th>
                    <th className="px-1.5 py-2 text-center w-[10%]">% Quá Hạn</th>
                    <th className="px-1.5 py-2 text-center w-[10%]">Rủi Ro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-750">
                  {agingMatrixData.rows.map((row) => (
                    <tr 
                      key={row.buuCuc} 
                      className={`hover:bg-slate-50 dark:hover:bg-slate-750/60 transition-colors ${
                        row.p_gt_8d_192h > 0 ? 'bg-red-50/30 dark:bg-red-950/20' :
                        row.riskLevel === 'danger' ? 'bg-rose-50/20 dark:bg-rose-950/10' : ''
                      }`}
                    >
                      <td className="px-2 py-2 font-bold text-slate-900 dark:text-slate-100">
                        <div className="flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{row.buuCucShort}</span>
                        </div>
                      </td>
                      <td className="px-1.5 py-2 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {row.lt_1d.toLocaleString('vi-VN')}
                      </td>
                      <td className="px-1.5 py-2 text-right font-mono font-bold text-amber-600">
                        {row.p_1_3d.toLocaleString('vi-VN')}
                      </td>
                      <td className="px-1.5 py-2 text-right font-mono font-bold text-orange-600">
                        {row.p_3_5d.toLocaleString('vi-VN')}
                      </td>
                      <td className="px-1.5 py-2 text-right font-mono font-bold text-rose-600">
                        {row.p_5_8d.toLocaleString('vi-VN')}
                      </td>
                      {/* CELL 192H TÁCH RIÊNG BIỆT KHẨN CẤP */}
                      <td className="px-1.5 py-2 text-right font-mono font-black border-x-2 border-red-500/50 bg-red-100/50 dark:bg-red-950/40">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-black ${
                          row.p_gt_8d_192h > 0
                            ? 'bg-red-600 text-white animate-pulse shadow-2xs'
                            : 'text-slate-400'
                        }`}>
                          {row.p_gt_8d_192h.toLocaleString('vi-VN')}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-right font-mono font-black text-slate-900 dark:text-white text-xs">
                        {row.total.toLocaleString('vi-VN')}
                      </td>
                      <td className="px-1.5 py-2 text-center">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-bold ${
                          row.overdueRate >= 15 ? 'text-red-700 bg-red-100 dark:bg-red-950 dark:text-red-300' :
                          row.overdueRate >= 8 ? 'text-amber-700 bg-amber-100 dark:bg-amber-950 dark:text-amber-300' :
                          'text-emerald-700 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}>
                          {row.overdueRate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-1.5 py-2 text-center">
                        {row.p_gt_8d_192h > 0 ? (
                          <span className="px-1.5 py-0.5 rounded text-[9.5px] font-black bg-red-600 text-white whitespace-nowrap animate-pulse">
                            🚨 Cần Xử Lý 192h
                          </span>
                        ) : row.riskLevel === 'danger' ? (
                          <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-rose-600 text-white whitespace-nowrap">
                            Báo Động Đỏ
                          </span>
                        ) : row.riskLevel === 'warning' ? (
                          <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 whitespace-nowrap">
                            Cảnh Báo Vàng
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 whitespace-nowrap">
                            An Toàn
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-100/90 dark:bg-slate-750 text-slate-900 dark:text-white font-extrabold border-t-2 border-slate-300 dark:border-slate-650">
                  <tr>
                    <td className="px-2 py-2.5 uppercase tracking-wider text-[11px] font-bold">
                      {agingMatrixData.totals.buuCuc}
                    </td>
                    <td className="px-1.5 py-2.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {agingMatrixData.totals.lt_1d.toLocaleString('vi-VN')}
                    </td>
                    <td className="px-1.5 py-2.5 text-right font-mono font-bold text-amber-600">
                      {agingMatrixData.totals.p_1_3d.toLocaleString('vi-VN')}
                    </td>
                    <td className="px-1.5 py-2.5 text-right font-mono font-bold text-orange-600">
                      {agingMatrixData.totals.p_3_5d.toLocaleString('vi-VN')}
                    </td>
                    <td className="px-1.5 py-2.5 text-right font-mono font-bold text-rose-600">
                      {agingMatrixData.totals.p_5_8d.toLocaleString('vi-VN')}
                    </td>
                    {/* TỔNG NHÓM 192H */}
                    <td className="px-1.5 py-2.5 text-right font-mono font-black border-x-2 border-red-500 bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 text-xs sm:text-sm">
                      {agingMatrixData.totals.p_gt_8d_192h.toLocaleString('vi-VN')}
                    </td>
                    <td className="px-2 py-2.5 text-right font-mono font-black text-slate-900 dark:text-white text-xs sm:text-sm">
                      {agingMatrixData.totals.total.toLocaleString('vi-VN')}
                    </td>
                    <td className="px-1.5 py-2.5 text-center font-bold text-rose-600">
                      {agingMatrixData.totals.overdueRate.toFixed(1)}%
                    </td>
                    <td className="px-1.5 py-2.5 text-center">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-red-600 text-white whitespace-nowrap">
                        Ưu Tiên Triệt Để
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Biểu Đồ Trực Quan Xếp Chồng 5 Nhóm Tuổi Tồn Ngày */}
            <div className="xl:col-span-4 bg-slate-50/70 dark:bg-slate-750/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight">
                  Biểu Đồ Cấp Độ Ngày Theo Bưu Cục
                </span>
                <span className="text-[10px] text-slate-400">Xếp chồng theo 5 mốc ngày</span>
              </div>
              <div className="h-64">
                {(agingMatrixData.rows.length === 0 || alertMatrixData.rows.length === 0) ? (
                  <ChartEmptyState 
                    title="Không có dữ liệu cấp độ ngày" 
                    subtitle="Không tìm thấy dữ liệu tồn quy đổi theo ngày cho bộ lọc hiện tại" 
                    heightClass="h-64" 
                  />
                ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={agingMatrixData.rows} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                    <XAxis dataKey="buuCucShort" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip 
                      formatter={(v: any, name: any) => [
                        `${Number(v).toLocaleString('vi-VN')} đơn`,
                        name === 'lt_1d' ? '< 1 ngày (<24h)' :
                        name === 'p_1_3d' ? '1 - 3 ngày (24-72h)' :
                        name === 'p_3_5d' ? '3 - 5 ngày (72-120h)' :
                        name === 'p_5_8d' ? '5 - 8 ngày (120-192h)' :
                        '> 8 ngày (192h - Triệt để)'
                      ]}
                    />
                    <Legend 
                      wrapperStyle={{ fontSize: 9.5, paddingTop: 6 }} 
                      formatter={(val) => 
                        val === 'lt_1d' ? '< 1N' :
                        val === 'p_1_3d' ? '1-3N' :
                        val === 'p_3_5d' ? '3-5N' :
                        val === 'p_5_8d' ? '5-8N' :
                        '> 8N (192h)'
                      }
                    />
                    <Bar dataKey="lt_1d" stackId="aging" fill="#10B981" />
                    <Bar dataKey="p_1_3d" stackId="aging" fill="#F59E0B" />
                    <Bar dataKey="p_3_5d" stackId="aging" fill="#F97316" />
                    <Bar dataKey="p_5_8d" stackId="aging" fill="#E11D48" />
                    <Bar dataKey="p_gt_8d_192h" stackId="aging" fill="#DC2626" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* Khối Nhận Xét & Đánh Giá Vận Hành Logic Mức Cảnh Báo & 192h */}
          <div className="bg-gradient-to-r from-rose-50/80 via-amber-50/40 to-slate-50 dark:from-rose-950/30 dark:via-slate-800/60 dark:to-slate-800 border border-rose-200 dark:border-rose-900 rounded-xl p-3.5 space-y-2 text-xs text-slate-700 dark:text-slate-300">
            <div className="flex items-center gap-1.5 font-bold text-rose-700 dark:text-rose-400 text-xs uppercase tracking-wide">
              <Lightbulb className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Chỉ Đạo Trọng Tâm: Xử Lý Triệt Để Đơn Nhóm 192h (&gt; 8 Ngày)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11.5px] leading-relaxed">
              <div className="bg-white/90 dark:bg-slate-800/90 p-2.5 rounded-lg border border-red-200 dark:border-red-950 shadow-2xs space-y-1">
                <div className="flex items-center gap-1 font-bold text-red-600">
                  <AlertOctagon className="w-3.5 h-3.5 shrink-0" />
                  <span>Xử Lý Triệt Để Nhóm 192h</span>
                </div>
                <p>
                  Đơn hàng rơi vào <strong>nhóm 192h tức là đã lưu kho trên 8 ngày</strong>, mức độ vi phạm khẩn cấp nhất toàn mạng lưới. Trưởng bưu cục phải trực tiếp rà soát từng vận đơn 192h, thực hiện hoàn tất thủ tục giao gấp hoặc hoàn hàng về shop, <strong>tuyệt đối không để đơn 192h kéo dài thêm</strong>.
                </p>
              </div>

              <div className="bg-white/90 dark:bg-slate-800/90 p-2.5 rounded-lg border border-amber-100 dark:border-amber-950 shadow-2xs space-y-1">
                <div className="flex items-center gap-1 font-bold text-amber-600">
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span>Chặn Nguy Cơ Đơn 5 - 8 Ngày (120-192h)</span>
                </div>
                <p>
                  Nhóm đơn từ <strong>5 đến 8 ngày</strong> là nguồn chuyển tiếp trực tiếp vào nhóm 192h nếu không được xử lý dứt điểm. Cần lên danh sách phát lại ca 1 và phân bổ bưu tá cứng tuyến để gỡ sạch trước khi chạm mốc 192h.
                </p>
              </div>

              <div className="bg-white/90 dark:bg-slate-800/90 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-950 shadow-2xs space-y-1">
                <div className="flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Giải Phóng Đơn Trong Vòng 24h - 72h</span>
                </div>
                <p>
                  Duy trì tỷ lệ hàng mới <strong>&lt; 1 ngày (&gt; 65%)</strong> để giảm áp lực tích lũy tồn lưu kho. Bưu cục cần quét phân luồng ngay khi hàng cập bến và ưu tiên hàng giao lần đầu trong ca.
                </p>
              </div>
            </div>
          </div>
        </div>


        {/* =========================================================================
            CẢNH BÁO TRỌNG TÂM: CHIẾN DỊCH TỒN ĐỌNG & BẢO VỆ SLA TIKTOK SHOP (TTS)
           ========================================================================= */}
        <div id="section-tts-center" className="bg-gradient-to-br from-purple-50/70 via-white to-pink-50/50 dark:from-purple-950/30 dark:via-slate-800 dark:to-pink-950/20 p-4 md:p-5 rounded-2xl border-2 border-purple-300 dark:border-purple-800 shadow-md space-y-4 scroll-mt-16">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-purple-200/80 dark:border-purple-800/60">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="p-1.5 rounded-lg bg-purple-600 text-white shadow-xs">
                  <Flame className="w-5 h-5 fill-amber-300 text-amber-300" />
                </span>
                <h3 className="text-sm md:text-base font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Cảnh Báo Trọng Tâm: Kiểm Soát Tồn Đọng &amp; SLA TikTok Shop (TTS)
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-600 text-white shadow-2xs">
                  ⚡ CHIẾN DỊCH TRỌNG ĐIỂM
                </span>
              </div>
              <p className="text-xs text-purple-900 dark:text-purple-300 font-medium mt-1">
                Giám sát đặc quyền <strong>{ttsAlertMatrixData.totals.totalTts.toLocaleString('vi-VN')} đơn hàng TikTok Shop</strong> (chiếm <strong>{ttsAlertMatrixData.totals.ttsShare.toFixed(1)}% tổng tồn toàn khu vực</strong>) để chặn đứng rủi ro vi phạm thời gian cam kết giao hàng (SLA).
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleFilterTtsBuuCuc()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs hover:shadow transition-all cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                <span>Xem Tất Cả {ttsAlertMatrixData.totals.totalTts.toLocaleString('vi-VN')} Đơn TTS</span>
              </button>
            </div>
          </div>

          {/* 4 Thẻ Chỉ Số Cảnh Báo Nóng Của TikTok Shop */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            {/* 1. Tổng Tồn TTS */}
            <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-purple-200 dark:border-purple-900/60 shadow-2xs">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                <span>Tổng Tồn TTS</span>
                <Store className="w-4 h-4 text-purple-600" />
              </div>
              <div className="text-xl font-black text-purple-600 dark:text-purple-400 mt-1">
                {ttsAlertMatrixData.totals.totalTts.toLocaleString('vi-VN')}
              </div>
              <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                Chiếm <strong className="text-purple-700 dark:text-purple-300 font-bold">{ttsAlertMatrixData.totals.ttsShare.toFixed(1)}%</strong> tải lưu kho
              </div>
            </div>

            {/* 2. Chưa Có Chuyến Đi (Đọng Kho) */}
            <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-amber-200 dark:border-amber-900/60 shadow-2xs">
              <div className="flex items-center justify-between text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase">
                <span>Chưa Có Chuyến Đi</span>
                <Truck className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-xl font-black text-amber-600 mt-1">
                {ttsAlertMatrixData.totals.noTrip.toLocaleString('vi-VN')}
              </div>
              <div className="text-[10px] text-amber-700 dark:text-amber-400 font-medium mt-0.5">
                <strong className="font-bold">{ttsAlertMatrixData.totals.noTripPct.toFixed(1)}%</strong> đơn TTS chưa xuất kho
              </div>
            </div>

            {/* 3. Ưu Tiên Giao / Đã Trễ */}
            <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-orange-200 dark:border-orange-900/60 shadow-2xs">
              <div className="flex items-center justify-between text-[11px] font-bold text-orange-700 dark:text-orange-400 uppercase">
                <span>Ưu Tiên Giao / Trễ</span>
                <Timer className="w-4 h-4 text-orange-600" />
              </div>
              <div className="text-xl font-black text-orange-600 mt-1">
                {ttsAlertMatrixData.totals.priorityLate.toLocaleString('vi-VN')}
              </div>
              <div className="text-[10px] text-orange-700 dark:text-orange-400 font-medium mt-0.5">
                Cần giải phóng gấp trong ca
              </div>
            </div>

            {/* 4. Quá Hạn >48h (SLA Vi Phạm) */}
            <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-rose-200 dark:border-rose-900/60 shadow-2xs">
              <div className="flex items-center justify-between text-[11px] font-bold text-rose-700 dark:text-rose-400 uppercase">
                <span>Tồn Quá Hạn &gt; 48h</span>
                <AlertOctagon className="w-4 h-4 text-rose-600" />
              </div>
              <div className="text-xl font-black text-rose-600 mt-1">
                {ttsAlertMatrixData.totals.overdue48h.toLocaleString('vi-VN')}
              </div>
              <div className="text-[10px] text-rose-600 font-medium mt-0.5">
                Gồm <strong className="font-bold">{ttsAlertMatrixData.totals.urgent} đơn khẩn cấp &gt;120h</strong>
              </div>
            </div>
          </div>

          {/* Bảng Ma Trận Cảnh Báo SLA TikTok Shop Theo 5 Bưu Cục (Fit 100%, không thanh trượt ngang, số in đậm) */}
          <div className="overflow-hidden rounded-xl border border-purple-200 dark:border-purple-800/80 bg-white dark:bg-slate-800 shadow-2xs">
            <table className="w-full text-left border-collapse text-[11px] sm:text-xs">
              <thead className="bg-purple-100/70 dark:bg-purple-950/60 text-purple-950 dark:text-purple-200 border-b border-purple-200 dark:border-purple-800 font-bold">
                <tr>
                  <th className="px-2 py-2.5 w-[18%]">Bưu Cục</th>
                  <th className="px-1.5 py-2.5 text-right text-purple-700 dark:text-purple-300 w-[12%]">Tổng TTS</th>
                  <th className="px-1.5 py-2.5 text-right text-slate-700 dark:text-slate-300 w-[12%]">% Trong Kho</th>
                  <th className="px-1.5 py-2.5 text-right text-amber-700 dark:text-amber-400 w-[13%]">Chưa Có Chuyến</th>
                  <th className="px-1.5 py-2.5 text-right text-orange-600 w-[13%]">Ưu Tiên / Trễ</th>
                  <th className="px-1.5 py-2.5 text-right text-rose-600 w-[11%]">Quá Hạn &gt;48h</th>
                  <th className="px-1.5 py-2.5 text-right text-red-600 w-[11%]">&gt;120h Khẩn Cấp</th>
                  <th className="px-1.5 py-2.5 text-center w-[10%]">Đánh Giá SLA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-100 dark:divide-slate-700">
                {ttsAlertMatrixData.rows.map((row) => (
                  <tr 
                    key={row.buuCuc} 
                    className={`hover:bg-purple-50/50 dark:hover:bg-purple-950/30 transition-colors ${
                      row.riskLevel === 'danger' ? 'bg-red-50/30 dark:bg-red-950/20' : ''
                    }`}
                  >
                    <td className="px-2 py-2 font-bold text-slate-900 dark:text-slate-100">
                      <div className="flex items-center gap-1">
                        <Store className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                        <span className="truncate">{row.buuCucShort}</span>
                      </div>
                    </td>
                    <td className="px-1.5 py-2 text-right font-mono font-black text-purple-700 dark:text-purple-300 text-xs">
                      {row.totalTts.toLocaleString('vi-VN')}
                    </td>
                    <td className="px-1.5 py-2 text-right font-mono font-bold text-slate-700 dark:text-slate-300">
                      {row.ttsShare.toFixed(1)}%
                    </td>
                    <td className="px-1.5 py-2 text-right font-mono font-bold text-amber-600">
                      {row.noTrip.toLocaleString('vi-VN')} <span className="text-[10px] font-normal text-slate-400">({row.noTripPct.toFixed(0)}%)</span>
                    </td>
                    <td className="px-1.5 py-2 text-right font-mono font-bold text-orange-600">
                      {row.priorityLate.toLocaleString('vi-VN')}
                    </td>
                    <td className="px-1.5 py-2 text-right font-mono font-bold text-rose-600">
                      {row.overdue48h.toLocaleString('vi-VN')}
                    </td>
                    <td className="px-1.5 py-2 text-right font-mono font-black text-red-600">
                      {row.urgent.toLocaleString('vi-VN')}
                    </td>
                    <td className="px-1.5 py-2 text-center">
                      {row.riskLevel === 'danger' ? (
                        <button
                          type="button"
                          onClick={() => handleFilterTtsBuuCuc(row.buuCuc)}
                          title="Bấm để lọc ngay danh sách đơn TTS của bưu cục này"
                          className="px-1.5 py-0.5 rounded text-[9.5px] font-black bg-red-600 text-white animate-pulse whitespace-nowrap cursor-pointer hover:bg-red-700"
                        >
                          BÁO ĐỘNG ĐỎ
                        </button>
                      ) : row.riskLevel === 'warning' ? (
                        <button
                          type="button"
                          onClick={() => handleFilterTtsBuuCuc(row.buuCuc)}
                          title="Bấm để lọc ngay danh sách đơn TTS của bưu cục này"
                          className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 whitespace-nowrap cursor-pointer hover:bg-amber-200"
                        >
                          NGUY CƠ CAO
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleFilterTtsBuuCuc(row.buuCuc)}
                          title="Bấm để lọc ngay danh sách đơn TTS của bưu cục này"
                          className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 whitespace-nowrap cursor-pointer hover:bg-emerald-200"
                        >
                          KIỂM SOÁT TỐT
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-purple-100/90 dark:bg-purple-950/80 text-purple-950 dark:text-white font-black border-t-2 border-purple-300 dark:border-purple-800">
                <tr>
                  <td className="px-2 py-2.5 uppercase tracking-wider text-[11px] font-bold">
                    {ttsAlertMatrixData.totals.buuCuc}
                  </td>
                  <td className="px-1.5 py-2.5 text-right font-mono font-black text-purple-800 dark:text-purple-300 text-xs sm:text-sm">
                    {ttsAlertMatrixData.totals.totalTts.toLocaleString('vi-VN')}
                  </td>
                  <td className="px-1.5 py-2.5 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                    {ttsAlertMatrixData.totals.ttsShare.toFixed(1)}%
                  </td>
                  <td className="px-1.5 py-2.5 text-right font-mono font-bold text-amber-700 dark:text-amber-400">
                    {ttsAlertMatrixData.totals.noTrip.toLocaleString('vi-VN')} <span className="text-[10px] font-normal opacity-80">({ttsAlertMatrixData.totals.noTripPct.toFixed(0)}%)</span>
                  </td>
                  <td className="px-1.5 py-2.5 text-right font-mono font-bold text-orange-700 dark:text-orange-400">
                    {ttsAlertMatrixData.totals.priorityLate.toLocaleString('vi-VN')}
                  </td>
                  <td className="px-1.5 py-2.5 text-right font-mono font-bold text-rose-700 dark:text-rose-400">
                    {ttsAlertMatrixData.totals.overdue48h.toLocaleString('vi-VN')}
                  </td>
                  <td className="px-1.5 py-2.5 text-right font-mono font-black text-red-700 dark:text-red-400">
                    {ttsAlertMatrixData.totals.urgent.toLocaleString('vi-VN')}
                  </td>
                  <td className="px-1.5 py-2.5 text-center">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-purple-600 text-white whitespace-nowrap">
                      Ưu Tiên #1
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Cẩm Nang Hành Động Thực Chiến Thúc Đẩy Đội Ngũ Xử Lý Đơn TTS */}
          <div className="bg-white/80 dark:bg-slate-800/80 p-3.5 rounded-xl border border-purple-200/90 dark:border-purple-800/60 shadow-2xs space-y-2">
            <div className="flex items-center gap-2 text-xs font-black text-purple-900 dark:text-purple-200 uppercase tracking-wide">
              <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span>Chỉ Đạo Thực Chiến: 3 Giải Pháp Thúc Đẩy Đội Ngũ Giải Phóng Đơn TikTok Shop</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-700 dark:text-slate-300">
              <div className="p-2.5 rounded-lg bg-purple-50/60 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/60 space-y-1">
                <div className="flex items-center gap-1 font-bold text-purple-700 dark:text-purple-300">
                  <Truck className="w-3.5 h-3.5 shrink-0" />
                  <span>1. Kỷ Luật "Luồng Xanh TTS" Trước 09h15</span>
                </div>
                <p className="text-[11.5px] leading-relaxed">
                  TikTok Shop kiểm soát rất ngặt tỷ lệ phát hành đúng hạn (LDR). Bắt buộc 100% đơn TTS đêm về kho phải được chia tuyến và quét giao bưu tá trước <strong>09h15 sáng</strong>. Tuyệt đối không để <strong>2.624 đơn chưa có chuyến</strong> nằm tồn qua 12h trưa.
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-orange-50/60 dark:bg-orange-950/40 border border-orange-100 dark:border-orange-900/60 space-y-1">
                <div className="flex items-center gap-1 font-bold text-orange-700 dark:text-orange-400">
                  <PhoneCall className="w-3.5 h-3.5 shrink-0" />
                  <span>2. Chống Boom Hàng &amp; Hủy Đơn Ảo</span>
                </div>
                <p className="text-[11.5px] leading-relaxed">
                  Đặc thù người mua TTS là giới trẻ, mua theo cảm xúc livestream nên tỷ lệ hủy hẹn rất cao. Bưu tá xử lý <strong>1.162 đơn ưu tiên/trễ</strong> phải gọi tối thiểu 3 cuộc cách nhau 15 phút. Không bưu tá nào được tự ý nhập lý do "Khách không nghe máy" nếu không có lịch sử cuộc gọi.
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-red-50/60 dark:bg-red-950/40 border border-red-100 dark:border-red-900/60 space-y-1">
                <div className="flex items-center gap-1 font-bold text-red-600 dark:text-red-400">
                  <AlertOctagon className="w-3.5 h-3.5 shrink-0" />
                  <span>3. Giải Cứu Khẩn Cấp Rạch Kiến</span>
                </div>
                <p className="text-[11.5px] leading-relaxed">
                  <strong>Rạch Kiến chiếm 1.672 đơn TTS (37.3%)</strong> nhưng có tới <strong>1.260 đơn chưa xuất kho và 80 đơn khẩn cấp &gt;120h</strong>. Điều phối ngay 2 xe tải trung chuyển từ Cần Giuộc &amp; Cần Đước 1 sang kéo hàng TTS phân bổ về kho vệ tinh các xã Long Hòa, Tân Trạch để xả tải trong ngày.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            BÁO CÁO 2: BẢNG KÊ CHI TIẾT & BIỂU ĐỒ CỘT - ĐƯỜNG NHÓM KHÁCH HÀNG (THEO CẤP ĐỘ NGÀY & CỘT 192H)
           ========================================================================= */}
        <div id="section-customer-report" className="bg-white dark:bg-slate-800 p-4 md:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-5 scroll-mt-16">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700">
            <div>
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-indigo-600 shrink-0" />
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                  Báo Cáo 2: Bảng Kê Chi Tiết &amp; Biểu Đồ Cột - Đường Nhóm Khách Hàng
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                  Cấp Độ Ngày &amp; 192h Triệt Để
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Quy đổi tuổi tồn thành 5 cấp độ ngày, tách riêng cột 192h (&gt;8 ngày) khẩn cấp nhất và kết hợp biểu đồ Cột - Đường theo dõi áp lực SLA
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="px-2.5 py-1 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-right">
                <div className="text-[10px] text-red-600 dark:text-red-400 font-semibold uppercase">Đơn 192h Toàn Mạng:</div>
                <div className="text-sm font-black text-red-700 dark:text-red-300">
                  {customerAgingDetailed.totals.p_gt_8d_192h.toLocaleString('vi-VN')} đơn
                </div>
              </div>
              <div className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-900 text-right">
                <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold uppercase">Quá Hạn (&gt;3N):</div>
                <div className="text-sm font-black text-indigo-700 dark:text-indigo-300">
                  {customerAgingDetailed.totals.overdueRate.toFixed(1)}% ({customerAgingDetailed.totals.overdueCount.toLocaleString('vi-VN')} đơn)
                </div>
              </div>
            </div>
          </div>

          {/* Bảng Kê Chi Tiết Nhóm Khách Hàng Theo 5 Cấp Độ Ngày (Tách Riêng Cột 192h) */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
            <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
              <thead className="bg-slate-100 dark:bg-slate-750 text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 font-bold">
                <tr>
                  <th className="px-3 py-2.5">Nhóm Khách Hàng / Đối Tác</th>
                  <th className="px-2.5 py-2.5 text-center">Phân Loại</th>
                  <th className="px-2.5 py-2.5 text-right font-extrabold text-slate-900 dark:text-white">Tổng Tồn</th>
                  <th className="px-2 py-2.5 text-right text-slate-500">Tỷ Trọng</th>
                  <th className="px-2.5 py-2.5 text-right text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30">
                    &lt; 1 Ngày (&lt;24h)
                  </th>
                  <th className="px-2.5 py-2.5 text-right text-amber-700 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/30">
                    1 - 3 Ngày (24-72h)
                  </th>
                  <th className="px-2.5 py-2.5 text-right text-orange-700 dark:text-orange-400 bg-orange-50/50 dark:bg-orange-950/30">
                    3 - 5 Ngày (72-120h)
                  </th>
                  <th className="px-2.5 py-2.5 text-right text-rose-700 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/30">
                    5 - 8 Ngày (120-192h)
                  </th>
                  {/* CỘT TÁCH RIÊNG DÀNH CHO NHÓM 192H (> 8 NGÀY) - MỨC ĐỘ KHẨN CẤP NHẤT */}
                  <th className="px-3 py-2.5 text-right text-white bg-red-600 dark:bg-red-700 font-black border-x-2 border-red-700 shadow-inner">
                    🚨 &gt; 8 Ngày (192h)
                  </th>
                  <th className="px-2.5 py-2.5 text-right text-rose-600 dark:text-rose-400">Quá Hạn %</th>
                  <th className="px-2.5 py-2.5 text-center">Áp Lực SLA</th>
                  <th className="px-2.5 py-2.5 text-center">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-750">
                {customerAgingDetailed.rows.map((row) => (
                  <tr 
                    key={row.khachHang} 
                    className="hover:bg-slate-50 dark:hover:bg-slate-750/60 transition-colors"
                  >
                    <td className="px-3 py-2 font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <Store className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span className="font-mono text-indigo-700 dark:text-indigo-300 font-extrabold">{row.khachHang}</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">({row.partnerName})</span>
                    </td>
                    <td className="px-2.5 py-2 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        row.khachHang === 'TTS' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300' :
                        row.khachHang === 'SHOPEE' ? 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300' :
                        row.khachHang === 'OTHER' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' :
                        'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                      }`}>
                        {row.categoryBadge}
                      </span>
                    </td>
                    <td className="px-2.5 py-2 text-right font-mono font-black text-slate-900 dark:text-white">
                      {row.total.toLocaleString('vi-VN')}
                    </td>
                    <td className="px-2 py-2 text-right font-mono text-[11px] text-slate-500">
                      {row.sharePct.toFixed(1)}%
                    </td>
                    <td className="px-2.5 py-2 text-right font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-50/20 dark:bg-emerald-950/10">
                      {row.lt_1d.toLocaleString('vi-VN')}
                    </td>
                    <td className="px-2.5 py-2 text-right font-mono text-amber-700 dark:text-amber-400 bg-amber-50/20 dark:bg-amber-950/10">
                      {row.p_1_3d.toLocaleString('vi-VN')}
                    </td>
                    <td className="px-2.5 py-2 text-right font-mono text-orange-700 dark:text-orange-400 bg-orange-50/20 dark:bg-orange-950/10">
                      {row.p_3_5d.toLocaleString('vi-VN')}
                    </td>
                    <td className="px-2.5 py-2 text-right font-mono text-rose-700 dark:text-rose-400 bg-rose-50/20 dark:bg-rose-950/10">
                      {row.p_5_8d.toLocaleString('vi-VN')}
                    </td>
                    {/* CỘT TÁCH RIÊNG DÀNH CHO NHÓM 192H (> 8 NGÀY) */}
                    <td className={`px-3 py-2 text-right font-mono font-black border-x border-red-200 dark:border-red-900 ${
                      row.p_gt_8d_192h > 0 
                        ? 'bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-400 animate-pulse font-extrabold' 
                        : 'text-slate-400 bg-slate-50/50 dark:bg-slate-800/40'
                    }`}>
                      {row.p_gt_8d_192h > 0 ? `🚨 ${row.p_gt_8d_192h.toLocaleString('vi-VN')}` : '-'}
                    </td>
                    <td className="px-2.5 py-2 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                      {row.overdueRate.toFixed(1)}%
                    </td>
                    <td className="px-2.5 py-2 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        row.slaPressure === 'Rất Cao (Khẩn)' ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' :
                        row.slaPressure === 'Cao' ? 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300' :
                        row.slaPressure === 'Trung Bình' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                        'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}>
                        {row.slaPressure}
                      </span>
                    </td>
                    <td className="px-2.5 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleKpiCardClick(`customer:${row.khachHang}`)}
                        className="px-2 py-0.5 text-[10.5px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-white hover:bg-indigo-600 dark:hover:bg-indigo-600 border border-indigo-200 dark:border-indigo-800 rounded transition-colors cursor-pointer"
                      >
                        Xem Đơn
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100/95 dark:bg-slate-750 text-slate-900 dark:text-white font-extrabold border-t-2 border-slate-300 dark:border-slate-650">
                <tr>
                  <td className="px-3 py-2.5 uppercase tracking-wider text-[11px] font-black" colSpan={2}>
                    {customerAgingDetailed.totals.partnerName}
                  </td>
                  <td className="px-2.5 py-2.5 text-right font-mono text-sm font-black text-indigo-700 dark:text-indigo-300">
                    {customerAgingDetailed.totals.total.toLocaleString('vi-VN')}
                  </td>
                  <td className="px-2 py-2.5 text-right font-mono text-[11px] text-slate-500">
                    100%
                  </td>
                  <td className="px-2.5 py-2.5 text-right text-emerald-700 dark:text-emerald-400 font-mono">
                    {customerAgingDetailed.totals.lt_1d.toLocaleString('vi-VN')}
                  </td>
                  <td className="px-2.5 py-2.5 text-right text-amber-700 dark:text-amber-400 font-mono">
                    {customerAgingDetailed.totals.p_1_3d.toLocaleString('vi-VN')}
                  </td>
                  <td className="px-2.5 py-2.5 text-right text-orange-700 dark:text-orange-400 font-mono">
                    {customerAgingDetailed.totals.p_3_5d.toLocaleString('vi-VN')}
                  </td>
                  <td className="px-2.5 py-2.5 text-right text-rose-700 dark:text-rose-400 font-mono">
                    {customerAgingDetailed.totals.p_5_8d.toLocaleString('vi-VN')}
                  </td>
                  <td className="px-3 py-2.5 text-right text-white bg-red-600 dark:bg-red-700 font-black font-mono border-x-2 border-red-700 text-sm">
                    {customerAgingDetailed.totals.p_gt_8d_192h.toLocaleString('vi-VN')}
                  </td>
                  <td className="px-2.5 py-2.5 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                    {customerAgingDetailed.totals.overdueRate.toFixed(1)}%
                  </td>
                  <td className="px-2.5 py-2.5 text-center">
                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">
                      {customerAgingDetailed.totals.slaPressure}
                    </span>
                  </td>
                  <td className="px-2.5 py-2.5 text-center">
                    <button
                      type="button"
                      onClick={() => setSelectedKpi('all')}
                      className="px-2 py-0.5 text-[10.5px] font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 underline cursor-pointer"
                    >
                      Tất Cả
                    </button>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Biểu Đồ Cột Kết Hợp Đường (ComposedChart): Cột Số Lượng Đơn Tồn & Đường Tỷ Lệ Quá Hạn % */}
          <div className="bg-slate-50/80 dark:bg-slate-750/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-1">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-600 shrink-0" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight">
                  Biểu Đồ Cột Kết Hợp Đường Nhóm Khách Hàng (Tồn Đọng Theo Cấp Độ &amp; Tỷ Lệ Quá Hạn)
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                <span className="flex items-center gap-1 font-bold text-red-600">
                  <span className="w-2.5 h-2.5 rounded-xs bg-red-600 inline-block" /> Cột đỏ: Đơn 192h (&gt;8N) Triệt Để
                </span>
                <span className="flex items-center gap-1 font-bold text-purple-600 dark:text-purple-400">
                  <span className="w-3 h-0.5 bg-purple-600 inline-block" /> Đường tím: Tỷ Lệ Quá Hạn % (Trục Phải)
                </span>
              </div>
            </div>

            <div className="h-72">
              {customerAgingDetailed.chartData.length === 0 ? (
                <ChartEmptyState 
                  title="Không có dữ liệu đối tác / TMĐT" 
                  subtitle="Không tìm thấy dữ liệu phân kênh sàn cho bộ lọc hiện tại" 
                  heightClass="h-72" 
                />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={customerAgingDetailed.chartData} margin={{ top: 15, right: 35, left: -10, bottom: 15 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                    <XAxis dataKey="name" tick={{ fontSize: 10.5, fontWeight: 700 }} />
                    <YAxis 
                      yAxisId="left" 
                      orientation="left" 
                      tick={{ fontSize: 10 }}
                      label={{ value: 'Số Lượng Đơn', angle: -90, position: 'insideLeft', offset: 12, style: { fontSize: 10, fill: '#64748B' } }}
                    />
                    <YAxis 
                      yAxisId="right" 
                      orientation="right" 
                      tick={{ fontSize: 10 }} 
                      unit="%" 
                      domain={[0, 100]}
                      label={{ value: 'Tỷ Lệ Quá Hạn (%)', angle: 90, position: 'insideRight', offset: 12, style: { fontSize: 10, fill: '#7C3AED', fontWeight: 'bold' } }}
                    />
                    <Tooltip 
                      formatter={(v: any, name: any) => [
                        name === 'overdueRate' ? `${Number(v).toFixed(1)}%` : `${Number(v).toLocaleString('vi-VN')} đơn`,
                        name === 'lt_1d' ? '< 1 Ngày (<24h)' :
                        name === 'p_1_3d' ? '1 - 3 Ngày (24-72h)' :
                        name === 'p_3_5d' ? '3 - 5 Ngày (72-120h)' :
                        name === 'p_5_8d' ? '5 - 8 Ngày (120-192h)' :
                        name === 'p_gt_8d_192h' ? '🚨 > 8 Ngày (192h - Triệt Để)' :
                        name === 'overdueRate' ? 'Tỷ Lệ Quá Hạn (%)' : name
                      ]}
                    />
                    <Legend 
                      wrapperStyle={{ fontSize: 10.5, paddingTop: 6 }} 
                      formatter={(val) => 
                        val === 'lt_1d' ? '< 1N' :
                        val === 'p_1_3d' ? '1-3N' :
                        val === 'p_3_5d' ? '3-5N' :
                        val === 'p_5_8d' ? '5-8N' :
                        val === 'p_gt_8d_192h' ? '🚨 >8N (192h)' :
                        val === 'overdueRate' ? 'Tỷ Lệ Quá Hạn %' : val
                      }
                    />
                    {/* Các cột xếp chồng theo 5 cấp độ ngày */}
                    <Bar yAxisId="left" dataKey="lt_1d" stackId="aging" fill="#10B981" />
                    <Bar yAxisId="left" dataKey="p_1_3d" stackId="aging" fill="#F59E0B" />
                    <Bar yAxisId="left" dataKey="p_3_5d" stackId="aging" fill="#F97316" />
                    <Bar yAxisId="left" dataKey="p_5_8d" stackId="aging" fill="#E11D48" />
                    <Bar yAxisId="left" dataKey="p_gt_8d_192h" stackId="aging" fill="#DC2626" radius={[3, 3, 0, 0]} />
                    {/* Đường tỷ lệ quá hạn % trên trục Y Phải */}
                    <Line 
                      yAxisId="right" 
                      type="monotone" 
                      dataKey="overdueRate" 
                      stroke="#7C3AED" 
                      strokeWidth={2.5} 
                      dot={{ r: 4, fill: '#7C3AED' }} 
                      activeDot={{ r: 6 }} 
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Khối Nhận Xét & Đánh Giá Vận Hành Logic Khách Hàng / Sàn */}
          <div className="bg-gradient-to-r from-indigo-50/80 via-purple-50/40 to-slate-50 dark:from-indigo-950/30 dark:via-slate-800/60 dark:to-slate-800 border border-indigo-200 dark:border-indigo-900 rounded-xl p-3.5 space-y-2 text-xs text-slate-700 dark:text-slate-300">
            <div className="flex items-center gap-1.5 font-bold text-indigo-700 dark:text-indigo-400 text-xs uppercase tracking-wide">
              <Lightbulb className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>Đánh Giá &amp; Nhận Định Thực Tế Vận Hành (Đối Tác &amp; Khách Hàng)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11.5px] leading-relaxed">
              <div className="bg-white/90 dark:bg-slate-800/90 p-2.5 rounded-lg border border-indigo-100 dark:border-indigo-950 shadow-2xs space-y-1">
                <div className="flex items-center gap-1 font-bold text-orange-600">
                  <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                  <span>Áp Lực Phạt SLA Shopee Tại Rạch Kiến</span>
                </div>
                <p>
                  Riêng Rạch Kiến đang gánh <strong>2.112 đơn Shopee (chiếm 51.7% tổng đơn Shopee toàn khu vực)</strong>. Shopee có chính sách phạt giao trễ và hạ cấp đánh giá bưu cục nếu đơn nằm kho quá 48h. Cần ưu tiên xếp chuyến giao cho 2.112 đơn Shopee này vào ca 1 hàng ngày để tránh rủi ro phạt hợp đồng SLA.
                </p>
              </div>

              <div className="bg-white/90 dark:bg-slate-800/90 p-2.5 rounded-lg border border-purple-100 dark:border-purple-950 shadow-2xs space-y-1">
                <div className="flex items-center gap-1 font-bold text-purple-600 dark:text-purple-400">
                  <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                  <span>Tăng Trưởng Nóng Từ TikTok Shop (TTS)</span>
                </div>
                <p>
                  <strong>TikTok Shop (TTS: 4.485 đơn - 41.0%)</strong> chiếm tỷ trọng lớn nhất tại Tầm Vu (50%), Cần Đước 1 (51.4%), Phước Lý (43.1%). Đơn hàng TTS có tần suất hủy đơn (Cancel Rate) cao nếu giao trễ trên 72h. Khuyến nghị bưu cục liên hệ người nhận qua ZNS trước khi phát để đảm bảo tỷ lệ giao thành công (GTC).
                </p>
              </div>

              <div className="bg-white/90 dark:bg-slate-800/90 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs space-y-1">
                <div className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-200">
                  <Store className="w-3.5 h-3.5 shrink-0" />
                  <span>Giữ Chân Khách Hàng Ruột (OTHER: 21.6%)</span>
                </div>
                <p>
                  Nhóm <strong>OTHER (2.361 đơn)</strong> gồm các Shop thời trang, nông sản lẻ tại địa phương mang lại cước phí hoa hồng tốt nhất. Tập trung cao tại Cần Giuộc (684 đơn) và Rạch Kiến (644 đơn). Bưu cục cần duy trì chất lượng giao đúng hẹn, tránh để áp lực đơn sàn lấn át dịch vụ cho khách hàng ruột.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Data Table (Được liên kết với Menu KPI phía trên) */}
        <div ref={tableRef} className="scroll-mt-36 space-y-2">
          {selectedKpi !== 'all' && (
            <div className="flex items-center justify-between px-4 py-2 bg-rose-50/90 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-xl text-xs shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping shrink-0" />
                <span className="text-slate-700 dark:text-slate-200">
                  Đang lọc hiển thị menu: <strong className="text-rose-600 dark:text-rose-400 font-bold">{selectedKpiLabel}</strong> (<span className="font-bold">{tableData.length.toLocaleString('vi-VN')}</span> đơn hàng)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedKpi('all')}
                className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Xem tất cả ({tabKPIs.totalCount.toLocaleString('vi-VN')})</span>
              </button>
            </div>
          )}

          <DataTable<BacklogGltRecord>
            columns={columns}
            data={tableData}
            title={
              selectedKpi === 'all'
                ? `Danh Sách ${tableData.length.toLocaleString('vi-VN')} Đơn Hàng Tồn Đọng GLT`
                : `Danh Sách ${tableData.length.toLocaleString('vi-VN')} ${selectedKpiLabel}`
            }
            subtitle={
              selectedKpi === 'all'
                ? 'Tra cứu trực tiếp mã đơn hàng, trạng thái, địa bàn và mức cảnh báo'
                : `Bấm vào menu trên cùng hoặc nút "Xem tất cả" để quay lại toàn bộ đơn hàng`
            }
            exportFilename={`ton_dong_glt_${selectedKpi}`}
            maxHeight="max-h-[580px]"
            stickyHeader={true}
            pagination={false}
            noWrap={true}
            searchPlaceholder="Tìm mã đơn hàng, khách hàng, phường xã..."
            keyExtractor={(r) => r.maDonHang}
          />
        </div>
      </div>
    </div>
  );
};

export default React.memo(BacklogGltTab);
