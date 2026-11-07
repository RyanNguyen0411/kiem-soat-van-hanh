import React, { useState, useMemo } from 'react';
import { RotateCcw, AlertCircle } from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip 
} from 'recharts';
import { useDashboard } from '../context/DashboardContext';
import { DataTable } from '../components/common/DataTable';
import type { Column } from '../components/common/DataTable';
import { IndependentFilter } from '../components/common/IndependentFilter';
import type { FilterFieldConfig } from '../components/common/IndependentFilter';
import { sortDatesDesc } from '../utils/dateEngine';

export const ReturnRateTab: React.FC = () => {
  const { dataset, selectedBuuCucGlobal } = useDashboard();

  // Independent Filter state (Đồng bộ bưu cục toàn hệ thống)
  const [filterValues, setFilterValues] = useState<Record<string, string[]>>(() => ({
    buuCuc: selectedBuuCucGlobal && selectedBuuCucGlobal !== 'all' ? [selectedBuuCucGlobal] : [],
    ngay: [],
    loaiHang: []
  }));

  React.useEffect(() => {
    if (selectedBuuCucGlobal && selectedBuuCucGlobal !== 'all') {
      setFilterValues(prev => ({
        ...prev,
        buuCuc: [selectedBuuCucGlobal]
      }));
    }
  }, [selectedBuuCucGlobal]);

  const buuCucOptions = useMemo(() => {
    return [...new Set(dataset.gtcBuuCuc.map(r => r.buuCuc))].filter(Boolean).map(b => ({ label: b, value: b }));
  }, [dataset.gtcBuuCuc]);

  const ngayOptions = useMemo(() => {
    const dates = [...new Set(dataset.gtcBuuCuc.map(r => r.ngay))].filter(Boolean);
    return sortDatesDesc(dates).map(n => ({ label: n, value: n }));
  }, [dataset.gtcBuuCuc]);

  const loaiHangOptions = useMemo(() => {
    return [...new Set(dataset.gtcBuuCuc.map(r => r.loaiHang))].filter(Boolean).map(l => ({ label: l, value: l }));
  }, [dataset.gtcBuuCuc]);

  const filterFields: FilterFieldConfig[] = [
    { key: 'buuCuc', label: 'Bưu cục', options: buuCucOptions },
    { key: 'ngay', label: 'Ngày', options: ngayOptions },
    { key: 'loaiHang', label: 'Loại hàng / Ca', options: loaiHangOptions }
  ];

  // Data from GTC Bưu cục
  const filteredData = useMemo(() => {
    return dataset.gtcBuuCuc.filter(r => {
      if (filterValues.buuCuc?.length && !filterValues.buuCuc.includes(r.buuCuc)) return false;
      if (filterValues.ngay?.length && !filterValues.ngay.includes(r.ngay)) return false;
      if (filterValues.loaiHang?.length && !filterValues.loaiHang.includes(r.loaiHang)) return false;
      return true;
    });
  }, [dataset.gtcBuuCuc, filterValues]);

  // Aggregate return metrics
  const returnMetrics = useMemo(() => {
    const totalVolume = filteredData.reduce((acc, r) => acc + (r.volume || 0), 0);
    const returnUnits = filteredData.reduce((acc, r) => {
      const pct = parseFloat(r.tiLeChuyenTra?.replace('%', '').replace(',', '.') || '0') / 100;
      return acc + (r.volume * pct);
    }, 0);
    const returnRateTotal = totalVolume > 0 ? (returnUnits / totalVolume) * 100 : 0;

    return {
      totalVolume,
      returnUnits: Math.round(returnUnits),
      returnRateTotal
    };
  }, [filteredData]);

  // Post office return rate breakdown
  const poReturnData = useMemo(() => {
    const map: Record<string, { buuCuc: string; volume: number; returnUnits: number }> = {};
    filteredData.forEach(r => {
      if (!map[r.buuCuc]) {
        map[r.buuCuc] = { buuCuc: r.buuCuc, volume: 0, returnUnits: 0 };
      }
      const pct = parseFloat(r.tiLeChuyenTra?.replace('%', '').replace(',', '.') || '0') / 100;
      map[r.buuCuc].volume += r.volume || 0;
      map[r.buuCuc].returnUnits += (r.volume * pct);
    });

    return Object.values(map).map(item => ({
      ...item,
      returnRate: item.volume > 0 ? parseFloat(((item.returnUnits / item.volume) * 100).toFixed(2)) : 0
    })).sort((a, b) => b.returnRate - a.returnRate);
  }, [filteredData]);

  // Columns for Table
  const columns: Column<any>[] = [
    {
      key: 'buuCuc',
      header: 'Bưu Cục',
      render: r => <span className="font-bold text-slate-800 dark:text-slate-100">{r.buuCuc}</span>
    },
    {
      key: 'loaiHang',
      header: 'Loại Hàng',
      render: r => <span>{r.loaiHang}</span>
    },
    {
      key: 'ngay',
      header: 'Ngày',
      render: r => <span>{r.ngay} ({r.thu})</span>
    },
    {
      key: 'volume',
      header: 'Volume Nhập',
      align: 'right',
      render: r => <span className="font-bold">{r.volume.toLocaleString('vi-VN')}</span>
    },
    {
      key: 'tiLeChuyenTra',
      header: 'Tỷ Lệ Chuyển Trả',
      align: 'right',
      render: r => {
        const val = parseFloat(r.tiLeChuyenTra?.replace(',', '.') || '0');
        return (
          <span className={`font-bold px-2 py-0.5 rounded ${
            val > 3 ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' :
            val > 1.5 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' :
            'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
          }`}>
            {r.tiLeChuyenTra}
          </span>
        );
      }
    },
    {
      key: 'tiLeGTC',
      header: '% GTC Đối Chiếu',
      align: 'right',
      render: r => <span className="text-slate-600 dark:text-slate-400 font-medium">{r.tiLeGTC}</span>
    },
    {
      key: 'tonDong',
      header: 'Tồn Đọng Ca',
      align: 'right',
      render: r => <span className="text-rose-600 font-medium">{r.tonDong}</span>
    }
  ];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Official Data Audit Notification Banner */}
      <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 p-4 rounded-xl flex items-start gap-3 shadow-sm text-xs text-amber-900 dark:text-amber-200">
        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-bold text-sm uppercase text-amber-800 dark:text-amber-300">
            Thông Báo Trạng Thái Dữ Liệu Nguồn Sheet "Tỷ lệ trả hàng"
          </div>
          <p>
            Theo đúng nguyên tắc kiểm toán dữ liệu tại <b>Phần II mục 4</b>: Hệ thống đã kết nối trực tiếp đến tab <b>"Tỷ lệ trả hàng"</b> trên Google Sheets nguồn. Sheet này hiện chỉ có 1 dòng tiêu đề cột: 
            <code className="mx-1 px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/60 rounded text-[11px] font-mono">
              ['AM', 'Bưu cục', 'Time', '%vol', '% Return', '', 'Ngày', 'Thứ']
            </code> 
            và <b>chưa có bản ghi số liệu (0 dòng dữ liệu)</b>.
          </p>
          <p className="text-emerald-700 dark:text-emerald-300 font-medium pt-0.5">
            ✓ <b>Giải pháp hỗ trợ vận hành:</b> Hệ thống tự động trích xuất trường <b>"% Chuyển trả"</b> từ Sheet <b>"GTC Bưu cục"</b> để Area Manager theo dõi liên tục tỷ lệ chuyển trả của 6 bưu cục mà không bị gián đoạn công tác điều hành.
          </p>
        </div>
      </div>

      {/* Tab Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div>
          <div className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-orange-600" />
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
              Phân Hệ Kiểm Soát Tỷ Lệ Chuyển Trả Hàng
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Theo dõi tỷ lệ hoàn chuyển trả theo từng bưu cục, ca vận hành và biến động thời gian
          </p>
        </div>

        <IndependentFilter
          title="Lọc Tỷ Lệ Trả"
          fields={filterFields}
          selectedValues={filterValues}
          onApply={val => setFilterValues(val)}
          onReset={() => setFilterValues({ buuCuc: [], ngay: [], loaiHang: [] })}
        />
      </div>

      {/* KPI Cards Section */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="text-xs text-slate-400 font-medium">Tổng Sản Lượng Volume</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {returnMetrics.totalVolume.toLocaleString('vi-VN')}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Mẫu số tính tỷ lệ chuyển trả</div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="text-xs text-slate-400 font-medium">Ước Tính Đơn Chuyển Trả</div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
            ~{returnMetrics.returnUnits.toLocaleString('vi-VN')} đơn
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Volume × % Chuyển trả</div>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white p-4 rounded-xl shadow-md">
          <div className="text-xs text-amber-100 font-bold">% CHUYỂN TRẢ TRUNG BÌNH</div>
          <div className="text-3xl font-black mt-1">
            {returnMetrics.returnRateTotal.toFixed(2)}%
          </div>
          <div className="text-[11px] text-amber-100 mt-0.5">Toàn khu vực tháng 10/2026</div>
        </div>
      </div>

      {/* Post Office Return Rate Comparison Chart */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              So Sánh Tỷ Lệ Chuyển Trả Giữa 6 Bưu Cục
            </h3>
            <p className="text-[11px] text-slate-400">Xếp hạng bưu cục theo tỷ lệ hoàn hàng</p>
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={poReturnData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
              <XAxis dataKey="buuCuc" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 4]} tick={{ fontSize: 10 }} tickFormatter={v => `${v}%`} />
              <Tooltip formatter={(v: any) => [`${Number(v).toFixed(2)}%`, 'Tỷ lệ chuyển trả']} />
              <Bar dataKey="returnRate" name="% Chuyển trả" fill="#F59E0B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table Section */}
      <DataTable
        columns={columns}
        data={filteredData}
        title="Bảng Theo Dõi Chuyển Trả Chi Tiết"
        subtitle="Trích xuất từ trường % Chuyển trả của Sheet GTC Bưu cục"
        exportFilename="ty_le_chuyen_tra_ghn"
        pageSizeDefault={15}
        keyExtractor={(r, idx) => `${r.buuCuc}_${r.time}_${idx}`}
      />
    </div>
  );
};

export default ReturnRateTab;
