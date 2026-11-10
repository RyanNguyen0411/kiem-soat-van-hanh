import React, { useState, useMemo, useCallback } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Download,
  Search,
  CheckCircle2,
  Calendar,
  Building2,
  CheckSquare,
  Square,
  ExternalLink,
  Info,
  Clock
} from 'lucide-react';
import { exportToCSV } from '../../services/excelExportService';
import { normalizePostOfficeName, normalizeDate } from '../../utils/normalizationEngine';
import { 
  getISOWeekNumber, 
  extractMonths, 
  extractWeeks, 
  sortDatesDesc, 
  parseDateDDMMYYYY, 
  toTimestamp 
} from '../../utils/dateEngine';
import nhanSuFallbackSnapshot from '../../data/snapshots/nhan_su.json';
import type { DatasetState, GtcEmployeeRecord, DailySalaryRecord, NhanSuRecord } from '../../types/dashboard';

interface NhanSuOperationalAlertsCardProps {
  dataset: DatasetState;
  defaultBuuCuc?: string;
  onNavigateToEmployeeGtc?: (maNV: string, buuCuc: string) => void;
}

export const NhanSuOperationalAlertsCard: React.FC<NhanSuOperationalAlertsCardProps> = ({
  dataset,
  defaultBuuCuc = 'all',
  onNavigateToEmployeeGtc
}) => {
  // Sub-tab: Cảnh báo gán/giao thấp vs Cảnh báo nhân viên OFF
  const [activeSubTab, setActiveSubTab] = useState<'low_assign' | 'off_alert'>('low_assign');

  // Danh sách 5 bưu cục chuẩn hóa của khu vực
  const standardPostOffices = useMemo(() => [
    '(LAN) Cần Đước 1',
    '(LAN) Cần Giuộc',
    '(LAN) Phước Lý',
    '(LAN) Rạch Kiến',
    '(LAN) Tầm Vu'
  ], []);

  // Bộ lọc: Tick chọn bưu cục (Hỗ trợ chọn nhiều hoặc Tất cả)
  const [selectedPos, setSelectedPos] = useState<string[]>(() => {
    if (defaultBuuCuc && defaultBuuCuc !== 'all') {
      return [normalizePostOfficeName(defaultBuuCuc)];
    }
    return ['all'];
  });

  // Đồng bộ khi defaultBuuCuc từ ngoài thay đổi
  React.useEffect(() => {
    if (defaultBuuCuc && defaultBuuCuc !== 'all') {
      setSelectedPos([normalizePostOfficeName(defaultBuuCuc)]);
    } else {
      setSelectedPos(['all']);
    }
  }, [defaultBuuCuc]);

  // Bộ lọc: Tháng & Tuần & Tìm kiếm
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedWeek, setSelectedWeek] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Quản lý mở rộng xem chi tiết từng bưu cục (Accordion)
  const [expandedPoLowAssign, setExpandedPoLowAssign] = useState<Record<string, boolean>>({});
  const [expandedPoOff, setExpandedPoOff] = useState<Record<string, boolean>>({});
  const [expandedStaffDates, setExpandedStaffDates] = useState<Record<string, boolean>>({});

  // 1. Dữ liệu nhân sự dự phòng 2 lớp an toàn (Effective Nhan Su)
  const effectiveNhanSu = useMemo<NhanSuRecord[]>(() => {
    const live = dataset.nhanSu || [];
    if (live.length >= 50) return live;
    const snapList = (nhanSuFallbackSnapshot as unknown as NhanSuRecord[]) || [];
    if (live.length === 0) return snapList;
    const liveIds = new Set(live.map(s => s.maNV.trim()));
    const merged = [...live];
    snapList.forEach(s => {
      if (!liveIds.has(s.maNV.trim())) {
        merged.push(s);
      }
    });
    return merged;
  }, [dataset.nhanSu]);

  // Tập hợp mã nhân sự đã nghỉ việc (để loại trừ khỏi bảng OFF)
  const resignedStaffIds = useMemo(() => {
    const set = new Set<string>();
    (dataset.nghiViec || []).forEach(r => {
      const id = r.id || (r as unknown as { maNV?: string }).maNV;
      if (id) set.add(id.trim());
    });
    effectiveNhanSu.forEach(s => {
      if (s.trangThai === 'Đã thôi việc') set.add(s.maNV.trim());
    });
    return set;
  }, [dataset.nghiViec, effectiveNhanSu]);

  // Nhân sự loại trừ chuyên biệt: Nhân viên chuyên lấy tại Rạch Kiến & Quản lý/NVXL
  const isPickupSpecialist = (maNV: string, tenNV: string, buuCuc: string): boolean => {
    if (!buuCuc.includes('Rạch Kiến')) return false;
    const cleanId = (maNV || '').trim();
    return (
      cleanId === '3178591' || 
      cleanId === '3178527' || 
      (tenNV || '').includes('Võ Hoàng Phúc') || 
      (tenNV || '').includes('Lương Tuấn Minh')
    );
  };

  const isExcludedStaff = (maNV: string): boolean => {
    const cleanId = (maNV || '').trim();
    return cleanId === '3175777'; // Trần Trọng Phú (NVXL)
  };

  // 2. Thu thập tất cả các ngày vận hành thực tế trong dataset
  const allUniqueDates = useMemo(() => {
    const set = new Set<string>();
    (dataset.gtcNhanVien || []).forEach(r => { if (r.ngay) set.add(normalizeDate(r.ngay).standard || r.ngay); });
    (dataset.hoaHongNgay || []).forEach(r => { if (r.ngay) set.add(normalizeDate(r.ngay).standard || r.ngay); });
    (dataset.gtcBuuCuc || []).forEach(r => { if (r.ngay) set.add(normalizeDate(r.ngay).standard || r.ngay); });
    return sortDatesDesc(Array.from(set).filter(Boolean));
  }, [dataset.gtcNhanVien, dataset.hoaHongNgay, dataset.gtcBuuCuc]);

  // Danh sách Tháng có trong dữ liệu (sắp xếp mới nhất trước)
  const availableMonths = useMemo(() => {
    return extractMonths(allUniqueDates);
  }, [allUniqueDates]);

  // Danh sách Tuần có trong dữ liệu (lọc theo tháng nếu có)
  const availableWeeks = useMemo(() => {
    const targetDates = selectedMonth === 'all'
      ? allUniqueDates
      : allUniqueDates.filter(d => {
          const parts = d.split('/');
          if (parts.length >= 3) {
            const key = `${parts[2]}-${parts[1].padStart(2, '0')}`;
            return key === selectedMonth;
          }
          return false;
        });
    return extractWeeks(targetDates);
  }, [allUniqueDates, selectedMonth]);

  // Reset tuần khi đổi tháng mà tuần đó không còn tồn tại
  React.useEffect(() => {
    if (selectedWeek !== 'all' && !availableWeeks.some(w => w.key === selectedWeek)) {
      setSelectedWeek('all');
    }
  }, [selectedMonth, availableWeeks, selectedWeek]);

  // Tập hợp ngày khớp với bộ lọc Tháng & Tuần hiện tại
  const filteredActiveDates = useMemo(() => {
    let dates = allUniqueDates;

    // Lọc theo Tháng
    if (selectedMonth !== 'all') {
      dates = dates.filter(d => {
        const parts = d.split('/');
        if (parts.length >= 3) {
          const key = `${parts[2]}-${parts[1].padStart(2, '0')}`;
          return key === selectedMonth;
        }
        return false;
      });
    }

    // Lọc theo Tuần
    if (selectedWeek !== 'all') {
      const weekOption = availableWeeks.find(w => w.key === selectedWeek);
      if (weekOption) {
        const weekDatesSet = new Set(weekOption.dates);
        dates = dates.filter(d => weekDatesSet.has(d));
      }
    }

    return dates;
  }, [allUniqueDates, selectedMonth, selectedWeek, availableWeeks]);

  const filteredActiveDatesSet = useMemo(() => new Set(filteredActiveDates), [filteredActiveDates]);

  // Helper kiểm tra bưu cục có được chọn qua tick filter hay không
  const isPostOfficeSelected = useCallback((poName: string): boolean => {
    if (selectedPos.includes('all')) return true;
    const std = normalizePostOfficeName(poName);
    return selectedPos.includes(std);
  }, [selectedPos]);

  // Toggle tick chọn bưu cục
  const handleTogglePo = (poName: string) => {
    if (poName === 'all') {
      setSelectedPos(['all']);
      return;
    }

    let next = selectedPos.filter(p => p !== 'all');
    if (next.includes(poName)) {
      next = next.filter(p => p !== poName);
      if (next.length === 0) next = ['all'];
    } else {
      next.push(poName);
      if (next.length === standardPostOffices.length) next = ['all'];
    }
    setSelectedPos(next);
  };

  // Lookup map cho HoaHongNgay theo key `${maNV}_${ngay}`
  const hoaHongMap = useMemo(() => {
    const map = new Map<string, DailySalaryRecord>();
    (dataset.hoaHongNgay || []).forEach(h => {
      const cleanId = (h.maNV || '').trim();
      const normDate = normalizeDate(h.ngay).standard || h.ngay.trim();
      if (cleanId && normDate) {
        map.set(`${cleanId}_${normDate}`, h);
      }
    });
    return map;
  }, [dataset.hoaHongNgay]);

  // =========================================================================
  // BẢNG 1: THEO DÕI CẢNH BÁO GÁN / GIAO KHÔNG ĐẠT MỐC TỐI THIỂU
  // (Gán < 30 đơn, Giao < 20 đơn) - LOẠI TRỪ NV CHUYÊN LẤY & NV ĐÃ OFF
  // =========================================================================
  const lowAssignAlertData = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    // 1. Quét toàn bộ bản ghi GTC Nhân Viên thỏa mãn tiêu chí
    const rawViolations = (dataset.gtcNhanVien || []).filter(r => {
      const poStd = normalizePostOfficeName(r.buuCuc);
      if (!isPostOfficeSelected(poStd)) return false;

      // Khớp ngày theo bộ lọc Tháng / Tuần
      const stdDate = normalizeDate(r.ngay).standard || r.ngay;
      if (!filteredActiveDatesSet.has(stdDate)) return false;

      // Loại trừ NV chuyên lấy hàng (Rạch Kiến)
      if (isPickupSpecialist(r.maNV, r.tenNV, r.buuCuc)) return false;

      // Loại trừ quản lý / NVXL
      if (isExcludedStaff(r.maNV)) return false;

      // Loại trừ nhân viên ĐÃ OFF trong ngày đó (không phát sinh đi làm, tongDon <= 0)
      if (!r.tongDon || r.tongDon <= 0) return false;

      // Cảnh báo mốc tối thiểu khu vực: Gán < 30 HOẶC GTC < 20
      const isLowAssigned = (r.tongDon || 0) < 30;
      const isLowGtc = (r.tongDonGTC || 0) < 20;
      if (!isLowAssigned && !isLowGtc) return false;

      // Khớp từ khóa tìm kiếm
      if (query) {
        const match = r.tenNV.toLowerCase().includes(query) ||
          r.maNV.toLowerCase().includes(query) ||
          r.buuCuc.toLowerCase().includes(query);
        if (!match) return false;
      }

      return true;
    });

    // 2. Làm giàu dữ liệu với chỉ số Lấy hàng từ HoaHongNgay
    const enrichedViolations = rawViolations.map(r => {
      const cleanId = (r.maNV || '').trim();
      const stdDate = normalizeDate(r.ngay).standard || r.ngay;
      const hh = hoaHongMap.get(`${cleanId}_${stdDate}`);

      const soDonGanLay = hh ? (hh.soDonGanLay || 0) : 0;
      const donLayTinhLuong = hh ? (hh.donLayTinhLuong || 0) : 0;
      const tyLeLayTC = soDonGanLay > 0 
        ? (donLayTinhLuong / soDonGanLay) * 100 
        : (donLayTinhLuong > 0 ? 100 : 0);

      const gtcRate = r.tongDon > 0 ? (r.tongDonGTC / r.tongDon) * 100 : 0;
      const isLowAssigned = (r.tongDon || 0) < 30;
      const isLowGtc = (r.tongDonGTC || 0) < 20;

      let alertTypeLabel = '';
      if (isLowAssigned && isLowGtc) {
        alertTypeLabel = '⚠️ < 30 Gán & < 20 GTC';
      } else if (isLowAssigned) {
        alertTypeLabel = '⚠️ Gán < 30 đơn';
      } else {
        alertTypeLabel = '⚠️ GTC < 20 đơn';
      }

      return {
        ...r,
        stdDate,
        buuCucStd: normalizePostOfficeName(r.buuCuc),
        soDonGanLay,
        donLayTinhLuong,
        tyLeLayTC,
        gtcRate,
        isLowAssigned,
        isLowGtc,
        alertTypeLabel
      };
    }).sort((a, b) => toTimestamp(b.stdDate) - toTimestamp(a.stdDate) || a.tongDon - b.tongDon);

    // 3. Gom nhóm theo từng Bưu Cục
    const groupedByPo = standardPostOffices
      .filter(po => isPostOfficeSelected(po))
      .map(po => {
        const items = enrichedViolations.filter(v => v.buuCucStd === po);
        const uniqueStaff = new Set(items.map(v => v.maNV.trim()));
        const totalGan = items.reduce((s, v) => s + (v.tongDon || 0), 0);
        const totalGtc = items.reduce((s, v) => s + (v.tongDonGTC || 0), 0);
        const avgGtcRate = totalGan > 0 ? (totalGtc / totalGan) * 100 : 0;

        const totalGanLay = items.reduce((s, v) => s + v.soDonGanLay, 0);
        const totalLayTc = items.reduce((s, v) => s + v.donLayTinhLuong, 0);
        const avgLayTcRate = totalGanLay > 0 ? (totalLayTc / totalGanLay) * 100 : 0;

        const totalTonDong = items.reduce((s, v) => s + (v.tonDong || 0), 0);
        const avgLeadtime = items.length > 0 
          ? items.reduce((s, v) => s + (v.leadtime || 0), 0) / items.length 
          : 0;

        return {
          buuCuc: po,
          violationCount: items.length,
          uniqueStaffCount: uniqueStaff.size,
          totalGan,
          totalGtc,
          avgGtcRate,
          totalGanLay,
          totalLayTc,
          avgLayTcRate,
          totalTonDong,
          avgLeadtime,
          items
        };
      });

    const totalViolations = enrichedViolations.length;
    const totalUniqueStaffViolated = new Set(enrichedViolations.map(v => v.maNV.trim())).size;

    return {
      groupedByPo,
      allViolations: enrichedViolations,
      totalViolations,
      totalUniqueStaffViolated
    };
  }, [
    dataset.gtcNhanVien,
    standardPostOffices,
    isPostOfficeSelected,
    filteredActiveDatesSet,
    searchQuery,
    hoaHongMap
  ]);

  // =========================================================================
  // BẢNG 2: THEO DÕI CẢNH BÁO OFF CỦA NHÂN VIÊN TRONG THÁNG
  // QUY CHUẨN CHUYÊN CẦN AM HUY: OFF ≥ 2 NGÀY/TUẦN HOẶC OFF > 4 NGÀY/THÁNG
  // (LOẠI BỎ HOÀN TOÀN NHÂN VIÊN ĐÃ NGHỈ VIỆC KHỎI BẢNG CẢNH BÁO OFF)
  // =========================================================================
  const offTrackingAlertData = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    // 1. Danh sách nhân sự đang làm việc (đã loại trừ nhân viên đã nghỉ việc)
    const activeStaffPool = effectiveNhanSu.filter(s => {
      const cleanId = (s.maNV || '').trim();
      if (resignedStaffIds.has(cleanId)) return false;
      if (isExcludedStaff(cleanId)) return false;

      const cv = (s.chucVu || '').toLowerCase();
      const isNvpttt = s.chucVu === 'Business Development Field Executive' ||
        (!cv.includes('operations executive') &&
         !cv.includes('area manager') &&
         !cv.includes('nvxl') &&
         !cv.includes('điều phối') &&
         !cv.includes('dieu phoi'));
      if (!isNvpttt) return false;

      const poStd = normalizePostOfficeName(s.buuCuc);
      if (!isPostOfficeSelected(poStd)) return false;

      // Khớp từ khóa tìm kiếm
      if (query) {
        const match = s.tenNV.toLowerCase().includes(query) ||
          s.maNV.toLowerCase().includes(query) ||
          s.buuCuc.toLowerCase().includes(query);
        if (!match) return false;
      }

      return true;
    });

    // Lookup gtc theo mã nhân viên và ngày
    const gtcLookup = new Map<string, GtcEmployeeRecord>();
    (dataset.gtcNhanVien || []).forEach(r => {
      const cleanId = (r.maNV || '').trim();
      const stdDate = normalizeDate(r.ngay).standard || r.ngay.trim();
      if (cleanId && stdDate) {
        gtcLookup.set(`${cleanId}_${stdDate}`, r);
      }
    });

    // Helper kiểm tra một nhân viên có OFF trên một ngày cụ thể hay không
    const checkStaffOffOnDate = (staff: NhanSuRecord, dateStr: string): boolean => {
      const cleanId = staff.maNV.trim();
      const targetDateMs = toTimestamp(dateStr);
      const hireDateMs = toTimestamp(staff.ngayVaoLam);

      // Nếu ngày đối soát trước ngày vào làm của nhân viên -> Chưa vào làm, KHÔNG TÍNH OFF
      if (hireDateMs > 0 && targetDateMs > 0 && targetDateMs < hireDateMs) {
        return false;
      }

      const g = gtcLookup.get(`${cleanId}_${dateStr}`);
      const h = hoaHongMap.get(`${cleanId}_${dateStr}`);

      const hasDelivery = (g?.tongDon || 0) > 0 || 
                          (h?.soDonGanGiao || 0) > 0 || 
                          (h?.donGiaoTinhLuong || 0) > 0;

      const hasPickup = (h?.soDonGanLay || 0) > 0 || 
                        (h?.donLayTinhLuong || 0) > 0;

      const income = (h?.luongHHNgay || 0) + (h?.tongLuong || 0);
      const workDays = h?.soNgayDiLam || 0;

      // 1. Không phát sinh đơn giao hoặc đơn lấy -> Ghi nhận OFF
      if (!hasDelivery && !hasPickup) return true;

      // 2. Không phát sinh thu nhập và ngày công = 0 -> Ghi nhận OFF
      if (income <= 0 && workDays <= 0 && (g?.tongDon || 0) <= 0) return true;

      return false;
    };

    // 2. Tính toán số ngày OFF, cảnh báo tuần và chỉ số vận hành cho từng nhân viên
    const staffSummaries = activeStaffPool.map(staff => {
      const cleanId = staff.maNV.trim();
      const poStd = normalizePostOfficeName(staff.buuCuc);
      const hireDateMs = toTimestamp(staff.ngayVaoLam);

      // Ngày vận hành trong kỳ lọc mà nhân viên đã gia nhập công ty
      const applicableDates = filteredActiveDates.filter(d => {
        if (!hireDateMs) return true;
        return toTimestamp(d) >= hireDateMs;
      });

      const offDates: string[] = [];
      const workedDates: string[] = [];
      const weekOffCounter: Record<string, number> = {};

      applicableDates.forEach(dStr => {
        const isOff = checkStaffOffOnDate(staff, dStr);
        const parsedD = parseDateDDMMYYYY(dStr);
        const weekKey = parsedD ? `Tuần ${getISOWeekNumber(parsedD)}` : 'Tuần';

        if (!weekOffCounter[weekKey]) weekOffCounter[weekKey] = 0;

        if (isOff) {
          offDates.push(dStr);
          weekOffCounter[weekKey]++;
        } else {
          workedDates.push(dStr);
        }
      });

      // =======================================================================
      // LOGIC CẢNH BÁO CHUYÊN CẦN CHUẨN HÓA THEO QUY CHẾ AM HUY:
      // Nếu OFF 2 ngày trong cùng 1 tuần (count >= 2)
      // HOẶC OFF hơn 4 ngày trong cùng 1 tháng (totalOffDays > 4)
      // ĐỀU BỊ ĐÁNH GIÁ LÀ KHÔNG ĐẠT CHUYÊN CẦN
      // =======================================================================
      const warningWeeks = Object.entries(weekOffCounter)
        .filter(([, count]) => count >= 2)
        .map(([w, count]) => `${w} (${count} ngày OFF)`);

      const hasWeeklyOffWarning = warningWeeks.length > 0;
      const hasMonthlyOffWarning = offDates.length > 4;
      const hasChuyenCanWarning = hasWeeklyOffWarning || hasMonthlyOffWarning;

      let chuyenCanBadgeText = 'Đạt chuẩn';
      if (hasWeeklyOffWarning && hasMonthlyOffWarning) {
        chuyenCanBadgeText = `⚠️ ${warningWeeks[0]} & Tháng ${offDates.length}N (>4N)`;
      } else if (hasWeeklyOffWarning) {
        chuyenCanBadgeText = `⚠️ ${warningWeeks.join(', ')}`;
      } else if (hasMonthlyOffWarning) {
        chuyenCanBadgeText = `⚠️ Tháng ${offDates.length} ngày OFF (>4N)`;
      }

      // Tổng hợp chỉ số vận hành trên các ngày đi làm thực tế
      let sumGan = 0;
      let sumGtc = 0;
      let sumGanLay = 0;
      let sumLayTc = 0;
      let sumLuong = 0;

      // Chi tiết từng ngày để mở rộng drilldown
      const dailyDetails = applicableDates.map((dStr, idx) => {
        const isOff = offDates.includes(dStr);
        const g = gtcLookup.get(`${cleanId}_${dStr}`);
        const h = hoaHongMap.get(`${cleanId}_${dStr}`);

        const gan = g ? (g.tongDon || 0) : 0;
        const gtc = g ? (g.tongDonGTC || 0) : 0;
        const gtcPct = gan > 0 ? (gtc / gan) * 100 : 0;

        const ganLay = h ? (h.soDonGanLay || 0) : 0;
        const layTc = h ? (h.donLayTinhLuong || 0) : 0;
        const layTcPct = ganLay > 0 ? (layTc / ganLay) * 100 : (layTc > 0 ? 100 : 0);

        const luong = h ? ((h.luongHHNgay || 0) + (h.tongLuong || 0)) : 0;
        const donGiaTb = (gtc + layTc) > 0 ? luong / (gtc + layTc) : 0;

        if (!isOff) {
          sumGan += gan;
          sumGtc += gtc;
          sumGanLay += ganLay;
          sumLayTc += layTc;
          if (luong > 0) {
            sumLuong += luong;
          }
        }

        return {
          stt: idx + 1,
          ngay: dStr,
          isOff,
          statusText: isOff ? 'OFF Ngày' : 'Đi làm',
          gan,
          gtc,
          gtcPct,
          ganLay,
          layTc,
          layTcPct,
          luong,
          donGiaTb
        };
      }).sort((a, b) => toTimestamp(b.ngay) - toTimestamp(a.ngay));

      const avgGtcRate = sumGan > 0 ? (sumGtc / sumGan) * 100 : 0;
      const avgLayTcRate = sumGanLay > 0 ? (sumLayTc / sumGanLay) * 100 : 0;
      const avgSalaryPerDay = workedDates.length > 0 ? sumLuong / workedDates.length : 0;
      const avgUnitPrice = (sumGtc + sumLayTc) > 0 ? sumLuong / (sumGtc + sumLayTc) : 0;

      return {
        maNV: staff.maNV,
        tenNV: staff.tenNV,
        buuCuc: staff.buuCuc,
        buuCucStd: poStd,
        chucVu: staff.chucVu,
        loaiHD: staff.loaiHD || 'HĐLĐ',
        nhomThamNien: staff.nhomThamNien,
        ngayVaoLam: staff.ngayVaoLam,
        totalApplicableDays: applicableDates.length,
        totalOffDays: offDates.length,
        totalWorkedDays: workedDates.length,
        offDates,
        hasWeeklyOffWarning,
        hasMonthlyOffWarning,
        hasChuyenCanWarning,
        chuyenCanBadgeText,
        warningWeeks,
        sumGan,
        sumGtc,
        avgGtcRate,
        sumGanLay,
        sumLayTc,
        avgLayTcRate,
        sumLuong,
        avgSalaryPerDay,
        avgUnitPrice,
        dailyDetails
      };
    }).sort((a, b) => {
      // Ưu tiên nhân viên không đạt chuyên cần lên đầu, sau đó theo số ngày OFF giảm dần
      if (a.hasChuyenCanWarning && !b.hasChuyenCanWarning) return -1;
      if (!a.hasChuyenCanWarning && b.hasChuyenCanWarning) return 1;
      return b.totalOffDays - a.totalOffDays;
    });

    // 3. Gom nhóm theo từng Bưu Cục
    const groupedByPo = standardPostOffices
      .filter(po => isPostOfficeSelected(po))
      .map(po => {
        const staffInPo = staffSummaries.filter(s => s.buuCucStd === po);
        const totalRoster = staffInPo.length;
        const staffWithOff = staffInPo.filter(s => s.totalOffDays > 0);
        const totalOffDaysInPo = staffInPo.reduce((s, x) => s + x.totalOffDays, 0);
        const totalWorkedDaysInPo = staffInPo.reduce((s, x) => s + x.totalWorkedDays, 0);
        const totalPossibleDays = totalOffDaysInPo + totalWorkedDaysInPo;
        const attendanceRate = totalPossibleDays > 0 
          ? (totalWorkedDaysInPo / totalPossibleDays) * 100 
          : 100;

        const warnedStaffList = staffInPo.filter(s => s.hasChuyenCanWarning);

        return {
          buuCuc: po,
          totalRoster,
          staffWithOffCount: staffWithOff.length,
          totalOffDaysInPo,
          attendanceRate,
          warnedStaffCount: warnedStaffList.length,
          staffList: staffInPo
        };
      });

    const totalStaffTracked = staffSummaries.length;
    const totalWarnedStaff = staffSummaries.filter(s => s.hasChuyenCanWarning).length;
    const totalOffDaysAll = staffSummaries.reduce((s, x) => s + x.totalOffDays, 0);

    return {
      groupedByPo,
      allStaff: staffSummaries,
      totalStaffTracked,
      totalWarnedStaff,
      totalOffDaysAll
    };
  }, [
    effectiveNhanSu,
    resignedStaffIds,
    standardPostOffices,
    isPostOfficeSelected,
    filteredActiveDates,
    searchQuery,
    dataset.gtcNhanVien,
    hoaHongMap
  ]);

  // Toggle mở rộng bưu cục trong bảng 1
  const togglePoLowAssign = (po: string) => {
    setExpandedPoLowAssign(prev => ({ ...prev, [po]: !prev[po] }));
  };

  // Toggle mở rộng bưu cục trong bảng 2
  const togglePoOff = (po: string) => {
    setExpandedPoOff(prev => ({ ...prev, [po]: !prev[po] }));
  };

  // Toggle mở rộng chi tiết ngày của nhân viên trong bảng 2
  const toggleStaffDates = (maNV: string) => {
    setExpandedStaffDates(prev => ({ ...prev, [maNV]: !prev[maNV] }));
  };

  // =========================================================================
  // XUẤT EXCEL THEO TAB ĐANG XEM
  // =========================================================================
  const handleExportData = () => {
    if (activeSubTab === 'low_assign') {
      const headers = [
        'STT',
        'Bưu Cục',
        'Ngày',
        'Mã NV',
        'Họ & Tên',
        'SLĐ Gán',
        'SLĐ GTC',
        '% GTC',
        'SLĐ Gán Lấy',
        'Lấy TC',
        '% Lấy TC',
        'Leadtime (giờ)',
        'Chuyến Đi',
        'Tồn Đọng',
        'Loại Cảnh Báo'
      ];
      const rows = lowAssignAlertData.allViolations.map((v, i) => [
        i + 1,
        v.buuCucStd,
        v.stdDate,
        v.maNV,
        v.tenNV,
        v.tongDon,
        v.tongDonGTC,
        `${v.gtcRate.toFixed(1)}%`,
        v.soDonGanLay,
        v.donLayTinhLuong,
        `${v.tyLeLayTC.toFixed(1)}%`,
        v.leadtime ? v.leadtime.toFixed(1) : '0',
        v.chuyenDi || 1,
        v.tonDong || 0,
        v.alertTypeLabel
      ]);
      exportToCSV(`Canh_Bao_Gan_Giao_Duoi_Moc_${selectedMonth}_${selectedWeek}`, headers, rows);
    } else {
      const headers = [
        'STT',
        'Bưu Cục',
        'Mã NV',
        'Họ & Tên',
        'Chức Vụ',
        'Loại HĐ',
        'Tổng Ngày OFF',
        'Cảnh Báo Chuyên Cần (≥2N/tuần hoặc >4N/tháng)',
        'Tổng SLĐ Gán',
        'Tổng SLĐ GTC',
        '% GTC',
        'SLĐ Gán Lấy',
        'Lấy TC',
        '% Lấy TC',
        'Lương Bình Quân (đ/ngày)',
        'Đơn Giá Bình Quân (đ/đơn)'
      ];
      const rows = offTrackingAlertData.allStaff.map((s, i) => [
        i + 1,
        s.buuCucStd,
        s.maNV,
        s.tenNV,
        s.chucVu,
        s.loaiHD,
        s.totalOffDays,
        s.hasChuyenCanWarning ? s.chuyenCanBadgeText.replace('⚠️ ', '') : 'Đạt chuẩn',
        s.sumGan,
        s.sumGtc,
        `${s.avgGtcRate.toFixed(1)}%`,
        s.sumGanLay,
        s.sumLayTc,
        `${s.avgLayTcRate.toFixed(1)}%`,
        Math.round(s.avgSalaryPerDay),
        Math.round(s.avgUnitPrice)
      ]);
      exportToCSV(`Canh_Bao_Chuyen_Can_Nhan_Vien_OFF_${selectedMonth}_${selectedWeek}`, headers, rows);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-900/60 rounded-xl shadow-xs overflow-hidden transition-all">
      
      {/* 1. HEADER CARD: TIÊU ĐỀ & 2 SUB-TAB CHUYỂN ĐỔI (TỐI GIẢN & THU GỌN THEO ẢNH ĐÍNH KÈM) */}
      <div className="p-2.5 sm:p-3 bg-gradient-to-r from-indigo-50/70 via-white to-orange-50/50 dark:from-slate-800 dark:via-slate-800 dark:to-slate-750 border-b border-indigo-100 dark:border-slate-700">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
          
          {/* Tiêu đề chính tinh gọn */}
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-gradient-to-br from-indigo-600 to-indigo-800 text-white rounded-lg shadow-2xs shrink-0">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wide">
                  Trung Tâm Giám Sát &amp; Cảnh Báo Vận Hành Nhân Sự
                </h2>
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                  AM Huy (ĐNB)
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                Bảo vệ kỷ luật tuyến phát: Cảnh báo gán/giao không đạt chuẩn &amp; Kiểm soát tần suất nghỉ OFF theo tháng/tuần
              </p>
            </div>
          </div>

          {/* 2 Sub-Tabs Chuyển Đổi với Badge Bộ Đếm - Layout Tinh Gọn */}
          <div className="flex items-center gap-1.5 self-start lg:self-auto bg-slate-100 dark:bg-slate-900/80 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
            {/* Tab 1 */}
            <button
              type="button"
              onClick={() => setActiveSubTab('low_assign')}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === 'low_assign'
                  ? 'bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-300 shadow-2xs border border-amber-200 dark:border-amber-900/60'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Cảnh Báo Gán/Giao Thấp (&lt;30/&lt;20)</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                activeSubTab === 'low_assign'
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}>
                {lowAssignAlertData.totalViolations}
              </span>
            </button>

            {/* Tab 2 */}
            <button
              type="button"
              onClick={() => setActiveSubTab('off_alert')}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === 'off_alert'
                  ? 'bg-white dark:bg-slate-800 text-rose-700 dark:text-rose-300 shadow-2xs border border-rose-200 dark:border-rose-900/60'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              <span>Cảnh Báo Chuyên Cần &amp; OFF</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                activeSubTab === 'off_alert'
                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}>
                {offTrackingAlertData.totalWarnedStaff} NV
              </span>
            </button>
          </div>

        </div>

        {/* 2. BỘ LỌC ĐA NĂNG: BƯU CỤC (TICK CHỌN), THÁNG, TUẦN, TÌM KIẾM & XUẤT EXCEL - GỌN GÀNG TỐI ƯU */}
        <div className="mt-2.5 pt-2 border-t border-slate-200/80 dark:border-slate-700 space-y-2">
          
          {/* Hàng 1: Tick chọn bưu cục */}
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
              <Building2 className="w-3 h-3 text-indigo-500" />
              Bưu Cục:
            </span>

            {/* Nút Tất cả */}
            <button
              type="button"
              onClick={() => handleTogglePo('all')}
              className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                selectedPos.includes('all')
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-slate-100 dark:bg-slate-750 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {selectedPos.includes('all') ? (
                <CheckSquare className="w-3 h-3" />
              ) : (
                <Square className="w-3 h-3" />
              )}
              <span>Tất cả 5 bưu cục</span>
            </button>

            {/* Các bưu cục chi tiết */}
            {standardPostOffices.map(po => {
              const isChecked = selectedPos.includes('all') || selectedPos.includes(po);
              return (
                <button
                  key={po}
                  type="button"
                  onClick={() => handleTogglePo(po)}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    isChecked && !selectedPos.includes('all')
                      ? 'bg-indigo-600 text-white shadow-2xs ring-1 ring-indigo-400'
                      : isChecked
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                        : 'bg-slate-100 dark:bg-slate-750 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {isChecked ? (
                    <CheckSquare className="w-3 h-3" />
                  ) : (
                    <Square className="w-3 h-3" />
                  )}
                  <span>{po.replace('(LAN) ', '')}</span>
                </button>
              );
            })}
          </div>

          {/* Hàng 2: Tick chọn Tháng, Tick chọn Tuần, Tìm Kiếm & Nút Xuất Excel */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            
            <div className="flex flex-wrap items-center gap-1.5">
              {/* Tick chọn Tháng */}
              <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 h-7">
                <Calendar className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                <span className="text-[10px] font-bold text-slate-500">Tháng:</span>
                <select
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(e.target.value)}
                  className="bg-transparent text-[11px] font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
                >
                  <option value="all">Tất cả các tháng</option>
                  {availableMonths.map(m => (
                    <option key={m.key} value={m.key}>{m.label}</option>
                  ))}
                </select>
              </div>

              {/* Tick chọn Tuần */}
              <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 h-7">
                <Clock className="w-3 h-3 text-orange-600 dark:text-orange-400" />
                <span className="text-[10px] font-bold text-slate-500">Tuần:</span>
                <select
                  value={selectedWeek}
                  onChange={e => setSelectedWeek(e.target.value)}
                  className="bg-transparent text-[11px] font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
                >
                  <option value="all">Tất cả tuần</option>
                  {availableWeeks.map(w => (
                    <option key={w.key} value={w.key}>{w.label}</option>
                  ))}
                </select>
              </div>

              {/* Thông tin số ngày áp dụng */}
              <span className="text-[10px] text-slate-500 hidden sm:inline">
                ({filteredActiveDates.length} ngày vận hành)
              </span>
            </div>

            {/* Tìm kiếm & Xuất Excel */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-44">
                <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Tìm mã NV, tên..."
                  className="w-full pl-7 pr-2 text-[11px] h-7 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-200"
                />
              </div>

              <button
                type="button"
                onClick={handleExportData}
                className="inline-flex items-center gap-1 px-2.5 h-7 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md shadow-2xs transition-all whitespace-nowrap cursor-pointer"
                title="Xuất Excel toàn bộ dữ liệu bảng cảnh báo theo bộ lọc"
              >
                <Download className="w-3 h-3" />
                <span>Xuất Excel</span>
              </button>
            </div>

          </div>

          {/* Hộp ghi chú quy chế vận hành - RÚT GỌN 1 DÒNG DUY NHẤT (THEO ẢNH ĐÍNH KÈM) */}
          {activeSubTab === 'low_assign' ? (
            <div className="p-1 px-2.5 bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-md flex items-center gap-1.5 text-[10.5px] text-amber-900 dark:text-amber-200">
              <Info className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="truncate">
                <strong>Mức tối thiểu khu vực:</strong> Gán &ge; 30 đơn &bull; GTC &ge; 20 đơn/ngày. Loại trừ NV chuyên lấy (Rạch Kiến) &amp; NV đã OFF.
              </span>
            </div>
          ) : (
            <div className="p-1 px-2.5 bg-rose-50/80 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-md flex items-center gap-1.5 text-[10.5px] text-rose-900 dark:text-rose-200">
              <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
              <span className="truncate">
                <strong>Quy chế chuyên cần khu vực:</strong> Không đạt khi <b>1 tuần OFF &ge; 2 ngày</b> hoặc <b>1 tháng OFF &gt; 4 ngày</b> (đã loại trừ nhân viên thôi việc).
              </span>
            </div>
          )}

        </div>

      </div>

      {/* 3. NỘI DUNG BẢNG 1 HOẶC BẢNG 2 THEO SUB-TAB (STICKY HEADER + DỮ LIỆU CÙNG 1 HÀNG) */}
      <div className="p-2.5 sm:p-3">
        
        {/* =========================================================================
            SUB-TAB 1: BẢNG THEO DÕI CẢNH BÁO GÁN/GIAO KHÔNG ĐẠT MỐC TỐI THIỂU
            ========================================================================= */}
        {activeSubTab === 'low_assign' && (
          <div className="space-y-2.5">
            
            {/* Danh sách thẻ từng Bưu Cục có thể mở rộng */}
            {lowAssignAlertData.groupedByPo.map(poGroup => {
              const isExpanded = Boolean(expandedPoLowAssign[poGroup.buuCuc]);
              const hasViolations = poGroup.violationCount > 0;

              return (
                <div 
                  key={poGroup.buuCuc}
                  className={`rounded-lg border transition-all overflow-hidden ${
                    hasViolations
                      ? 'border-amber-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xs'
                      : 'border-slate-200 dark:border-slate-750 bg-slate-50/60 dark:bg-slate-800/60 opacity-90'
                  }`}
                >
                  {/* Header bưu cục gọn gàng */}
                  <div 
                    onClick={() => togglePoLowAssign(poGroup.buuCuc)}
                    className="p-2.5 flex flex-col md:flex-row md:items-center justify-between gap-2 cursor-pointer hover:bg-amber-50/40 dark:hover:bg-slate-750 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${hasViolations ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wide">
                            {poGroup.buuCuc}
                          </h3>
                          <span className={`px-1.5 py-0.2 rounded-full text-[9.5px] font-black ${
                            hasViolations
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          }`}>
                            {poGroup.violationCount} lượt vi phạm ({poGroup.uniqueStaffCount} NV)
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Gán: <b>{poGroup.totalGan.toLocaleString()}</b> &bull; GTC: <b>{poGroup.totalGtc.toLocaleString()}</b> ({poGroup.avgGtcRate.toFixed(1)}%) &bull; Gán lấy: <b>{poGroup.totalGanLay.toLocaleString()}</b> &bull; Lấy TC: <b>{poGroup.totalLayTc.toLocaleString()}</b> ({poGroup.avgLayTcRate.toFixed(1)}%)
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-auto">
                      <div className="text-right text-[10px] text-slate-600 dark:text-slate-300 hidden sm:block">
                        <div>Tồn đọng: <b className="text-rose-600 dark:text-rose-400">{poGroup.totalTonDong}</b> đơn &bull; Leadtime: <b>{poGroup.avgLeadtime.toFixed(1)}h</b></div>
                      </div>

                      <button
                        type="button"
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold transition-all ${
                          isExpanded
                            ? 'bg-amber-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span>{isExpanded ? 'Thu gọn' : `Chi tiết (${poGroup.violationCount})`}</span>
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>

                  {/* Bảng chi tiết từng lượt nhân viên vi phạm khi mở rộng (STICKY HEADER + DỮ LIỆU CÙNG 1 HÀNG) */}
                  {isExpanded && (
                    <div className="p-2.5 border-t border-amber-100 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/60">
                      {poGroup.items.length === 0 ? (
                        <div className="py-3 text-center text-xs text-emerald-700 dark:text-emerald-400 font-semibold flex items-center justify-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Bưu cục {poGroup.buuCuc} không có nhân viên nào bị cảnh báo gán/giao thấp trong giai đoạn này.</span>
                        </div>
                      ) : (
                        <div className="overflow-x-auto max-h-[460px] overflow-y-auto rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xs">
                          <table className="w-full text-xs text-left border-collapse">
                            {/* CỐ ĐỊNH TIÊU ĐỀ: STICKY THEAD - CHỈ TIÊU ĐỀ MỚI ĐƯỢC NGẮT DÒNG */}
                            <thead className="bg-amber-50/95 dark:bg-slate-850 backdrop-blur-xs text-amber-900 dark:text-amber-200 font-bold border-b border-amber-200 dark:border-slate-700 sticky top-0 z-10 shadow-2xs">
                              <tr>
                                <th className="py-2 px-2 text-center w-10 whitespace-normal break-words leading-tight align-middle">STT</th>
                                <th className="py-2 px-2.5 text-center whitespace-normal break-words leading-tight align-middle">Ngày</th>
                                <th className="py-2 px-2.5 text-center whitespace-normal break-words leading-tight align-middle">Mã NV</th>
                                <th className="py-2 px-3 whitespace-normal break-words leading-tight align-middle">Họ &amp; Tên</th>
                                <th className="py-2 px-2 text-center bg-amber-100/60 dark:bg-amber-900/40 whitespace-normal break-words leading-tight align-middle">SLĐ Gán (&lt;30)</th>
                                <th className="py-2 px-2 text-center bg-rose-100/60 dark:bg-rose-900/40 whitespace-normal break-words leading-tight align-middle">SLĐ GTC (&lt;20)</th>
                                <th className="py-2 px-2 text-center whitespace-normal break-words leading-tight align-middle">% GTC</th>
                                <th className="py-2 px-2 text-center whitespace-normal break-words leading-tight align-middle">SLĐ Lấy</th>
                                <th className="py-2 px-2 text-center whitespace-normal break-words leading-tight align-middle">Lấy TC</th>
                                <th className="py-2 px-2 text-center whitespace-normal break-words leading-tight align-middle">% Lấy TC</th>
                                <th className="py-2 px-2 text-center whitespace-normal break-words leading-tight align-middle">Leadtime</th>
                                <th className="py-2 px-2 text-center whitespace-normal break-words leading-tight align-middle">Chuyến Đi</th>
                                <th className="py-2 px-2 text-center whitespace-normal break-words leading-tight align-middle">Tồn Đọng</th>
                                <th className="py-2 px-2.5 text-center whitespace-normal break-words leading-tight align-middle">Loại Cảnh Báo</th>
                              </tr>
                            </thead>
                            {/* DỮ LIỆU CHI TIẾT: BẮT BUỘC CÙNG 1 HÀNG (WHITESPACE-NOWRAP) */}
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-750 text-slate-700 dark:text-slate-200">
                              {poGroup.items.map((v, idx) => (
                                <tr key={`${v.maNV}_${v.stdDate}_${idx}`} className="hover:bg-amber-50/30 dark:hover:bg-slate-750 transition-colors">
                                  <td className="py-1.5 px-2 text-center text-slate-400 font-medium whitespace-nowrap align-middle">
                                    {idx + 1}
                                  </td>
                                  <td className="py-1.5 px-2.5 text-center font-mono text-[11px] font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap align-middle">
                                    {v.stdDate}
                                  </td>
                                  <td className="py-1.5 px-2.5 text-center font-mono font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap align-middle">
                                    {v.maNV}
                                  </td>
                                  <td className="py-1.5 px-3 font-bold text-slate-900 dark:text-white whitespace-nowrap align-middle">
                                    {v.tenNV}
                                  </td>
                                  
                                  {/* SLĐ Gán */}
                                  <td className="py-1.5 px-2 text-center font-bold whitespace-nowrap align-middle">
                                    <span className={`px-1.5 py-0.2 rounded text-[11px] font-black ${
                                      v.isLowAssigned
                                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                        : 'text-slate-800 dark:text-slate-200'
                                    }`}>
                                      {v.tongDon}
                                    </span>
                                  </td>

                                  {/* SLĐ GTC */}
                                  <td className="py-1.5 px-2 text-center font-bold whitespace-nowrap align-middle">
                                    <span className={`px-1.5 py-0.2 rounded text-[11px] font-black ${
                                      v.isLowGtc
                                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                        : 'text-slate-800 dark:text-slate-200'
                                    }`}>
                                      {v.tongDonGTC}
                                    </span>
                                  </td>

                                  {/* % GTC */}
                                  <td className="py-1.5 px-2 text-center font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap align-middle">
                                    {v.gtcRate.toFixed(1)}%
                                  </td>

                                  {/* Lấy Hàng */}
                                  <td className="py-1.5 px-2 text-center text-slate-600 dark:text-slate-400 whitespace-nowrap align-middle">
                                    {v.soDonGanLay}
                                  </td>
                                  <td className="py-1.5 px-2 text-center font-bold text-purple-600 dark:text-purple-400 whitespace-nowrap align-middle">
                                    {v.donLayTinhLuong}
                                  </td>
                                  <td className="py-1.5 px-2 text-center text-slate-600 dark:text-slate-400 whitespace-nowrap align-middle">
                                    {v.soDonGanLay > 0 ? `${v.tyLeLayTC.toFixed(1)}%` : '-'}
                                  </td>

                                  {/* Chỉ số vận hành */}
                                  <td className="py-1.5 px-2 text-center text-slate-600 dark:text-slate-400 whitespace-nowrap align-middle">
                                    {v.leadtime ? `${v.leadtime.toFixed(1)}h` : '-'}
                                  </td>
                                  <td className="py-1.5 px-2 text-center text-slate-600 dark:text-slate-400 whitespace-nowrap align-middle">
                                    {v.chuyenDi || 1}
                                  </td>
                                  <td className="py-1.5 px-2 text-center font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap align-middle">
                                    {v.tonDong || 0}
                                  </td>

                                  {/* Badge Loại cảnh báo */}
                                  <td className="py-1.5 px-2.5 text-center whitespace-nowrap align-middle">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black inline-block whitespace-nowrap ${
                                      v.isLowAssigned && v.isLowGtc
                                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300'
                                        : v.isLowAssigned
                                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300'
                                          : 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 border border-orange-300'
                                    }`}>
                                      {v.alertTypeLabel}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

          </div>
        )}

        {/* =========================================================================
            SUB-TAB 2: BẢNG THEO DÕI CẢNH BÁO OFF & CHUYÊN CẦN CỦA NHÂN VIÊN
            (QUY CHUẨN: OFF ≥ 2 NGÀY/TUẦN HOẶC OFF > 4 NGÀY/THÁNG)
            ========================================================================= */}
        {activeSubTab === 'off_alert' && (
          <div className="space-y-2.5">
            
            {/* Danh sách thẻ từng Bưu Cục */}
            {offTrackingAlertData.groupedByPo.map(poGroup => {
              const isExpanded = Boolean(expandedPoOff[poGroup.buuCuc]);
              const hasWarnedStaff = poGroup.warnedStaffCount > 0;

              return (
                <div 
                  key={poGroup.buuCuc}
                  className={`rounded-lg border transition-all overflow-hidden ${
                    hasWarnedStaff
                      ? 'border-rose-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xs'
                      : 'border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800'
                  }`}
                >
                  {/* Header bưu cục gọn gàng */}
                  <div 
                    onClick={() => togglePoOff(poGroup.buuCuc)}
                    className="p-2.5 flex flex-col md:flex-row md:items-center justify-between gap-2 cursor-pointer hover:bg-rose-50/40 dark:hover:bg-slate-750 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${hasWarnedStaff ? 'bg-rose-500 animate-pulse' : 'bg-indigo-500'}`}></span>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wide">
                            {poGroup.buuCuc}
                          </h3>
                          <span className="px-1.5 py-0.2 rounded-full text-[9.5px] font-black bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                            {poGroup.totalRoster} NVPTTT
                          </span>
                          {hasWarnedStaff && (
                            <span className="px-1.5 py-0.2 rounded-full text-[9.5px] font-black bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300">
                              ⚠️ {poGroup.warnedStaffCount} NV không đạt chuyên cần
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Có <b>{poGroup.staffWithOffCount} NV</b> phát sinh ngày OFF &bull; Tổng ngày OFF: <b className="text-rose-600 dark:text-rose-400">{poGroup.totalOffDaysInPo} ngày</b> &bull; Chuyên cần bưu cục: <b className="text-emerald-600 dark:text-emerald-400">{poGroup.attendanceRate.toFixed(1)}%</b>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-auto">
                      <button
                        type="button"
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold transition-all ${
                          isExpanded
                            ? 'bg-rose-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span>{isExpanded ? 'Thu gọn' : `Xem ${poGroup.totalRoster} nhân sự`}</span>
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>

                  {/* Bảng chi tiết nhân viên trong bưu cục khi mở rộng (STICKY HEADER + DỮ LIỆU CÙNG 1 HÀNG) */}
                  {isExpanded && (
                    <div className="p-2.5 border-t border-rose-100 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/60 space-y-2">
                      <div className="overflow-x-auto max-h-[480px] overflow-y-auto rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xs">
                        <table className="w-full text-xs text-left border-collapse">
                          {/* CỐ ĐỊNH TIÊU ĐỀ: STICKY THEAD - CHỈ TIÊU ĐỀ MỚI ĐƯỢC NGẮT DÒNG */}
                          <thead className="bg-rose-50/95 dark:bg-slate-850 backdrop-blur-xs text-rose-900 dark:text-rose-200 font-bold border-b border-rose-200 dark:border-slate-700 sticky top-0 z-10 shadow-2xs">
                            <tr>
                              <th className="py-2 px-2 text-center w-10 whitespace-normal break-words leading-tight align-middle">STT</th>
                              <th className="py-2 px-2.5 text-center whitespace-normal break-words leading-tight align-middle">Mã NV</th>
                              <th className="py-2 px-3 whitespace-normal break-words leading-tight align-middle">Họ &amp; Tên</th>
                              <th className="py-2 px-2 text-center whitespace-normal break-words leading-tight align-middle">Hợp Đồng</th>
                              <th className="py-2 px-2.5 text-center bg-rose-100/60 dark:bg-rose-900/40 whitespace-normal break-words leading-tight align-middle">Tổng Ngày OFF</th>
                              <th className="py-2 px-3 text-center whitespace-normal break-words leading-tight align-middle">Cảnh Báo Chuyên Cần</th>
                              <th className="py-2 px-2 text-center whitespace-normal break-words leading-tight align-middle">SLĐ Gán</th>
                              <th className="py-2 px-2 text-center whitespace-normal break-words leading-tight align-middle">SLĐ GTC</th>
                              <th className="py-2 px-2 text-center whitespace-normal break-words leading-tight align-middle">% GTC</th>
                              <th className="py-2 px-2 text-center whitespace-normal break-words leading-tight align-middle">SLĐ Lấy</th>
                              <th className="py-2 px-2 text-center whitespace-normal break-words leading-tight align-middle">Lấy TC</th>
                              <th className="py-2 px-2 text-center whitespace-normal break-words leading-tight align-middle">% Lấy TC</th>
                              <th className="py-2 px-2.5 text-center bg-emerald-50/70 dark:bg-emerald-950/40 whitespace-normal break-words leading-tight align-middle">Lương TB/Ngày</th>
                              <th className="py-2 px-2.5 text-center bg-purple-50/70 dark:bg-purple-950/40 whitespace-normal break-words leading-tight align-middle">Đơn Giá TB</th>
                              <th className="py-2 px-2 text-center whitespace-normal break-words leading-tight align-middle">Chi Tiết Ngày</th>
                            </tr>
                          </thead>
                          {/* DỮ LIỆU CHI TIẾT: BẮT BUỘC CÙNG 1 HÀNG (WHITESPACE-NOWRAP) */}
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-750 text-slate-700 dark:text-slate-200">
                            {poGroup.staffList.map((staff, idx) => {
                              const isStaffExpanded = Boolean(expandedStaffDates[staff.maNV]);

                              return (
                                <React.Fragment key={staff.maNV}>
                                  <tr className={`hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors ${
                                    staff.hasChuyenCanWarning ? 'bg-rose-50/25 dark:bg-rose-950/15' : ''
                                  }`}>
                                    <td className="py-1.5 px-2 text-center text-slate-400 font-medium whitespace-nowrap align-middle">
                                      {idx + 1}
                                    </td>
                                    <td className="py-1.5 px-2.5 text-center font-mono font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap align-middle">
                                      {staff.maNV}
                                    </td>
                                    <td className="py-1.5 px-3 font-bold text-slate-900 dark:text-white whitespace-nowrap align-middle">
                                      {staff.tenNV}
                                    </td>
                                    <td className="py-1.5 px-2 text-center whitespace-nowrap align-middle">
                                      <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                        {staff.loaiHD}
                                      </span>
                                    </td>

                                    {/* Tổng ngày OFF */}
                                    <td className="py-1.5 px-2.5 text-center font-bold whitespace-nowrap align-middle">
                                      <span className={`px-1.5 py-0.2 rounded text-[11px] font-black ${
                                        staff.totalOffDays > 0
                                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                          : 'text-slate-500'
                                      }`}>
                                        {staff.totalOffDays} ngày
                                      </span>
                                    </td>

                                    {/* Cảnh báo chuyên cần (≥2N/tuần HOẶC >4N/tháng) */}
                                    <td className="py-1.5 px-3 text-center whitespace-nowrap align-middle">
                                      {staff.hasChuyenCanWarning ? (
                                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white shadow-2xs whitespace-nowrap">
                                          {staff.chuyenCanBadgeText}
                                        </span>
                                      ) : (
                                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center justify-center gap-1 whitespace-nowrap">
                                          <CheckCircle2 className="w-3.5 h-3.5" />
                                          Đạt chuẩn
                                        </span>
                                      )}
                                    </td>

                                    {/* Chỉ số giao */}
                                    <td className="py-1.5 px-2 text-center font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap align-middle">
                                      {staff.sumGan.toLocaleString()}
                                    </td>
                                    <td className="py-1.5 px-2 text-center font-bold text-slate-900 dark:text-white whitespace-nowrap align-middle">
                                      {staff.sumGtc.toLocaleString()}
                                    </td>
                                    <td className="py-1.5 px-2 text-center font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap align-middle">
                                      {staff.sumGan > 0 ? `${staff.avgGtcRate.toFixed(1)}%` : '-'}
                                    </td>

                                    {/* Chỉ số lấy */}
                                    <td className="py-1.5 px-2 text-center text-slate-600 dark:text-slate-400 whitespace-nowrap align-middle">
                                      {staff.sumGanLay.toLocaleString()}
                                    </td>
                                    <td className="py-1.5 px-2 text-center font-bold text-purple-600 dark:text-purple-400 whitespace-nowrap align-middle">
                                      {staff.sumLayTc.toLocaleString()}
                                    </td>
                                    <td className="py-1.5 px-2 text-center text-slate-600 dark:text-slate-400 whitespace-nowrap align-middle">
                                      {staff.sumGanLay > 0 ? `${staff.avgLayTcRate.toFixed(1)}%` : '-'}
                                    </td>

                                    {/* Lương TB / Ngày */}
                                    <td className="py-1.5 px-2.5 text-center font-bold text-emerald-700 dark:text-emerald-300 whitespace-nowrap align-middle">
                                      {staff.avgSalaryPerDay > 0 ? `${Math.round(staff.avgSalaryPerDay).toLocaleString()} đ` : '-'}
                                    </td>

                                    {/* Đơn giá TB */}
                                    <td className="py-1.5 px-2.5 text-center font-bold text-purple-700 dark:text-purple-300 whitespace-nowrap align-middle">
                                      {staff.avgUnitPrice > 0 ? `${Math.round(staff.avgUnitPrice).toLocaleString()} đ/đơn` : '-'}
                                    </td>

                                    {/* Nút xem chi tiết từng ngày */}
                                    <td className="py-1.5 px-2 text-center whitespace-nowrap align-middle">
                                      <button
                                        type="button"
                                        onClick={() => toggleStaffDates(staff.maNV)}
                                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all inline-flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                                          isStaffExpanded
                                            ? 'bg-rose-600 text-white'
                                            : 'bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-700 dark:bg-slate-700 dark:text-slate-300'
                                        }`}
                                      >
                                        <span>{isStaffExpanded ? 'Đóng' : 'Xem ngày'}</span>
                                        {isStaffExpanded ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
                                      </button>
                                    </td>
                                  </tr>

                                  {/* Hàng mở rộng bảng chi tiết từng ngày của nhân viên (STICKY HEADER + DỮ LIỆU CÙNG 1 HÀNG) */}
                                  {isStaffExpanded && (
                                    <tr className="bg-slate-100/90 dark:bg-slate-900/80">
                                      <td colSpan={15} className="p-2.5">
                                        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700 p-2.5 shadow-inner space-y-2">
                                          <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-700">
                                            <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                                              <span>Chi Tiết Lịch Sử Vận Hành: {staff.tenNV} ({staff.maNV})</span>
                                              <span className="text-[10px] text-slate-500 font-normal">
                                                Tổng {staff.totalApplicableDays} ngày đối soát &bull; {staff.totalWorkedDays} ngày làm &bull; {staff.totalOffDays} ngày OFF
                                              </span>
                                            </span>
                                            {onNavigateToEmployeeGtc && (
                                              <button
                                                type="button"
                                                onClick={() => onNavigateToEmployeeGtc(staff.maNV, staff.buuCuc)}
                                                className="text-[10.5px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                                              >
                                                <span>Xem Tab GTC Nhân Viên</span>
                                                <ExternalLink className="w-3 h-3" />
                                              </button>
                                            )}
                                          </div>

                                          <div className="max-h-56 overflow-y-auto rounded border border-slate-200 dark:border-slate-700">
                                            <table className="w-full text-[11px] text-left border-collapse">
                                              <thead className="bg-slate-100 dark:bg-slate-850 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10 shadow-2xs">
                                                <tr>
                                                  <th className="py-1 px-2 text-center w-8 whitespace-normal break-words leading-tight align-middle">STT</th>
                                                  <th className="py-1 px-2.5 text-center whitespace-normal break-words leading-tight align-middle">Ngày</th>
                                                  <th className="py-1 px-2.5 text-center whitespace-normal break-words leading-tight align-middle">Trạng Thái</th>
                                                  <th className="py-1 px-2 text-center whitespace-normal break-words leading-tight align-middle">SLĐ Gán</th>
                                                  <th className="py-1 px-2 text-center whitespace-normal break-words leading-tight align-middle">SLĐ GTC</th>
                                                  <th className="py-1 px-2 text-center whitespace-normal break-words leading-tight align-middle">% GTC</th>
                                                  <th className="py-1 px-2 text-center whitespace-normal break-words leading-tight align-middle">SLĐ Lấy</th>
                                                  <th className="py-1 px-2 text-center whitespace-normal break-words leading-tight align-middle">Lấy TC</th>
                                                  <th className="py-1 px-2 text-center whitespace-normal break-words leading-tight align-middle">% Lấy TC</th>
                                                  <th className="py-1 px-2.5 text-center whitespace-normal break-words leading-tight align-middle">Lương Ngày</th>
                                                  <th className="py-1 px-2.5 text-center whitespace-normal break-words leading-tight align-middle">Đơn Giá</th>
                                                </tr>
                                              </thead>
                                              <tbody className="divide-y divide-slate-100 dark:divide-slate-750">
                                                {staff.dailyDetails.map(day => (
                                                  <tr key={day.ngay} className={day.isOff ? 'bg-rose-50/40 dark:bg-rose-950/20' : ''}>
                                                    <td className="py-1 px-2 text-center text-slate-400 whitespace-nowrap align-middle">{day.stt}</td>
                                                    <td className="py-1 px-2.5 text-center font-mono font-medium whitespace-nowrap align-middle">{day.ngay}</td>
                                                    <td className="py-1 px-2.5 text-center whitespace-nowrap align-middle">
                                                      <span className={`px-1.5 py-0.2 rounded text-[9.5px] font-bold inline-block whitespace-nowrap ${
                                                        day.isOff 
                                                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' 
                                                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                                      }`}>
                                                        {day.statusText}
                                                      </span>
                                                    </td>
                                                    <td className="py-1 px-2 text-center whitespace-nowrap align-middle">{day.gan}</td>
                                                    <td className="py-1 px-2 text-center font-bold whitespace-nowrap align-middle">{day.gtc}</td>
                                                    <td className="py-1 px-2 text-center whitespace-nowrap align-middle">{day.gan > 0 ? `${day.gtcPct.toFixed(1)}%` : '-'}</td>
                                                    <td className="py-1 px-2 text-center whitespace-nowrap align-middle">{day.ganLay}</td>
                                                    <td className="py-1 px-2 text-center font-bold text-purple-600 whitespace-nowrap align-middle">{day.layTc}</td>
                                                    <td className="py-1 px-2 text-center whitespace-nowrap align-middle">{day.ganLay > 0 ? `${day.layTcPct.toFixed(1)}%` : '-'}</td>
                                                    <td className="py-1 px-2.5 text-center font-bold text-emerald-600 whitespace-nowrap align-middle">
                                                      {day.luong > 0 ? `${Math.round(day.luong).toLocaleString()} đ` : '0 đ'}
                                                    </td>
                                                    <td className="py-1 px-2.5 text-center font-bold text-purple-600 whitespace-nowrap align-middle">
                                                      {day.donGiaTb > 0 ? `${Math.round(day.donGiaTb).toLocaleString()} đ` : '-'}
                                                    </td>
                                                  </tr>
                                                ))}
                                              </tbody>
                                            </table>
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

          </div>
        )}

      </div>

    </div>
  );
};

export default NhanSuOperationalAlertsCard;
