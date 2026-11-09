import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  Users, 
  AlertTriangle, 
  CheckCircle2, 
  Calendar, 
  FileSpreadsheet, 
  Download, 
  Search, 
  UserX, 
  Clock,
  ChevronUp,
  ChevronDown,
  Send,
  Camera,
  Settings,
  RefreshCw,
  X,
  Check,
  CheckCircle
} from 'lucide-react';
import { useDashboard } from '../context/DashboardContext';
import { sortDatesDesc } from '../utils/dateEngine';
import { exportToCSV } from '../services/excelExportService';
import { 
  capturePostOfficeCard, 
  sendPhotoToTelegram, 
  downloadBlobAsFile, 
  testTelegramBotConnection, 
  getStoredTelegramConfig, 
  saveStoredTelegramConfig, 
  type TelegramConfig 
} from '../services/telegramService';

export const BaoCaoGtcBcTab: React.FC = () => {
  const { dataset, selectedBuuCucGlobal } = useDashboard();

  // Normalize post office names (e.g. merge '(LAN) Cần Đước' into '(LAN) Cần Đước 1')
  const normalizeBuuCuc = (bc: string) => {
    if (!bc) return '';
    const trimmed = bc.trim();
    if (trimmed === '(LAN) Cần Đước' || trimmed === 'Cần Đước') return '(LAN) Cần Đước 1';
    return trimmed;
  };

  // Extract all available operational dates sorted from newest to oldest (Gần nhất -> Xa nhất)
  const allUniqueDatesDesc = useMemo(() => {
    const rawDates = [
      ...dataset.gtcNhanVien.map(r => r.ngay),
      ...dataset.gtcBuuCuc.map(r => r.ngay)
    ].filter(Boolean);
    return sortDatesDesc([...new Set(rawDates)]);
  }, [dataset.gtcNhanVien, dataset.gtcBuuCuc]);

  // Selected date defaults to the latest date (Ngày gần nhất)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return allUniqueDatesDesc[0] || '04/11/2026';
  });

  // Filters
  const [selectedBuuCuc, setSelectedBuuCuc] = useState<string>(() => selectedBuuCucGlobal || 'all');

  // Đồng bộ với bộ lọc điều hướng toàn hệ thống
  React.useEffect(() => {
    if (selectedBuuCucGlobal && selectedBuuCucGlobal !== 'all') {
      setSelectedBuuCuc(selectedBuuCucGlobal);
    }
  }, [selectedBuuCucGlobal]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'alert_only' | 'off_only'>('all');
  const [showKpis, setShowKpis] = useState<boolean>(true);

  // Telegram Bot Integration State
  const [showTelegramModal, setShowTelegramModal] = useState<boolean>(false);
  const [telegramConfig, setTelegramConfig] = useState<TelegramConfig>(getStoredTelegramConfig);
  const [showConfigSettings, setShowConfigSettings] = useState<boolean>(false);
  const [botTestStatus, setBotTestStatus] = useState<{ testing: boolean; message?: string; ok?: boolean } | null>(null);
  const [sendScope, setSendScope] = useState<'all' | 'selected'>('all');
  const [isBatchSending, setIsBatchSending] = useState<boolean>(false);
  const [isBatchDownloading, setIsBatchDownloading] = useState<boolean>(false);
  const [sendingSinglePo, setSendingSinglePo] = useState<string | null>(null);
  const [batchProgress, setBatchProgress] = useState<{
    current: number;
    total: number;
    logs: { po: string; status: 'pending' | 'capturing' | 'sending' | 'success' | 'error'; message?: string }[];
  }>({ current: 0, total: 0, logs: [] });
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error' | 'info', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 5000);
  };

  // Month key of the selected date (e.g. "11/2026")
  const currentMonthKey = useMemo(() => {
    if (!selectedDate || !selectedDate.includes('/')) return '11/2026';
    return selectedDate.slice(3);
  }, [selectedDate]);

  // Parse DD/MM/YYYY into timestamp
  const parseDateMs = (d: string) => {
    if (!d || !d.includes('/')) return 0;
    const [day, m, y] = d.split('/').map(Number);
    return new Date(y, m - 1, day).getTime();
  };

  // Distinct operating dates in hoaHongNgay during this month up to selectedDate
  const monthOperatingDatesInHh = useMemo(() => {
    const targetMs = parseDateMs(selectedDate);
    const dates = dataset.hoaHongNgay
      .filter(r => r.ngay.slice(3) === currentMonthKey && parseDateMs(r.ngay) <= targetMs)
      .map(r => r.ngay);
    return [...new Set(dates)];
  }, [dataset.hoaHongNgay, currentMonthKey, selectedDate]);

  // Total operating days in month up to selectedDate
  const totalMonthDaysSoFar = useMemo(() => {
    return monthOperatingDatesInHh.length > 0 ? monthOperatingDatesInHh.length : 1;
  }, [monthOperatingDatesInHh]);

  // Official list of post offices in the region (aligned with Task "Nhân sự")
  const postOfficesList = useMemo(() => {
    const fromNs = [...new Set(dataset.nhanSu.map(r => normalizeBuuCuc(r.buuCuc)))].filter(Boolean);
    if (fromNs.length > 0) return fromNs.sort();
    return ['(LAN) Cần Đước 1', '(LAN) Cần Giuộc', '(LAN) Phước Lý', '(LAN) Rạch Kiến', '(LAN) Tầm Vu'];
  }, [dataset.nhanSu]);

  // Active delivery workforce (NVPTTT / Bưu tá giao nhận) in Task "Nhân sự" (Real-time roster)
  const activeDeliveryStaffInNs = useMemo(() => {
    return dataset.nhanSu.filter(s => {
      // Exclude Tran Trong Phu (NVXL) and AM Nguyen Hoang Huy from delivery staff
      if (s.maNV === '3175777') return false;
      const isNvpttt = s.chucVu === 'Business Development Field Executive' ||
        (!s.chucVu?.toLowerCase().includes('operations executive') &&
         !s.chucVu?.toLowerCase().includes('area manager') &&
         !s.chucVu?.toLowerCase().includes('nvxl'));
      return isNvpttt;
    });
  }, [dataset.nhanSu]);

  // Lookup map of all active staff in Task "Nhân sự" for quick cross-referencing
  const nhanSuActiveMap = useMemo(() => {
    return new Map(dataset.nhanSu.map(s => [s.maNV, s]));
  }, [dataset.nhanSu]);

  // Build structured data for each post office on selectedDate
  const postOfficeReportData = useMemo(() => {
    const targetMs = parseDateMs(selectedDate);

    return postOfficesList.map(po => {
      // 1. All active NVPTTT belonging to this post office in Task "Nhân sự" (Real-time roster)
      const poRosterInNs = activeDeliveryStaffInNs.filter(s => normalizeBuuCuc(s.buuCuc) === po);

      // Separate staff in roster by hire date vs selectedDate
      const notYetJoinedStaff = poRosterInNs.filter(m => {
        const staffHireMs = parseDateMs(m.ngayVaoLam);
        return staffHireMs > targetMs;
      });

      // 2. Delivery staff who worked on selectedDate (active delivery in gtcNhanVien)
      const activeRows = dataset.gtcNhanVien.filter(
        r => normalizeBuuCuc(r.buuCuc) === po && r.ngay === selectedDate && r.tongDon > 0 && r.maNV !== '3175777'
      );
      const activeMap = new Map(activeRows.map(r => [r.maNV, r]));

      // 3. Process active staff records with highlight flags
      const activeStaff = activeRows.map(r => {
        const isLowAssigned = (r.tongDon || 0) < 30; // SLĐ Gán < 30 đơn
        const isLowGtc = (r.tongDonGTC || 0) < 20;     // SLĐ GTC < 20 đơn
        const isHighlighted = isLowAssigned || isLowGtc;
        const gtcRate = r.tongDon > 0 ? (r.tongDonGTC / r.tongDon) * 100 : 0;

        // Cross-reference with Task "Nhân sự"
        const nsRecord = nhanSuActiveMap.get(r.maNV);
        const isResigned = !nsRecord; // Not in Task "Nhân sự" -> has resigned after this date

        return {
          ...r,
          gtcRate,
          isLowAssigned,
          isLowGtc,
          isHighlighted,
          isResigned,
          loaiHD: nsRecord?.loaiHD || 'HĐLĐ',
          nhomThamNien: nsRecord?.nhomThamNien || ''
        };
      }).sort((a, b) => b.tongDon - a.tongDon); // Sort by highest assigned orders down

      // 4. Special logic: Nhân viên chuyên lấy hàng tại bưu cục (LAN) Rạch Kiến
      // 2 nhân viên chuyên lấy: Võ Hoàng Phúc (3178591) và Lương Tuấn Minh (3178527)
      // Chỉ phụ trách lấy hàng từ shop/đối tác, không đi giao hàng -> TÁCH RIÊNG & LOẠI KHỎI NHÓM OFF
      const isPickupSpecialist = (maNV: string, tenNV: string) => {
        if (!po.includes('Rạch Kiến')) return false;
        return (
          maNV === '3178591' || 
          maNV === '3178527' || 
          tenNV.includes('Võ Hoàng Phúc') || 
          tenNV.includes('Lương Tuấn Minh')
        );
      };

      const pickupSpecialists = poRosterInNs
        .filter(m => isPickupSpecialist(m.maNV, m.tenNV))
        .map(m => {
          // Check if employee worked on selectedDate from hoaHongNgay
          const hhRecord = dataset.hoaHongNgay.find(
            r => r.maNV === m.maNV && r.ngay === selectedDate
          );
          const isDateTrackedInHh = dataset.hoaHongNgay.some(r => r.ngay === selectedDate);

          let isOff = false;
          if (hhRecord) {
            isOff = (hhRecord.soNgayDiLam ?? 0) <= 0 && (hhRecord.donLayTinhLuong ?? 0) <= 0;
          } else if (isDateTrackedInHh) {
            isOff = true;
          } else {
            isOff = false;
          }

          return {
            maNV: m.maNV,
            tenNV: m.tenNV,
            buuCuc: po,
            chucVu: 'NVPTTT (Chuyên Lấy Hàng)',
            loaiHD: m.loaiHD,
            nhomThamNien: m.nhomThamNien,
            ngayVaoLam: m.ngayVaoLam,
            isOff,
            statusText: isOff ? 'OFF ngày' : 'Bình thường'
          };
        });

      // 5. Identify OFF staff (belong to post office in Task "Nhân sự" but had NO delivery on selectedDate)
      // =========================================================================
      // CRITICAL USER LOGIC:
      // 1. Loại trừ 2 nhân viên chuyên lấy (Võ Hoàng Phúc & Lương Tuấn Minh) ra khỏi nhóm OFF!
      // 2. Kiểm tra ngày vào làm của nhân viên so với thời gian đối chiếu (selectedDate).
      //    Nhân viên nhận việc sau ngày đối chiếu -> KHÔNG ĐƯA VÀO OFF!
      // =========================================================================
      const offStaff = poRosterInNs
        .filter(m => {
          // Did not work on selectedDate
          if (activeMap.has(m.maNV)) return false;

          // LOẠI BỎ NHÂN VIÊN CHUYÊN LẤY RA KHỎI DANH SÁCH OFF
          if (isPickupSpecialist(m.maNV, m.tenNV)) return false;

          // Check hire date vs selectedDate
          const staffHireMs = parseDateMs(m.ngayVaoLam);
          if (staffHireMs > targetMs) {
            // Joined AFTER selectedDate -> Not yet employed on this date -> Do NOT count as OFF
            return false;
          }
          return true;
        })
        .map(m => {
          const staffHireMs = parseDateMs(m.ngayVaoLam);

          // Operating dates in month from staff's hire date up to selectedDate
          const possibleOperatingDates = monthOperatingDatesInHh.filter(d => parseDateMs(d) >= staffHireMs);
          const expectedWorkDays = possibleOperatingDates.length > 0 ? possibleOperatingDates.length : 1;

          // Calculate worked days in current month from hoaHongNgay up to selectedDate
          const workedDaysInMonth = dataset.hoaHongNgay.filter(
            r => r.maNV === m.maNV && r.ngay.slice(3) === currentMonthKey && r.soNgayDiLam > 0 && parseDateMs(r.ngay) <= targetMs
          ).length;
          const offDaysInMonth = Math.max(0, expectedWorkDays - workedDaysInMonth);

          const isNewRecruit = m.nhomThamNien?.includes('G01') || m.nhomThamNien?.includes('Dưới 1 tháng');

          return {
            maNV: m.maNV,
            tenNV: m.tenNV,
            buuCuc: po,
            chucVu: 'NVPTTT (Bưu tá)',
            loaiHD: m.loaiHD,
            nhomThamNien: m.nhomThamNien,
            ngayVaoLam: m.ngayVaoLam,
            isNewRecruit,
            expectedWorkDays,
            workedDaysInMonth,
            offDaysInMonth
          };
        }).sort((a, b) => b.offDaysInMonth - a.offDaysInMonth);

      // 6. Post office summary metrics from gtcBuuCuc or aggregated
      const bcRecords = dataset.gtcBuuCuc.filter(r => normalizeBuuCuc(r.buuCuc) === po && r.ngay === selectedDate);
      const totalVolume = bcRecords.reduce((acc, r) => acc + (r.volume || 0), 0) || 
        activeStaff.reduce((acc, r) => acc + (r.tongDon || 0), 0);
      const totalSldGan = activeStaff.reduce((acc, r) => acc + (r.tongDon || 0), 0);
      const totalSldGtc = activeStaff.reduce((acc, r) => acc + (r.tongDonGTC || 0), 0);
      const totalTonDong = activeStaff.reduce((acc, r) => acc + (r.tonDong || 0), 0);
      const gtcRate = totalSldGan > 0 ? (totalSldGtc / totalSldGan) * 100 : 0;

      const alertCount = activeStaff.filter(r => r.isHighlighted).length;

      return {
        buuCuc: po,
        totalMembers: poRosterInNs.length, // Real-time delivery staff count from Task "Nhân sự"
        pickupSpecialists,
        deliveryStaffCount: poRosterInNs.length - pickupSpecialists.length,
        activeRosterCount: poRosterInNs.length - notYetJoinedStaff.length - pickupSpecialists.length,
        notYetJoinedStaff,
        notYetJoinedCount: notYetJoinedStaff.length,
        activeStaff,
        offStaff,
        totalVolume,
        totalSldGan,
        totalSldGtc,
        totalTonDong,
        gtcRate,
        alertCount
      };
    });
  }, [postOfficesList, activeDeliveryStaffInNs, nhanSuActiveMap, dataset.gtcNhanVien, dataset.gtcBuuCuc, dataset.hoaHongNgay, selectedDate, currentMonthKey, totalMonthDaysSoFar, monthOperatingDatesInHh]);

  // Overall regional metrics for selected date
  const regionalSummary = useMemo(() => {
    let totalVolume = 0;
    let totalGan = 0;
    let totalGtc = 0;
    let totalActive = 0;
    let totalOff = 0;
    let totalAlerts = 0;
    let totalRoster = 0;

    postOfficeReportData.forEach(po => {
      totalVolume += po.totalVolume;
      totalGan += po.totalSldGan;
      totalGtc += po.totalSldGtc;
      totalActive += po.activeStaff.length;
      totalOff += po.offStaff.length;
      totalAlerts += po.alertCount;
      totalRoster += po.totalMembers;
    });

    const gtcRate = totalGan > 0 ? (totalGtc / totalGan) * 100 : 0;

    return {
      totalVolume,
      totalGan,
      totalGtc,
      gtcRate,
      totalActive,
      totalOff,
      totalAlerts,
      totalRoster
    };
  }, [postOfficeReportData]);

  // Filtered post offices according to UI controls
  const displayedPostOffices = useMemo(() => {
    return postOfficeReportData.filter(po => {
      if (selectedBuuCuc !== 'all' && po.buuCuc !== selectedBuuCuc) return false;
      if (statusFilter === 'alert_only' && po.alertCount === 0) return false;
      if (statusFilter === 'off_only' && po.offStaff.length === 0) return false;
      return true;
    });
  }, [postOfficeReportData, selectedBuuCuc, statusFilter]);

  // Handle Export to CSV/Excel
  const handleExportExcel = () => {
    const headers = [
      'Bưu Cục',
      'Ngày Báo Cáo',
      'Loại Nhân Viên',
      'Mã NV',
      'Họ & Tên',
      'Chức Vụ',
      'Loại HĐ',
      'Nhóm Thâm Niên',
      'Tổng Đơn (Gán)',
      'Tổng Đơn GTC',
      'Tỷ Lệ GTC (%)',
      'Leadtime (giờ)',
      'Chuyến Đi',
      'Tồn Đọng',
      'Cảnh Báo Vận Hành',
      'Số Ngày Nghỉ Tháng',
      'Số Ngày Làm Tháng',
      'Đối Chiếu Task Nhân Sự'
    ];

    const rows: (string | number)[][] = [];

    postOfficeReportData.forEach(po => {
      // 1. Active staff rows
      po.activeStaff.forEach(nv => {
        let warningText = 'Đạt chuẩn';
        if (nv.isLowAssigned && nv.isLowGtc) warningText = 'SLĐ Gán < 30 & GTC < 20';
        else if (nv.isLowAssigned) warningText = 'SLĐ Gán < 30 đơn';
        else if (nv.isLowGtc) warningText = 'SLĐ GTC < 20 đơn';

        rows.push([
          po.buuCuc,
          selectedDate,
          'Đi giao trong ngày',
          nv.maNV,
          nv.tenNV,
          'NVPTTT (Bưu tá)',
          nv.loaiHD,
          nv.nhomThamNien || '-',
          nv.tongDon,
          nv.tongDonGTC,
          `${nv.gtcRate.toFixed(1)}%`,
          nv.leadtime?.toFixed(1) || '0',
          nv.chuyenDi || 1,
          nv.tonDong || 0,
          warningText,
          '-',
          '-',
          nv.isResigned ? 'Đã thôi việc sau ngày này' : 'Đang làm việc (Realtime)'
        ]);
      });

      // 2. Pickup specialist rows (Rạch Kiến - Tách riêng, không tính OFF)
      if (po.pickupSpecialists) {
        po.pickupSpecialists.forEach(sp => {
          rows.push([
            po.buuCuc,
            selectedDate,
            'NVPTTT (Chuyên lấy hàng)',
            sp.maNV,
            sp.tenNV,
            'NVPTTT (Lấy hàng)',
            sp.loaiHD,
            sp.nhomThamNien || '-',
            0,
            0,
            '-',
            '-',
            '-',
            0,
            'Chuyên lấy hàng đối tác',
            0,
            '-',
            'Đang làm việc (Realtime)'
          ]);
        });
      }

      // 3. OFF staff rows
      po.offStaff.forEach(off => {
        rows.push([
          po.buuCuc,
          selectedDate,
          'OFF (Nghỉ giao ngày)',
          off.maNV,
          off.tenNV,
          off.chucVu,
          off.loaiHD,
          off.nhomThamNien || '-',
          0,
          0,
          '0%',
          '-',
          0,
          0,
          'Nghỉ giao ngày gần nhất',
          off.offDaysInMonth,
          off.workedDaysInMonth,
          'Đang làm việc (Task Nhân Sự)'
        ]);
      });
    });

    exportToCSV(`Bao_Cao_GTC_Buu_Cuc_${selectedDate.replace(/\//g, '_')}`, headers, rows);
  };

  // Test Telegram Bot Connection
  const handleTestBot = async () => {
    setBotTestStatus({ testing: true });
    const res = await testTelegramBotConnection(telegramConfig);
    setBotTestStatus({ testing: false, message: res.message, ok: res.ok });
    if (res.ok) {
      saveStoredTelegramConfig(telegramConfig);
      showToast('success', res.message);
    } else {
      showToast('error', res.message);
    }
  };

  // Xây dựng Caption gửi Telegram chuẩn xác theo mẫu của AM Huy
  const buildTelegramCaption = (po: typeof postOfficeReportData[0]) => {
    const divider = '------------------------------------';
    
    // Khối nhân viên chuyên lấy (nếu có)
    let pickupLines = '';
    if (po.pickupSpecialists && po.pickupSpecialists.length > 0) {
      const namesList = po.pickupSpecialists.map(s => `${s.maNV} - ${s.tenNV}`).join(', ');
      pickupLines = `📦 <b>Nhân viên chuyên lấy:</b> ${po.pickupSpecialists.length} NV\n   • ${namesList}\n`;
    }

    // Khối cảnh báo năng suất
    const alertStaffList = po.activeStaff.filter(nv => nv.isHighlighted);
    let alertSection = `⚠️ <b>Cảnh báo năng suất (&lt;30 gán / &lt;20 GTC):</b> ${po.alertCount} NV`;
    if (alertStaffList.length > 0) {
      const lines = alertStaffList.map(nv => {
        const details = [];
        if (nv.isLowAssigned) details.push(`Gán ${nv.tongDon}`);
        if (nv.isLowGtc) details.push(`GTC ${nv.tongDonGTC}`);
        return `   • ${nv.maNV} - ${nv.tenNV} (${details.join(', ')})`;
      }).join('\n');
      alertSection += `\n${lines}`;
    }

    return `📊 <b>BÁO CÁO VẬN HÀNH GTC - ${po.buuCuc}</b>\n` +
      `📅 <b>Ngày đối chiếu:</b> ${selectedDate}\n` +
      `${divider}\n` +
      `👥 <b>Tổng NVPTTT tại bưu cục:</b> ${po.totalMembers} NV\n` +
      `🚚 <b>Nhân viên làm việc:</b> ${po.activeStaff.length} NV | <b>Nghỉ OFF:</b> ${po.offStaff.length} NV\n` +
      pickupLines +
      `${divider}\n` +
      `📦 <b>Volume:</b> ${po.totalVolume.toLocaleString('vi-VN')} đơn | <b>%GTC:</b> ${po.gtcRate.toFixed(2)}%\n` +
      `🎯 <b>Đã Gán:</b> ${po.totalSldGan.toLocaleString('vi-VN')} | <b>Đã GTC:</b> ${po.totalSldGtc.toLocaleString('vi-VN')} | <b>Tồn:</b> ${po.totalTonDong.toLocaleString('vi-VN')}\n` +
      `${divider}\n` +
      alertSection;
  };

  // Send single Post Office card photo to Telegram Bot
  const handleSendSinglePoToTelegram = async (po: typeof postOfficeReportData[0]) => {
    const safeId = po.buuCuc.replace(/[^a-zA-Z0-9]/g, '_');
    const el = document.getElementById(`po-card-${safeId}`);
    if (!el) {
      showToast('error', `Không tìm thấy bảng bưu cục ${po.buuCuc}`);
      return;
    }

    try {
      setSendingSinglePo(po.buuCuc);
      showToast('info', `Đang kết xuất và gửi ảnh ${po.buuCuc}...`);
      const blob = await capturePostOfficeCard(el);

      const filename = `BaoCao_GTC_${safeId}_${selectedDate.replace(/\//g, '_')}.jpg`;
      const caption = buildTelegramCaption(po);

      const result = await sendPhotoToTelegram(blob, filename, caption, telegramConfig);

      if (result.ok) {
        showToast('success', `Đã gửi thành công ảnh bưu cục ${po.buuCuc} qua Telegram Bot!`);
      } else {
        showToast('error', `Gửi ảnh thất bại: ${result.description || 'Lỗi không xác định'}`);
      }
    } catch (err: any) {
      showToast('error', `Lỗi xử lý: ${err.message || 'Không thể tạo hoặc gửi ảnh'}`);
    } finally {
      setSendingSinglePo(null);
    }
  };

  // Download single Post Office image as high-quality JPEG
  const handleDownloadSinglePoImage = async (po: typeof postOfficeReportData[0]) => {
    const safeId = po.buuCuc.replace(/[^a-zA-Z0-9]/g, '_');
    const el = document.getElementById(`po-card-${safeId}`);
    if (!el) {
      showToast('error', `Không tìm thấy bảng ${po.buuCuc}`);
      return;
    }
    try {
      showToast('info', `Đang kết xuất hình ảnh ${po.buuCuc}...`);
      const blob = await capturePostOfficeCard(el);
      const filename = `BaoCao_GTC_${safeId}_${selectedDate.replace(/\//g, '_')}.jpg`;
      downloadBlobAsFile(blob, filename);
      showToast('success', `Đã tải hình ảnh bưu cục ${po.buuCuc} về máy!`);
    } catch (err: any) {
      showToast('error', `Lỗi tải ảnh: ${err.message || 'Không thể tạo ảnh'}`);
    }
  };

  // High-Speed Pipelined Batch Send: Chụp tuần tự siêu tốc & Đẩy song song qua Telegram Bot
  const handleStartBatchSend = async () => {
    const targetPos = sendScope === 'all' 
      ? postOfficeReportData 
      : displayedPostOffices;

    if (targetPos.length === 0) {
      showToast('error', 'Không có bưu cục nào phù hợp để gửi.');
      return;
    }

    // Đảm bảo DOM hiển thị đầy đủ bưu cục nếu đang ở chế độ xem tất cả
    if (sendScope === 'all') {
      if (selectedBuuCuc !== 'all') setSelectedBuuCuc('all');
      if (statusFilter !== 'all') setStatusFilter('all');
      if (searchQuery) setSearchQuery('');
      await new Promise(r => setTimeout(r, 80));
    }

    setIsBatchSending(true);
    const initialLogs = targetPos.map(po => ({
      po: po.buuCuc,
      status: 'pending' as const,
      message: 'Chờ xử lý...'
    }));
    setBatchProgress({ current: 0, total: targetPos.length, logs: initialLogs });

    // Pipeline: Chụp ảnh nhanh chóng và phát lệnh gửi Telegram song song (Parallel Uploads)
    const uploadTasks: Promise<boolean>[] = [];

    for (let i = 0; i < targetPos.length; i++) {
      const po = targetPos[i];
      const safeId = po.buuCuc.replace(/[^a-zA-Z0-9]/g, '_');
      const el = document.getElementById(`po-card-${safeId}`);

      if (!el) {
        setBatchProgress(prev => ({
          ...prev,
          logs: prev.logs.map((log, idx) => 
            idx === i ? { ...log, status: 'error', message: 'Không tìm thấy thẻ bưu cục' } : log
          )
        }));
        uploadTasks.push(Promise.resolve(false));
        continue;
      }

      setBatchProgress(prev => ({
        ...prev,
        logs: prev.logs.map((log, idx) => 
          idx === i ? { ...log, status: 'capturing', message: 'Đang kết xuất ảnh...' } : log
        )
      }));

      try {
        // Chụp siêu tốc bằng canvas.toBlob JPEG 90% (chỉ mất ~50-80ms/ảnh)
        const blob = await capturePostOfficeCard(el);

        setBatchProgress(prev => ({
          ...prev,
          logs: prev.logs.map((log, idx) => 
            idx === i ? { ...log, status: 'sending', message: 'Đang tải lên Telegram...' } : log
          )
        }));

        const filename = `BaoCao_GTC_${safeId}_${selectedDate.replace(/\//g, '_')}.jpg`;
        const caption = buildTelegramCaption(po);

        // Đẩy luồng gửi ngay lập tức lên mạng (Parallel Upload Stream)
        const task = sendPhotoToTelegram(blob, filename, caption, telegramConfig)
          .then(res => {
            if (res.ok) {
              setBatchProgress(prev => ({
                ...prev,
                current: prev.current + 1,
                logs: prev.logs.map((log, idx) => 
                  idx === i ? { ...log, status: 'success', message: 'Đã gửi thành công ✅' } : log
                )
              }));
              return true;
            } else {
              setBatchProgress(prev => ({
                ...prev,
                logs: prev.logs.map((log, idx) => 
                  idx === i ? { ...log, status: 'error', message: `Lỗi: ${res.description || 'Thất bại'}` } : log
                )
              }));
              return false;
            }
          })
          .catch((err: any) => {
            setBatchProgress(prev => ({
              ...prev,
              logs: prev.logs.map((log, idx) => 
                idx === i ? { ...log, status: 'error', message: `Lỗi: ${err.message || 'Lỗi gửi'}` } : log
              )
            }));
            return false;
          });

        uploadTasks.push(task);
      } catch (err: any) {
        setBatchProgress(prev => ({
          ...prev,
          logs: prev.logs.map((log, idx) => 
            idx === i ? { ...log, status: 'error', message: `Lỗi: ${err.message || 'Lỗi kết xuất'}` } : log
          )
        }));
        uploadTasks.push(Promise.resolve(false));
      }
    }

    // Chờ toàn bộ các luồng tải lên hoàn tất đồng thời
    const results = await Promise.all(uploadTasks);
    const successCount = results.filter(Boolean).length;
    const failCount = results.length - successCount;

    setIsBatchSending(false);
    if (successCount === targetPos.length) {
      showToast('success', `Đã gửi thành công siêu tốc ${successCount} tấm ảnh bưu cục qua Telegram Bot!`);
    } else if (successCount > 0) {
      showToast('info', `Đã gửi ${successCount}/${targetPos.length} bưu cục. Có ${failCount} bưu cục gặp lỗi.`);
    } else {
      showToast('error', `Không thể gửi ảnh qua Telegram. Vui lòng kiểm tra token hoặc chat ID.`);
    }
  };

  // Tải nhanh toàn bộ ảnh về máy tính
  const handleStartBatchDownload = async () => {
    const targetPos = sendScope === 'all' 
      ? postOfficeReportData 
      : displayedPostOffices;

    if (sendScope === 'all') {
      if (selectedBuuCuc !== 'all') setSelectedBuuCuc('all');
      if (statusFilter !== 'all') setStatusFilter('all');
      if (searchQuery) setSearchQuery('');
      await new Promise(r => setTimeout(r, 80));
    }

    setIsBatchDownloading(true);
    showToast('info', `Đang kết xuất và tải ${targetPos.length} tấm ảnh về máy...`);

    for (let i = 0; i < targetPos.length; i++) {
      const po = targetPos[i];
      const safeId = po.buuCuc.replace(/[^a-zA-Z0-9]/g, '_');
      const el = document.getElementById(`po-card-${safeId}`);
      if (el) {
        try {
          const blob = await capturePostOfficeCard(el);
          const filename = `BaoCao_GTC_${safeId}_${selectedDate.replace(/\//g, '_')}.jpg`;
          downloadBlobAsFile(blob, filename);
          await new Promise(r => setTimeout(r, 100));
        } catch (e) {
          console.error(e);
        }
      }
    }

    setIsBatchDownloading(false);
    showToast('success', `Đã tải toàn bộ ${targetPos.length} ảnh bưu cục về máy!`);
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto px-3 sm:px-5 py-3 md:py-4">
      {/* =========================================================================
          STICKY HEADER & BỘ ĐIỀU HÀNH BÁO CÁO GTC BƯU CỤC (THU GỌN 1 HÀNG TỐI ƯU KHÔNG GIAN)
          Chế độ xem và tìm kiếm cùng hàng với bộ lọc (Ngày, Bưu cục)
          ========================================================================= */}
      <div className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-800/90 rounded-xl shadow-xs px-3 py-2 transition-all">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          {/* Cụm Trái: Tiêu Đề + Bộ Lọc (Ngày, Bưu Cục) + Chế Độ Xem (CÙNG HÀNG) */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Tiêu đề ngắn gọn */}
            <div className="flex items-center gap-1.5 mr-1">
              <div className="p-1.5 bg-orange-600 text-white rounded-lg shadow-2xs">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider whitespace-nowrap">
                GTC BƯU CỤC
              </span>
              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 hidden xl:inline">
                {selectedDate === allUniqueDatesDesc[0] ? 'Ngày Gần Nhất' : 'Lịch Sử'}
              </span>
            </div>

            {/* BỘ LỌC 1: Chọn Ngày */}
            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
              <Calendar className="w-3.5 h-3.5 text-orange-600 shrink-0" />
              <label className="text-slate-500 text-[11px] font-semibold hidden sm:inline">Ngày:</label>
              <select
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="bg-transparent font-bold text-slate-800 dark:text-slate-200 text-xs focus:outline-none cursor-pointer"
              >
                {allUniqueDatesDesc.map((d, idx) => (
                  <option key={d} value={d}>
                    {d} {idx === 0 ? '(Gần nhất)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* BỘ LỌC 2: Chọn Bưu Cục */}
            <select
              value={selectedBuuCuc}
              onChange={e => setSelectedBuuCuc(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs rounded-lg px-2.5 py-1 font-semibold focus:ring-1 focus:ring-orange-500 focus:outline-none cursor-pointer"
            >
              <option value="all">Tất cả {postOfficesList.length} bưu cục</option>
              {postOfficesList.map(po => (
                <option key={po} value={po}>
                  {po.replace('(LAN) ', '')}
                </option>
              ))}
            </select>

            {/* Phân cách nhẹ */}
            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block mx-0.5" />

            {/* CHẾ ĐỘ XEM: CÙNG HÀNG VỚI BỘ LỌC */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700/80">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-2 py-0.5 rounded-md text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === 'all'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Tất cả ({regionalSummary.totalActive + regionalSummary.totalOff})
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('alert_only')}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === 'alert_only'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950/40'
                }`}
                title="Bưu tá có < 30 gán hoặc < 20 GTC"
              >
                <AlertTriangle className="w-3 h-3 text-amber-500" />
                <span>Cảnh báo ({regionalSummary.totalAlerts})</span>
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('off_only')}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === 'off_only'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/40'
                }`}
                title="Bưu tá không phát sinh đơn giao trong ngày"
              >
                <UserX className="w-3 h-3 text-rose-500" />
                <span>Bưu tá OFF ({regionalSummary.totalOff})</span>
              </button>
            </div>
          </div>

          {/* Cụm Phải: TÌM KIẾM (CÙNG HÀNG) + XUẤT EXCEL + THU GỌN KPI */}
          <div className="flex items-center gap-2">
            {/* TÌM KIẾM CÙNG HÀNG */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Tìm tên, mã NV..."
                className="pl-8 pr-6 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs rounded-lg w-36 sm:w-44 focus:outline-none focus:ring-1 focus:ring-orange-500 text-slate-800 dark:text-slate-200"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-slate-400 hover:text-slate-600 text-xs absolute right-2 top-1/2 -translate-y-1/2"
                >
                  ✕
                </button>
              )}
            </div>

            {/* NÚT GỬI ẢNH TELEGRAM */}
            <button
              type="button"
              onClick={() => setShowTelegramModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer whitespace-nowrap"
              title="Gửi báo cáo danh sách nhân viên từng bưu cục dạng hình ảnh qua Bot Telegram"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Gửi Telegram</span>
            </button>

            {/* NÚT XUẤT EXCEL */}
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer whitespace-nowrap"
              title="Xuất bảng chi tiết vận hành bưu cục ra file Excel, tự động lưu trữ Google Drive &amp; mở tab mới"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Xuất Excel</span>
            </button>

            {/* NÚT THU GỌN / XEM THẺ KPI */}
            <button
              type="button"
              onClick={() => setShowKpis(!showKpis)}
              className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-all cursor-pointer whitespace-nowrap"
              title={showKpis ? "Thu gọn 5 thẻ KPI tổng quan để tối ưu không gian xem" : "Mở rộng xem 5 thẻ KPI"}
            >
              {showKpis ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span className="hidden lg:inline">Thu gọn KPI</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  <span className="hidden lg:inline">Xem KPI</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          5 THẺ KPI TỔNG QUAN KHU VỰC NGÀY GẦN NHẤT (CÓ THỂ THU GỌN / MỞ RỘNG)
          ========================================================================= */}
      {showKpis && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* KPI 1: Tổng Volume */}
          <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm text-center">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
              <span>Volume Ngày {selectedDate}</span>
              <Building2 className="w-4 h-4 text-orange-600" />
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-white my-0.5 text-center">
              {regionalSummary.totalVolume.toLocaleString('vi-VN')}
            </div>
            <div className="text-[10px] text-slate-400 text-center">Đơn toàn khu vực</div>
          </div>

          {/* KPI 2: Tổng Gán & Tỷ lệ */}
          <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm text-center">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
              <span>SLĐ Đã Gán</span>
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-xl font-black text-blue-600 dark:text-blue-400 my-0.5 text-center">
              {regionalSummary.totalGan.toLocaleString('vi-VN')}
            </div>
            <div className="text-[10px] text-slate-400 text-center">
              {regionalSummary.totalVolume > 0 ? ((regionalSummary.totalGan / regionalSummary.totalVolume) * 100).toFixed(1) : 0}% Volume
            </div>
          </div>

          {/* KPI 3: Tổng GTC */}
          <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm text-center">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
              <span>Giao Thành Công</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 my-0.5 text-center">
              {regionalSummary.totalGtc.toLocaleString('vi-VN')}
            </div>
            <div className="text-[10px] text-emerald-600 font-bold text-center">
              Đạt {regionalSummary.gtcRate.toFixed(2)}% GTC
            </div>
          </div>

          {/* KPI 4: Nhân viên làm việc & OFF */}
          <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm text-center">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
              <span>Nhân Viên Làm Việc</span>
              <Clock className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-xl font-black text-indigo-600 dark:text-indigo-400 my-0.5 text-center">
              {regionalSummary.totalActive} nhân viên
            </div>
            <div className="text-[10px] text-slate-500 text-center">
              Nghỉ OFF: <strong className="text-rose-600">{regionalSummary.totalOff} NV</strong> &bull; Roster: {regionalSummary.totalRoster} NVPTTT
            </div>
          </div>

          {/* KPI 5: Cảnh báo năng suất thấp */}
          <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-amber-200 dark:border-amber-900/60 shadow-sm text-center">
            <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 text-xs font-semibold mb-1">
              <span>Cảnh Báo Năng Suất</span>
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-xl font-black text-amber-600 dark:text-amber-400 my-0.5 text-center">
              {regionalSummary.totalAlerts} bưu tá
            </div>
            <div className="text-[10px] text-amber-600 text-center font-medium">
              &lt; 30 gán hoặc &lt; 20 GTC
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          DANH SÁCH BẢNG CHI TIẾT TỪNG BƯU CỤC (MỖI BƯU CỤC LÀ 1 BẢNG RIÊNG)
          ========================================================================= */}
      <div className="space-y-6">
        {displayedPostOffices.map(po => {
          // Filter active staff by search query
          const filteredActive = po.activeStaff.filter(nv => {
            if (!searchQuery.trim()) return true;
            const q = searchQuery.toLowerCase();
            return nv.tenNV.toLowerCase().includes(q) || nv.maNV.includes(q);
          });

          // Filter off staff by search query
          const filteredOff = po.offStaff.filter(nv => {
            if (!searchQuery.trim()) return true;
            const q = searchQuery.toLowerCase();
            return nv.tenNV.toLowerCase().includes(q) || nv.maNV.includes(q);
          });

          // If filtering alert_only, hide non-alert active staff
          const finalActiveStaff = statusFilter === 'alert_only' 
            ? filteredActive.filter(nv => nv.isHighlighted)
            : statusFilter === 'off_only'
            ? []
            : filteredActive;

          // If filtering alert_only, hide off staff
          const finalOffStaff = statusFilter === 'alert_only'
            ? []
            : filteredOff;

          const safePoId = po.buuCuc.replace(/[^a-zA-Z0-9]/g, '_');

          return (
            <div 
              key={po.buuCuc}
              id={`po-card-${safePoId}`}
              className="bg-white dark:bg-slate-800 rounded-xl border border-orange-200/90 dark:border-slate-700 shadow-sm overflow-hidden transition-all"
            >
              {/* HEADER BẢNG BƯU CỤC (Theo đúng chuẩn hình đính kèm của AM Huy) */}
              <div className="p-3.5 bg-gradient-to-r from-orange-50/50 via-slate-50 to-white dark:from-slate-750 dark:to-slate-800 border-b border-orange-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-orange-600 text-white flex items-center justify-center font-bold text-xs">
                    <Users className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 dark:text-white text-xs sm:text-sm uppercase tracking-wide flex items-center gap-2 flex-wrap">
                      <span>DANH SÁCH NHÂN VIÊN: {po.buuCuc}</span>
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300">
                        {po.totalMembers} NVPTTT {po.pickupSpecialists && po.pickupSpecialists.length > 0 ? `(${po.deliveryStaffCount} Giao • ${po.pickupSpecialists.length} Chuyên lấy)` : ''}
                      </span>
                      {po.pickupSpecialists && po.pickupSpecialists.length > 0 && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300">
                          📦 {po.pickupSpecialists.length} NV Chuyên lấy hàng
                        </span>
                      )}
                      {po.alertCount > 0 && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200 border border-amber-300">
                          ⚠️ {po.alertCount} NV cần hỗ trợ
                        </span>
                      )}
                    </h3>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-3">
                  <div className="text-right text-xs">
                    <span className="font-semibold text-orange-600 dark:text-orange-400">
                      Volume: <strong>{po.totalVolume.toLocaleString('vi-VN')} đơn</strong> &bull; %GTC: <strong>{po.gtcRate.toFixed(2)}%</strong>
                    </span>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Đã Gán: {po.totalSldGan.toLocaleString('vi-VN')} &bull; Đã GTC: {po.totalSldGtc.toLocaleString('vi-VN')} &bull; Tồn: {po.totalTonDong.toLocaleString('vi-VN')}
                    </div>
                  </div>

                  {/* Nút tác vụ nhanh riêng bưu cục này (tự động ẩn khi xuất ảnh) */}
                  <div className="flex items-center gap-1.5 shrink-0" data-no-capture="true">
                    <button
                      type="button"
                      onClick={() => handleSendSinglePoToTelegram(po)}
                      disabled={sendingSinglePo === po.buuCuc}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
                      title={`Gửi riêng tấm ảnh bưu cục ${po.buuCuc} qua Telegram Bot`}
                    >
                      <Send className="w-3 h-3" />
                      <span>{sendingSinglePo === po.buuCuc ? 'Đang gửi...' : 'Gửi Bot'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadSinglePoImage(po)}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
                      title={`Tải ảnh bưu cục ${po.buuCuc} về máy (.PNG)`}
                    >
                      <Camera className="w-3 h-3" />
                      <span className="hidden md:inline">Tải ảnh</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* BẢNG CHI TIẾT NHÂN VIÊN HOẠT ĐỘNG (ĐI GIAO TRONG NGÀY) */}
              {statusFilter !== 'off_only' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-slate-100 dark:bg-slate-750 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="py-2.5 px-3 text-center w-[10%] min-w-[75px]">Mã NV</th>
                        <th className="py-2.5 px-4 text-left w-[25%] min-w-[170px]">Họ Tên</th>
                        <th className="py-2.5 px-3 text-center w-[11%] min-w-[90px]">Tổng Đơn</th>
                        <th className="py-2.5 px-3 text-center w-[12%] min-w-[100px]">Tổng Đơn GTC</th>
                        <th className="py-2.5 px-3 text-center w-[11%] min-w-[90px]">% GTC</th>
                        <th className="py-2.5 px-3 text-center w-[9%] min-w-[75px]">Leadtime</th>
                        <th className="py-2.5 px-3 text-center w-[13%] min-w-[120px]">Chuyến Đi</th>
                        <th className="py-2.5 px-3 text-center w-[9%] min-w-[75px]">Tồn Đọng</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-750">
                      {finalActiveStaff.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-4 py-6 text-center text-slate-400 italic text-sm">
                            Không có nhân viên phát sinh đơn giao theo điều kiện lọc này trong ngày {selectedDate}.
                          </td>
                        </tr>
                      ) : (
                        finalActiveStaff.map(nv => {
                          const isShift2 = (nv.chuyenDi || 1) >= 2;
                          return (
                            <tr 
                              key={nv.maNV}
                              className={`transition-colors select-none ${
                                nv.isHighlighted
                                  ? 'bg-amber-50/70 hover:bg-amber-100/60 dark:bg-amber-950/30 dark:hover:bg-amber-900/40 border-l-4 border-amber-500'
                                  : 'hover:bg-orange-50/30 dark:hover:bg-slate-750'
                              }`}
                            >
                              {/* 1. Mã NV */}
                              <td className="py-2.5 px-3 font-mono text-xs font-bold text-slate-600 dark:text-slate-400 text-center">
                                {nv.maNV}
                              </td>

                              {/* 2. Họ Tên */}
                              <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-slate-100 text-sm text-left">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span>{nv.tenNV}</span>
                                  {nv.isResigned && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-750 dark:text-slate-300 border border-slate-300">
                                      Đã thôi việc sau ngày này
                                    </span>
                                  )}
                                  {nv.isLowAssigned && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200 border border-amber-300">
                                      ⚠️ &lt;30 gán ({nv.tongDon})
                                    </span>
                                  )}
                                  {nv.isLowGtc && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200 border border-red-300">
                                      ⚠️ &lt;20 GTC ({nv.tongDonGTC})
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* 3. Tổng Đơn */}
                              <td className="py-2.5 px-3 text-center font-black text-sm md:text-base text-slate-800 dark:text-slate-100">
                                <span className={nv.isLowAssigned ? 'text-amber-600' : ''}>
                                  {nv.tongDon.toLocaleString('vi-VN')}
                                </span>
                              </td>

                              {/* 4. Tổng Đơn GTC */}
                              <td className="py-2.5 px-3 text-center font-black text-sm md:text-base text-emerald-600 dark:text-emerald-400">
                                <span className={nv.isLowGtc ? 'text-red-600' : ''}>
                                  {nv.tongDonGTC.toLocaleString('vi-VN')}
                                </span>
                              </td>

                              {/* 5. % GTC */}
                              <td className="py-2.5 px-3 text-center">
                                <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-black ${
                                  nv.gtcRate < 65 
                                    ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' 
                                    : nv.gtcRate < 75 
                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' 
                                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                }`}>
                                  {nv.gtcRate.toFixed(1)}%
                                </span>
                              </td>

                              {/* 6. Leadtime */}
                              <td className="py-2.5 px-3 text-center font-bold text-sm text-slate-700 dark:text-slate-300">
                                {nv.leadtime?.toFixed(1) || '0.0'}
                              </td>

                              {/* 7. Chuyến Đi (Có giao ca 2 vs Chỉ giao 1 ca) */}
                              <td className="py-2.5 px-3 text-center">
                                {isShift2 ? (
                                  <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-[11px] font-black bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shadow-2xs">
                                    có giao ca 2 {nv.chuyenDi && nv.chuyenDi > 2 ? `(${nv.chuyenDi}C)` : ''}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-750 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                    Chỉ giao 1 ca
                                  </span>
                                )}
                              </td>

                              {/* 8. Tồn Đọng */}
                              <td className="py-2.5 px-3 text-center font-black text-sm md:text-base text-rose-600 dark:text-rose-400">
                                {nv.tonDong || 0}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>

                    {/* Hàng Tổng Cộng Bưu Cục */}
                    {finalActiveStaff.length > 0 && (
                      <tfoot className="bg-slate-50 dark:bg-slate-750/90 font-bold border-t border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                        <tr>
                          <td colSpan={2} className="py-3 px-4 text-left font-black uppercase text-xs text-orange-600">
                            Tổng {finalActiveStaff.length} Nhân Viên Làm Việc:
                          </td>
                          <td className="py-3 px-3 text-center font-black text-sm md:text-base">
                            {finalActiveStaff.reduce((a, b) => a + b.tongDon, 0).toLocaleString('vi-VN')}
                          </td>
                          <td className="py-3 px-3 text-center font-black text-sm md:text-base text-emerald-600">
                            {finalActiveStaff.reduce((a, b) => a + b.tongDonGTC, 0).toLocaleString('vi-VN')}
                          </td>
                          <td className="py-3 px-3 text-center font-black">
                            <span className="px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-650 text-xs font-black">
                              {finalActiveStaff.reduce((a, b) => a + b.tongDon, 0) > 0
                                ? (
                                    (finalActiveStaff.reduce((a, b) => a + b.tongDonGTC, 0) /
                                      finalActiveStaff.reduce((a, b) => a + b.tongDon, 0)) *
                                    100
                                  ).toFixed(1) + '%'
                                : '0%'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-xs text-slate-400">
                            -
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                              {finalActiveStaff.filter(r => (r.chuyenDi || 1) >= 2).length} NV ca 2
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center font-black text-sm md:text-base text-rose-600">
                            {finalActiveStaff.reduce((a, b) => a + b.tonDong, 0).toLocaleString('vi-VN')}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              )}

              {/* =========================================================================
                  ĐẶC BIỆT BƯU CỤC (LAN) RẠCH KIẾN: NHÂN VIÊN CHUYÊN LẤY HÀNG
                  Võ Hoàng Phúc (3178591) và Lương Tuấn Minh (3178527)
                  Chỉ lấy hàng, không giao hàng -> Tách riêng biệt, hoàn toàn loại khỏi nhóm OFF
                  ========================================================================= */}
              {po.pickupSpecialists && po.pickupSpecialists.length > 0 && (
                <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/20 border-t border-blue-200 dark:border-blue-900/60">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2 mb-2 border-b border-blue-200/80 dark:border-blue-800/80">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                      <h4 className="text-xs font-black text-blue-900 dark:text-blue-300 uppercase tracking-wide flex items-center gap-2">
                        <span>Nhân Viên OFF (Nghỉ Lấy Ngày {selectedDate})</span>
                        <span className="px-2 py-0.2 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border border-blue-300 dark:border-blue-700">
                          {po.pickupSpecialists.length} NV
                        </span>
                      </h4>
                    </div>
                    <span className="text-[11px] text-blue-700 dark:text-blue-300 font-medium">
                      Chuyên lấy hàng đối tác/shop &bull; Đối chiếu Task Hoa Hồng Ngày &bull; Tháng {currentMonthKey}
                    </span>
                  </div>

                  <div className="overflow-x-auto rounded-lg border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-800 shadow-2xs">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead className="bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-bold border-b border-blue-100 dark:border-blue-800">
                        <tr>
                          <th className="py-2.5 px-3 text-center w-[10%]">Mã NV</th>
                          <th className="py-2.5 px-4 text-left w-[24%]">Họ &amp; Tên</th>
                          <th className="py-2.5 px-3 text-center w-[12%]">Loại Hợp Đồng</th>
                          <th className="py-2.5 px-3 text-center w-[16%]">Trạng Thái Làm Việc</th>
                          <th className="py-2.5 px-3 text-center w-[18%]">Chức Năng Vận Hành</th>
                          <th className="py-2.5 px-3 text-center w-[20%]">Nhiệm Vụ Thực Tế</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-blue-50 dark:divide-blue-900/30">
                        {po.pickupSpecialists.map(sp => (
                          <tr key={sp.maNV} className="hover:bg-blue-50/40 transition-colors">
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-600 dark:text-slate-400">
                              {sp.maNV}
                            </td>
                            <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">
                              <span>{sp.tenNV}</span>
                              {sp.nhomThamNien && (
                                <span className="ml-1.5 px-1.5 py-0.2 text-[9px] rounded bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 font-semibold">
                                  {sp.nhomThamNien}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center font-semibold text-slate-700 dark:text-slate-300">
                              {sp.loaiHD}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {sp.isOff ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200">
                                  OFF ngày
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                  Bình thường
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200">
                                📦 Chuyên Lấy Hàng
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center text-slate-600 dark:text-slate-400 font-medium">
                              Chỉ phụ trách lấy hàng, không phát sinh đơn giao
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* =========================================================================
                  CUỐI BẢNG: DANH SÁCH NHÂN VIÊN OFF (NGHỈ GIAO TRONG NGÀY GẦN NHẤT)
                  ĐỐI CHIẾU THỜI GIAN THỰC VỚI TASK NHÂN SỰ
                  CHỈ TÍNH NHÂN VIÊN ĐÃ NHẬN VIỆC - LOẠI TRỪ TÂN BINH CHƯA ĐẾN NGÀY VÀO LÀM
                  ========================================================================= */}
              <div className="p-3.5 bg-slate-50/90 dark:bg-slate-750/70 border-t border-slate-200 dark:border-slate-700">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2 mb-2 border-b border-slate-200/80 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                    <h4 className="text-xs font-black text-rose-700 dark:text-rose-400 uppercase tracking-wide flex items-center gap-2">
                      <span>Nhân Viên OFF (Nghỉ Giao Ngày {selectedDate})</span>
                      <span className="px-2 py-0.2 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                        {po.offStaff.length} Bưu tá
                      </span>
                    </h4>
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Đã đối chiếu <strong>Task Nhân Sự (Realtime)</strong> &bull; Loại trừ nhân sự chưa đến ngày nhận việc &bull; Tháng <strong>{currentMonthKey}</strong>
                  </span>
                </div>

                {finalOffStaff.length === 0 ? (
                  <div className="py-3 text-center text-emerald-700 dark:text-emerald-400 text-xs font-semibold flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>
                      Toàn bộ {po.deliveryStaffCount || po.activeRosterCount} NVPTTT giao hàng thực tế ngày {selectedDate} của bưu cục {po.buuCuc} đều đi làm và phát sinh gán/giao đầy đủ.
                      {po.pickupSpecialists && po.pickupSpecialists.length > 0 && ` (${po.pickupSpecialists.length} nhân viên chuyên lấy hàng làm việc bình thường)`}
                    </span>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xs">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead className="bg-rose-50/60 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200 font-bold border-b border-rose-100 dark:border-slate-700">
                        <tr>
                          <th className="py-2.5 px-3 text-center w-[10%] min-w-[75px]">Mã NV</th>
                          <th className="py-2.5 px-4 text-left w-[25%] min-w-[170px]">Họ & Tên</th>
                          <th className="py-2.5 px-3 text-center w-[11%] min-w-[85px]">Hợp Đồng</th>
                          <th className="py-2.5 px-3 text-center w-[14%] min-w-[110px]">Trạng Thái Ngày</th>
                          <th className="py-2.5 px-3 text-center w-[15%] min-w-[120px]">Số Ngày Đã Nghỉ Trong Tháng</th>
                          <th className="py-2.5 px-3 text-center w-[12%] min-w-[95px]">Số Ngày Đã Đi Làm</th>
                          <th className="py-2.5 px-3 text-center w-[13%] min-w-[110px]">Đánh Giá Chuyên Cần</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-750">
                        {finalOffStaff.map(off => {
                          const isFrequentOff = off.offDaysInMonth >= 4;

                          return (
                            <tr key={off.maNV} className="hover:bg-rose-50/30 dark:hover:bg-slate-750 transition-colors">
                              {/* 1. Mã NV */}
                              <td className="py-2.5 px-3 font-mono text-xs font-bold text-slate-500 text-center">
                                {off.maNV}
                              </td>

                              {/* 2. Họ Tên */}
                              <td className="py-2.5 px-4 font-bold text-slate-800 dark:text-slate-100 text-sm text-left">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span>{off.tenNV}</span>
                                  {off.nhomThamNien && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-750 dark:text-slate-300">
                                      {off.nhomThamNien.split(':')[0]}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* 3. Hợp Đồng */}
                              <td className="py-2.5 px-3 text-center">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  off.loaiHD === 'HĐLĐ'
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                }`}>
                                  {off.loaiHD || 'HĐLĐ'}
                                </span>
                              </td>

                              {/* 4. Trạng Thái Ngày */}
                              <td className="py-2.5 px-3 text-center">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                                  <UserX className="w-3 h-3" />
                                  <span>OFF (Không có đơn gán)</span>
                                </span>
                              </td>

                              {/* 5. Số Ngày Nghỉ Trong Tháng */}
                              <td className="py-2.5 px-3 text-center font-black">
                                <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-black ${
                                  isFrequentOff
                                    ? 'bg-rose-600 text-white shadow-2xs'
                                    : off.offDaysInMonth > 0
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
                                    : 'bg-slate-100 text-slate-700'
                                }`}>
                                  {off.offDaysInMonth} ngày nghỉ
                                </span>
                              </td>

                              {/* 6. Số Ngày Đã Đi Làm */}
                              <td className="py-2.5 px-3 text-center font-bold text-sm text-slate-700 dark:text-slate-300">
                                {off.workedDaysInMonth} / {off.expectedWorkDays || totalMonthDaysSoFar} ngày
                              </td>

                              {/* 7. Đánh Giá Chuyên Cần */}
                              <td className="py-2.5 px-3 text-center">
                                <span className={`text-[11px] font-bold ${
                                  isFrequentOff 
                                    ? 'text-rose-600 dark:text-rose-400' 
                                    : off.offDaysInMonth > 0
                                    ? 'text-amber-600 dark:text-amber-400'
                                    : 'text-slate-500'
                                }`}>
                                  {isFrequentOff 
                                    ? '⚠️ Nghỉ nhiều trong tháng (≥ 4 ngày)' 
                                    : off.offDaysInMonth > 0
                                    ? 'Nghỉ luân phiên / phép'
                                    : 'Mới nghỉ hôm nay'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* =========================================================================
          MODAL GỬI BÁO CÁO HÌNH ẢNH QUA TELEGRAM BOT (MỖI BƯU CỤC 1 TẤM ẢNH)
          ========================================================================= */}
      {showTelegramModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in">
          <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden">
            
            {/* Modal Header */}
            <div className="px-5 py-3.5 bg-gradient-to-r from-sky-50 via-slate-50 to-white dark:from-slate-800 dark:to-slate-850 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-500 text-white flex items-center justify-center shadow-xs">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <span>Gửi Báo Cáo Hình Ảnh Qua Telegram Bot</span>
                    <span className="px-2 py-0.2 text-[10px] font-bold rounded-full bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                      Mỗi BC 1 Tấm Ảnh
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Chụp toàn bộ danh sách nhân viên &amp; NV OFF của từng bưu cục thành hình ảnh chất lượng cao gửi về Telegram
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!isBatchSending) setShowTelegramModal(false);
                }}
                disabled={isBatchSending}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-750 transition-all cursor-pointer disabled:opacity-40"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto text-xs">
              {/* Card Thông tin Bot & Người nhận */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      Bot: <span className="text-sky-600 font-extrabold">BC vận hành ngày</span> (@BaocaoGTCtheoBC_bot)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleTestBot}
                      disabled={botTestStatus?.testing}
                      className="px-2 py-1 rounded-md text-[11px] font-bold bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition-all cursor-pointer inline-flex items-center gap-1"
                    >
                      {botTestStatus?.testing ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin text-sky-500" />
                          <span>Đang kiểm tra...</span>
                        </>
                      ) : (
                        <span>Kiểm tra kết nối</span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowConfigSettings(!showConfigSettings)}
                      className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                      title="Chỉnh sửa Token hoặc ID Chat"
                    >
                      <Settings className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center justify-between">
                  <span>Người nhận (Chat ID): <strong className="font-mono text-slate-800 dark:text-slate-200">{telegramConfig.chatId}</strong> (3166018 - Huy Nguyễn - AM)</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Sẵn sàng gửi
                  </span>
                </div>

                {botTestStatus?.message && (
                  <div className={`p-2 rounded-lg text-[11px] font-medium ${
                    botTestStatus.ok ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                  }`}>
                    {botTestStatus.message}
                  </div>
                )}

                {/* Form chỉnh sửa cấu hình mở rộng nếu cần */}
                {showConfigSettings && (
                  <div className="pt-2 mt-2 border-t border-slate-200 dark:border-slate-700 space-y-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-0.5 uppercase">Bot Token:</label>
                      <input
                        type="text"
                        value={telegramConfig.botToken || ''}
                        onChange={e => {
                          const next = { ...telegramConfig, botToken: e.target.value.trim() };
                          setTelegramConfig(next);
                          saveStoredTelegramConfig(next);
                        }}
                        className="w-full px-2 py-1 font-mono text-[11px] bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-1 focus:ring-sky-500"
                        placeholder="Quản lý an toàn trên Server (hoặc nhập mã tạm thời)..."
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-0.5 uppercase">Chat ID / Group ID:</label>
                      <input
                        type="text"
                        value={telegramConfig.chatId}
                        onChange={e => {
                          const next = { ...telegramConfig, chatId: e.target.value.trim() };
                          setTelegramConfig(next);
                          saveStoredTelegramConfig(next);
                        }}
                        className="w-full px-2 py-1 font-mono text-[11px] bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-1 focus:ring-sky-500"
                        placeholder="Nhập ID người nhận..."
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Phạm vi gửi ảnh */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Chọn phạm vi bưu cục gửi báo cáo:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center gap-2.5 ${
                    sendScope === 'all'
                      ? 'border-sky-500 bg-sky-50/50 dark:bg-sky-950/30 ring-1 ring-sky-400'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                  }`}>
                    <input
                      type="radio"
                      name="sendScope"
                      checked={sendScope === 'all'}
                      onChange={() => setSendScope('all')}
                      className="text-sky-600 focus:ring-sky-500 cursor-pointer"
                    />
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">Toàn bộ 5 bưu cục quản lý</div>
                      <div className="text-[11px] text-slate-500">Mỗi bưu cục là 1 tấm ảnh riêng biệt ({postOfficeReportData.length} ảnh)</div>
                    </div>
                  </label>

                  <label className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center gap-2.5 ${
                    sendScope === 'selected'
                      ? 'border-sky-500 bg-sky-50/50 dark:bg-sky-950/30 ring-1 ring-sky-400'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                  }`}>
                    <input
                      type="radio"
                      name="sendScope"
                      checked={sendScope === 'selected'}
                      onChange={() => setSendScope('selected')}
                      className="text-sky-600 focus:ring-sky-500 cursor-pointer"
                    />
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">Chỉ bưu cục đang lọc</div>
                      <div className="text-[11px] text-slate-500">
                        {selectedBuuCuc === 'all' ? `Tất cả bưu cục trên màn hình (${displayedPostOffices.length} ảnh)` : `${selectedBuuCuc} (1 ảnh)`}
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Danh sách các bưu cục sẽ được xuất ảnh */}
              <div>
                <div className="flex items-center justify-between font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  <span>Tiến trình từng bưu cục:</span>
                  <span className="text-[11px] text-slate-500">
                    Ngày: <strong>{selectedDate}</strong>
                  </span>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {(sendScope === 'all' ? postOfficeReportData : displayedPostOffices).map((po, idx) => {
                    const log = batchProgress.logs.find(l => l.po === po.buuCuc);
                    const status = log?.status || 'pending';

                    return (
                      <div
                        key={po.buuCuc}
                        className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold text-[10px]">
                            {idx + 1}
                          </span>
                          <div>
                            <span className="font-bold text-slate-800 dark:text-slate-200">{po.buuCuc}</span>
                            <span className="text-[10px] text-slate-400 ml-1.5">
                              ({po.totalMembers} NV &bull; {po.totalVolume.toLocaleString('vi-VN')} đơn &bull; {po.gtcRate.toFixed(1)}% GTC)
                            </span>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div>
                          {status === 'pending' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                              Chờ xử lý
                            </span>
                          )}
                          {status === 'capturing' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 animate-pulse">
                              <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                              <span>Đang chụp ảnh...</span>
                            </span>
                          )}
                          {status === 'sending' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 animate-pulse">
                              <Send className="w-2.5 h-2.5" />
                              <span>Đang gửi Telegram...</span>
                            </span>
                          )}
                          {status === 'success' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span>Đã gửi thành công</span>
                            </span>
                          )}
                          {status === 'error' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300" title={log?.message}>
                              <X className="w-3 h-3 text-rose-600" />
                              <span>{log?.message || 'Lỗi gửi'}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Progress bar khi đang gửi */}
              {(isBatchSending || isBatchDownloading) && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-bold text-sky-600">
                    <span>{isBatchSending ? 'Đang gửi ảnh qua Telegram...' : 'Đang tải ảnh về máy...'}</span>
                    <span>{batchProgress.current} / {batchProgress.total}</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-sky-600 h-full transition-all duration-300"
                      style={{ width: `${batchProgress.total > 0 ? (batchProgress.current / batchProgress.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setShowTelegramModal(false)}
                disabled={isBatchSending || isBatchDownloading}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold transition-all cursor-pointer disabled:opacity-40"
              >
                Đóng
              </button>

              <div className="flex items-center gap-2">
                {/* Nút Tải về máy */}
                <button
                  type="button"
                  onClick={handleStartBatchDownload}
                  disabled={isBatchSending || isBatchDownloading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-650 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer disabled:opacity-50"
                  title="Tải tất cả các tấm ảnh bưu cục về máy tính"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Tải tất cả ảnh (.PNG)</span>
                </button>

                {/* Nút Gửi Telegram */}
                <button
                  type="button"
                  onClick={handleStartBatchSend}
                  disabled={isBatchSending || isBatchDownloading}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-black transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isBatchSending ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang gửi ảnh...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>🚀 Bắt Đầu Gửi Ảnh Qua Bot</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* =========================================================================
          TOAST THÔNG BÁO TRẠNG THÁI GỬI / TẢI ẢNH
          ========================================================================= */}
      {toastMessage && (
        <div className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-2xl border flex items-center gap-2.5 text-xs font-bold transition-all duration-300 ${
          toastMessage.type === 'success'
            ? 'bg-emerald-600 text-white border-emerald-400'
            : toastMessage.type === 'error'
            ? 'bg-rose-600 text-white border-rose-400'
            : 'bg-slate-900 text-white border-slate-700'
        }`}>
          {toastMessage.type === 'success' && <Check className="w-4 h-4 text-emerald-200 shrink-0" />}
          {toastMessage.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-200 shrink-0" />}
          {toastMessage.type === 'info' && <RefreshCw className="w-4 h-4 text-sky-200 animate-spin shrink-0" />}
          <span>{toastMessage.text}</span>
          <button 
            type="button" 
            onClick={() => setToastMessage(null)}
            className="ml-2 text-white/70 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};

export default BaoCaoGtcBcTab;