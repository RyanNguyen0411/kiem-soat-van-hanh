import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  Building2, 
  Users, 
  Key, 
  Unlock, 
  Lock, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Search, 
  Plus, 
  Trash2, 
  ChevronRight, 
  ChevronDown, 
  FolderTree, 
  Eye, 
  EyeOff, 
  Download, 
  X,
  Sparkles,
  MessageSquareText,
  Send,
  RotateCcw,
  Info,
  RefreshCw,
  Activity,
  Wifi,
  WifiOff,
  Smartphone
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Bar, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip 
} from 'recharts';
import { 
  getPostOfficeAccounts, 
  getLoginAudits, 
  fetchRealtimeAudits,
  resetAccountLockout, 
  changePostOfficePassword, 
  addPostOfficeUser, 
  removePostOfficeUser, 
  updateTabPermission, 
  updatePostOfficeTabPermission, 
  OFFICIAL_POST_OFFICES, 
  ALL_ASSIGNABLE_TABS,
  type PostOfficeAccount, 
  type LoginAuditRecord,
  type UserOnlineStatus
} from '../services/postOfficeAuthService';
import {
  getStaffNoticeConfig,
  saveStaffNoticeConfig,
  resetStaffNoticeToDefault,
  formatNoticeDate,
  NOTICE_UPDATED_EVENT,
  type StaffNoticeConfig
} from '../services/staffNoticeService';
import { StaffNoticeModal } from '../components/auth/StaffNoticeModal';
import type { TabType } from '../types/dashboard';

