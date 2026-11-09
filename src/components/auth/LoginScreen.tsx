import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  User, 
  KeyRound, 
  AlertCircle, 
  Phone, 
  Mail, 
  ArrowLeft, 
  CheckCircle2, 
  Eye, 
  EyeOff, 
  Sparkles,
  ShieldAlert,
  Loader2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const LoginScreen: React.FC = () => {
  const { 
    login, 
    verifyEmail, 
    sendZaloOtp, 
    verifyZaloOtp, 
    lockoutRemaining, 
    logoutReason, 
    clearLogoutReason 
  } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Recovery modes: null = Normal, 'email' = Email Recovery, 'zalo' = Zalo OTP
  const [recoveryMode, setRecoveryMode] = useState<'email' | 'zalo' | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [zaloSent, setZaloSent] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const handleNormalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (logoutReason) clearLogoutReason();
    if (!username.trim() || !password.trim()) {
      setErrorMessage('Vui lòng nhập đầy đủ Tên đăng nhập và Mật khẩu!');
      return;
    }
    setIsSending(true);
    setErrorMessage(null);
    try {
      const result = await login(username, password);
      if (!result.success) {
        setErrorMessage(result.error || 'Đăng nhập không thành công');
      }
    } catch {
      setErrorMessage('Lỗi hệ thống khi gửi yêu cầu xác thực đăng nhập.');
    } finally {
      setIsSending(false);
    }
  };

  const handleEmailRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (logoutReason) clearLogoutReason();
    if (!emailInput.trim()) {
      setErrorMessage('Vui lòng nhập địa chỉ Email quản trị!');
      return;
    }
    setIsSending(true);
    setErrorMessage(null);
    try {
      const result = await verifyEmail(emailInput);
      if (!result.success) {
        setErrorMessage(result.error || 'Email không hợp lệ!');
      }
    } catch {
      setErrorMessage('Lỗi hệ thống khi gửi yêu cầu xác thực Email.');
    } finally {
      setIsSending(false);
    }
  };

  const handleSendZaloOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (logoutReason) clearLogoutReason();
    if (!phoneInput.trim()) {
      setErrorMessage('Vui lòng nhập số điện thoại quản trị!');
      return;
    }
    setIsSending(true);
    setErrorMessage(null);
    try {
      const result = await sendZaloOtp(phoneInput);
      if (result.success) {
        setZaloSent(true);
      } else {
        setErrorMessage(result.error || 'Gửi OTP thất bại!');
      }
    } catch {
      setErrorMessage('Có lỗi xảy ra khi phát lệnh gửi mã OTP!');
    } finally {
      setIsSending(false);
    }
  };

  const handleVerifyZaloOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (logoutReason) clearLogoutReason();
    if (!otpInput.trim()) {
      setErrorMessage('Vui lòng nhập mã OTP gồm 6 chữ số!');
      return;
    }
    setIsSending(true);
    setErrorMessage(null);
    try {
      const result = await verifyZaloOtp(phoneInput, otpInput);
      if (!result.success) {
        setErrorMessage(result.error || 'Xác thực OTP thất bại!');
      }
    } catch {
      setErrorMessage('Lỗi hệ thống khi xác thực mã OTP.');
    } finally {
      setIsSending(false);
    }
  };

  const switchMode = (mode: 'email' | 'zalo' | null) => {
    setRecoveryMode(mode);
    setErrorMessage(null);
    if (logoutReason) clearLogoutReason();
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans selection:bg-orange-500 selection:text-white">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-orange-600/15 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Main card */}
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl relative z-10 space-y-6">
        
        {/* Header Logo & Title */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 text-white shadow-lg shadow-orange-500/25 mb-1">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase">
            GHN Control Center
          </h1>
          <p className="text-xs text-slate-400 font-medium">
            Hệ thống Quản Trị Vận Hành Khu Vực &bull; AM Long An
          </p>
        </div>

        {/* Lockout Warning Banner */}
        {lockoutRemaining > 0 && (
          <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-2xl flex items-center gap-3 text-red-200 animate-pulse">
            <ShieldAlert className="w-5 h-5 text-red-400 shrink-0" />
            <div className="text-xs">
              <strong className="block font-bold text-red-300">HỆ THỐNG ĐANG TẠM KHÓA</strong>
              <span>Vui lòng chờ <strong>{lockoutRemaining}s</strong> trước khi thử đăng nhập lại.</span>
            </div>
          </div>
        )}

        {/* Logout Notice Banner */}
        {logoutReason && !errorMessage && (
          <div className="p-3 bg-amber-950/60 border border-amber-800/80 rounded-2xl flex items-center justify-between gap-3 text-amber-200">
            <div className="flex items-center gap-2 text-xs">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{logoutReason}</span>
            </div>
            <button
              type="button"
              onClick={clearLogoutReason}
              className="text-[11px] underline text-amber-400 hover:text-amber-300 shrink-0 cursor-pointer"
            >
              Đóng
            </button>
          </div>
        )}

        {/* Error Message */}
        {errorMessage && (
          <div className="p-3 bg-rose-950/60 border border-rose-800/80 rounded-2xl flex items-center gap-2.5 text-xs text-rose-200">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* FORM 1: NORMAL LOGIN (Default) */}
        {recoveryMode === null && (
          <form onSubmit={handleNormalLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                Tài khoản quản trị
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  disabled={lockoutRemaining > 0 || isSending}
                  placeholder="Nhập tài khoản quản trị..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all disabled:opacity-50"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                Mật khẩu
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  disabled={lockoutRemaining > 0 || isSending}
                  placeholder="Nhập mật khẩu..."
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all disabled:opacity-50 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={lockoutRemaining > 0 || isSending}
              className="w-full py-3 px-4 rounded-xl font-bold text-white bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 shadow-lg shadow-orange-600/30 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 text-sm cursor-pointer"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang xác thực bảo mật...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Đăng Nhập Quản Trị</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* FORM 2: EMAIL RECOVERY */}
        {recoveryMode === 'email' && (
          <form onSubmit={handleEmailRecovery} className="space-y-4">
            <div className="p-3 bg-blue-950/40 border border-blue-900/60 rounded-xl text-blue-200 text-xs leading-relaxed">
              Nhập địa chỉ Email quản trị viên đã đăng ký trong hệ thống để xác thực quyền đăng nhập.
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                Email Quản Trị Viên
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => {
                    setEmailInput(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  disabled={isSending}
                  placeholder="Nhập địa chỉ email quản trị..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-mono"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => switchMode(null)}
                className="py-2.5 px-3 rounded-xl border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Quay lại</span>
              </button>
              <button
                type="submit"
                disabled={isSending}
                className="flex-1 py-2.5 px-4 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-xs cursor-pointer"
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang kiểm tra...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Xác Thực Qua Email</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* FORM 3: PHONE OTP */}
        {recoveryMode === 'zalo' && (
          <div className="space-y-4">
            <div className="p-3 bg-emerald-950/40 border border-emerald-900/60 rounded-xl text-emerald-200 text-xs leading-relaxed">
              Mã OTP bảo mật sẽ được hệ thống máy chủ phát lệnh gửi tự động đến thiết bị của AM Huy.
            </div>

            {!zaloSent ? (
              <form onSubmit={handleSendZaloOtp} className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                    Số Điện Thoại Quản Trị
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      type="tel"
                      value={phoneInput}
                      onChange={(e) => {
                        setPhoneInput(e.target.value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      disabled={isSending}
                      placeholder="Nhập số điện thoại quản trị..."
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => switchMode(null)}
                    className="py-2.5 px-3 rounded-xl border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Quay lại</span>
                  </button>
                  <button
                    type="submit"
                    disabled={isSending}
                    className="flex-1 py-2.5 px-4 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-xs cursor-pointer"
                  >
                    {isSending ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Đang gửi mã...</span>
                      </>
                    ) : (
                      <>
                        <Phone className="w-3.5 h-3.5" />
                        <span>Gửi Mã OTP Xác Thực</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleVerifyZaloOtp} className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                    Nhập Mã OTP 6 Chữ Số
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      maxLength={6}
                      value={otpInput}
                      onChange={(e) => {
                        setOtpInput(e.target.value.replace(/\D/g, ''));
                        if (errorMessage) setErrorMessage(null);
                      }}
                      disabled={isSending}
                      placeholder="6 chữ số OTP"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 text-center tracking-[0.4em] text-lg font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setZaloSent(false);
                      setOtpInput('');
                      setErrorMessage(null);
                    }}
                    className="py-2.5 px-3 rounded-xl border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Gửi lại</span>
                  </button>
                  <button
                    type="submit"
                    disabled={isSending}
                    className="flex-1 py-2.5 px-4 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-xs cursor-pointer"
                  >
                    {isSending ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Đang xác minh...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Xác Nhận Đăng Nhập</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Alternative Recovery Options */}
        {recoveryMode === null && (
          <div className="pt-4 border-t border-slate-800/80 space-y-2">
            <p className="text-[11px] text-slate-500 text-center uppercase tracking-wider font-semibold">
              Phương thức xác thực thay thế
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => switchMode('email')}
                className="py-2 px-3 rounded-xl bg-slate-950/60 hover:bg-slate-800 border border-slate-800/80 text-slate-300 hover:text-white transition-all text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Mail className="w-3.5 h-3.5 text-blue-400" />
                <span>Qua Email</span>
              </button>
              <button
                type="button"
                onClick={() => switchMode('zalo')}
                className="py-2 px-3 rounded-xl bg-slate-950/60 hover:bg-slate-800 border border-slate-800/80 text-slate-300 hover:text-white transition-all text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                <span>Qua Mã OTP</span>
              </button>
            </div>
          </div>
        )}

        {/* Security Footnote */}
        <div className="text-center pt-2">
          <p className="text-[10px] text-slate-600 flex items-center justify-center gap-1">
            <span>🔒 Bảo mật phiên làm việc 8 giờ &bull; Tự động khóa sau 5 lần nhập sai</span>
          </p>
        </div>

      </div>
    </div>
  );
};

export default LoginScreen;
