import React, { useState, useMemo } from 'react';
import { Truck, Send } from 'lucide-react';
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
import type { BacklogLcRecord } from '../types/dashboard';
import { DataTable } from '../components/common/DataTable';
import type { Column } from '../components/common/DataTable';
import { IndependentFilter } from '../components/common/IndependentFilter';
import type { FilterFieldConfig } from '../components/common/IndependentFilter';

export const BacklogLcTab: React.FC = () => {
  const { dataset, selectedBuuCucGlobal } = useDashboard();

  // Independent Filter state (Đồng bộ bưu cục)
  const [filterValues, setFilterValues] = useState<Record<string, string[]>>(() => ({
    tenBC: selectedBuuCucGlobal && selectedBuuCucGlobal !== 'all' ? [selectedBuuCucGlobal] : [],
    loaiDon: [],
    trangThai: [],
    canhBao: []
  }));

  React.useEffect(() => {
    if (selectedBuuCucGlobal && selectedBuuCucGlobal !== 'all') {
      setFilterValues(prev => ({
        ...prev,
        tenBC: [selectedBuuCucGlobal]
      }));
    }
  }, [selectedBuuCucGlobal]);

  // Options
  const buuCucOptions = useMemo(() => {
    return [...new Set(dataset.tonDongLc.map(r => r.tenBC))].filter(Boolean).map(b => ({ label: b, value: b }));
  }, [dataset.tonDongLc]);

  const loaiDonOptions = useMemo(() => {
    return [...new Set(dataset.tonDongLc.map(r => r.loaiDon))].filter(Boolean).map(l => ({ label: l, value: l }));
  }, [dataset.tonDongLc]);

  const trangThaiOptions = useMemo(() => {
    return [...new Set(dataset.tonDongLc.map(r => r.trangThai))].filter(Boolean).map(s => ({ label: s, value: s }));
  }, [dataset.tonDongLc]);

  const canhBaoOptions = useMemo(() => {
    return [...new Set(dataset.tonDongLc.map(r => r.canhBao))].filter(Boolean).map(c => ({ label: c, value: c }));
  }, [dataset.tonDongLc]);

  const filterFields: FilterFieldConfig[] = [
    { key: 'tenBC', label: 'Bưu cục', options: buuCucOptions },
    { key: 'loaiDon', label: 'Loại đơn LC', options: loaiDonOptions },
    { key: 'trangThai', label: 'Trạng thái kiện', options: trangThaiOptions },
    { key: 'canhBao', label: 'Mức cảnh báo', options: canhBaoOptions }
  ];

  // Apply filters
  const filteredData = useMemo(() => {
    return dataset.tonDongLc.filter(r => {
      if (filterValues.tenBC?.length && !filterValues.tenBC.includes(r.tenBC)) return false;
      if (filterValues.loaiDon?.length && !filterValues.loaiDon.includes(r.loaiDon)) return false;
      if (filterValues.trangThai?.length && !filterValues.trangThai.includes(r.trangThai)) return false;
      if (filterValues.canhBao?.length && !filterValues.canhBao.includes(r.canhBao)) return false;
      return true;
    });
  }, [dataset.tonDongLc, filterValues]);

  // Tab KPIs
  const tabKPIs = useMemo(() => {
    const totalCount = filteredData.length;
    const lcGiao = filteredData.filter(r => r.loaiDon.includes('giao')).length;
    const lcTra = filteredData.filter(r => r.loaiDon.includes('trả')).length;
    const chuaDongKien = filteredData.filter(r => r.trangThai.includes('Chưa đóng')).length;
    const daDongKien = filteredData.filter(r => r.trangThai.includes('Đã đóng')).length;
    const boSungGap = filteredData.filter(r => r.canhBao.includes('gấp')).length;

    return {
      totalCount,
      lcGiao,
      lcTra,
      chuaDongKien,
      daDongKien,
      boSungGap
    };
  }, [filteredData]);

  // Chart data: Backlog by Post Office
  const poLcData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredData.forEach(r => {
      map[r.tenBC] = (map[r.tenBC] || 0) + 1;
    });
    return Object.entries(map)
      .map(([tenBC, count]) => ({ tenBC, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredData]);

  // Chart data: Package Status breakdown
  const statusData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredData.forEach(r => {
      map[r.trangThai] = (map[r.trangThai] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredData]);

  const STATUS_COLORS = ['#EF4444', '#10B981', '#3B82F6'];

  // Columns for DataTable
  const columns: Column<BacklogLcRecord>[] = [
    {
      key: 'maDonHang',
      header: 'Mã Vận Đơn LC',
      width: '130px',
      render: r => <span className="font-mono font-bold text-blue-600 select-all">{r.maDonHang}</span>
    },
    {
      key: 'tenBC',
      header: 'Bưu Cục',
      render: r => <span className="font-bold text-slate-800 dark:text-slate-100">{r.tenBC}</span>
    },
    {
      key: 'loaiDon',
      header: 'Loại Đơn',
      render: r => (
        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
          r.loaiDon.includes('trả') ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' :
          'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
        }`}>
          {r.loaiDon}
        </span>
      )
    },
    {
      key: 'khachHang',
      header: 'Đối Tác / Khách Hàng',
      render: r => <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">{r.khachHang}</span>
    },
    {
      key: 'trangThai',
      header: 'Trạng Thái Kiện Hàng',
      render: r => (
        <span className={`text-[11px] font-medium ${
          r.trangThai.includes('Chưa đóng') ? 'text-red-600 font-bold' :
          r.trangThai.includes('Đã đóng') ? 'text-emerald-600' :
          'text-slate-600 dark:text-slate-300'
        }`}>
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
      render: r => (
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
          r.canhBao.includes('gấp') ? 'bg-red-600 text-white animate-pulse' :
          'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
        }`}>
          {r.canhBao}
        </span>
      )
    }
  ];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Tab Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div>
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
              Phân Hệ Kiểm Soát Tồn Đọng Luân Chuyển (LC)
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Quản trị 284 vận đơn luân chuyển tồn, phân loại trạng thái đóng kiện và yêu cầu bổ sung gấp
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('open-telegram-report', { detail: { reportType: 'lc' } }))}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#229ED9] hover:bg-[#1e8ec3] text-white font-extrabold text-xs shadow-sm transition-all cursor-pointer whitespace-nowrap active:scale-95 border border-[#229ED9]/50"
            title="Xuất và gửi báo cáo Telegram Tồn Đọng Luân Chuyển (LC) cho 5 bưu cục"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Báo Cáo Telegram LC</span>
          </button>

          <IndependentFilter
            title="Lọc Tồn LC"
            fields={filterFields}
            selectedValues={filterValues}
            onApply={val => setFilterValues(val)}
            onReset={() => setFilterValues({ tenBC: [], loaiDon: [], trangThai: [], canhBao: [] })}
          />
        </div>
      </div>

      {/* KPI Cards Section */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-blue-600 text-white p-3.5 rounded-xl shadow-md">
          <div className="text-[11px] text-blue-100 font-bold">TỔNG TỒN LC</div>
          <div className="text-2xl font-black mt-1">
            {tabKPIs.totalCount}
          </div>
          <div className="text-[10px] text-blue-200">Đơn luân chuyển</div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="text-[11px] text-slate-400 font-medium">LC Giao</div>
          <div className="text-lg font-black text-blue-600 mt-1">
            {tabKPIs.lcGiao}
          </div>
          <div className="text-[10px] text-slate-400">{((tabKPIs.lcGiao / tabKPIs.totalCount) * 100 || 0).toFixed(0)}% tổng LC</div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="text-[11px] text-slate-400 font-medium">LC Trả</div>
          <div className="text-lg font-black text-amber-600 mt-1">
            {tabKPIs.lcTra}
          </div>
          <div className="text-[10px] text-slate-400">{((tabKPIs.lcTra / tabKPIs.totalCount) * 100 || 0).toFixed(0)}% tổng LC</div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-red-200 dark:border-red-900/60 shadow-sm">
          <div className="text-[11px] text-slate-400 font-medium">Chưa Đóng Kiện</div>
          <div className="text-lg font-black text-red-600 mt-1">
            {tabKPIs.chuaDongKien}
          </div>
          <div className="text-[10px] text-red-500 font-medium">Cần xử lý đóng kiện</div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="text-[11px] text-slate-400 font-medium">Đã Đóng Kiện</div>
          <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {tabKPIs.daDongKien}
          </div>
          <div className="text-[10px] text-slate-400">Chờ xe vận chuyển</div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-red-300 dark:border-red-900 shadow-sm">
          <div className="text-[11px] text-slate-400 font-medium">Bổ Sung Gấp</div>
          <div className="text-lg font-black text-red-600 mt-1">
            {tabKPIs.boSungGap}
          </div>
          <div className="text-[10px] text-red-500 font-bold">Khẩn cấp</div>
        </div>
      </div>

      {/* Row Charts: Backlog LC by Post Office & Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Số Lượng Đơn Tồn LC Theo Bưu Cục
              </h3>
              <p className="text-[11px] text-slate-400">Rạch Kiến chiếm 207/284 đơn (72,9%)</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={poLcData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                <XAxis dataKey="tenBC" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: any) => [`${v} đơn`, 'Tồn LC']} />
                <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Cơ Cấu Trạng Thái Kiện
              </h3>
              <p className="text-[11px] text-slate-400">Đóng kiện vs Chưa đóng kiện</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {statusData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => [`${v} đơn`, 'Số lượng']} />
                <Legend wrapperStyle={{ fontSize: 9, paddingTop: 4 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Detailed Data Table */}
      <DataTable<BacklogLcRecord>
        columns={columns}
        data={filteredData}
        title="Danh Sách Vận Đơn Luân Chuyển Tồn"
        subtitle="Theo dõi trạng thái đóng gói và điều động xe luân chuyển giữa các bưu cục"
        exportFilename="ton_dong_lc_ghn"
        pageSizeDefault={20}
        searchPlaceholder="Tìm mã đơn LC, đối tác, khách hàng..."
        keyExtractor={(r) => r.maDonHang}
      />
    </div>
  );
};

export default BacklogLcTab;
