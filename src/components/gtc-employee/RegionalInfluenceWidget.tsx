import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  Filter, 
  RotateCcw, 
  ShieldAlert, 
  Layers, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingDown, 
  Calendar, 
  Clock 
} from 'lucide-react';
import { 
  ComposedChart, 
  ResponsiveContainer, 
  CartesianGrid, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  Bar, 
  Line, 
  ReferenceLine, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { IndividualFilterDropdown } from '../common/IndividualFilterDropdown';
import type { DatasetState } from '../../types/dashboard';

export interface RegionalInfluenceWidgetProps {
  dataset: DatasetState;
  availableMonths: { key: string; label: string; dates: string[] }[];
  availableWeeks: { key: string; label: string; dates: string[]; monthKey?: string }[];
  allUniqueDatesDesc: string[];
}

const PO_COLORS = ['#F97316', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899'];

export const RegionalInfluenceWidget: React.FC<RegionalInfluenceWidgetProps> = ({
  dataset,
  availableMonths,
  availableWeeks,
  allUniqueDatesDesc
}) => {
  const [influenceQuickRange, setInfluenceQuickRange] = useState<'7' | '14' | 'all'>('7');
  const [influenceFilterMonths, setInfluenceFilterMonths] = useState<string[]>([]);
  const [influenceFilterWeeks, setInfluenceFilterWeeks] = useState<string[]>([]);
  const [influenceFilterDates, setInfluenceFilterDates] = useState<string[]>([]);

  const handleResetInfluenceFilter = () => {
    setInfluenceFilterMonths([]);
    setInfluenceFilterWeeks([]);
    setInfluenceFilterDates([]);
    setInfluenceQuickRange('7');
  };

  const handleQuickSetInfluenceRange = (range: '7' | '14' | 'all') => {
    setInfluenceFilterMonths([]);
    setInfluenceFilterWeeks([]);
    setInfluenceFilterDates([]);
    setInfluenceQuickRange(range);
  };

  const regionalInfluenceData = useMemo(() => {
    const isCustom = influenceFilterMonths.length > 0 || influenceFilterWeeks.length > 0 || influenceFilterDates.length > 0;
    const defaultDates = influenceQuickRange === '7' ? allUniqueDatesDesc.slice(0, 7) :
                         influenceQuickRange === '14' ? allUniqueDatesDesc.slice(0, 14) : [];

    // 1. Lọc records theo bộ lọc Tháng, Tuần, Ngày hoặc Quick range
    const filteredRecords = dataset.gtcNhanVien.filter(r => {
      if (isCustom) {
        if (influenceFilterMonths.length > 0) {
          const matchMonth = influenceFilterMonths.some(mKey => {
            const mObj = availableMonths.find(m => m.key === mKey);
            return mObj && mObj.dates.includes(r.ngay);
          });
          if (!matchMonth) return false;
        }
        if (influenceFilterWeeks.length > 0) {
          const matchWeek = influenceFilterWeeks.some(wKey => {
            const wObj = availableWeeks.find(w => w.key === wKey);
            return wObj && wObj.dates.includes(r.ngay);
          });
          if (!matchWeek) return false;
        }
        if (influenceFilterDates.length > 0 && !influenceFilterDates.includes(r.ngay)) {
          return false;
        }
        return true;
      }

      if (defaultDates.length > 0) {
        return defaultDates.includes(r.ngay);
      }
      return true;
    });

    // 2. Gom theo bưu cục
    const poMap: Record<string, { totalDon: number; totalGTC: number; totalTon: number; staffSet: Set<string> }> = {};
    let totalRegionDon = 0;
    let totalRegionGtc = 0;
    let totalRegionTon = 0;

    filteredRecords.forEach(r => {
      const bc = r.buuCuc;
      if (!poMap[bc]) {
        poMap[bc] = { totalDon: 0, totalGTC: 0, totalTon: 0, staffSet: new Set() };
      }
      const don = r.tongDon || 0;
      const gtc = r.tongDonGTC || 0;
      const ton = r.tonDong || 0;

      poMap[bc].totalDon += don;
      poMap[bc].totalGTC += gtc;
      poMap[bc].totalTon += ton;
      if (r.maNV) poMap[bc].staffSet.add(r.maNV);

      totalRegionDon += don;
      totalRegionGtc += gtc;
      totalRegionTon += ton;
    });

    const avgRegionGtcRate = totalRegionDon > 0 ? (totalRegionGtc / totalRegionDon) * 100 : 0;
    const avgRegionTonRate = totalRegionDon > 0 ? (totalRegionTon / totalRegionDon) * 100 : 0;
    const totalStaffCount = Object.values(poMap).reduce((acc, p) => acc + p.staffSet.size, 0) || 1;

    // Đảm bảo 5 bưu cục đều xuất hiện
    const allPos = Array.from(new Set(dataset.gtcNhanVien.map(r => r.buuCuc)));
    const items = allPos.map(bc => {
      const poData = poMap[bc] || { totalDon: 0, totalGTC: 0, totalTon: 0, staffSet: new Set() };
      const don = poData.totalDon;
      const gtc = poData.totalGTC;
      const ton = poData.totalTon;
      const staffCount = poData.staffSet.size || 1;
      const avgGtcRate = don > 0 ? (gtc / don) * 100 : 0;
      const donShare = totalRegionDon > 0 ? (don / totalRegionDon) * 100 : 0;
      const gtcShare = totalRegionGtc > 0 ? (gtc / totalRegionGtc) * 100 : 0;
      const tonShare = totalRegionTon > 0 ? (ton / totalRegionTon) * 100 : 0;
      const tonRate = don > 0 ? (ton / don) * 100 : 0;
      const tonPerStaff = parseFloat((ton / staffCount).toFixed(1));
      const staffShare = (staffCount / totalStaffCount) * 100;
      const rateDiff = avgGtcRate - avgRegionGtcRate;

      return {
        buuCuc: bc,
        shortName: bc.replace('(LAN) ', ''),
        totalDon: don,
        totalGTC: gtc,
        totalTon: ton,
        staffCount,
        donShare: parseFloat(donShare.toFixed(1)),
        gtcShare: parseFloat(gtcShare.toFixed(1)),
        tonShare: parseFloat(tonShare.toFixed(1)),
        tonRate: parseFloat(tonRate.toFixed(1)),
        tonPerStaff,
        avgGtcRate: parseFloat(avgGtcRate.toFixed(1)),
        rateDiff: parseFloat(rateDiff.toFixed(1)),
        staffShare: parseFloat(staffShare.toFixed(1)),
        impactLevel: donShare >= 25 ? 'Chi phối chính' : donShare >= 15 ? 'Trọng yếu' : 'Cân bằng',
        qualityStatus: rateDiff >= 5 ? 'Hiệu suất vượt trội' : rateDiff >= 0 ? 'Đạt chuẩn khu vực' : 'Dưới chuẩn khu vực'
      };
    }).sort((a, b) => b.totalDon - a.totalDon);

    // Bưu cục dẫn đầu GTC (Lá chắn chất lượng)
    const bestGtcPo = [...items].sort((a, b) => b.avgGtcRate - a.avgGtcRate)[0] || items[0];
    // Bưu cục có tồn đọng cao nhất (Điểm nghẽn tồn)
    const worstTonPo = [...items].sort((a, b) => b.totalTon - a.totalTon)[0] || items[0];

    const currentFilterLabel = isCustom
      ? [
          influenceFilterMonths.length > 0 ? `${influenceFilterMonths.length} tháng` : '',
          influenceFilterWeeks.length > 0 ? `${influenceFilterWeeks.length} tuần` : '',
          influenceFilterDates.length > 0 ? `${influenceFilterDates.length} ngày` : ''
        ].filter(Boolean).join(' • ')
      : influenceQuickRange === '7' ? '7 Ngày gần nhất' :
        influenceQuickRange === '14' ? '14 Ngày gần nhất' : 'Toàn bộ thời gian';

    return {
      items,
      totalRegionDon,
      totalRegionGtc,
      totalRegionTon,
      avgRegionGtcRate,
      avgRegionTonRate,
      bestGtcPo,
      worstTonPo,
      currentFilterLabel
    };
  }, [
    dataset.gtcNhanVien,
    influenceFilterMonths,
    influenceFilterWeeks,
    influenceFilterDates,
    influenceQuickRange,
    allUniqueDatesDesc,
    availableMonths,
    availableWeeks
  ]);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-3.5 md:p-4 space-y-3.5">
      {/* Header khối biểu đồ */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700 pb-3">
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
            Đang xem: <strong className="text-orange-600 font-bold">{regionalInfluenceData.currentFilterLabel}</strong> ({regionalInfluenceData.totalRegionDon.toLocaleString('vi-VN')} đơn &bull; {regionalInfluenceData.totalRegionGtc.toLocaleString('vi-VN')} GTC &bull; <strong className="text-rose-600 font-bold">{regionalInfluenceData.totalRegionTon.toLocaleString('vi-VN')} tồn</strong>)
          </span>
        </div>
      </div>

      {/* Bộ lọc đa chọn: Tick chọn Tháng, Tick chọn Tuần, Tick chọn Ngày */}
      <div className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-750/60 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-orange-600" />
          <span className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide text-xs">
            Bộ Lọc Biểu Đồ Sức Ảnh Hưởng:
          </span>
          <div className="flex items-center gap-1 text-[10.5px] ml-1">
            <button
              type="button"
              onClick={() => handleQuickSetInfluenceRange('7')}
              className={`px-2 py-0.5 rounded font-semibold transition-all cursor-pointer ${
                influenceQuickRange === '7' && influenceFilterMonths.length === 0 && influenceFilterWeeks.length === 0 && influenceFilterDates.length === 0
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200'
              }`}
            >
              7 Ngày
            </button>
            <button
              type="button"
              onClick={() => handleQuickSetInfluenceRange('14')}
              className={`px-2 py-0.5 rounded font-semibold transition-all cursor-pointer ${
                influenceQuickRange === '14' && influenceFilterMonths.length === 0 && influenceFilterWeeks.length === 0 && influenceFilterDates.length === 0
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200'
              }`}
            >
              14 Ngày
            </button>
            <button
              type="button"
              onClick={() => handleQuickSetInfluenceRange('all')}
              className={`px-2 py-0.5 rounded font-semibold transition-all cursor-pointer ${
                influenceQuickRange === 'all' && influenceFilterMonths.length === 0 && influenceFilterWeeks.length === 0 && influenceFilterDates.length === 0
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200'
              }`}
            >
              Tất cả
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* 1. Lọc Tháng */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Tháng:</span>
            <IndividualFilterDropdown
              label="tháng"
              compact={true}
              icon={<Calendar className="w-3.5 h-3.5 text-emerald-600" />}
              options={availableMonths.map(m => ({ label: `${m.label} (${m.dates.length} ngày)`, value: m.key }))}
              selectedValues={influenceFilterMonths}
              onChange={setInfluenceFilterMonths}
              searchPlaceholder="Tìm tháng..."
              minWidth="w-56"
            />
          </div>

          {/* 2. Lọc Tuần */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Tuần:</span>
            <IndividualFilterDropdown
              label="tuần"
              compact={true}
              icon={<Clock className="w-3.5 h-3.5 text-purple-600" />}
              options={availableWeeks.map(w => ({ label: `${w.label} (${w.dates.length} ngày)`, value: w.key }))}
              selectedValues={influenceFilterWeeks}
              onChange={setInfluenceFilterWeeks}
              searchPlaceholder="Tìm tuần..."
              minWidth="w-60"
            />
          </div>

          {/* 3. Lọc Ngày */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Ngày:</span>
            <IndividualFilterDropdown
              label="ngày"
              compact={true}
              icon={<Calendar className="w-3.5 h-3.5 text-rose-600" />}
              options={allUniqueDatesDesc.map(d => ({ label: d, value: d }))}
              selectedValues={influenceFilterDates}
              onChange={setInfluenceFilterDates}
              searchPlaceholder="Tìm ngày (dd/mm/yyyy)..."
              minWidth="w-56"
            />
          </div>

          {/* Nút Xóa lọc */}
          {(influenceFilterMonths.length > 0 || influenceFilterWeeks.length > 0 || influenceFilterDates.length > 0 || influenceQuickRange !== '7') && (
            <button
              type="button"
              onClick={handleResetInfluenceFilter}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 rounded-lg transition-colors border border-rose-200 dark:border-rose-900/50 cursor-pointer shadow-2xs"
              title="Đặt lại bộ lọc biểu đồ"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Xóa lọc</span>
            </button>
          )}
        </div>
      </div>

      {/* 3 Thẻ Đánh Giá Tác Động Vận Hành Thực Chiến - TƯƠNG TÁC SÁNG BỪNG KHI HOVER */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Card 1: Bưu cục chi phối lớn nhất */}
        <div className="group p-3.5 rounded-xl border transition-all duration-300 cursor-pointer bg-gradient-to-br from-orange-50/80 to-amber-50/40 dark:from-orange-950/40 dark:to-amber-950/20 border-orange-200 dark:border-orange-900/60 hover:border-orange-500 hover:ring-2 hover:ring-orange-400 hover:shadow-xl hover:shadow-orange-500/20 hover:scale-[1.02] space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-orange-700 dark:text-orange-400 uppercase">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              Điểm Nóng Chi Phối Khu Vực
            </span>
            <ShieldAlert className="w-4 h-4 text-orange-600 group-hover:scale-120 group-hover:rotate-12 transition-transform" />
          </div>
          <div className="text-base font-black text-slate-900 dark:text-white group-hover:text-orange-600 transition-colors">
            {regionalInfluenceData.items[0]?.shortName} (Gánh {regionalInfluenceData.items[0]?.donShare}% tải)
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
            Chiếm tỷ trọng sản lượng lớn nhất ({regionalInfluenceData.items[0]?.totalDon.toLocaleString('vi-VN')} đơn) nhưng %GTC đạt <strong>{regionalInfluenceData.items[0]?.avgGtcRate}%</strong> ({regionalInfluenceData.items[0]?.rateDiff >= 0 ? '+' : ''}{regionalInfluenceData.items[0]?.rateDiff}% so với chuẩn KV {regionalInfluenceData.avgRegionGtcRate.toFixed(1)}%). Tồn đọng: <strong className="text-rose-600">{regionalInfluenceData.items[0]?.totalTon.toLocaleString('vi-VN')} đơn</strong> ({regionalInfluenceData.items[0]?.tonRate}%). Mắt xích quyết định hiệu suất toàn tỉnh.
          </p>
        </div>

        {/* Card 2: 2 Bưu cục trụ cột */}
        <div className="group p-3.5 rounded-xl border transition-all duration-300 cursor-pointer bg-gradient-to-br from-blue-50/80 to-indigo-50/40 dark:from-blue-950/40 dark:to-indigo-950/20 border-blue-200 dark:border-blue-900/60 hover:border-blue-500 hover:ring-2 hover:ring-blue-400 hover:shadow-xl hover:shadow-blue-500/20 hover:scale-[1.02] space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-blue-700 dark:text-blue-400 uppercase">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              Trụ Cột Sản Lượng Khu Vực
            </span>
            <Layers className="w-4 h-4 text-blue-600 group-hover:scale-120 group-hover:rotate-12 transition-transform" />
          </div>
          <div className="text-base font-black text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
            {regionalInfluenceData.items[0]?.shortName} + {regionalInfluenceData.items[1]?.shortName} ({((regionalInfluenceData.items[0]?.donShare || 0) + (regionalInfluenceData.items[1]?.donShare || 0)).toFixed(1)}% Tải)
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
            Hai bưu cục đầu tàu gánh <strong>{((regionalInfluenceData.items[0]?.donShare || 0) + (regionalInfluenceData.items[1]?.donShare || 0)).toFixed(1)}%</strong> sản lượng toàn khu vực ({((regionalInfluenceData.items[0]?.totalDon || 0) + (regionalInfluenceData.items[1]?.totalDon || 0)).toLocaleString('vi-VN')} đơn &bull; {((regionalInfluenceData.items[0]?.totalTon || 0) + (regionalInfluenceData.items[1]?.totalTon || 0)).toLocaleString('vi-VN')} đơn tồn). Biến động tại đây ảnh hưởng trực tiếp tới chỉ số toàn khu vực.
          </p>
        </div>

        {/* Card 3: Lá chắn chất lượng */}
        <div className="group p-3.5 rounded-xl border transition-all duration-300 cursor-pointer bg-gradient-to-br from-emerald-50/80 to-teal-50/40 dark:from-emerald-950/40 dark:to-teal-950/20 border-emerald-200 dark:border-emerald-900/60 hover:border-emerald-500 hover:ring-2 hover:ring-emerald-400 hover:shadow-xl hover:shadow-emerald-500/20 hover:scale-[1.02] space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Lá Chắn Chất Lượng GTC
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 group-hover:scale-120 group-hover:rotate-12 transition-transform" />
          </div>
          <div className="text-base font-black text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors">
            {regionalInfluenceData.bestGtcPo?.shortName} ({regionalInfluenceData.bestGtcPo?.avgGtcRate}% GTC)
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
            Dẫn đầu tỷ lệ giao thành công toàn khu vực với <strong>{regionalInfluenceData.bestGtcPo?.avgGtcRate}% GTC</strong> ({regionalInfluenceData.bestGtcPo?.rateDiff >= 0 ? '+' : ''}{regionalInfluenceData.bestGtcPo?.rateDiff}% so với chuẩn KV), sản lượng {regionalInfluenceData.bestGtcPo?.totalDon.toLocaleString('vi-VN')} đơn, giữ nhịp chất lượng cho toàn tỉnh.
          </p>
        </div>
      </div>

      {/* 2 Khung biểu đồ song song: Cột đa trục + Donut Chart */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
        {/* Biểu đồ Đa Trục: Tỷ trọng đóng góp và Hiệu suất so với chuẩn khu vực */}
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

        {/* Biểu đồ Donut: Thị phần sức ảnh hưởng toàn khu vực */}
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

      {/* BIỂU ĐỒ PHÂN TÍCH TỒN ĐỌNG & TÁC ĐỘNG ĐẾN CHẤT LƯỢNG (%GTC) VÀ NHÂN SỰ */}
      <div className="pt-3.5 border-t border-slate-200/80 dark:border-slate-700 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="p-1 rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-600">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Biểu Đồ Tồn Đọng &amp; Áp Lực Đến Chất Lượng &amp; Nhân Sự Các Bưu Cục
              </h4>
              <span className="px-2 py-0.5 rounded-full text-[9.5px] font-black bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800 uppercase tracking-wider">
                Cảnh Báo Điểm Nghẽn Tồn Kho
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Tồn đọng cao là mắt xích trực tiếp kéo tụt %GTC và gây quá tải, kiệt sức, biến động đội ngũ bưu tá toàn khu vực
            </p>
          </div>
          <div className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold shrink-0">
            Chuẩn tồn KV: <strong className="text-rose-600 font-black">{regionalInfluenceData.avgRegionTonRate}%</strong> &bull; Tổng tồn KV: <strong className="text-rose-600 font-black">{regionalInfluenceData.totalRegionTon.toLocaleString('vi-VN')}</strong> đơn
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
          {/* Biểu đồ Cột Kép & Line: Số Đơn Tồn, Áp Lực Tồn/Bưu Tá & Tỷ Lệ Tồn */}
          <div className="xl:col-span-7 bg-slate-50/70 dark:bg-slate-750/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-tight">
                  Số Lượng Đơn Tồn, Gánh Nặng Tồn/Bưu Tá &amp; % Tỷ Lệ Tồn Kho
                </span>
                <span className="text-[10px] text-slate-400">Trục trái: Số đơn &bull; Trục phải: % Tồn / Sản lượng</span>
              </div>
              <p className="text-[11px] text-slate-500 mb-3">
                Cột đỏ thể hiện quy mô tồn đọng; Cột cam thể hiện áp lực gánh nặng bình quân lên mỗi bưu tá; Đường line thể hiện % tỷ lệ tồn kho.
              </p>
            </div>

            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={regionalInfluenceData.items} margin={{ top: 15, right: 15, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                  <XAxis dataKey="shortName" tick={{ fontSize: 11, fontWeight: 700 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
                  <YAxis 
                    yAxisId="right" 
                    orientation="right" 
                    unit="%" 
                    domain={[0, Math.ceil(Math.max(...regionalInfluenceData.items.map(i => i.tonRate), 10) * 1.3)]}
                    tick={{ fontSize: 10 }} 
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1.5 min-w-[240px]">
                          <div className="font-extrabold text-slate-900 dark:text-white text-sm border-b pb-1 flex justify-between items-center">
                            <span>{d.buuCuc}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded font-black bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                              {d.staffCount} bưu tá
                            </span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-slate-500">Đơn Tồn Đọng:</span>
                            <strong className="font-mono text-rose-600 dark:text-rose-400">{d.totalTon.toLocaleString('vi-VN')} đơn ({d.tonShare}% toàn tỉnh)</strong>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-slate-500">Tỷ Lệ Tồn / Sản Lượng:</span>
                            <strong className="font-mono text-rose-600 font-bold">{d.tonRate}%</strong>
                          </div>
                          <div className="flex justify-between gap-4 border-t pt-1">
                            <span className="text-slate-500">Áp Lực Nhân Sự:</span>
                            <strong className="font-mono text-amber-600 font-bold">{d.tonPerStaff} đơn tồn / bưu tá</strong>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-slate-500">Sản Lượng Phân Bổ:</span>
                            <span className="font-mono text-slate-700 dark:text-slate-300">{d.totalDon.toLocaleString('vi-VN')} đơn</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-slate-500">% GTC Đạt Được:</span>
                            <span className="font-mono text-emerald-600 font-bold">{d.avgGtcRate}%</span>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                  <Bar 
                    yAxisId="left" 
                    dataKey="totalTon" 
                    name="Số Đơn Tồn Đọng (đơn)" 
                    fill="#F43F5E" 
                    radius={[4, 4, 0, 0]} 
                  />
                  <Bar 
                    yAxisId="left" 
                    dataKey="tonPerStaff" 
                    name="Áp Lực Tồn / Bưu Tá (đơn/NV)" 
                    fill="#F59E0B" 
                    radius={[4, 4, 0, 0]} 
                  />
                  <Line 
                    yAxisId="right" 
                    type="monotone" 
                    dataKey="tonRate" 
                    name="% Tỷ Lệ Tồn / Sản Lượng (%)" 
                    stroke="#BE123C" 
                    strokeWidth={3} 
                    dot={{ r: 4, fill: '#BE123C', stroke: '#fff', strokeWidth: 1.5 }} 
                  />
                  <ReferenceLine 
                    yAxisId="right" 
                    y={regionalInfluenceData.avgRegionTonRate} 
                    stroke="#EF4444" 
                    strokeDasharray="4 4" 
                    strokeWidth={2}
                    label={{ 
                      value: `Chuẩn Tồn KV: ${regionalInfluenceData.avgRegionTonRate}%`, 
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

          {/* Biểu đồ Donut: Thị phần đơn tồn khu vực */}
          <div className="xl:col-span-5 bg-slate-50/70 dark:bg-slate-750/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-tight">
                  Cơ Cấu Thị Phần Đơn Tồn Khu Vực (100%)
                </span>
                <span className="text-[10px] text-slate-400">Donut Chart</span>
              </div>
              <p className="text-[11px] text-slate-500 mb-2">
                Tỷ trọng dồn ứ đơn tồn của 5 bưu cục tạo nên 100% lượng tồn toàn tỉnh Long An
              </p>
            </div>

            <div className="h-52 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={regionalInfluenceData.items}
                    dataKey="totalTon"
                    nameKey="shortName"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {regionalInfluenceData.items.map((_, index) => (
                      <Cell key={`cell-ton-${index}`} fill={PO_COLORS[index % PO_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(val, name) => [
                      `${Number(val).toLocaleString('vi-VN')} đơn tồn (${((Number(val)/regionalInfluenceData.totalRegionTon)*100).toFixed(1)}%)`,
                      name
                    ]} 
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Tâm Donut */}
              <div className="absolute text-center pointer-events-none">
                <span className="text-[9.5px] uppercase font-bold text-rose-500 block">Tổng Tồn KV</span>
                <span className="text-sm font-black text-rose-600 dark:text-rose-400 block font-mono">
                  {regionalInfluenceData.totalRegionTon.toLocaleString('vi-VN')}
                </span>
                <span className="text-[9px] text-slate-400 block">đơn tồn đọng</span>
              </div>
            </div>

            {/* 2 Khối Đánh Giá Tác Động Nhân Sự & Chất Lượng Thực Tế */}
            <div className="space-y-2 pt-2 border-t border-slate-200/80 dark:border-slate-700 text-xs">
              <div className="p-2.5 rounded-lg bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold text-rose-800 dark:text-rose-300 text-[11px] block">
                    Nút Thắt Tồn Lớn Nhất: {regionalInfluenceData.worstTonPo?.shortName}
                  </span>
                  <p className="text-[10.5px] text-slate-600 dark:text-slate-300 leading-tight">
                    Gánh <strong>{regionalInfluenceData.worstTonPo?.totalTon.toLocaleString('vi-VN')} đơn tồn</strong> (chiếm <strong>{regionalInfluenceData.worstTonPo?.tonShare}%</strong> tồn toàn tỉnh). Bình quân mỗi bưu tá gánh <strong>{regionalInfluenceData.worstTonPo?.tonPerStaff} đơn tồn</strong> trên tuyến.
                  </p>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-start gap-2">
                <TrendingDown className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold text-amber-800 dark:text-amber-300 text-[11px] block">
                    Tác Động Kép Đến %GTC &amp; Tinh Thần Nhân Sự
                  </span>
                  <p className="text-[10.5px] text-slate-600 dark:text-slate-300 leading-tight">
                    Tồn đọng cao làm ca sáng phải đi xử lý đơn cũ, trễ giờ hẹn khách dẫn đến hoàn hàng cao, kéo tụt %GTC và gây mệt mỏi, áp lực tinh thần bưu tá.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