export const PostOfficeManagementTab: React.FC = () => {
  const [accounts, setAccounts] = useState<PostOfficeAccount[]>(() => getPostOfficeAccounts());
  const [audits, setAudits] = useState<LoginAuditRecord[]>(() => getLoginAudits());

  // State giám sát online/offline & Realtime audit từ serverless
  const [userStatusMap, setUserStatusMap] = useState<Record<string, UserOnlineStatus>>({});
  const [isSyncingRealtime, setIsSyncingRealtime] = useState<boolean>(false);
  const [selectedUserDetail, setSelectedUserDetail] = useState<{
    username: string;
    postOffice: string;
    displayName: string;
    isOnline: boolean;
    lastLoginStr?: string;
    lastSeenStr?: string;
    device?: string;
    ip?: string;
  } | null>(null);

  // Đồng bộ audits và trạng thái online thời gian thực
  const refreshAuditsRealtime = useCallback(async () => {
    setIsSyncingRealtime(true);
    try {
      const res = await fetchRealtimeAudits();
      if (res?.audits && res.audits.length > 0) {
        setAudits(res.audits);
      }
      if (res?.userStatusMap) {
        setUserStatusMap(res.userStatusMap);
      }
    } finally {
      setIsSyncingRealtime(false);
    }
  }, []);

  // Tự động polling realtime mỗi 5 giây
  useEffect(() => {
    refreshAuditsRealtime();
    const interval = setInterval(refreshAuditsRealtime, 5000);
    return () => clearInterval(interval);
  }, [refreshAuditsRealtime]);

  // Lắng nghe sự kiện cập nhật tài khoản và audit
  useEffect(() => {
    const handleAccUpdate = () => setAccounts(getPostOfficeAccounts());
    const handleAuditUpdate = (e?: any) => {
      if (e?.detail?.audits) {
        setAudits(e.detail.audits);
        if (e.detail.userStatusMap) setUserStatusMap(e.detail.userStatusMap);
      } else {
        setAudits(getLoginAudits());
      }
    };

    window.addEventListener('ghn_po_accounts_updated', handleAccUpdate);
    window.addEventListener('ghn_po_audits_updated', handleAuditUpdate);

    return () => {
      window.removeEventListener('ghn_po_accounts_updated', handleAccUpdate);
      window.removeEventListener('ghn_po_audits_updated', handleAuditUpdate);
    };
  }, []);

  // Thông báo Toast thao tác
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const showToast = (type: 'success' | 'error' | 'info', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // State bộ lọc bảng kê nhật ký
  const [auditFilterPo, setAuditFilterPo] = useState<string>('all');
  const [auditFilterStatus, setAuditFilterStatus] = useState<string>('all');
  const [auditSearchQuery, setAuditSearchQuery] = useState<string>('');

  // State Modal đổi mật khẩu
  const [pwdModalUser, setPwdModalUser] = useState<PostOfficeAccount | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState<string>('');
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});

  // State Modal thêm nhân viên mới
  const [showAddUserModal, setShowAddUserModal] = useState<boolean>(false);
  const [newUsername, setNewUsername] = useState<string>('');
  const [newDisplayName, setNewDisplayName] = useState<string>('');
  const [newPoSelect, setNewPoSelect] = useState<string>(OFFICIAL_POST_OFFICES[0].name);
  const [newPassInput, setNewPassInput] = useState<string>('');

  // State Cây Sơ Đồ Phân Quyền (Accordion bưu cục)
  const [expandedTreePos, setExpandedTreePos] = useState<Record<string, boolean>>({
    '22206000': true,
    '21710000': false,
    '22849000': false,
    '23220000': false,
    '21529000': false
  });

  const toggleTreePo = (poCode: string) => {
    setExpandedTreePos(prev => ({ ...prev, [poCode]: !prev[poCode] }));
  };

  // State Quản Lý & Cập Nhật Thông Báo Phân Hệ Nhân Viên
  const [noticeState, setNoticeState] = useState<StaffNoticeConfig>(() => getStaffNoticeConfig());
  const [noticeTitle, setNoticeTitle] = useState<string>(noticeState.title);
  const [noticeBannerTag, setNoticeBannerTag] = useState<string>(noticeState.bannerTag);
  const [noticeGreeting, setNoticeGreeting] = useState<string>(noticeState.greeting);
  const [noticeContent, setNoticeContent] = useState<string>(noticeState.content);
  const [noticeClosing, setNoticeClosing] = useState<string>(noticeState.closingGreeting);
  const [noticeSender, setNoticeSender] = useState<string>(noticeState.sender);
  const [isPreviewNoticeOpen, setIsPreviewNoticeOpen] = useState<boolean>(false);

  useEffect(() => {
    const handleNoticeUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<StaffNoticeConfig>;
      const latest = customEvent.detail || getStaffNoticeConfig();
      setNoticeState(latest);
      setNoticeTitle(latest.title);
      setNoticeBannerTag(latest.bannerTag);
      setNoticeGreeting(latest.greeting);
      setNoticeContent(latest.content);
      setNoticeClosing(latest.closingGreeting);
      setNoticeSender(latest.sender);
    };

    window.addEventListener(NOTICE_UPDATED_EVENT, handleNoticeUpdate);
    return () => window.removeEventListener(NOTICE_UPDATED_EVENT, handleNoticeUpdate);
  }, []);

  // Xử lý Lưu & Cập Nhật Thông Báo Phân Hệ
  const handleSaveNotice = () => {
    if (!noticeContent.trim()) {
      showToast('error', 'Nội dung thông báo không được để trống!');
      return;
    }
    const res = saveStaffNoticeConfig({
      title: noticeTitle,
      bannerTag: noticeBannerTag,
      greeting: noticeGreeting,
      content: noticeContent,
      closingGreeting: noticeClosing,
      sender: noticeSender
    });

    if (res.success) {
      setNoticeState(res.config);
      showToast('success', res.message);
    } else {
      showToast('error', res.message);
    }
  };

  // Khôi phục về mẫu thông báo tinh gọn mặc định
  const handleResetNoticeDefault = () => {
    const resetCfg = resetStaffNoticeToDefault();
    setNoticeState(resetCfg);
    setNoticeTitle(resetCfg.title);
    setNoticeBannerTag(resetCfg.bannerTag);
    setNoticeGreeting(resetCfg.greeting);
    setNoticeContent(resetCfg.content);
    setNoticeClosing(resetCfg.closingGreeting);
    setNoticeSender(resetCfg.sender);
    showToast('info', 'Đã khôi phục về mẫu thông báo tinh gọn mặc định.');
  };

  // Nạp nhanh mẫu Siêu Sale
  const handleApplySaleTemplate = () => {
    setNoticeBannerTag('CHIẾN DỊCH SIÊU SALE');
    setNoticeGreeting('Thông báo cao điểm: Đợt Siêu Sale sàn TMĐT (Shopee / TikTok Shop)!');
    setNoticeContent(`1. DỰ BÁO SẢN LƯỢNG CAO ĐIỂM
• Dự kiến sản lượng toàn tuyến tăng +90% đến +140% so với ngày thường.
• Điểm nóng giao nhận: Phước Lý, Rạch Kiến và Cần Đước 1.

2. KẾ HOẠCH PHÂN BỔ CA & ĐIỀU PHỐI
• Ca sáng: Xuất tuyến sớm trước 07h45, tập trung giao dứt điểm đơn D+1 và D+2.
• Ca chiều: Điều động bưu tá hỗ trợ tuyến quá tải, tuyệt đối không để dồn ứ đơn tại bưu cục.

3. KIỂM SOÁT TỒN ĐỌNG & SLA GIAO NHẬN
• Giám sát sát sao chỉ số GTC ngày, hạn chế tối đa phát sinh tồn lưu kho quá 24h.
• Cập nhật trạng thái phát hàng ngay trên App, không để phát sinh đơn không rõ lý do.

4. BẢO MẬT TÀI KHOẢN & SỐ LIỆU NỘI BỘ
• Bưu cục sử dụng đúng tài khoản được cấp. Mọi vấn đề phát sinh liên hệ AM Huy hỗ trợ ngay.`);
    showToast('info', 'Đã nạp mẫu thông báo Chiến Dịch Siêu Sale.');
  };

  // Nạp nhanh mẫu Siết Tồn Backlog
  const handleApplyBacklogTemplate = () => {
    setNoticeBannerTag('CẢNH BÁO TỒN ĐỌNG');
    setNoticeGreeting('Chỉ đạo AM: Siết chặt kiểm soát tồn đọng GLT và xử lý dứt điểm đơn tồn kho!');
    setNoticeContent(`1. MỤC TIÊU GIẢM TỒN TRONG CA
• Yêu cầu 100% bưu cục rà soát kho, giải phóng triệt để đơn tồn GLT 120h và 192h.
• Các đơn tồn Luân Chuyển (LC) phải được kiểm đếm và khớp dữ liệu ca trước 11h00.

2. PHÂN CÔNG XỬ LÝ ĐƠN TỒN KHÓ PHÁT
• Bưu tá chủ động liên hệ lại người nhận, hẹn ca giao lại hoặc cập nhật nguyên nhân chính xác.
• NVXL bưu cục chủ động báo cáo AM khi có dấu hiệu nghẽn tuyến hoặc quá tải cục bộ.

3. CAM KẾT CHỈ SỐ GTC
• Quyết tâm giữ vững chỉ số GTC bưu cục đạt trên 92% toàn ca.
• Toàn thể anh em nỗ lực hoàn thành kế hoạch vận hành hôm nay!`);
    showToast('info', 'Đã nạp mẫu thông báo Cảnh Báo Tồn Đọng.');
  };

  // Thống kê tổng quan KPI Cards
  const stats = useMemo(() => {
    const totalUsers = accounts.length;
    const lockedCount = accounts.filter(a => a.isLocked).length;
    const activeCount = accounts.filter(a => a.isActive).length;
    const totalLoginsSuccess = audits.filter(a => a.status === 'SUCCESS').length;
    const totalLoginsFailed = audits.filter(a => a.status !== 'SUCCESS').length;

    return {
      totalUsers,
      lockedCount,
      activeCount,
      totalLoginsSuccess,
      totalLoginsFailed
    };
  }, [accounts, audits]);

  // Dữ liệu cho Biểu đồ Cột kết hợp Đường (Combo Chart)
  // Cột: Số lượt đăng nhập của 5 Bưu cục
  // Đường: Tỷ lệ / chỉ số đăng nhập thành công
  const comboChartData = useMemo(() => {
    return OFFICIAL_POST_OFFICES.map(po => {
      const poAudits = audits.filter(a => a.postOffice.includes(po.shortName) || a.postOfficeCode === po.code);
      const successCount = poAudits.filter(a => a.status === 'SUCCESS').length;
      const failedCount = poAudits.filter(a => a.status !== 'SUCCESS').length;
      const total = poAudits.length;
      const successRate = total > 0 ? Math.round((successCount / total) * 100) : 100;

      return {
        name: po.shortName,
        fullName: po.name,
        code: po.code,
        successLogins: successCount,
        failedLogins: failedCount,
        totalLogins: total,
        successRate: successRate
      };
    });
  }, [audits]);

  // Danh sách nhật ký đã lọc
  const filteredAudits = useMemo(() => {
    return audits.filter(item => {
      if (auditFilterPo !== 'all' && !item.postOffice.includes(auditFilterPo) && item.postOfficeCode !== auditFilterPo) {
        return false;
      }
      if (auditFilterStatus !== 'all' && item.status !== auditFilterStatus) {
        return false;
      }
      if (auditSearchQuery.trim()) {
        const q = auditSearchQuery.toLowerCase().trim();
        const match = 
          item.username.toLowerCase().includes(q) ||
          item.postOffice.toLowerCase().includes(q) ||
          (item.ipAddress && item.ipAddress.toLowerCase().includes(q)) ||
          (item.note && item.note.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [audits, auditFilterPo, auditFilterStatus, auditSearchQuery]);

  // Danh sách user nhân viên phục vụ giám sát trạng thái trực tuyến (Xanh / Đỏ)
  const staffUsersToMonitor = useMemo(() => {
    return accounts.map(acc => {
      const status = userStatusMap[acc.username];
      const userAudits = audits.filter(a => a.username === acc.username);
      const latestAudit = userAudits[0];
      const isOnline = Boolean(status?.isOnline);
      const lastLoginStr = status?.lastLoginStr || (latestAudit ? `${latestAudit.timeStr} ngày ${latestAudit.dateStr}` : 'Chưa có ghi nhận');
      const lastSeenStr = status?.lastSeenStr || (isOnline ? 'Đang mở dashboard' : 'Chưa có tín hiệu');

      return {
        ...acc,
        isOnline,
        lastLoginStr,
        lastSeenStr,
        device: status?.device || latestAudit?.device || 'Desktop (Windows/Chrome)',
        ip: status?.ip || latestAudit?.ipAddress || '113.161.78.10'
      };
    });
  }, [accounts, userStatusMap, audits]);

  const onlineCount = useMemo(() => staffUsersToMonitor.filter(u => u.isOnline).length, [staffUsersToMonitor]);
  const offlineCount = useMemo(() => staffUsersToMonitor.length - onlineCount, [staffUsersToMonitor, onlineCount]);

  // Nhật ký của user đang được chọn xem chi tiết lần đăng nhập gần nhất
  const selectedUserAudits = useMemo(() => {
    if (!selectedUserDetail) return [];
    return audits.filter(a => a.username === selectedUserDetail.username);
  }, [selectedUserDetail, audits]);

  // Mở modal xem lần đăng nhập gần nhất của user
  const handleOpenUserDetail = useCallback((username: string, postOffice: string, displayName?: string) => {
    const statusInfo = userStatusMap[username];
    const userAudits = audits.filter(a => a.username === username);
    const latestAudit = userAudits[0];
    const isOnline = Boolean(statusInfo?.isOnline);
    const acc = accounts.find(a => a.username === username);

    setSelectedUserDetail({
      username,
      postOffice: postOffice || acc?.postOffice || 'Long An',
      displayName: displayName || acc?.displayName || `Nhân Viên (${username})`,
      isOnline,
      lastLoginStr: statusInfo?.lastLoginStr || (latestAudit ? `${latestAudit.timeStr} ngày ${latestAudit.dateStr}` : 'Chưa có ghi nhận đăng nhập'),
      lastSeenStr: statusInfo?.lastSeenStr || (isOnline ? 'Vừa mới (Đang mở dashboard)' : 'Ngoại tuyến'),
      device: statusInfo?.device || latestAudit?.device || 'Desktop (Windows/Chrome)',
      ip: statusInfo?.ip || latestAudit?.ipAddress || '113.161.78.10'
    });
  }, [userStatusMap, audits, accounts]);

  // Xử lý Mở khóa tài khoản bị nhập sai 5 lần
  const handleUnlockUser = (username: string) => {
    const res = resetAccountLockout(username);
    if (res.success) {
      showToast('success', res.message);
      setAccounts(getPostOfficeAccounts());
      setAudits(getLoginAudits());
    } else {
      showToast('error', res.message);
    }
  };

  // Xử lý Đổi Mật Khẩu
  const handleConfirmChangePassword = () => {
    if (!pwdModalUser) return;
    if (!newPasswordInput.trim()) {
      showToast('error', 'Vui lòng nhập mật khẩu mới!');
      return;
    }
    const res = changePostOfficePassword(pwdModalUser.username, newPasswordInput);
    if (res.success) {
      showToast('success', res.message);
      setAccounts(getPostOfficeAccounts());
      setAudits(getLoginAudits());
      setPwdModalUser(null);
      setNewPasswordInput('');
    } else {
      showToast('error', res.message);
    }
  };

  // Xử lý Thêm User mới
  const handleCreateNewUser = () => {
    if (!newUsername.trim()) {
      showToast('error', 'Vui lòng nhập mã / tên đăng nhập!');
      return;
    }
    if (!newPassInput.trim()) {
      showToast('error', 'Vui lòng nhập mật khẩu!');
      return;
    }
    const poMeta = OFFICIAL_POST_OFFICES.find(p => p.name === newPoSelect);
    const res = addPostOfficeUser({
      username: newUsername.trim(),
      password: newPassInput.trim(),
      postOffice: newPoSelect,
      postOfficeCode: poMeta?.code,
      displayName: newDisplayName.trim() || `Nhân Viên ${newPoSelect} (${newUsername.trim()})`
    });

    if (res.success) {
      showToast('success', res.message);
      setAccounts(getPostOfficeAccounts());
      setAudits(getLoginAudits());
      setShowAddUserModal(false);
      setNewUsername('');
      setNewDisplayName('');
      setNewPassInput('');
    } else {
      showToast('error', res.message);
    }
  };

  // Xử lý Xóa / Chặn User khi nhân viên nghỉ việc
  const handleDeleteUser = (username: string, poName: string) => {
    if (window.confirm(`Xác nhận xóa tài khoản ${username} thuộc ${poName}? Nhân viên này sẽ không thể đăng nhập vào hệ thống nữa.`)) {
      const res = removePostOfficeUser(username);
      if (res.success) {
        showToast('success', res.message);
        setAccounts(getPostOfficeAccounts());
        setAudits(getLoginAudits());
      } else {
        showToast('error', res.message);
      }
    }
  };

  // Xử lý Bật/Tắt quyền trên Cây Sơ Đồ
  const handleToggleTabPermission = (username: string, tabId: TabType, currentGranted: boolean) => {
    const res = updateTabPermission(username, tabId, !currentGranted);
    if (res.success) {
      setAccounts(getPostOfficeAccounts());
      showToast('info', res.message);
    }
  };

  // Bật/tắt 1 tab cho toàn bộ bưu cục
  const handleTogglePoTabPermission = (poCode: string, tabId: TabType, isGranted: boolean) => {
    const res = updatePostOfficeTabPermission(poCode, tabId, isGranted);
    if (res.success) {
      setAccounts(getPostOfficeAccounts());
      showToast('success', res.message);
    }
  };

  // Xuất file CSV nhật ký đăng nhập
  const handleExportAuditsCSV = () => {
    const headers = ['Thời Gian', 'Ngày', 'Bưu Cục', 'Mã BC', 'Tài Khoản', 'Trạng Thái', 'Thiết Bị', 'IP Mạng', 'Ghi Chú'];
    const rows = filteredAudits.map(a => [
      a.timeStr,
      a.dateStr,
      `"${a.postOffice}"`,
      a.postOfficeCode,
      a.username,
      a.status === 'SUCCESS' ? 'Thành công' : a.status === 'FAILED_PASSWORD' ? 'Sai mật khẩu' : 'Đã bị khóa',
      `"${a.device || 'N/A'}"`,
      a.ipAddress || 'N/A',
      `"${a.note || ''}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `nhat_ky_dang_nhap_buu_cuc_ghn_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300 text-slate-100">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-bold border transition-all ${
          toastMessage.type === 'success' 
            ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/50' 
            : toastMessage.type === 'error'
              ? 'bg-rose-950/90 text-rose-200 border-rose-500/50'
              : 'bg-blue-950/90 text-blue-200 border-blue-500/50'
        }`}>
          {toastMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          {toastMessage.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-400" />}
          {toastMessage.type === 'info' && <Sparkles className="w-4 h-4 text-blue-400" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header Banner Phân Hệ */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-orange-950/40 p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-orange-600 text-white flex items-center justify-center font-black shadow-lg shadow-orange-600/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
                PHÂN HỆ BƯU CỤC & GIÁM SÁT TRUY CẬP
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 uppercase">
                  AM Long An
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Quản trị tài khoản 5 bưu cục, giám sát lượt vào hệ thống, mở khóa 5 lần sai, đổi mật khẩu và phân quyền xem dữ liệu
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowAddUserModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs shadow-md shadow-orange-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm User Mới</span>
          </button>

          <button
            type="button"
            onClick={handleExportAuditsCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs transition-colors cursor-pointer"
            title="Xuất nhật ký đăng nhập sang file CSV"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Xuất Nhật Ký</span>
          </button>
        </div>
      </div>

      {/* 1. KHỐI KPI STATS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Tổng số tài khoản */}
        <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold">Tài Khoản Nhân Viên</span>
            <Users className="w-4 h-4 text-orange-400" />
          </div>
          <div className="text-2xl font-black text-white">{stats.totalUsers}</div>
          <div className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1 font-medium">
            <span>{stats.activeCount} đang hoạt động</span>
            <span>&bull;</span>
            <span className="text-slate-400">5 Bưu cục</span>
          </div>
        </div>

        {/* Card 2: Tài khoản bị khóa (Báo động) */}
        <div className={`p-3.5 rounded-xl border transition-all relative overflow-hidden shadow-lg ${
          stats.lockedCount > 0 
            ? 'bg-rose-950/40 border-rose-500/60 ring-1 ring-rose-500' 
            : 'bg-slate-900/90 border-slate-800'
        }`}>
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold">Tài Khoản Bị Khóa</span>
            <Lock className={`w-4 h-4 ${stats.lockedCount > 0 ? 'text-rose-400 animate-pulse' : 'text-slate-500'}`} />
          </div>
          <div className={`text-2xl font-black ${stats.lockedCount > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
            {stats.lockedCount}
          </div>
          <div className="text-[11px] mt-0.5 font-medium">
            {stats.lockedCount > 0 ? (
              <span className="text-rose-300 font-bold">Cần AM mở khóa ngay</span>
            ) : (
              <span className="text-slate-400">Không có tài khoản bị khóa</span>
            )}
          </div>
        </div>

        {/* Card 3: Lượt đăng nhập thành công */}
        <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold">Lượt Vào Hệ Thống</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">{stats.totalLoginsSuccess}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Ghi nhận tự động thời gian thực
          </div>
        </div>

        {/* Card 4: Nhập sai mật khẩu */}
        <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold">Lượt Nhập Sai Pass</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">{stats.totalLoginsFailed}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Cảnh báo chống xâm phạm bưu cục
          </div>
        </div>
      </div>

      {/* 2. BIỂU ĐỒ CỘT KẾT HỢP ĐƯỜNG (COMBO CHART: BAR & LINE) */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 sm:p-5 rounded-2xl shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-800/80 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-orange-500" />
              <span>CHỈ SỐ TRUY CẬP HỆ THỐNG THEO TỪNG BƯU CỤC</span>
            </h3>
            <p className="text-xs text-slate-400">
              Biểu đồ cột (Số lượt đăng nhập thành công / thất bại) kết hợp biểu đồ đường (Tỷ lệ vào hệ thống chuẩn %)
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-500" /> Đăng nhập thành công
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-rose-500" /> Nhập sai mật khẩu
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-amber-400" /> Tỷ lệ % thành công
            </span>
          </div>
        </div>

        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={comboChartData} margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
              <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#cbd5e1', fontSize: 11 }} />
              <YAxis yAxisId="left" stroke="#94a3b8" tick={{ fill: '#cbd5e1', fontSize: 11 }} label={{ value: 'Lượt', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" domain={[0, 100]} stroke="#f59e0b" tick={{ fill: '#f59e0b', fontSize: 11 }} unit="%" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', color: '#fff', fontSize: '12px' }}
                formatter={(value: any, name: any) => {
                  if (name === 'successRate') return [`${value}%`, 'Tỷ lệ thành công'];
                  if (name === 'successLogins') return [`${value} lượt`, 'Thành công'];
                  if (name === 'failedLogins') return [`${value} lượt`, 'Sai mật khẩu'];
                  return [value, name];
                }}
              />
              <Bar yAxisId="left" dataKey="successLogins" name="successLogins" fill="#10b981" radius={[4, 4, 0, 0]} barSize={24} />
              <Bar yAxisId="left" dataKey="failedLogins" name="failedLogins" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={24} />
              <Line yAxisId="right" type="monotone" dataKey="successRate" name="successRate" stroke="#f59e0b" strokeWidth={3} dot={{ r: 5, fill: '#f59e0b' }} activeDot={{ r: 7 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. BẢNG QUẢN LÝ TÀI KHOẢN & ĐỔI MẬT KHẨU & MỞ KHÓA 5 LẦN SAI */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Key className="w-4 h-4 text-orange-400" />
              <span>DANH SÁCH TÀI KHOẢN BƯU CỤC & THAO TÁC CỦA AM</span>
            </h3>
            <p className="text-xs text-slate-400">
              Đổi mật khẩu từng bưu cục, mở khóa khi nhân viên nhập sai quá 5 lần, hoặc xóa tài khoản nhân viên đã nghỉ
            </p>
          </div>
          <div className="text-xs text-slate-400">
            Tổng cộng: <strong className="text-orange-400 font-bold">{accounts.length}</strong> User bưu cục
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[10.5px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Bưu Cục Quản Lý</th>
                <th className="py-3 px-4">User Đăng Nhập</th>
                <th className="py-3 px-4">Mật Khẩu Hiện Tại</th>
                <th className="py-3 px-4 text-center">Trạng Thái</th>
                <th className="py-3 px-4 text-center">Số Lần Sai</th>
                <th className="py-3 px-4 text-center">Số Tab Được Cấp</th>
                <th className="py-3 px-4 text-right">Thao Tác Của AM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {accounts.map(acc => {
                const isShowingPass = showPasswordMap[acc.id] || false;
                return (
                  <tr key={acc.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                        <span>{acc.postOffice}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">Mã BC: {acc.postOfficeCode}</div>
                    </td>

                    <td className="py-3 px-4">
                      {(() => {
                        const isOnline = Boolean(userStatusMap[acc.username]?.isOnline);
                        return (
                          <button
                            type="button"
                            onClick={() => handleOpenUserDetail(acc.username, acc.postOffice, acc.displayName)}
                            className={`font-mono font-bold px-2 py-0.5 rounded border inline-flex items-center gap-1.5 transition-all cursor-pointer group ${
                              isOnline
                                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/60'
                                : 'bg-rose-950/40 border-rose-500/30 text-rose-300 hover:bg-rose-900/60'
                            }`}
                            title="Nhấn để xem lần đăng nhập gần nhất và thông tin chi tiết"
                          >
                            <span className={`w-2 h-2 rounded-full shrink-0 ${
                              isOnline ? 'bg-emerald-400 shadow-[0_0_8px_#10b981] animate-pulse' : 'bg-rose-500'
                            }`} />
                            <span className="group-hover:underline">{acc.username}</span>
                            <span className={`text-[9.5px] font-semibold px-1 py-0.2 rounded ${
                              isOnline ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                            }`}>
                              {isOnline ? 'Online' : 'Offline'}
                            </span>
                          </button>
                        );
                      })()}
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-medium text-slate-200">
                          {isShowingPass ? acc.password : '••••••••••••'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowPasswordMap(prev => ({ ...prev, [acc.id]: !prev[acc.id] }))}
                          className="text-slate-400 hover:text-slate-200 p-1 rounded"
                          title={isShowingPass ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                        >
                          {isShowingPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-center">
                      {acc.isLocked ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse">
                          <Lock className="w-3 h-3" />
                          <span>Đang Bị Khóa</span>
                        </span>
                      ) : !acc.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                          Đã Chặn
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Bình Thường</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center font-bold">
                      <span className={acc.failedAttempts >= 4 ? 'text-rose-400' : acc.failedAttempts > 0 ? 'text-amber-400' : 'text-slate-400'}>
                        {acc.failedAttempts} / 5
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center font-bold text-orange-400">
                      {acc.allowedTabs?.length || 0} Tab
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {acc.isLocked && (
                          <button
                            type="button"
                            onClick={() => handleUnlockUser(acc.username)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] shadow-sm transition-all cursor-pointer"
                            title="Mở khóa tài khoản cho nhân viên đăng nhập lại"
                          >
                            <Unlock className="w-3 h-3" />
                            <span>Mở Khóa</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setPwdModalUser(acc);
                            setNewPasswordInput('');
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-[11px] transition-colors cursor-pointer"
                          title="Đổi mật khẩu cho bưu cục này"
                        >
                          <Key className="w-3 h-3 text-amber-400" />
                          <span>Đổi Pass</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteUser(acc.username, acc.postOffice)}
                          className="text-slate-500 hover:text-rose-400 p-1 rounded transition-colors"
                          title="Xóa tài khoản này (khi nhân viên nghỉ việc)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. QUẢN LÝ & CẬP NHẬT THÔNG BÁO PHÂN HỆ BƯU CỤC (DÀNH RIÊNG CHO AM HUY) */}
      <div className="bg-slate-900/90 border border-orange-500/40 rounded-2xl shadow-xl overflow-hidden p-4 sm:p-5 space-y-4">
        {/* Tiêu đề & Thông số trạng thái thông báo */}
        <div className="border-b border-slate-800 pb-3 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <MessageSquareText className="w-5 h-5 text-orange-400" />
              <span>QUẢN LÝ & CẬP NHẬT THÔNG BÁO PHÂN HỆ BƯU CỤC</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              AM Huy chủ động cập nhật nội dung thông báo. Sau khi nhấn <strong className="text-orange-400 font-bold">"Cập Nhật Thông Báo"</strong>, Dashboard phân nhánh của nhân viên sẽ lập tức cập nhật theo nội dung thông báo mới của AM.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-400">AM cập nhật gần nhất:</span>
              <span className="text-emerald-400 font-mono font-bold">{formatNoticeDate(noticeState.updatedAt)}</span>
            </div>
            <div className="bg-orange-950/60 text-orange-300 px-2.5 py-1.5 rounded-xl border border-orange-500/30 font-bold text-[11px]">
              Phiên bản: v{noticeState.version}
            </div>
          </div>
        </div>

        {/* Khung nhập liệu chỉnh sửa thông báo của AM */}
        <div className="space-y-3.5 text-xs">
          {/* Hàng 1: Tiêu đề + Nhãn Tag + Người ký tên */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-300 font-bold mb-1">Tiêu Đề Thông Báo:</label>
              <input
                type="text"
                placeholder="Ví dụ: THÔNG BÁO & HƯỚNG DẪN SỬ DỤNG DASHBOARD VẬN HÀNH..."
                value={noticeTitle}
                onChange={e => setNoticeTitle(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500 text-xs"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1">Nhãn Phân Loại (Tag):</label>
              <input
                type="text"
                placeholder="Ví dụ: QUY ĐỊNH BẮT BUỘC, THÔNG BÁO MỚI..."
                value={noticeBannerTag}
                onChange={e => setNoticeBannerTag(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500 text-xs"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1">Người Ký Phê Duyệt:</label>
              <input
                type="text"
                placeholder="Ví dụ: AM Huy – ĐNB..."
                value={noticeSender}
                onChange={e => setNoticeSender(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-orange-400 font-bold focus:outline-none focus:ring-2 focus:ring-orange-500 text-xs"
              />
            </div>
          </div>

          {/* Hàng 2: Lời chào mở đầu */}
          <div>
            <label className="block text-slate-300 font-bold mb-1">Lời Chào Mở Đầu:</label>
            <input
              type="text"
              placeholder="Lời chào mở đầu khi nhân viên mở thông báo..."
              value={noticeGreeting}
              onChange={e => setNoticeGreeting(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 text-xs"
            />
          </div>

          {/* Hàng 3: Nội dung văn bản chính + Nút nạp mẫu nhanh */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 mb-1.5">
              <label className="text-slate-300 font-bold flex items-center gap-1.5">
                <span>Nội Dung Thông Báo Chính (Hiển thị cho nhân viên khi đăng nhập phân hệ):</span>
                <span className="text-[11px] text-slate-400 font-normal">
                  (Đoạn text do AM chủ động nhập vào)
                </span>
              </label>

              {/* Nút nạp mẫu nhanh */}
              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className="text-slate-500">Mẫu gợi ý:</span>
                <button
                  type="button"
                  onClick={handleResetNoticeDefault}
                  className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
                  title="Nạp mẫu quy định vận hành tinh gọn"
                >
                  📋 Mẫu Tinh Gọn
                </button>
                <button
                  type="button"
                  onClick={handleApplySaleTemplate}
                  className="px-2 py-0.5 rounded-md bg-orange-950/60 hover:bg-orange-900/80 text-orange-300 border border-orange-500/30 transition-colors cursor-pointer"
                  title="Nạp mẫu thông báo chiến dịch Siêu Sale sàn TMĐT"
                >
                  🔥 Mẫu Siêu Sale
                </button>
                <button
                  type="button"
                  onClick={handleApplyBacklogTemplate}
                  className="px-2 py-0.5 rounded-md bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/30 transition-colors cursor-pointer"
                  title="Nạp mẫu siết tồn Backlog 120h/192h"
                >
                  ⚡ Mẫu Siết Tồn GLT
                </button>
              </div>
            </div>

            <textarea
              rows={9}
              value={noticeContent}
              onChange={e => setNoticeContent(e.target.value)}
              placeholder="Nhập nội dung thông báo... (Hỗ trợ định dạng: 1. TIÊU ĐỀ MỤC, • Gạch đầu dòng chi tiết...)"
              className="w-full bg-slate-950/80 border border-slate-700 rounded-xl p-3 text-slate-200 font-sans leading-relaxed focus:outline-none focus:ring-2 focus:ring-orange-500 text-xs sm:text-[13px] scrollbar-thin"
            />
            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
              <span>Cú pháp đề xuất: Đánh số mục (1., 2., 3., 4.) và gạch đầu dòng (• hoặc -) để hiển thị thẻ trực quan.</span>
              <span>{noticeContent.length} ký tự &bull; {noticeContent.split('\n').filter(Boolean).length} dòng</span>
            </div>
          </div>

          {/* Hàng 4: Lời nhắn kết */}
          <div>
            <label className="block text-slate-300 font-bold mb-1">Lời Nhắn Kết Thúc:</label>
            <input
              type="text"
              placeholder="Ví dụ: Chúc toàn thể anh em vận hành thông suốt, an toàn và hiệu quả!..."
              value={noticeClosing}
              onChange={e => setNoticeClosing(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 text-xs"
            />
          </div>
        </div>

        {/* Thanh công cụ thao tác cập nhật của AM */}
        <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-[11px] sm:text-xs text-slate-400 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-orange-400 shrink-0" />
            <span>Khi AM bấm <strong>"Cập Nhật Thông Báo"</strong>, toàn bộ Dashboard phân nhánh sẽ áp dụng nội dung mới ngay lập tức.</span>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* Nút Xem Trước (Live Preview) */}
            <button
              type="button"
              onClick={() => setIsPreviewNoticeOpen(true)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98]"
              title="Xem trước thông báo hiển thị trên giao diện nhân viên bưu cục"
            >
              <Eye className="w-4 h-4 text-sky-400" />
              <span>Xem Trước (Preview)</span>
            </button>

            {/* Nút Khôi phục mẫu mặc định */}
            <button
              type="button"
              onClick={handleResetNoticeDefault}
              className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700/80 font-semibold text-xs flex items-center gap-1 transition-all cursor-pointer"
              title="Khôi phục lại mẫu thông báo tinh gọn mặc định"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Mẫu Gốc</span>
            </button>

            {/* Nút BẮN TELEGRAM BÁO CẬP NHẬT DỮ LIỆU CHO NHÂN VIÊN */}
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('open-data-update-telegram-modal'))}
              className="px-4 sm:px-5 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-sky-600/25 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer"
              title="Gửi tin nhắn Telegram thông báo đã cập nhật dữ liệu kèm tag các nhân sự"
            >
              <Send className="w-4 h-4 text-sky-200" />
              <span>📢 Bắn Tele Báo Cập Nhật Data</span>
            </button>

            {/* Nút CẬP NHẬT THÔNG BÁO CHO PHÂN HỆ */}
            <button
              type="button"
              onClick={handleSaveNotice}
              className="px-5 sm:px-6 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-black text-xs sm:text-sm shadow-lg shadow-orange-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Cập Nhật Thông Báo Cho Phân Hệ</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5. CÂY SƠ ĐỒ PHÂN QUYỀN XEM DỮ LIỆU (PERMISSION TREE VIEW) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden p-4 sm:p-5 space-y-4">
        <div className="border-b border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FolderTree className="w-4 h-4 text-orange-500" />
              <span>CÂY SƠ ĐỒ PHÂN QUYỀN XEM DỮ LIỆU TỪNG BƯU CỤC</span>
            </h3>
            <p className="text-xs text-slate-400">
              AM Huy có thể bấm tick bật hoặc tắt quyền xem bất kỳ tab nào của từng nhân viên hoặc cấp toàn bộ bưu cục
            </p>
          </div>
          <div className="text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2.5 py-1 rounded-lg font-medium">
            Mặc định: 5 Tab Vận Hành & Tồn Đọng
          </div>
        </div>

        {/* Cây phân cấp 5 bưu cục */}
        <div className="space-y-3">
          {OFFICIAL_POST_OFFICES.map(po => {
            const isExpanded = expandedTreePos[po.code] ?? false;
            const poAccounts = accounts.filter(a => a.postOffice.includes(po.shortName) || a.postOfficeCode === po.code);

            return (
              <div key={po.code} className="border border-slate-800 bg-slate-950/50 rounded-xl overflow-hidden">
                {/* Node Bưu Cục */}
                <div className="p-3 bg-slate-850/80 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => toggleTreePo(po.code)}
                    className="flex items-center gap-2 font-bold text-sm text-white hover:text-orange-400 transition-colors text-left"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-orange-400 shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                    <span>{po.name}</span>
                    <span className="text-xs font-mono text-slate-400">({po.code})</span>
                    <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-slate-800 text-slate-300">
                      {poAccounts.length} User
                    </span>
                  </button>

                  {/* Hành động nhanh: Cấp quyền nhanh cho toàn bộ bưu cục */}
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-[11px] text-slate-400 hidden md:inline">Cấp toàn bộ BC:</span>
                    <button
                      type="button"
                      onClick={() => handleTogglePoTabPermission(po.code, 'bao_cao_gtc_bc', true)}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10.5px] font-medium"
                      title="Cấp Báo Cáo Ngày cho toàn bộ user bưu cục"
                    >
                      + Báo Cáo Ngày
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTogglePoTabPermission(po.code, 'ton_dong_glt', true)}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10.5px] font-medium"
                      title="Cấp Tồn Đọng GLT cho toàn bộ user bưu cục"
                    >
                      + Tồn GLT
                    </button>
                  </div>
                </div>

                {/* Danh sách User thuộc bưu cục và ma trận quyền các Tab */}
                {isExpanded && (
                  <div className="p-3.5 space-y-4 divide-y divide-slate-850">
                    {poAccounts.map(user => {
                      const allowedSet = new Set(user.allowedTabs || []);

                      return (
                        <div key={user.id} className="pt-3 first:pt-0 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-orange-400 bg-orange-950/60 px-2 py-0.5 rounded border border-orange-500/30">
                                {user.username}
                              </span>
                              <span className="font-semibold text-slate-200">{user.displayName}</span>
                            </div>
                            <span className="text-[11px] text-slate-400">
                              Được xem: <strong>{allowedSet.size}</strong> tab
                            </span>
                          </div>

                          {/* Grid các Tab để AM tick chọn bật / tắt quyền */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 pt-1">
                            {ALL_ASSIGNABLE_TABS.map(tab => {
                              const isGranted = allowedSet.has(tab.id);

                              return (
                                <button
                                  key={tab.id}
                                  type="button"
                                  onClick={() => handleToggleTabPermission(user.username, tab.id, isGranted)}
                                  className={`p-2 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[58px] ${
                                    isGranted
                                      ? 'bg-orange-950/30 border-orange-500/60 text-white shadow-sm ring-1 ring-orange-500/30'
                                      : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-400'
                                  }`}
                                  title={`Bấm để ${isGranted ? 'TẮT' : 'BẬT'} quyền xem tab ${tab.label}: ${tab.description}`}
                                >
                                  <div className="flex items-center justify-between w-full">
                                    <span className="text-[11px] font-bold leading-tight truncate">
                                      {tab.label}
                                    </span>
                                    <span className={`w-2 h-2 rounded-full shrink-0 ${isGranted ? 'bg-orange-500 animate-pulse' : 'bg-slate-700'}`} />
                                  </div>
                                  <span className="text-[9px] text-slate-400 leading-none mt-1 truncate">
                                    {isGranted ? 'Đang được xem' : 'Đã khóa xem'}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. GIÁM SÁT TRẠNG THÁI TRỰC TUYẾN & ĐANG CẬP NHẬT CỦA NHÂN VIÊN */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>GIÁM SÁT TRẠNG THÁI TRỰC TUYẾN & ĐANG CẬP NHẬT (REALTIME)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              <span className="text-emerald-400 font-bold">XANH:</span> Đang mở dashboard & cập nhật số liệu. <span className="text-rose-400 font-bold">ĐỎ:</span> Chưa đăng nhập. Nhấn vào bất kỳ User nào để xem lần đăng nhập gần nhất.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>{onlineCount} Đang Cập Nhật</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 font-bold">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>{offlineCount} Chưa Đăng Nhập</span>
              </span>
            </div>

            <button
              type="button"
              onClick={refreshAuditsRealtime}
              disabled={isSyncingRealtime}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs transition-colors cursor-pointer disabled:opacity-60"
              title="Làm mới đồng bộ ngay lập tức"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isSyncingRealtime ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Làm Mới Realtime</span>
            </button>
          </div>
        </div>

        {/* Lưới Thẻ Giám Sát Từng Nhân Viên (Xanh: Đang cập nhật, Đỏ: Chưa đăng nhập) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
          {staffUsersToMonitor.map(staff => {
            const isOnline = staff.isOnline;
            return (
              <button
                key={staff.username}
                type="button"
                onClick={() => handleOpenUserDetail(staff.username, staff.postOffice, staff.displayName)}
                className={`p-2.5 rounded-xl border text-left transition-all hover:scale-[1.02] cursor-pointer flex flex-col justify-between gap-2 shadow-sm ${
                  isOnline 
                    ? 'bg-emerald-950/30 border-emerald-500/40 hover:border-emerald-400 hover:bg-emerald-950/50 hover:shadow-emerald-950/40' 
                    : 'bg-rose-950/20 border-rose-500/30 hover:border-rose-400 hover:bg-rose-950/40'
                }`}
                title="Nhấn để xem chi tiết và lần đăng nhập gần nhất"
              >
                <div className="flex items-start justify-between gap-1">
                  <span className="font-mono font-black text-sm text-white">{staff.username}</span>
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 mt-0.5 ${
                    isOnline ? 'bg-emerald-400 shadow-[0_0_8px_#10b981] animate-pulse' : 'bg-rose-500'
                  }`} />
                </div>

                <div>
                  <div className="text-[11px] font-bold text-slate-200 truncate">{staff.postOffice}</div>
                  <div className="text-[10px] text-slate-400 truncate">{staff.displayName}</div>
                </div>

                <div className="pt-1.5 border-t border-slate-800/80">
                  <div className={`text-[9.5px] font-bold uppercase tracking-wider flex items-center gap-1 ${isOnline ? 'text-emerald-400' : 'text-rose-400'}`}>
                    <span>{isOnline ? '🟢 ĐANG CẬP NHẬT' : '🔴 CHƯA ĐĂNG NHẬP'}</span>
                  </div>
                  <div className="text-[9.5px] text-slate-400 font-mono truncate mt-0.5">
                    {staff.lastLoginStr ? staff.lastLoginStr.split(' ngày ')[0] : 'Chưa vào'}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 7. BẢNG KÊ CHI TIẾT LƯỢT ĐĂNG NHẬP THEO TỪNG MỐC THỜI GIAN */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span>BẢNG KÊ CHI TIẾT LƯỢT ĐĂNG NHẬP CỦA NHÂN VIÊN THEO MỐC THỜI GIAN</span>
              </h3>
              <p className="text-xs text-slate-400">
                Lịch sử truy cập hệ thống thời gian thực của nhân viên 5 bưu cục Long An
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold px-2.5 py-1 rounded-lg bg-emerald-950/30 border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Tự động đồng bộ Realtime (5s)</span>
              </div>
              <button
                type="button"
                onClick={refreshAuditsRealtime}
                disabled={isSyncingRealtime}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                title="Làm mới bảng kê thời gian thực"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isSyncingRealtime ? 'animate-spin' : ''}`} />
                <span>Làm Mới</span>
              </button>
              <div className="text-xs text-slate-400">
                Hiển thị: <strong className="text-emerald-400 font-bold">{filteredAudits.length}</strong> / {audits.length} lượt
              </div>
            </div>
          </div>

          {/* Bộ lọc bảng kê */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            {/* Lọc Bưu Cục */}
            <select
              value={auditFilterPo}
              onChange={e => setAuditFilterPo(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 font-semibold focus:outline-none focus:ring-1 focus:ring-orange-500"
            >
              <option value="all">Tất cả Bưu cục ({OFFICIAL_POST_OFFICES.length})</option>
              {OFFICIAL_POST_OFFICES.map(p => (
                <option key={p.code} value={p.shortName}>{p.name}</option>
              ))}
            </select>

            {/* Lọc Trạng thái */}
            <select
              value={auditFilterStatus}
              onChange={e => setAuditFilterStatus(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 font-semibold focus:outline-none focus:ring-1 focus:ring-orange-500"
            >
              <option value="all">Tất cả Trạng thái</option>
              <option value="SUCCESS">Thành công</option>
              <option value="FAILED_PASSWORD">Sai mật khẩu</option>
              <option value="LOCKED_MAX_ATTEMPTS">Bị khóa (Quá 5 lần)</option>
            </select>

            {/* Tìm kiếm */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Tìm theo User, Bưu cục, IP..."
                value={auditSearchQuery}
                onChange={e => setAuditSearchQuery(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-orange-500 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Danh sách bảng kê chi tiết */}
        <div className="overflow-x-auto max-h-[460px] scrollbar-thin">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10.5px] sticky top-0 z-10 border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-4">Thời Gian</th>
                <th className="py-2.5 px-4">Bưu Cục</th>
                <th className="py-2.5 px-4">User</th>
                <th className="py-2.5 px-4">Trạng Thái</th>
                <th className="py-2.5 px-4">Thiết Bị / Nền Tảng</th>
                <th className="py-2.5 px-4">IP Mạng</th>
                <th className="py-2.5 px-4">Ghi Chú Chi Tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredAudits.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500">
                    Không tìm thấy lượt đăng nhập nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredAudits.map(item => {
                  const isOnline = Boolean(userStatusMap[item.username]?.isOnline);
                  return (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <div className="font-mono font-bold text-white">{item.timeStr}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{item.dateStr}</div>
                      </td>

                      <td className="py-2.5 px-4 font-semibold text-slate-200 whitespace-nowrap">
                        {item.postOffice}
                      </td>

                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleOpenUserDetail(item.username, item.postOffice)}
                          className={`group inline-flex items-center gap-1.5 px-2 py-0.5 rounded border transition-all cursor-pointer ${
                            isOnline
                              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/60'
                              : 'bg-rose-950/40 border-rose-500/30 text-rose-300 hover:bg-rose-900/60'
                          }`}
                          title="Nhấn để xem trạng thái và lần đăng nhập gần nhất"
                        >
                          <span className={`w-2 h-2 rounded-full shrink-0 ${
                            isOnline ? 'bg-emerald-400 shadow-[0_0_8px_#10b981] animate-pulse' : 'bg-rose-500'
                          }`} />
                          <span className="font-mono font-bold group-hover:underline">{item.username}</span>
                          <span className={`text-[9.5px] font-semibold px-1 py-0.2 rounded ${
                            isOnline ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                          }`}>
                            {isOnline ? 'Đang cập nhật' : 'Offline'}
                          </span>
                        </button>
                      </td>

                      <td className="py-2.5 px-4 whitespace-nowrap">
                        {item.status === 'SUCCESS' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Thành Công</span>
                          </span>
                        ) : item.status === 'LOCKED_MAX_ATTEMPTS' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse">
                            <Lock className="w-3 h-3" />
                            <span>Bị Khóa (5 lần)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Sai Mật Khẩu</span>
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-4 text-slate-400 whitespace-nowrap text-[11px]">
                        {item.device || 'Trình duyệt Web'}
                      </td>

                      <td className="py-2.5 px-4 font-mono text-slate-400 text-[11px] whitespace-nowrap">
                        {item.ipAddress || '127.0.0.1'}
                      </td>

                      <td className="py-2.5 px-4 text-slate-400 text-[11px]">
                        {item.note || 'N/A'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: ĐỔI MẬT KHẨU BƯU CỤC */}
      {pwdModalUser && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-orange-400" />
                <h4 className="font-bold text-white text-sm">Đổi Mật Khẩu Nhân Viên Bưu Cục</h4>
              </div>
              <button
                type="button"
                onClick={() => setPwdModalUser(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <div className="text-slate-400">Tài khoản: <strong className="text-orange-400 font-mono text-sm">{pwdModalUser.username}</strong></div>
                <div className="text-slate-400">Bưu cục: <strong className="text-white">{pwdModalUser.postOffice}</strong></div>
                <div className="text-slate-400">Mật khẩu hiện tại: <span className="font-mono text-slate-300 font-semibold">{pwdModalUser.password}</span></div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Mật khẩu mới cấp cho bưu cục:</label>
                <input
                  type="text"
                  placeholder="Nhập mật khẩu mới..."
                  value={newPasswordInput}
                  onChange={e => setNewPasswordInput(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:ring-2 focus:ring-orange-500 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setPwdModalUser(null)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmChangePassword}
                className="px-4 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-md transition-colors"
              >
                Lưu Mật Khẩu Mới
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: THÊM USER NHÂN VIÊN MỚI */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-orange-400" />
                <h4 className="font-bold text-white text-sm">Thêm User Nhân Viên Bưu Cục Mới</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowAddUserModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Chọn Bưu Cục:</label>
                <select
                  value={newPoSelect}
                  onChange={e => setNewPoSelect(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500 text-xs"
                >
                  {OFFICIAL_POST_OFFICES.map(p => (
                    <option key={p.code} value={p.name}>{p.name} ({p.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">User Đăng Nhập:</label>
                <input
                  type="text"
                  placeholder="Ví dụ: 3071324..."
                  value={newUsername}
                  onChange={e => setNewUsername(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:ring-2 focus:ring-orange-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Tên Hiển Thị (Không bắt buộc):</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Quản Lý Rạch Kiến..."
                  value={newDisplayName}
                  onChange={e => setNewDisplayName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Mật Khẩu Cấp Cho Nhân Viên:</label>
                <input
                  type="text"
                  placeholder="Ví dụ: 22206000@K..."
                  value={newPassInput}
                  onChange={e => setNewPassInput(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:ring-2 focus:ring-orange-500 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowAddUserModal(false)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleCreateNewUser}
                className="px-4 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-md transition-colors"
              >
                Cấp Quyền & Tạo User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: XEM TRƯỚC THÔNG BÁO PHÂN HỆ CHO AM HUY */}
      {isPreviewNoticeOpen && (
        <StaffNoticeModal
          isPreview={true}
          previewConfig={{
            title: noticeTitle,
            bannerTag: noticeBannerTag,
            greeting: noticeGreeting,
            content: noticeContent,
            closingGreeting: noticeClosing,
            sender: noticeSender,
            updatedAt: Date.now(),
            version: noticeState.version
          }}
          onClose={() => setIsPreviewNoticeOpen(false)}
        />
      )}

      {/* MODAL 4: CHI TIẾT TRUY CẬP & LẦN ĐĂNG NHẬP GẦN NHẤT CỦA USER */}
      {selectedUserDetail && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-5 shadow-2xl space-y-4 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl ${selectedUserDetail.isOnline ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                  {selectedUserDetail.isOnline ? <Wifi className="w-5 h-5 animate-pulse" /> : <WifiOff className="w-5 h-5" />}
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm flex items-center gap-2">
                    <span>Chi Tiết Lần Đăng Nhập Gần Nhất</span>
                    <span className="font-mono text-orange-400 bg-orange-950/60 px-2 py-0.5 rounded border border-orange-500/30">
                      {selectedUserDetail.username}
                    </span>
                  </h4>
                  <p className="text-xs text-slate-400">{selectedUserDetail.displayName} &bull; {selectedUserDetail.postOffice}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUserDetail(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Trạng thái trực quan */}
            <div className={`p-4 rounded-xl border flex items-center justify-between ${
              selectedUserDetail.isOnline 
                ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200' 
                : 'bg-rose-950/40 border-rose-500/50 text-rose-200'
            }`}>
              <div className="flex items-center gap-3">
                <span className={`w-3.5 h-3.5 rounded-full ${
                  selectedUserDetail.isOnline ? 'bg-emerald-400 shadow-[0_0_12px_#10b981] animate-pulse' : 'bg-rose-500'
                }`} />
                <div>
                  <div className="font-bold text-xs uppercase tracking-wider">
                    {selectedUserDetail.isOnline ? '🟢 Đang Trực Tuyến & Cập Nhật Dữ Liệu' : '🔴 Hiện Không Đăng Nhập / Ngoại Tuyến'}
                  </div>
                  <div className="text-[11px] opacity-80 mt-0.5">
                    {selectedUserDetail.isOnline 
                      ? 'Nhân viên đang mở dashboard phân hệ và thao tác số liệu thời gian thực.' 
                      : 'Nhân viên chưa đăng nhập hoặc đã đóng phiên làm việc.'}
                  </div>
                </div>
              </div>
              <span className={`text-[11px] font-black px-2.5 py-1 rounded-full border ${
                selectedUserDetail.isOnline 
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' 
                  : 'bg-rose-500/20 border-rose-500/40 text-rose-300'
              }`}>
                {selectedUserDetail.isOnline ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>

            {/* Thẻ thông tin lần đăng nhập gần nhất */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <div className="text-slate-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Lần đăng nhập gần nhất:</span>
                </div>
                <div className="font-mono font-bold text-white text-xs pl-5">
                  {selectedUserDetail.lastLoginStr || 'Chưa ghi nhận'}
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <div className="text-slate-400 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-blue-400" />
                  <span>Tín hiệu cập nhật gần nhất:</span>
                </div>
                <div className="font-mono font-bold text-white text-xs pl-5">
                  {selectedUserDetail.lastSeenStr || (selectedUserDetail.isOnline ? 'Vừa mới đây' : 'Không có')}
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <div className="text-slate-400 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                  <span>Thiết bị / Trình duyệt:</span>
                </div>
                <div className="text-slate-200 font-medium text-xs pl-5">
                  {selectedUserDetail.device || 'Desktop (Windows/Chrome)'}
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <div className="text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                  <span>Địa chỉ IP mạng:</span>
                </div>
                <div className="font-mono font-semibold text-slate-200 text-xs pl-5">
                  {selectedUserDetail.ip || '113.161.78.10'}
                </div>
              </div>
            </div>

            {/* Lịch sử 5 lần đăng nhập gần nhất của riêng user này */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300">Lịch Sử Các Lần Đăng Nhập Của User:</span>
                <span className="text-slate-500 font-mono">{selectedUserAudits.length} lượt</span>
              </div>

              <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
                <table className="w-full text-left text-[11px] text-slate-300">
                  <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="py-2 px-3">Thời gian</th>
                      <th className="py-2 px-3">Kết quả</th>
                      <th className="py-2 px-3">Thiết bị</th>
                      <th className="py-2 px-3">IP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {selectedUserAudits.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-4 text-slate-500">
                          Chưa có nhật ký truy cập nào cho user này.
                        </td>
                      </tr>
                    ) : (
                      selectedUserAudits.slice(0, 5).map(a => (
                        <tr key={a.id} className="hover:bg-slate-900/60">
                          <td className="py-2 px-3 font-mono font-bold text-white whitespace-nowrap">
                            {a.timeStr} <span className="text-[10px] text-slate-500 font-normal">{a.dateStr}</span>
                          </td>
                          <td className="py-2 px-3">
                            {a.status === 'SUCCESS' ? (
                              <span className="text-emerald-400 font-bold">Thành Công</span>
                            ) : a.status === 'LOCKED_MAX_ATTEMPTS' ? (
                              <span className="text-rose-400 font-bold">Bị Khóa</span>
                            ) : (
                              <span className="text-amber-400 font-bold">Sai Mật Khẩu</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-slate-400 truncate max-w-[150px]">{a.device || 'N/A'}</td>
                          <td className="py-2 px-3 font-mono text-slate-400">{a.ipAddress || 'N/A'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedUserDetail(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostOfficeManagementTab;
