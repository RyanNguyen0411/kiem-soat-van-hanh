import React, { useState, useMemo } from 'react';
import { Truck, Building2 } from 'lucide-react';
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
import { useAuth } from '../context/AuthContext';
import type { BacklogLcRecord } from '../types/dashboard';
import { dedupeLcRecords, computeLcBacklogBreakdown } from '../services/kpiEngine';
import { DataTable } from '../components/common/DataTable';
import { ChartEmptyState } from '../components/common/ChartEmptyState';
import type { Column } from '../components/common/DataTable';
import { IndependentFilter } from '../components/common/IndependentFilter';
import type { FilterFieldConfig } from '../components/common/IndependentFilter';

export const BacklogLcTab: React.FC = () => {
  const { dataset, selectedBuuCucGlobal, setSelectedBuuCucGlobal } = useDashboard();
  const { currentUser } = useAuth();
  const isStaff = currentUser?.role === 'post_office_staff';
  const assignedPo = currentUser?.assignedPostOffice;

  const lastPushedBcRef = React.useRef<string>(isStaff && assignedPo ? assignedPo : (selectedBuuCucGlobal || 'all'));

  // Independent Filter state (Đồng bộ bưu cục)
  const [filterValues, setFilterValues] = useState<Record<string, string[]>>(() => ({
    tenBC: isStaff && assignedPo ? [assignedPo] : (selectedBuuCucGlobal && selectedBuuCucGlobal !== 'all' ? [selectedBuuCucGlobal] : []),
    loaiDon: [],
    trangThai: [],
    canhBao: []
  }));

  React.useEffect(() => {
    if (isStaff && assignedPo) {
      setFilterValues(prev => ({ ...prev, tenBC: [assignedPo] }));
      return;
    }
    if (selectedBuuCucGlobal !== lastPushedBcRef.current) {
      lastPushedBcRef.current = selectedBuuCucGlobal || 'all';
      setFilterValues(prev => ({
        ...prev,
        tenBC: selectedBuuCucGlobal && selectedBuuCucGlobal !== 'all' ? [selectedBuuCucGlobal] : []
      }));
    }
  }, [selectedBuuCucGlobal, isStaff, assignedPo]);

  // Options
  const buuCucOptions = useMemo(() => {
    if (isStaff && assignedPo) return [{ label: assignedPo, value: assignedPo }];
    return [...new Set(dataset.tonDongLc.map(r => r.tenBC))].filter(Boolean).map(b => ({ label: b, value: b }));
  }, [dataset.tonDongLc, isStaff, assignedPo]);

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
    ...(!isStaff ? [{ key: 'tenBC', label: 'Bưu cục', options: buuCucOptions }] : []),
    { key: 'loaiDon', label: 'Loại đơn LC', options: loaiDonOptions },
    { key: 'trangThai', label: 'Trạng thái kiện', options: trangThaiOptions },
    { key: 'canhBao', label: 'Mức cảnh báo', options: canhBaoOptions }
  ];

  // Apply filters & deduplicate by unique normalized maDonHang
  const matchedRawRows = useMemo(() => {
    const result: BacklogLcRecord[] = [];
    for (const r of dataset.tonDongLc) {
      if (filterValues.tenBC?.length && !filterValues.tenBC.includes(r.tenBC)) continue;
      if (filterValues.loaiDon?.length && !filterValues.loaiDon.includes(r.loaiDon)) continue;
      if (filterValues.trangThai?.length && !filterValues.trangThai.includes(r.trangThai)) continue;
      if (filterValues.canhBao?.length && !filterValues.canhBao.includes(r.canhBao)) continue;
      result.push(r);
    }
    return result;
  }, [dataset.tonDongLc, filterValues]);

  const lcBreakdown = useMemo(() => {
    return computeLcBacklogBreakdown(matchedRawRows);
  }, [matchedRawRows]);

  const filteredData = useMemo(() => {
    return dedupeLcRecords(matchedRawRows);
  }, [matchedRawRows]);

  // Tab KPIs
  const tabKPIs = useMemo(() => {
    const totalCount = lcBreakdown.totalUnique;
    const lcGiao = lcBreakdown.lcGiao;
    const lcTra = lcBreakdown.lcTra;
    const chuaDongKien = filteredData.filter(r => (r.trangThai || '').includes('Chưa đóng')).length;
    const daDongKien = filteredData.filter(r => (r.trangThai || '').includes('Đã đóng')).length;
    const boSungGap = filteredData.filter(r => (r.canhBao || '').toLowerCase().includes('gấp')).length;

    return {
      totalCount,
      lcGiao,
      lcTra,
      chuaDongKien,
      daDongKien,
      boSungGap,
      businessConflictCount: lcBreakdown.businessConflictCount,
      secondaryDiffCount: lcBreakdown.secondaryDiffCount,
      exactDuplicateCount: lcBreakdown.exactDuplicateCount,
      duplicateRowsIgnored: lcBreakdown.duplicateRowsIgnored,
      emptyOrderIdRowsIgnored: lcBreakdown.emptyOrderIdRowsIgnored
    };
  }, [filteredData, lcBreakdown]);

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
            Quản trị {tabKPIs.totalCount.toLocaleString('vi-VN')} vận đơn luân chuyển tồn duy nhất, phân loại trạng thái đóng kiện và yêu cầu bổ sung gấp
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isStaff && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-100 dark:bg-orange-950/60 border border-orange-300 dark:border-orange-500/50 rounded-xl text-xs font-bold text-orange-700 dark:text-orange-300 shadow-2xs">
              <Building2 className="w-3.5 h-3.5 text-orange-500 shrink-0" />
              <span>{assignedPo || filterValues.tenBC?.[0]}</span>
            </div>
          )}
          <IndependentFilter
            title="Lọc Tồn LC"
            fields={filterFields}
            selectedValues={filterValues}
            onApply={val => {
              setFilterValues(val);
              const bcs = val.tenBC || [];
              const targetBc = bcs.length === 1 ? bcs[0] : 'all';
              lastPushedBcRef.current = targetBc;
              setSelectedBuuCucGlobal(targetBc);
            }}
            onReset={() => {
              setFilterValues({ 
                tenBC: isStaff && assignedPo ? [assignedPo] : [], 
                loaiDon: [], 
                trangThai: [], 
                canhBao: [] 
              });
              if (!isStaff) {
                lastPushedBcRef.current = 'all';
                setSelectedBuuCucGlobal('all');
              }
            }}
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
              <p className="text-[11px] text-slate-400">
                {poLcData.length > 0 && tabKPIs.totalCount > 0
                  ? `${poLcData[0].tenBC.replace('(LAN) ', '')} dẫn đầu với ${poLcData[0].count}/${tabKPIs.totalCount} đơn (${((poLcData[0].count / tabKPIs.totalCount) * 100).toFixed(1)}%)`
                  : 'Phân bổ tồn luân chuyển theo bưu cục'}
              </p>
            </div>
          </div>
          <div className="h-64">
            {poLcData.length === 0 ? (
              <ChartEmptyState 
                title="Không có đơn tồn LC" 
                subtitle="Không tìm thấy số lượng đơn tồn LC theo bưu cục cho bộ lọc hiện tại" 
                heightClass="h-64" 
              />
            ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={poLcData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                <XAxis dataKey="tenBC" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: any) => [`${v} đơn`, 'Tồn LC']} />
                <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            )}
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
            {statusData.length === 0 || statusData.every(d => d.value === 0) ? (
              <ChartEmptyState 
                title="Không có dữ liệu trạng thái kiện" 
                subtitle="Chưa có dữ liệu phân loại kiện đóng/chưa đóng" 
                heightClass="h-64" 
              />
            ) : (
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
            )}
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

export default React.memo(BacklogLcTab);
