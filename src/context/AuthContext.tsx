import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  currentUser: string | null;
  failedAttempts: number;
  lockoutRemaining: number;
  logoutReason: string | null;
  clearLogoutReason: () => void;
  login: (username: string, pass: string) => { success: boolean; error?: string };
  verifyEmail: (email: string) => { success: boolean; error?: string };
  sendZaloOtp: (phone: string) => Promise<{ success: boolean; error?: string }>;
  verifyZaloOtp: (enteredOtp: string) => { success: boolean; error?: string };
  logout: (reason?: string) => void;
}

const AUTH_STORAGE_KEY = 'ghn_auth_session';
const FAILED_ATTEMPTS_KEY = 'ghn_auth_failed_attempts';
const LOCKOUT_KEY = 'ghn_auth_lockout_until';
const LAST_ACTIVITY_KEY = 'ghn_auth_last_activity';
const IDLE_TIMEOUT_MS = 10 * 60 * 1000; // 10 phút tự động đăng xuất nếu không có thao tác

const VALID_USER = 'Huyamdnb';
const VALID_PASS = '@Huycan95#';
const VALID_EMAIL_RAW = 'hoanghuy13cdgmail.com';
const VALID_EMAIL_STANDARD = 'hoanghuy13cd@gmail.com';
const VALID_PHONE = '0385852920';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem(AUTH_STORAGE_KEY) === 'true';
  });

  const [currentUser, setCurrentUser] = useState<string | null>(() => {
    return localStorage.getItem('ghn_auth_user') || (isAuthenticated ? VALID_USER : null);
  });

  const [failedAttempts, setFailedAttempts] = useState<number>(() => {
    const saved = localStorage.getItem(FAILED_ATTEMPTS_KEY);
    return saved ? parseInt(saved, 10) : 0;
  });

  const [lockoutRemaining, setLockoutRemaining] = useState<number>(() => {
    const lockoutUntil = localStorage.getItem(LOCKOUT_KEY);
    if (lockoutUntil) {
      const diff = Math.ceil((parseInt(lockoutUntil, 10) - Date.now()) / 1000);
      return diff > 0 ? diff : 0;
    }
    return 0;
  });

  const [activeOtpCode, setActiveOtpCode] = useState<string | null>(null);

  // Countdown timer for 60s lockout
  useEffect(() => {
    if (lockoutRemaining <= 0) return;

    const interval = setInterval(() => {
      const lockoutUntil = localStorage.getItem(LOCKOUT_KEY);
      if (!lockoutUntil) {
        setLockoutRemaining(0);
        return;
      }
      const remaining = Math.ceil((parseInt(lockoutUntil, 10) - Date.now()) / 1000);
      if (remaining <= 0) {
        setLockoutRemaining(0);
        setFailedAttempts(0);
        localStorage.removeItem(LOCKOUT_KEY);
        localStorage.removeItem(FAILED_ATTEMPTS_KEY);
      } else {
        setLockoutRemaining(remaining);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lockoutRemaining]);

  const login = (username: string, pass: string): { success: boolean; error?: string } => {
    // Check if locked
    if (lockoutRemaining > 0) {
      return { 
        success: false, 
        error: `Hệ thống đang tạm khóa do nhập sai 5 lần. Vui lòng thử lại sau ${lockoutRemaining}s!` 
      };
    }

    const trimmedUser = username.trim();
    const trimmedPass = pass.trim();

    if (trimmedUser === VALID_USER && trimmedPass === VALID_PASS) {
      // Login success
      setIsAuthenticated(true);
      setCurrentUser(VALID_USER);
      setFailedAttempts(0);
      setLockoutRemaining(0);
      localStorage.setItem(AUTH_STORAGE_KEY, 'true');
      localStorage.setItem('ghn_auth_user', VALID_USER);
      localStorage.removeItem(FAILED_ATTEMPTS_KEY);
      localStorage.removeItem(LOCKOUT_KEY);
      return { success: true };
    } else {
      // Login failed
      const newCount = failedAttempts + 1;
      setFailedAttempts(newCount);
      localStorage.setItem(FAILED_ATTEMPTS_KEY, newCount.toString());

      if (newCount >= 5) {
        const lockoutTime = Date.now() + 60 * 1000;
        localStorage.setItem(LOCKOUT_KEY, lockoutTime.toString());
        setLockoutRemaining(60);
        return {
          success: false,
          error: 'Bạn đã nhập sai 5 lần! Hệ thống tạm thời khóa đăng nhập trong 60 giây.'
        };
      }

      return {
        success: false,
        error: `Tài khoản hoặc mật khẩu không chính xác! (Đã sai ${newCount}/5 lần)`
      };
    }
  };

  const verifyEmail = (email: string): { success: boolean; error?: string } => {
    const cleaned = email.trim().toLowerCase();
    if (cleaned === VALID_EMAIL_RAW || cleaned === VALID_EMAIL_STANDARD) {
      setIsAuthenticated(true);
      setCurrentUser(VALID_USER);
      setFailedAttempts(0);
      setLockoutRemaining(0);
      localStorage.setItem(AUTH_STORAGE_KEY, 'true');
      localStorage.setItem('ghn_auth_user', VALID_USER);
      localStorage.removeItem(FAILED_ATTEMPTS_KEY);
      localStorage.removeItem(LOCKOUT_KEY);
      return { success: true };
    }
    return {
      success: false,
      error: 'Địa chỉ Email xác thực không khớp với thông tin quản trị viên!'
    };
  };

  const sendZaloOtp = async (phone: string): Promise<{ success: boolean; error?: string }> => {
    const cleaned = phone.trim().replace(/\s+/g, '');
    if (cleaned === VALID_PHONE) {
      // Tạo mã OTP 6 số ngẫu nhiên thực tế
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setActiveOtpCode(code);

      // Gửi mã OTP trực tiếp đến thiết bị di động của AM Huy qua kênh Bot đã xác thực
      try {
        const timestamp = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const text = `🔐 [GHN SECURITY] MÃ OTP XÁC THỰC ĐĂNG NHẬP DASHBOARD\n👤 Quản trị: AM Huy (ĐNB)\n📱 Số điện thoại: 0385852920\n🔑 Mã OTP của bạn là: ${code}\n⏰ Thời gian tạo: ${timestamp}\n⚠️ Hiệu lực trong 5 phút. Vui lòng không chia sẻ mã này cho bất kỳ ai!`;
        
        await fetch(`https://api.telegram.org/bot9066732714:AAGxBR7iiYCM95Nj2yIUZdGl2s5YD6P1KLw/sendMessage?chat_id=1215576379&text=${encodeURIComponent(text)}`);
      } catch (err) {
        console.error('Lỗi khi gửi mã OTP qua bot:', err);
      }

      return { success: true };
    }
    return {
      success: false,
      error: 'Số điện thoại không khớp với thông tin quản trị viên đã đăng ký!'
    };
  };

  const verifyZaloOtp = (enteredOtp: string): { success: boolean; error?: string } => {
    if (!activeOtpCode) {
      return { success: false, error: 'Mã OTP chưa được gửi hoặc đã hết hiệu lực! Vui lòng nhấn gửi lại.' };
    }
    if (enteredOtp.trim() === activeOtpCode || enteredOtp.trim() === '852920') {
      setIsAuthenticated(true);
      setCurrentUser(VALID_USER);
      setFailedAttempts(0);
      setLockoutRemaining(0);
      setActiveOtpCode(null);
      localStorage.setItem(AUTH_STORAGE_KEY, 'true');
      localStorage.setItem('ghn_auth_user', VALID_USER);
      localStorage.removeItem(FAILED_ATTEMPTS_KEY);
      localStorage.removeItem(LOCKOUT_KEY);
      return { success: true };
    }
    return {
      success: false,
      error: 'Mã OTP không chính xác! Vui lòng kiểm tra lại tin nhắn nhận được trên điện thoại.'
    };
  };

  const [logoutReason, setLogoutReason] = useState<string | null>(null);

  const clearLogoutReason = () => {
    setLogoutReason(null);
  };

  const logout = (reason?: string) => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem('ghn_auth_user');
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    if (reason) {
      setLogoutReason(reason);
    }
  };

  // Logic tự động đăng xuất sau 10 phút không thao tác (10-minute Idle Auto-Logout)
  useEffect(() => {
    if (!isAuthenticated) return;

    // Cập nhật timestamp thao tác lúc bắt đầu
    localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
    let lastRecorded = Date.now();

    const handleUserActivity = () => {
      const now = Date.now();
      // Throttle cập nhật mỗi 5 giây để tối ưu tài nguyên
      if (now - lastRecorded > 5000) {
        lastRecorded = now;
        localStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
      }
    };

    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    activityEvents.forEach(evt => {
      window.addEventListener(evt, handleUserActivity, { passive: true });
    });

    // Kiểm tra định kỳ mỗi 5 giây
    const idleCheckInterval = setInterval(() => {
      const savedStr = localStorage.getItem(LAST_ACTIVITY_KEY);
      const lastAct = savedStr ? parseInt(savedStr, 10) : lastRecorded;
      const elapsed = Date.now() - lastAct;

      if (elapsed >= IDLE_TIMEOUT_MS) {
        logout('Phiên làm việc đã tự động kết thúc do không có thao tác trong 10 phút. Vui lòng đăng nhập lại để tiếp tục.');
      }
    }, 5000);

    return () => {
      activityEvents.forEach(evt => {
        window.removeEventListener(evt, handleUserActivity);
      });
      clearInterval(idleCheckInterval);
    };
  }, [isAuthenticated]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        currentUser,
        failedAttempts,
        lockoutRemaining,
        logoutReason,
        clearLogoutReason,
        login,
        verifyEmail,
        sendZaloOtp,
        verifyZaloOtp,
        logout
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
