import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  type AuthUser, 
  type AuthSession, 
  type UserRole, 
  getActiveSession, 
  touchSession, 
  clearSession, 
  isSessionValid, 
  getLockoutRemaining, 
  authenticateWithBackend, 
  requestOtpFromBackend, 
  verifyOtpWithBackend, 
  hasRole as checkRole
} from '../services/authService';
import {
  getStaffNoticeConfig,
  NOTICE_UPDATED_EVENT,
  startNoticeSyncHeartbeat
} from '../services/staffNoticeService';
import { sendStaffHeartbeat } from '../services/postOfficeAuthService';

import type { TabType } from '../types/dashboard';

interface AuthContextType {
  isAuthenticated: boolean;
  currentUser: AuthUser | null;
  session: AuthSession | null;
  failedAttempts: number;
  lockoutRemaining: number;
  logoutReason: string | null;
  clearLogoutReason: () => void;
  login: (username: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  verifyEmail: (email: string) => Promise<{ success: boolean; error?: string }>;
  sendZaloOtp: (phone: string) => Promise<{ success: boolean; error?: string }>;
  verifyZaloOtp: (phone: string, enteredOtp: string) => Promise<{ success: boolean; error?: string }>;
  logout: (reason?: string) => void;
  hasRole: (roles: UserRole[]) => boolean;
  canAccessTab: (tabId: TabType) => boolean;
  isNoticeAcknowledged: boolean;
  acknowledgeNotice: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<AuthSession | null>(() => getActiveSession());
  const [lockoutRemaining, setLockoutRemaining] = useState<number>(() => getLockoutRemaining());
  const [logoutReason, setLogoutReason] = useState<string | null>(null);

  const isAuthenticated = Boolean(session && isSessionValid(session));
  const currentUser = session?.user || null;

  const [isNoticeAcknowledged, setIsNoticeAcknowledged] = useState<boolean>(() => {
    const user = session?.user;
    if (user?.role === 'post_office_staff') {
      const ackFlag = sessionStorage.getItem(`ghn_staff_notice_ack_${user.username}`);
      const ackVersion = sessionStorage.getItem(`ghn_staff_notice_ack_version_${user.username}`);
      const currentConfig = getStaffNoticeConfig();
      if (ackFlag === 'true' && ackVersion && Number(ackVersion) >= (currentConfig.version || 1)) {
        return true;
      }
      return false;
    }
    return true;
  });

  const acknowledgeNotice = useCallback(() => {
    setIsNoticeAcknowledged(true);
    if (currentUser?.username) {
      const currentConfig = getStaffNoticeConfig();
      sessionStorage.setItem(`ghn_staff_notice_ack_${currentUser.username}`, 'true');
      sessionStorage.setItem(`ghn_staff_notice_ack_version_${currentUser.username}`, String(currentConfig.version || 1));
    }
  }, [currentUser]);

  // Lắng nghe lệnh cập nhật thông báo từ AM: Dashboard phân hệ nhận lệnh và cập nhật ngay lập tức (<5ms)
  useEffect(() => {
    const handleNoticeRealtimeUpdate = () => {
      if (currentUser?.role === 'post_office_staff') {
        if (currentUser?.username) {
          try {
            sessionStorage.removeItem(`ghn_staff_notice_ack_${currentUser.username}`);
            sessionStorage.removeItem(`ghn_staff_notice_ack_version_${currentUser.username}`);
          } catch {}
        }
        // Khóa màn hình và bắt buộc nhân viên đọc ngay thông báo mới nhất
        setIsNoticeAcknowledged(false);
      }
    };

    window.addEventListener(NOTICE_UPDATED_EVENT, handleNoticeRealtimeUpdate);
    return () => window.removeEventListener(NOTICE_UPDATED_EVENT, handleNoticeRealtimeUpdate);
  }, [currentUser]);

  // Kích hoạt Heartbeat đồng bộ tức thời đa thiết bị (mỗi 3s)
  useEffect(() => {
    const stopHeartbeat = startNoticeSyncHeartbeat();
    return () => stopHeartbeat();
  }, []);

  // Gửi heartbeat duy trì trạng thái online / đang cập nhật cho nhân viên bưu cục (mỗi 10s cập nhật liên tục)
  useEffect(() => {
    if (!isAuthenticated || !currentUser?.username) return;

    sendStaffHeartbeat(currentUser.username, currentUser.assignedPostOffice);

    const heartbeatTimer = setInterval(() => {
      sendStaffHeartbeat(currentUser.username, currentUser.assignedPostOffice);
    }, 10000);

    return () => clearInterval(heartbeatTimer);
  }, [isAuthenticated, currentUser]);

  // Countdown timer for 60s lockout
  useEffect(() => {
    if (lockoutRemaining <= 0) return;

    const interval = setInterval(() => {
      const remaining = getLockoutRemaining();
      setLockoutRemaining(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lockoutRemaining]);

  const clearLogoutReason = useCallback(() => {
    setLogoutReason(null);
  }, []);

  const logout = useCallback((reason?: string) => {
    setIsNoticeAcknowledged(false);
    clearSession();
    try {
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('ghn_staff_notice_ack_')) {
          sessionStorage.removeItem(key);
        }
      });
    } catch {
      // ignore
    }
    setSession(null);
    if (reason) {
      setLogoutReason(reason);
    }
  }, []);

  // Secure asynchronous login via backend
  const login = async (username: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    if (lockoutRemaining > 0) {
      return { 
        success: false, 
        error: `Hệ thống đang tạm khóa bảo vệ do nhập sai quá 5 lần. Vui lòng thử lại sau ${lockoutRemaining}s!` 
      };
    }

    const trimmedUser = username.trim();
    const trimmedPass = pass.trim();

    if (!trimmedUser || !trimmedPass) {
      return { success: false, error: 'Vui lòng nhập đầy đủ tài khoản và mật khẩu!' };
    }

    const result = await authenticateWithBackend({
      username: trimmedUser,
      password: trimmedPass
    });

    if (result.success && result.session) {
      // Khi nhân viên đăng nhập thành công, bắt buộc hiển thị thông báo trước khi vào dashboard
      if (result.session.user.role === 'post_office_staff') {
        setIsNoticeAcknowledged(false);
        try {
          sessionStorage.removeItem(`ghn_staff_notice_ack_${result.session.user.username}`);
        } catch {
          // ignore
        }
      } else {
        setIsNoticeAcknowledged(true);
      }
      setSession(result.session);
      setLockoutRemaining(0);
      return { success: true };
    }

    if (result.lockoutRemaining) {
      setLockoutRemaining(result.lockoutRemaining);
    }

    return {
      success: false,
      error: result.error || 'Tài khoản hoặc mật khẩu không chính xác!'
    };
  };

  // Secure asynchronous email verification via backend
  const verifyEmail = async (email: string): Promise<{ success: boolean; error?: string }> => {
    const cleaned = email.trim().toLowerCase();
    if (!cleaned) {
      return { success: false, error: 'Vui lòng nhập địa chỉ Email xác thực!' };
    }

    const result = await authenticateWithBackend({
      username: cleaned,
      email: cleaned
    });

    if (result.success) {
      // Email recovery only initiates the recovery process, NEVER creates an authenticated session or logs in!
      return { success: true };
    }

    return {
      success: false,
      error: result.error || 'Địa chỉ Email xác thực không khớp với thông tin quản trị viên!'
    };
  };

  // Dispatch OTP via Backend
  const sendZaloOtp = async (phone: string): Promise<{ success: boolean; error?: string }> => {
    const result = await requestOtpFromBackend(phone);
    return {
      success: result.success,
      error: result.error
    };
  };

  // Verify OTP via Backend (NO fixed OTP bypass permitted)
  const verifyZaloOtp = async (phone: string, enteredOtp: string): Promise<{ success: boolean; error?: string }> => {
    const result = await verifyOtpWithBackend(phone, enteredOtp);
    if (result.success && result.session) {
      setSession(result.session);
      setLockoutRemaining(0);
      return { success: true };
    }

    return {
      success: false,
      error: result.error || 'Mã OTP không chính xác hoặc đã hết hiệu lực!'
    };
  };

  const hasRole = useCallback((roles: UserRole[]): boolean => {
    return checkRole(currentUser?.role, roles);
  }, [currentUser]);

  const canAccessTab = useCallback((tabId: TabType): boolean => {
    if (!currentUser) return false;
    // AM Huy và Admin có quyền xem tất cả các tab
    if (currentUser.role === 'admin' || currentUser.role === 'area_manager' || currentUser.username === 'huyamdnb') {
      return true;
    }
    // Tab quản trị phân hệ bưu cục CHỈ DÀNH RIÊNG cho AM Huy
    if (tabId === 'quan_ly_buu_cuc') {
      return false;
    }
    // Nhân viên bưu cục chỉ xem các tab được cấp trong allowedTabs
    if (currentUser.role === 'post_office_staff') {
      const allowed = currentUser.allowedTabs || [];
      return allowed.includes(tabId);
    }
    return false;
  }, [currentUser]);

  // Logic tự động đăng xuất sau 60 phút không thao tác (60-minute Idle Auto-Logout - Cả Dashboard nguồn & Phân hệ)
  useEffect(() => {
    if (!isAuthenticated || !session) return;

    let lastRecorded = Date.now();

    const handleUserActivity = () => {
      const now = Date.now();
      // Throttle cập nhật mỗi 5 giây để tối ưu tài nguyên
      if (now - lastRecorded > 5000) {
        lastRecorded = now;
        touchSession(session);
      }
    };

    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    activityEvents.forEach(evt => {
      window.addEventListener(evt, handleUserActivity, { passive: true });
    });

    // Kiểm tra định kỳ mỗi 5 giây
    const idleCheckInterval = setInterval(() => {
      const active = getActiveSession();
      if (!active || !isSessionValid(active)) {
        logout('Phiên làm việc đã hết hạn hoặc không có thao tác trong 60 phút. Vui lòng đăng nhập lại để tiếp tục.');
      }
    }, 5000);

    return () => {
      activityEvents.forEach(evt => {
        window.removeEventListener(evt, handleUserActivity);
      });
      clearInterval(idleCheckInterval);
    };
  }, [isAuthenticated, session, logout]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        currentUser,
        session,
        failedAttempts: 0,
        lockoutRemaining,
        logoutReason,
        clearLogoutReason,
        login,
        verifyEmail,
        sendZaloOtp,
        verifyZaloOtp,
        logout,
        hasRole,
        canAccessTab,
        isNoticeAcknowledged,
        acknowledgeNotice
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
