import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  User, 
  KeyRound, 
  ShieldAlert, 
  Mail, 
  Phone, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  MessageSquare,
  ShieldCheck,
  Send,
  Loader2,
  Clock
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const LoginScreen: React.FC = () => {
  const { 
    login, 
    verifyEmail, 
    sendZaloOtp, 
    verifyZaloOtp, 
    lockoutRemaining, 
    failedAttempts,
    logoutReason,
    clearLogoutReason 
  } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Recovery modes: 'none' (normal login), 'email', 'zalo'
  const [recoveryMode, setRecoveryMode] = useState<'none' | 'email' | 'zalo'>('none');

  // Recovery inputs
  const [emailInput, setEmailInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [zaloSent, setZaloSent] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Clear errors when switching modes or typing
  useEffect(() => {
    setErrorMessage(null);
    if (logoutReason && (username || password || emailInput || phoneInput || otpInput)) {
      clearLogoutReason();
    }
  }, [username, password, emailInput, phoneInput, otpInput, recoveryMode, logoutReason, clearLogoutReason]);

  const handleNormalLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMessage('Vui lòng nhập đầy đủ Tên đăng nhập và Mật khẩu!');
      return;
    }
    const result = login(username, password);
    if (!result.success) {
      setErrorMessage(result.error || 'Đăng nhập không thành công');
    }
  };

  const handleEmailRecovery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) {
      setErrorMessage('Vui lòng nhập địa chỉ Email quản trị!');
      return;
    }
    const result = verifyEmail(emailInput);
    if (!result.success) {
      setErrorMessage(result.error || 'Email không hợp lệ!');
    }
  };

  const handleSendZaloOtp = async (e: React.FormEvent) => {
    e.preventDefault();
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

  const handleVerifyZaloOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpInput.trim()) {
      setErrorMessage('Vui lòng nhập mã OTP gồm 6 chữ số!');
      return;
    }
    const result = verifyZaloOtp(otpInput);
    if (!result.success) {
      setErrorMessage(result.error || 'Xác thực OTP thất bại!');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans selection:bg-orange-500 selection:text-white">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-orange-600/15 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl overflow-hidden relative z-10">
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-orange-600 to-amber-600 p-6 text-white text-center relative">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white text-orange-600 shadow-xl mb-3 font-black text-2xl tracking-tighter ring-4 ring-orange-500/30">
            GHN
          </div>
          <h1 className="text-lg font-black tracking-wide uppercase font-sans">
            GHN Area Operation Control
          </h1>
          <p className="text-xs text-orange-100 font-medium mt-0.5">
            Khu vực Long An &bull; Quản trị Vận hành Bưu cục
          </p>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 mt-2 bg-black/20 rounded-full text-[11px] font-semibold text-orange-100 border border-white/20">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
            <span>Xác Thực Bảo Mật Quản Trị Viên</span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Lockout Warning Banner if 5 failed attempts */}
          {lockoutRemaining > 0 && (
            <div className="p-3.5 rounded-xl bg-red-950/80 border border-red-500/60 text-red-200 text-xs flex items-start gap-2.5 animate-pulse">
              <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-red-300">HỆ THỐNG TẠM KHÓA AN TOÀN</p>
                <p className="mt-0.5 text-[11px] leading-relaxed">
                  Bạn đã nhập sai 5 lần liên tiếp. Để đảm bảo an toàn dữ liệu vận hành, vui lòng thử lại sau:
                </p>
                <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-900/90 rounded-md font-mono font-bold text-white text-sm border border-red-700">
                  <span>Đếm ngược: {lockoutRemaining}s</span>
                </div>
              </div>
            </div>
          )}

          {/* Inactivity Logout Notice (Tự động đăng xuất sau 10 phút) */}
          {logoutReason && (
            <div className="p-3.5 rounded-xl bg-amber-950/80 border border-amber-500/60 text-amber-200 text-xs flex items-start gap-2.5">
              <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-300">HẾT HẠN PHIÊN THAO TÁC</p>
                <p className="mt-0.5 text-[11px] leading-relaxed">
                  {logoutReason}
                </p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-900/40 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* NORMAL LOGIN MODE */}
          {recoveryMode === 'none' && (
            <form onSubmit={handleNormalLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Tên Đăng Nhập
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={lockoutRemaining > 0}
                    placeholder="Nhập tên đăng nhập"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all placeholder:text-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Mật Khẩu
                  </label>
                  <button
                    type="button"
                    onClick={() => setRecoveryMode('email')}
                    className="text-[11px] text-orange-400 hover:text-orange-300 font-semibold cursor-pointer underline"
                  >
                    Quên mật khẩu?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={lockoutRemaining > 0}
                    placeholder="Nhập mật khẩu"
                    className="w-full pl-9 pr-10 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all placeholder:text-slate-500 disabled:opacity-50 disabled:cursor-not-allowed font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {failedAttempts > 0 && lockoutRemaining === 0 && (
                  <p className="text-[11px] text-amber-400 mt-1 italic">
                    * Cảnh báo: Đã nhập sai {failedAttempts}/5 lần
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={lockoutRemaining > 0}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-sm tracking-wide shadow-lg shadow-orange-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Lock className="w-4 h-4" />
                <span>ĐĂNG NHẬP VÀO DASHBOARD</span>
              </button>

              {/* Quick recovery options */}
              <div className="pt-3 border-t border-slate-800 text-center">
                <p className="text-[11px] text-slate-400">
                  Hệ thống bảo mật cấp Quản lý Khu vực (Area Manager)
                </p>
                <div className="mt-2 flex items-center justify-center gap-2 text-[10px] text-slate-400">
                  <span>Hoặc khôi phục qua:</span>
                  <button
                    type="button"
                    onClick={() => setRecoveryMode('email')}
                    className="text-orange-400 hover:underline font-semibold cursor-pointer"
                  >
                    Email
                  </button>
                  <span>&bull;</span>
                  <button
                    type="button"
                    onClick={() => setRecoveryMode('zalo')}
                    className="text-blue-400 hover:underline font-semibold cursor-pointer"
                  >
                    Mã OTP (SĐT / App)
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* RECOVERY MODE 1: EMAIL */}
          {recoveryMode === 'email' && (
            <form onSubmit={handleEmailRecovery} className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-orange-400" />
                  Xác Thực Bằng Email Quản Trị
                </span>
                <button
                  type="button"
                  onClick={() => setRecoveryMode('none')}
                  className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3 h-3" />
                  Quay lại
                </button>
              </div>

              {/* Email note - tuyệt đối không hiển thị email hoặc ký tự gợi ý */}
              <div className="p-3 bg-slate-800/60 border border-slate-700/80 rounded-xl space-y-1">
                <p className="text-[11px] text-slate-300 font-medium leading-relaxed">
                  Vui lòng nhập chính xác địa chỉ Email quản trị viên đã đăng ký với hệ thống để xác thực và mở khóa quyền truy cập.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Nhập Địa Chỉ Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="Nhập địa chỉ email quản trị"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all placeholder:text-slate-500 font-mono"
                    autoFocus
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-sm tracking-wide shadow-lg shadow-orange-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>XÁC THỰC EMAIL & ĐĂNG NHẬP</span>
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setRecoveryMode('zalo')}
                  className="text-xs text-blue-400 hover:text-blue-300 font-medium underline cursor-pointer"
                >
                  Hoặc chuyển sang đăng nhập bằng mã OTP (SĐT / App)
                </button>
              </div>
            </form>
          )}

          {/* RECOVERY MODE 2: OTP (SĐT / APP) */}
          {recoveryMode === 'zalo' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-blue-400" />
                  Đăng Nhập Bằng Mã OTP (SĐT / App)
                </span>
                <button
                  type="button"
                  onClick={() => setRecoveryMode('none')}
                  className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3 h-3" />
                  Quay lại
                </button>
              </div>

              {!zaloSent ? (
                <form onSubmit={handleSendZaloOtp} className="space-y-4">
                  <div className="p-3 bg-blue-950/40 border border-blue-500/40 rounded-xl space-y-1">
                    <p className="text-[11px] text-blue-200 leading-relaxed font-medium">
                      Vui lòng nhập số điện thoại quản trị viên đã đăng ký với hệ thống để nhận mã xác thực OTP qua tin nhắn ứng dụng / thiết bị.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Số Điện Thoại Nhận OTP
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                        <Phone className="w-4 h-4" />
                      </div>
                      <input
                        type="tel"
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                        placeholder="Nhập số điện thoại đã đăng ký"
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-slate-500 font-mono"
                        autoFocus
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSending}
                    className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm tracking-wide shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {isSending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>ĐANG GỬI MÃ OTP...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>GỬI MÃ OTP BẢO MẬT</span>
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyZaloOtp} className="space-y-4">
                  <div className="p-3.5 bg-emerald-950/50 border border-emerald-500/50 rounded-xl space-y-1.5">
                    <p className="text-xs text-emerald-300 font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Đã phát lệnh gửi mã OTP thành công!</span>
                    </p>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      Mã xác thực 6 chữ số đã được gửi trực tiếp đến thiết bị di động của Quản trị viên. Vui lòng kiểm tra tin nhắn trên thiết bị để nhập mã bên dưới.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Nhập Mã OTP (6 Chữ Số)
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                      placeholder="• • • • • •"
                      className="w-full text-center tracking-[0.5em] font-mono font-black text-2xl py-3 bg-slate-800/90 border border-slate-700 rounded-xl text-amber-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-slate-600 placeholder:tracking-[0.3em]"
                      autoFocus
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm tracking-wide shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>XÁC NHẬN OTP & ĐĂNG NHẬP</span>
                  </button>

                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <button
                      type="button"
                      onClick={() => setZaloSent(false)}
                      className="text-slate-400 hover:text-white cursor-pointer"
                    >
                      Đổi số điện thoại
                    </button>
                    <button
                      type="button"
                      onClick={handleSendZaloOtp}
                      disabled={isSending}
                      className="text-blue-400 hover:text-blue-300 font-semibold underline cursor-pointer"
                    >
                      {isSending ? 'Đang gửi lại...' : 'Gửi lại mã OTP'}
                    </button>
                  </div>
                </form>
              )}

              <div className="text-center pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setRecoveryMode('email')}
                  className="text-xs text-orange-400 hover:text-orange-300 font-medium underline cursor-pointer"
                >
                  Hoặc chuyển sang xác thực bằng Email
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-950/60 p-3.5 border-t border-slate-800 text-center text-[10px] text-slate-400">
          Giao Hàng Nhanh Express &bull; Hệ thống phân tích & kiểm soát vận hành nội bộ
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
