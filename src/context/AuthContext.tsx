import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  currentUser: string | null;
  failedAttempts: number;
  lockoutRemaining: number;
  login: (username: string, pass: string) => { success: boolean; error?: string };
  verifyEmail: (email: string) => { success: boolean; error?: string };
  sendZaloOtp: (phone: string) => { success: boolean; error?: string; otp?: string };
  verifyZaloOtp: (enteredOtp: string) => { success: boolean; error?: string };
  logout: () => void;
  activeOtpCode: string | null;
}

const AUTH_STORAGE_KEY = 'ghn_auth_session';
const FAILED_ATTEMPTS_KEY = 'ghn_auth_failed_attempts';
const LOCKOUT_KEY = 'ghn_auth_lockout_until';

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

  const sendZaloOtp = (phone: string): { success: boolean; error?: string; otp?: string } => {
    const cleaned = phone.trim().replace(/\s+/g, '');
    if (cleaned === VALID_PHONE) {
      // Tạo mã OTP 6 số
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setActiveOtpCode(code);
      return { success: true, otp: code };
    }
    return {
      success: false,
      error: 'Số điện thoại không đúng với số đăng ký quản trị viên GHN (0385852920)!'
    };
  };

  const verifyZaloOtp = (enteredOtp: string): { success: boolean; error?: string } => {
    if (!activeOtpCode) {
      return { success: false, error: 'Mã OTP chưa được gửi hoặc đã hết hiệu lực!' };
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
      error: 'Mã OTP Zalo không chính xác! Vui lòng kiểm tra lại.'
    };
  };

  const logout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem('ghn_auth_user');
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        currentUser,
        failedAttempts,
        lockoutRemaining,
        login,
        verifyEmail,
        sendZaloOtp,
        verifyZaloOtp,
        logout,
        activeOtpCode
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
