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
  Legend 
} from 'recharts';
import { useDashboard } from '../context/DashboardContext';
import type { BacklogGltRecord } from '../types/dashboard';
import { DataTable } from '../components/common/DataTable';
import type { Column } from '../components/common/DataTable';
import { IndividualFilterDropdown } from '../components/common/IndividualFilterDropdown';

export const BacklogGltTab: React.FC = () => {
  const { dataset, selectedBuuCucGlobal } = useDashboard();

  // Independent Filter state (Đồng bộ với bưu cục được chọn)
  const [filterValues, setFilterValues] = useState<Record<string, string[]>>(() => ({
    buuCuc: selectedBuuCucGlobal && selectedBuuCucGlobal !== 'all' ? [selectedBuuCucGlobal] : [],
    loaiDon: [],
    trangThai: [],
    canhBao: [],
    thoiGianTonDong: []
  }));

  React.useEffect(() => {
    if (selectedBuuCucGlobal && selectedBuuCucGlobal !== 'all') {
      setFilterValues(prev => ({
        ...prev,
        buuCuc: [selectedBuuCucGlobal]
      }));
    }
  }, [selectedBuuCucGlobal]);

  // Options
  const buuCucOptions = useMemo(() => {
    return [...new Set(dataset.tonDongGlt.map(r => r.buuCuc))].filter(Boolean).map(b => ({ label: b, value: b }));
  }, [dataset.tonDongGlt]);

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
      buuCuc: [],
      loaiDon: [],
      trangThai: [],
      canhBao: [],
      thoiGianTonDong: []
    });
  };

  // Apply filters
  const filteredData = useMemo(() => {
    return dataset.tonDongGlt.filter(r => {
      if (filterValues.buuCuc?.length && !filterValues.buuCuc.includes(r.buuCuc)) return false;
      if (filterValues.loaiDon?.length && !filterValues.loaiDon.includes(r.loaiDon)) return false;
      if (filterValues.trangThai?.length && !filterValues.trangThai.includes(r.trangThai)) return false;
      if (filterValues.canhBao?.length && !filterValues.canhBao.includes(r.canhBao)) return false;
      if (filterValues.thoiGianTonDong?.length && !filterValues.thoiGianTonDong.includes(r.thoiGianTonDong)) return false;
      return true;
    });
  }, [dataset.tonDongGlt, filterValues]);

  // State chọn nhóm KPI làm menu điều hướng danh sách chi tiết
  type KpiGroup = 'all' | 'giao' | 'lay' | 'uutien' | 'chuacochuyen' | 'overdue' | 'tts';
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
    switch (selectedKpi) {
      case 'giao': return 'Đơn Giao Tồn';
      case 'lay': return 'Đơn Lấy Tồn';
      case 'uutien': return 'Ưu Tiên Giao / Đã Trễ';
      case 'chuacochuyen': return 'Chưa Có Chuyến Đi';
      case 'overdue': return 'Quá Hạn > 120h';
      case 'tts': return 'Đơn Hàng TikTok Shop (TTS)';
      default: return 'Tổng Tồn GLT';
    }
  }, [selectedKpi]);

  // Tab KPIs
  const tabKPIs = useMemo(() => {
    const totalCount = filteredData.length;
    const donGiao = filteredData.filter(r => r.loaiDon === 'Giao').length;
    const donLay = filteredData.filter(r => r.loaiDon === 'Lấy').length;
    const donUuTienTre = filteredData.filter(r => r.loaiDon.includes('trễ')).length;
    const chuaCoChuyen = filteredData.filter(r => r.trangThai.includes('Chưa có chuyến')).length;
    const urgentOverdue = filteredData.filter(r => r.thoiGianTonDong === '120_192' || r.thoiGianTonDong === '192').length;
    const ttsCount = filteredData.filter(r => r.khachHang === 'TTS').length;

    return {
      totalCount,
      donGiao,
      donLay,
      donUuTienTre,
      chuaCoChuyen,
      urgentOverdue,
      ttsCount
    };
  }, [filteredData]);

  // Dữ liệu bảng chi tiết được liên kết với Menu KPI
  const tableData = useMemo(() => {
    if (selectedKpi === 'giao') {
      return filteredData.filter(r => r.loaiDon === 'Giao');
    }
    if (selectedKpi === 'lay') {
      return filteredData.filter(r => r.loaiDon === 'Lấy');
    }
    if (selectedKpi === 'uutien') {
      return filteredData.filter(r => r.loaiDon.includes('trễ'));
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
    return filteredData;
  }, [filteredData, selectedKpi]);

  // Chart data: Backlog by Post Office
  const poBacklogData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredData.forEach(r => {
      map[r.buuCuc] = (map[r.buuCuc] || 0) + 1;
    });
    return Object.entries(map)
      .map(([buuCuc, count]) => ({ buuCuc, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredData]);

  // Chart data: Backlog by Type
  const typeBacklogData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredData.forEach(r => {
      map[r.loaiDon] = (map[r.loaiDon] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredData]);

  const TYPE_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  // =========================================================================
  // BÁO CÁO 1: MA TRẬN MỨC CẢNH BÁO THEO TỪNG BƯU CỤC
  // =========================================================================
  const alertMatrixData = useMemo(() => {
    const buuCucList = [...new Set(dataset.tonDongGlt.map(r => r.buuCuc))].filter(Boolean);
    const rows = buuCucList.map(bc => {
      const records = filteredData.filter(r => r.buuCuc === bc);
      const total = records.length;
      const hangMoi = records.filter(r => r.canhBao.includes('Hàng mới')).length;
      const tonDong = records.filter(r => 
        r.canhBao.includes('Tồn đọng 12_24') || 
        r.canhBao.includes('Tồn đọng 24_36') || 
        r.canhBao.includes('Tồn đọng 36_48')
      ).length;
      const canhBao = records.filter(r => 
        r.canhBao.includes('48_72') || 
        r.canhBao.includes('72_96') || 
        r.canhBao.includes('96_120')
      ).length;
      const khanCap = records.filter(r => 
        r.canhBao.includes('120_192') || 
        r.canhBao.includes('quá hạn') ||
        r.canhBao.includes('Đơn đã quá hạn')
      ).length;
      const riskRate = total > 0 ? ((canhBao + khanCap) / total) * 100 : 0;
      
      let riskLevel: 'danger' | 'warning' | 'normal' | 'safe' = 'safe';
      if (khanCap >= 50 || riskRate >= 15) riskLevel = 'danger';
      else if (khanCap >= 10 || riskRate >= 10) riskLevel = 'warning';
      else if (riskRate > 0) riskLevel = 'normal';

      return {
        buuCuc: bc,
        buuCucShort: bc.replace('(LAN) ', ''),
        total,
        hangMoi,
        tonDong,
        canhBao,
        khanCap,
        riskRate,
        riskLevel
      };
    }).sort((a, b) => b.total - a.total);

    const totals = rows.reduce((acc, cur) => ({
      buuCuc: 'Toàn Khu Vực',
      buuCucShort: 'Toàn Khu Vực',
      total: acc.total + cur.total,
      hangMoi: acc.hangMoi + cur.hangMoi,
      tonDong: acc.tonDong + cur.tonDong,
      canhBao: acc.canhBao + cur.canhBao,
      khanCap: acc.khanCap + cur.khanCap,
      riskRate: 0,
      riskLevel: 'warning' as const
    }), { 
      buuCuc: 'Toàn Khu Vực', 
      buuCucShort: 'Toàn Khu Vực', 
      total: 0, 
      hangMoi: 0, 
      tonDong: 0, 
      canhBao: 0, 
      khanCap: 0,
      riskRate: 0,
      riskLevel: 'warning' as const
    });

    totals.riskRate = totals.total > 0 ? ((totals.canhBao + totals.khanCap) / totals.total) * 100 : 0;

    return { rows, totals };
  }, [dataset.tonDongGlt, filteredData]);

  // =========================================================================
  // BÁO CÁO 2: MA TRẬN KHÁCH HÀNG / SÀN TMĐT THEO TỪNG BƯU CỤC
  // =========================================================================
  const customerMatrixData = useMemo(() => {
    const buuCucList = [...new Set(dataset.tonDongGlt.map(r => r.buuCuc))].filter(Boolean);
    const rows = buuCucList.map(bc => {
      const records = filteredData.filter(r => r.buuCuc === bc);
      const total = records.length;
      const tts = records.filter(r => r.khachHang === 'TTS').length;
      const shopee = records.filter(r => r.khachHang === 'SHOPEE').length;
      const other = records.filter(r => r.khachHang === 'OTHER').length;
      
      const ttsPct = total > 0 ? (tts / total) * 100 : 0;
      const shopeePct = total > 0 ? (shopee / total) * 100 : 0;
      const otherPct = total > 0 ? (other / total) * 100 : 0;

      let mainPartner = 'TTS';
      if (shopee >= tts && shopee >= other) mainPartner = 'SHOPEE';
      else if (other >= tts && other >= shopee) mainPartner = 'OTHER';

      return {
        buuCuc: bc,
        buuCucShort: bc.replace('(LAN) ', ''),
        total,
        tts,
        ttsPct,
        shopee,
        shopeePct,
        other,
        otherPct,
        mainPartner
      };
    }).sort((a, b) => b.total - a.total);

    const totals = rows.reduce((acc, cur) => ({
      buuCuc: 'Toàn Khu Vực',
      buuCucShort: 'Toàn Khu Vực',
      total: acc.total + cur.total,
      tts: acc.tts + cur.tts,
      shopee: acc.shopee + cur.shopee,
      other: acc.other + cur.other,
      ttsPct: 0,
      shopeePct: 0,
      otherPct: 0,
      mainPartner: 'TTS'
    }), { 
      buuCuc: 'Toàn Khu Vực', 
      buuCucShort: 'Toàn Khu Vực', 
      total: 0, 
      tts: 0, 
      shopee: 0, 
      other: 0,
      ttsPct: 0,
      shopeePct: 0,
      otherPct: 0,
      mainPartner: 'TTS'
    });

    totals.ttsPct = totals.total > 0 ? (totals.tts / totals.total) * 100 : 0;
    totals.shopeePct = totals.total > 0 ? (totals.shopee / totals.total) * 100 : 0;
    totals.otherPct = totals.total > 0 ? (totals.other / totals.total) * 100 : 0;

    return { rows, totals };
  }, [dataset.tonDongGlt, filteredData]);
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
      header: 'Tuổi Tồn',
      align: 'center',
      render: r => <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded font-mono font-bold text-[11px]">{r.thoiGianTonDong}h</span>
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
                    {dataset.tonDongGlt.length.toLocaleString('vi-VN')} đơn
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

                {/* NÚT BÁO CÁO TELEGRAM TỒN ĐỌNG 120H & 192H */}
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent('open-telegram-report', { detail: { reportType: 'glt' } }))}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#229ED9] hover:bg-[#1e8ec3] text-white font-extrabold text-[11px] shadow-sm transition-all cursor-pointer whitespace-nowrap active:scale-95 border border-[#229ED9]/50"
                  title="Xuất và gửi báo cáo Telegram Tồn Đọng 120h & 192h cho 5 bưu cục"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Báo Cáo Telegram</span>
                </button>
              </div>
            </div>

            {/* CÁC BỘ LỌC RIÊNG BIỆT (TÁCH RỜI - COMPACT TỐI ƯU KHÔNG GIAN) */}
            <div className="flex flex-wrap xl:flex-nowrap items-center gap-1.5 shrink-0">
              {/* 1. Lọc Bưu Cục */}
              <IndividualFilterDropdown
                label="Bưu cục"
                compact={true}
                icon={<Building2 className="w-3.5 h-3.5" />}
                options={buuCucOptions}
                selectedValues={filterValues.buuCuc || []}
                onChange={vals => setFilterValues(prev => ({ ...prev, buuCuc: vals }))}
                searchPlaceholder="Tìm bưu cục..."
                minWidth="w-56"
              />

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

        {/* Hàng 2: Menu 6 Thẻ KPI Tồn Đọng (Tương tác bấm để xem chi tiết bên dưới, có thể thu gọn trên điện thoại) */}
        {showKpiCards && (
          <div className="py-1.5 px-3 md:px-6 bg-slate-50/70 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800 animate-in fade-in duration-150">
            <div className="w-full max-w-[1600px] mx-auto grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5">
            {/* 1. Tổng Tồn GLT */}
            <button
              type="button"
              onClick={() => handleKpiCardClick('all')}
              title="Nhấn để xem toàn bộ danh sách đơn tồn GLT"
              className={`px-2.5 py-1.5 rounded-lg border text-left transition-all group cursor-pointer ${
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
                100% đơn duy nhất
              </div>
            </button>

            {/* 2. Đơn Giao Tồn */}
            <button
              type="button"
              onClick={() => handleKpiCardClick('giao')}
              title="Nhấn để xem chi tiết danh sách Đơn Giao Tồn"
              className={`px-2.5 py-1.5 rounded-lg border text-left transition-all group cursor-pointer ${
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
                {((tabKPIs.donGiao / tabKPIs.totalCount) * 100 || 0).toFixed(1)}% cơ cấu
              </div>
            </button>

            {/* 3. Đơn Lấy Tồn */}
            <button
              type="button"
              onClick={() => handleKpiCardClick('lay')}
              title="Nhấn để xem chi tiết danh sách Đơn Lấy Tồn"
              className={`px-2.5 py-1.5 rounded-lg border text-left transition-all group cursor-pointer ${
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
                {((tabKPIs.donLay / tabKPIs.totalCount) * 100 || 0).toFixed(1)}% cơ cấu
              </div>
            </button>

            {/* 4. Ưu Tiên Giao / Trễ */}
            <button
              type="button"
              onClick={() => handleKpiCardClick('uutien')}
              title="Nhấn để xem chi tiết Đơn Hàng Ưu Tiên Giao / Đã Trễ"
              className={`px-2.5 py-1.5 rounded-lg border text-left transition-all group cursor-pointer ${
                selectedKpi === 'uutien'
                  ? 'bg-red-50/90 dark:bg-red-950/60 border-red-500 ring-2 ring-red-500/40 shadow-xs'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-red-300 dark:hover:border-slate-600 hover:shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-tight">
                <span className={selectedKpi === 'uutien' ? 'text-red-700 dark:text-red-300' : 'text-slate-500 dark:text-slate-400'}>
                  Ưu Tiên Giao / Trễ
                </span>
                <span className={`text-[9px] ${selectedKpi === 'uutien' ? 'text-red-600 font-bold' : 'text-slate-400 group-hover:text-red-600'} transition-colors`}>
                  {selectedKpi === 'uutien' ? 'Đang lọc ↓' : 'Xem ↓'}
                </span>
              </div>
              <div className="text-sm lg:text-base font-black text-red-600 mt-0.5 truncate">
                {tabKPIs.donUuTienTre.toLocaleString('vi-VN')}
              </div>
              <div className="text-[9px] text-red-500 font-medium truncate">
                Cần giải phóng gấp
              </div>
            </button>

            {/* 5. Chưa Có Chuyến Đi */}
            <button
              type="button"
              onClick={() => handleKpiCardClick('chuacochuyen')}
              title="Nhấn để xem chi tiết Đơn Hàng Chưa Có Chuyến Đi"
              className={`px-2.5 py-1.5 rounded-lg border text-left transition-all group cursor-pointer ${
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

            {/* 6. Quá Hạn > 120h */}
            <button
              type="button"
              onClick={() => handleKpiCardClick('overdue')}
              title="Nhấn để xem chi tiết Đơn Hàng Báo Động Quá Hạn > 120h"
              className={`px-2.5 py-1.5 rounded-lg border text-left transition-all group cursor-pointer ${
                selectedKpi === 'overdue'
                  ? 'bg-rose-50/90 dark:bg-rose-950/60 border-rose-600 ring-2 ring-rose-600/40 shadow-xs'
                  : 'bg-white dark:bg-slate-800 border-red-200 dark:border-red-900/60 hover:border-red-400 dark:hover:border-red-800 hover:shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-tight">
                <span className={selectedKpi === 'overdue' ? 'text-rose-700 dark:text-rose-300' : 'text-slate-500 dark:text-slate-400'}>
                  Quá Hạn &gt; 120h
                </span>
                <span className={`text-[9px] ${selectedKpi === 'overdue' ? 'text-rose-600 font-bold' : 'text-slate-400 group-hover:text-rose-600'} transition-colors`}>
                  {selectedKpi === 'overdue' ? 'Đang lọc ↓' : 'Xem ↓'}
                </span>
              </div>
              <div className="text-sm lg:text-base font-black text-red-600 mt-0.5 truncate">
                {tabKPIs.urgentOverdue.toLocaleString('vi-VN')}
              </div>
              <div className="text-[9px] text-red-500 font-bold truncate">
                Báo động khẩn cấp
              </div>
            </button>

            {/* 7. Trọng Điểm: TikTok Shop (TTS) */}
            <button
              type="button"
              onClick={() => handleKpiCardClick('tts')}
              title="Nhấn để xem riêng danh sách 4.485 đơn hàng TikTok Shop (TTS)"
              className={`px-2.5 py-1.5 rounded-lg border text-left transition-all group cursor-pointer ${
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
            BÁO CÁO 1: THỐNG KÊ & BIỂU ĐỒ MỨC CẢNH BÁO TỒN ĐỌNG THEO BƯU CỤC
           ========================================================================= */}
        <div id="section-alert-report" className="bg-white dark:bg-slate-800 p-4 md:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4 scroll-mt-16">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-700">
            <div>
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                  Báo Cáo 1: Thống Kê Mức Cảnh Báo Tồn Đọng Theo Bưu Cục
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                  Phân Tích Rủi Ro Lưu Kho
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Đo lường chi tiết đơn hàng theo các mốc tuổi tồn: Hàng mới (0-12h), Tồn đọng (12-48h), Cảnh báo (48-120h) và Khẩn cấp (&gt;120h)
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400">Đơn khẩn cấp toàn khu vực:</span>
              <span className="ml-1.5 text-sm font-black text-red-600">{alertMatrixData.totals.khanCap.toLocaleString('vi-VN')} đơn</span>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
            {/* Bảng Ma Trận Chi Tiết (8 Cột trên XL, 100% không thanh trượt ngang) */}
            <div className="xl:col-span-8 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xs">
              <table className="w-full text-left border-collapse text-[11px] sm:text-xs">
                <thead className="bg-slate-100 dark:bg-slate-750 text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 font-bold">
                  <tr>
                    <th className="px-2 py-2 w-[18%]">Bưu Cục</th>
                    <th className="px-1.5 py-2 text-right text-emerald-600 dark:text-emerald-400 w-[11%]">
                      <span className="block font-bold">Mới</span>
                      <span className="text-[10px] font-normal opacity-75">(0-12h)</span>
                    </th>
                    <th className="px-1.5 py-2 text-right text-amber-600 w-[11%]">
                      <span className="block font-bold">Tồn</span>
                      <span className="text-[10px] font-normal opacity-75">(12-48h)</span>
                    </th>
                    <th className="px-1.5 py-2 text-right text-orange-600 w-[11%]">
                      <span className="block font-bold">Cảnh Báo</span>
                      <span className="text-[10px] font-normal opacity-75">(48-120h)</span>
                    </th>
                    <th className="px-1.5 py-2 text-right text-red-600 w-[11%]">
                      <span className="block font-bold">Khẩn Cấp</span>
                      <span className="text-[10px] font-normal opacity-75">(&gt;120h)</span>
                    </th>
                    <th className="px-2 py-2 text-right text-slate-900 dark:text-white font-black w-[13%]">Tổng Tồn</th>
                    <th className="px-1.5 py-2 text-center w-[12%]">% Quá Hạn</th>
                    <th className="px-1.5 py-2 text-center w-[13%]">Mức Rủi Ro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-750">
                  {alertMatrixData.rows.map((row) => (
                    <tr 
                      key={row.buuCuc} 
                      className={`hover:bg-slate-50 dark:hover:bg-slate-750/60 transition-colors ${
                        row.riskLevel === 'danger' ? 'bg-red-50/20 dark:bg-red-950/10' : ''
                      }`}
                    >
                      <td className="px-2 py-2 font-bold text-slate-900 dark:text-slate-100">
                        <div className="flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{row.buuCucShort}</span>
                        </div>
                      </td>
                      <td className="px-1.5 py-2 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {row.hangMoi.toLocaleString('vi-VN')}
                      </td>
                      <td className="px-1.5 py-2 text-right font-mono font-bold text-amber-600">
                        {row.tonDong.toLocaleString('vi-VN')}
                      </td>
                      <td className="px-1.5 py-2 text-right font-mono font-bold text-orange-600">
                        {row.canhBao.toLocaleString('vi-VN')}
                      </td>
                      <td className="px-1.5 py-2 text-right font-mono font-bold text-red-600">
                        {row.khanCap.toLocaleString('vi-VN')}
                      </td>
                      <td className="px-2 py-2 text-right font-mono font-black text-slate-900 dark:text-white text-xs">
                        {row.total.toLocaleString('vi-VN')}
                      </td>
                      <td className="px-1.5 py-2 text-center">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-bold ${
                          row.riskRate >= 15 ? 'text-red-700 bg-red-100 dark:bg-red-950 dark:text-red-300' :
                          row.riskRate >= 8 ? 'text-amber-700 bg-amber-100 dark:bg-amber-950 dark:text-amber-300' :
                          'text-emerald-700 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}>
                          {row.riskRate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-1.5 py-2 text-center">
                        {row.riskLevel === 'danger' ? (
                          <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-red-600 text-white whitespace-nowrap">
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
                      {alertMatrixData.totals.buuCuc}
                    </td>
                    <td className="px-1.5 py-2.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {alertMatrixData.totals.hangMoi.toLocaleString('vi-VN')}
                    </td>
                    <td className="px-1.5 py-2.5 text-right font-mono font-bold text-amber-600">
                      {alertMatrixData.totals.tonDong.toLocaleString('vi-VN')}
                    </td>
                    <td className="px-1.5 py-2.5 text-right font-mono font-bold text-orange-600">
                      {alertMatrixData.totals.canhBao.toLocaleString('vi-VN')}
                    </td>
                    <td className="px-1.5 py-2.5 text-right font-mono font-bold text-red-600">
                      {alertMatrixData.totals.khanCap.toLocaleString('vi-VN')}
                    </td>
                    <td className="px-2 py-2.5 text-right font-mono font-black text-slate-900 dark:text-white text-xs sm:text-sm">
                      {alertMatrixData.totals.total.toLocaleString('vi-VN')}
                    </td>
                    <td className="px-1.5 py-2.5 text-center font-bold text-rose-600">
                      {alertMatrixData.totals.riskRate.toFixed(1)}%
                    </td>
                    <td className="px-1.5 py-2.5 text-center">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 whitespace-nowrap">
                        Toàn Khu Vực
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Biểu Đồ Trực Quan Xếp Chồng (4 Cột trên XL) */}
            <div className="xl:col-span-4 bg-slate-50/70 dark:bg-slate-750/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight">
                  Biểu Đồ Phân Bổ Mức Cảnh Báo
                </span>
                <span className="text-[10px] text-slate-400">Cột xếp chồng theo Bưu cục</span>
              </div>
              <div className="h-60">
                {alertMatrixData.rows.length === 0 ? (
                  <ChartEmptyState 
                    title="Không có dữ liệu mức cảnh báo" 
                    subtitle="Không tìm thấy dữ liệu cảnh báo tồn cho bộ lọc hiện tại" 
                    heightClass="h-60" 
                  />
                ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={alertMatrixData.rows} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                    <XAxis dataKey="buuCucShort" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip 
                      formatter={(v: any, name: any) => [
                        `${Number(v).toLocaleString('vi-VN')} đơn`,
                        name === 'hangMoi' ? 'Mới (0-12h)' :
                        name === 'tonDong' ? 'Tồn đọng (12-48h)' :
                        name === 'canhBao' ? 'Cảnh báo (48-120h)' : 'Khẩn cấp (>120h)'
                      ]}
                    />
                    <Legend 
                      wrapperStyle={{ fontSize: 10, paddingTop: 6 }} 
                      formatter={(val) => 
                        val === 'hangMoi' ? 'Mới (0-12h)' :
                        val === 'tonDong' ? 'Tồn (12-48h)' :
                        val === 'canhBao' ? 'Cảnh báo (48-120h)' : 'Khẩn cấp (>120h)'
                      }
                    />
                    <Bar dataKey="hangMoi" stackId="a" fill="#10B981" />
                    <Bar dataKey="tonDong" stackId="a" fill="#F59E0B" />
                    <Bar dataKey="canhBao" stackId="a" fill="#F97316" />
                    <Bar dataKey="khanCap" stackId="a" fill="#EF4444" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* Khối Nhận Xét & Đánh Giá Vận Hành Logic Mức Cảnh Báo */}
          <div className="bg-gradient-to-r from-rose-50/80 via-amber-50/40 to-slate-50 dark:from-rose-950/30 dark:via-slate-800/60 dark:to-slate-800 border border-rose-200 dark:border-rose-900 rounded-xl p-3.5 space-y-2 text-xs text-slate-700 dark:text-slate-300">
            <div className="flex items-center gap-1.5 font-bold text-rose-700 dark:text-rose-400 text-xs uppercase tracking-wide">
              <Lightbulb className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Đánh Giá & Nhận Định Thực Tế Vận Hành (Mức Cảnh Báo)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11.5px] leading-relaxed">
              <div className="bg-white/90 dark:bg-slate-800/90 p-2.5 rounded-lg border border-rose-100 dark:border-rose-950 shadow-2xs space-y-1">
                <div className="flex items-center gap-1 font-bold text-red-600">
                  <AlertOctagon className="w-3.5 h-3.5 shrink-0" />
                  <span>Điểm Nóng Nghẽn: (LAN) Rạch Kiến</span>
                </div>
                <p>
                  Rạch Kiến đang là điểm thắt cổ chai lớn nhất khu vực khi ôm <strong>4.428 đơn tồn (40.5% toàn khu vực)</strong> và <strong>117/167 đơn khẩn cấp &gt;120h (70.1%)</strong>. Tỷ lệ đơn rủi ro quá hạn đạt <strong>15.7%</strong> (695 đơn). Nguyên nhân cốt lõi do áp lực dồn toa ca đêm và địa bàn tuyến xã rộng, thiếu bưu tá cơ động chi viện.
                </p>
              </div>

              <div className="bg-white/90 dark:bg-slate-800/90 p-2.5 rounded-lg border border-amber-100 dark:border-amber-950 shadow-2xs space-y-1">
                <div className="flex items-center gap-1 font-bold text-amber-600">
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span>Tồn Kho Lưu Cữu: (LAN) Cần Đước 1</span>
                </div>
                <p>
                  Mặc dù số lượng đơn không lớn (535 đơn), nhưng <strong>100% đơn tại Cần Đước 1 là hàng tồn lưu cữu từ các ca trước</strong> (449 đơn tồn 12-48h, 76 đơn cảnh báo và 10 đơn khẩn cấp), <strong>0 đơn mới trong ngày</strong>. Cần giải phóng dứt điểm các ca giao lại lần 2-3 và đơn hẹn khách kéo dài.
                </p>
              </div>

              <div className="bg-white/90 dark:bg-slate-800/90 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-950 shadow-2xs space-y-1">
                <div className="flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Hình Mẫu: Cần Đước 1 &amp; Cần Giuộc</span>
                </div>
                <p>
                  <strong>Cần Đước 1</strong> đạt hiệu suất lưu chuyển xuất sắc: <strong>0 đơn cảnh báo và 0 đơn khẩn cấp</strong> (75% là hàng mới trong ca). <strong>Cần Giuộc</strong> quản lý khối lượng lớn (2.230 đơn) nhưng kiểm soát khẩn cấp cực tốt chỉ 6 đơn (0.3%). Đề xuất rút 3 bưu tá từ Cần Đước 1 sang tăng viện Rạch Kiến xử lý 117 đơn quá hạn.
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
            BÁO CÁO 2: THỐNG KÊ & BIỂU ĐỒ TỒN ĐỌNG THEO KHÁCH HÀNG / SÀN TMĐT THEO BƯU CỤC
           ========================================================================= */}
        <div id="section-customer-report" className="bg-white dark:bg-slate-800 p-4 md:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4 scroll-mt-16">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-700">
            <div>
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-indigo-600 shrink-0" />
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                  Báo Cáo 2: Thống Kê Tồn Đọng Theo Khách Hàng &amp; Sàn TMĐT Theo Bưu Cục
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                  Áp Lực SLA Đối Tác
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Đo lường cơ cấu nguồn đơn sàn (TikTok Shop, Shopee, Khách lẻ ngoài sàn) và rủi ro vi phạm thời gian cam kết giao hàng (SLA)
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400">Tỷ trọng đơn sàn (TTS + Shopee):</span>
              <span className="ml-1.5 text-sm font-black text-indigo-600">
                {(customerMatrixData.totals.ttsPct + customerMatrixData.totals.shopeePct).toFixed(1)}% ({(customerMatrixData.totals.tts + customerMatrixData.totals.shopee).toLocaleString('vi-VN')} đơn)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Bảng Ma Trận Chi Tiết Khách Hàng (7 Cột rộng) */}
            <div className="lg:col-span-7 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                <thead className="bg-slate-100 dark:bg-slate-750 text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 font-bold">
                  <tr>
                    <th className="px-3 py-2.5">Bưu Cục</th>
                    <th className="px-2.5 py-2.5 text-right text-purple-600 dark:text-purple-400">TikTok Shop (TTS)</th>
                    <th className="px-2.5 py-2.5 text-right text-orange-600">Shopee</th>
                    <th className="px-2.5 py-2.5 text-right text-slate-600 dark:text-slate-300">Khách Khác (OTHER)</th>
                    <th className="px-3 py-2.5 text-right text-slate-900 dark:text-white font-extrabold">Tổng Tồn</th>
                    <th className="px-2.5 py-2.5 text-center">Kênh Chủ Lực</th>
                    <th className="px-2.5 py-2.5 text-center">Áp Lực SLA Sàn</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-750">
                  {customerMatrixData.rows.map((row) => (
                    <tr key={row.buuCuc} className="hover:bg-slate-50 dark:hover:bg-slate-750/60 transition-colors">
                      <td className="px-3 py-2 font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <Store className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{row.buuCucShort}</span>
                      </td>
                      <td className="px-2.5 py-2 text-right">
                        <span className="font-mono font-bold text-purple-600 dark:text-purple-400">{row.tts.toLocaleString('vi-VN')}</span>
                        <span className="ml-1 text-[10px] text-slate-400">({row.ttsPct.toFixed(0)}%)</span>
                      </td>
                      <td className="px-2.5 py-2 text-right">
                        <span className="font-mono font-bold text-orange-600">{row.shopee.toLocaleString('vi-VN')}</span>
                        <span className="ml-1 text-[10px] text-slate-400">({row.shopeePct.toFixed(0)}%)</span>
                      </td>
                      <td className="px-2.5 py-2 text-right">
                        <span className="font-mono font-medium text-slate-600 dark:text-slate-300">{row.other.toLocaleString('vi-VN')}</span>
                        <span className="ml-1 text-[10px] text-slate-400">({row.otherPct.toFixed(0)}%)</span>
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-black text-slate-900 dark:text-white">
                        {row.total.toLocaleString('vi-VN')}
                      </td>
                      <td className="px-2.5 py-2 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10.5px] font-bold ${
                          row.mainPartner === 'SHOPEE' ? 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300' :
                          row.mainPartner === 'TTS' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300' :
                          'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                        }`}>
                          {row.mainPartner}
                        </span>
                      </td>
                      <td className="px-2.5 py-2 text-center">
                        {row.shopee > 1000 || (row.tts + row.shopee) > 2000 ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">
                            Rất Cao (Cần Ưu Tiên)
                          </span>
                        ) : (row.tts + row.shopee) > 1000 ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            Trung Bình
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            Trong Tầm Kiểm Soát
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-100/90 dark:bg-slate-750 text-slate-900 dark:text-white font-extrabold border-t-2 border-slate-300 dark:border-slate-650">
                  <tr>
                    <td className="px-3 py-2.5 uppercase tracking-wider text-[11px]">
                      {customerMatrixData.totals.buuCuc}
                    </td>
                    <td className="px-2.5 py-2.5 text-right text-purple-600 dark:text-purple-400 font-mono">
                      {customerMatrixData.totals.tts.toLocaleString('vi-VN')} ({customerMatrixData.totals.ttsPct.toFixed(1)}%)
                    </td>
                    <td className="px-2.5 py-2.5 text-right text-orange-600 font-mono">
                      {customerMatrixData.totals.shopee.toLocaleString('vi-VN')} ({customerMatrixData.totals.shopeePct.toFixed(1)}%)
                    </td>
                    <td className="px-2.5 py-2.5 text-right text-slate-600 dark:text-slate-300 font-mono">
                      {customerMatrixData.totals.other.toLocaleString('vi-VN')} ({customerMatrixData.totals.otherPct.toFixed(1)}%)
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-slate-900 dark:text-white text-sm">
                      {customerMatrixData.totals.total.toLocaleString('vi-VN')}
                    </td>
                    <td className="px-2.5 py-2.5 text-center text-indigo-600">
                      TTS &amp; Shopee
                    </td>
                    <td className="px-2.5 py-2.5 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">
                        78.4% Đơn Sàn
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Biểu Đồ Trực Quan Xếp Chồng Khách Hàng (5 Cột rộng) */}
            <div className="lg:col-span-5 bg-slate-50/70 dark:bg-slate-750/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight">
                  Biểu Đồ Cơ Cấu Đối Tác / Sàn TMĐT
                </span>
                <span className="text-[10px] text-slate-400">Số lượng đơn theo kênh</span>
              </div>
              <div className="h-60">
                {customerMatrixData.rows.length === 0 ? (
                  <ChartEmptyState 
                    title="Không có dữ liệu đối tác / TMĐT" 
                    subtitle="Không tìm thấy dữ liệu phân kênh sàn cho bộ lọc hiện tại" 
                    heightClass="h-60" 
                  />
                ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={customerMatrixData.rows} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                    <XAxis dataKey="buuCucShort" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip 
                      formatter={(v: any, name: any) => [
                        `${Number(v).toLocaleString('vi-VN')} đơn`,
                        name === 'tts' ? 'TikTok Shop (TTS)' :
                        name === 'shopee' ? 'Shopee' : 'Khách Khác (OTHER)'
                      ]}
                    />
                    <Legend 
                      wrapperStyle={{ fontSize: 10, paddingTop: 6 }} 
                      formatter={(val) => 
                        val === 'tts' ? 'TikTok Shop' :
                        val === 'shopee' ? 'Shopee' : 'Khách Khác'
                      }
                    />
                    <Bar dataKey="tts" stackId="b" fill="#8B5CF6" />
                    <Bar dataKey="shopee" stackId="b" fill="#F97316" />
                    <Bar dataKey="other" stackId="b" fill="#64748B" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                )}
              </div>
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

export default BacklogGltTab;
