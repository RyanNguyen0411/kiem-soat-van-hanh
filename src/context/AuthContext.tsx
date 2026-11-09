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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<AuthSession | null>(() => getActiveSession());
  const [lockoutRemaining, setLockoutRemaining] = useState<number>(() => getLockoutRemaining());
  const [logoutReason, setLogoutReason] = useState<string | null>(null);

  const isAuthenticated = Boolean(session && isSessionValid(session));
  const currentUser = session?.user || null;

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
    clearSession();
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

    if (result.success && result.session) {
      setSession(result.session);
      setLockoutRemaining(0);
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

  // Logic tự động đăng xuất sau 10 phút không thao tác (10-minute Idle Auto-Logout)
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
        logout('Phiên làm việc đã hết hạn hoặc không có thao tác trong 10 phút. Vui lòng đăng nhập lại để tiếp tục.');
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
        hasRole
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
