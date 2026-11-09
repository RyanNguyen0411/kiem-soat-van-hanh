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
  Send
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const LoginScreen: React.FC = () => {
  const { 
    login, 
    verifyEmail, 
    sendZaloOtp, 
    verifyZaloOtp, 
    lockoutRemaining, 
    failedAttempts 
  } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Recovery modes: 'none' (normal login), 'email', 'zalo'
  const [recoveryMode, setRecoveryMode] = useState<'none' | 'email' | 'zalo'>('none');

  // Recovery inputs
  const [emailInput, setEmailInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('0385852920');
  const [otpInput, setOtpInput] = useState('');
  const [zaloSent, setZaloSent] = useState(false);
  const [simulatedZaloNotification, setSimulatedZaloNotification] = useState<{ code: string } | null>(null);

  // Clear errors when switching modes or typing
  useEffect(() => {
    setErrorMessage(null);
  }, [username, password, emailInput, phoneInput, otpInput, recoveryMode]);

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

  const handleSendZaloOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneInput.trim()) {
      setErrorMessage('Vui lòng nhập số điện thoại Zalo!');
      return;
    }
    const result = sendZaloOtp(phoneInput);
    if (result.success && result.otp) {
      setZaloSent(true);
      setSimulatedZaloNotification({ code: result.otp });
      setErrorMessage(null);
    } else {
      setErrorMessage(result.error || 'Gửi OTP thất bại!');
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

      {/* Simulated Zalo Notification Popup */}
      {simulatedZaloNotification && (
        <div className="fixed top-5 right-5 z-50 max-w-sm w-full bg-slate-900 border-2 border-blue-500 rounded-2xl p-4 shadow-2xl animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0 font-bold shadow-md">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-blue-400 uppercase tracking-wider">Zalo Official Account</span>
                <span className="text-[10px] text-slate-400">Vừa xong</span>
              </div>
              <p className="text-xs text-slate-200 mt-1 font-medium">
                Mã xác thực OTP đăng nhập GHN Express của AM Huy là:
              </p>
              <div className="mt-2 py-1.5 px-3 bg-blue-950/80 border border-blue-500/50 rounded-lg text-center font-mono font-black text-lg text-amber-300 tracking-widest shadow-inner">
                {simulatedZaloNotification.code}
              </div>
              <p className="text-[10px] text-slate-400 mt-1.5 italic">
                * Mã có hiệu lực trong 5 phút. Vui lòng không chia sẻ mã này cho người khác.
              </p>
            </div>
          </div>
        </div>
      )}

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
                    placeholder="Nhập tài khoản quản trị (vd: Huyamdnb)"
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
                    placeholder="Nhập mật khẩu quản trị"
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

              {/* Quick credentials hint note */}
              <div className="pt-3 border-t border-slate-800 text-center">
                <p className="text-[11px] text-slate-400">
                  Hệ thống bảo mật cấp Quản lý Khu vực (Area Manager)
                </p>
                <div className="mt-2 flex items-center justify-center gap-2 text-[10px] text-slate-400">
                  <span>Hoặc khôi phục qua:</span>
                  <button
                    type="button"
                    onClick={() => setRecoveryMode('email')}
                    className="text-orange-400 hover:underline font-semibold"
                  >
                    Email
                  </button>
                  <span>&bull;</span>
                  <button
                    type="button"
                    onClick={() => setRecoveryMode('zalo')}
                    className="text-blue-400 hover:underline font-semibold"
                  >
                    Zalo OTP
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

              {/* Email hint with masked asterisk */}
              <div className="p-3 bg-slate-800/60 border border-slate-700/80 rounded-xl space-y-1">
                <p className="text-[11px] text-slate-400">Gợi ý địa chỉ Email liên kết của AM Huy:</p>
                <p className="font-mono font-bold text-amber-300 text-sm tracking-wider">
                  H*********3**@gmail.com
                </p>
                <p className="text-[10px] text-slate-400 italic">
                  * Nhập đúng toàn bộ địa chỉ email để hệ thống mở khóa quyền truy cập.
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
                    placeholder="Hoanghuy13cdgmail.com"
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
                  Hoặc chuyển sang đăng nhập bằng OTP qua Zalo
                </button>
              </div>
            </form>
          )}

          {/* RECOVERY MODE 2: ZALO OTP */}
          {recoveryMode === 'zalo' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-blue-400" />
                  Đăng Nhập Bằng Mã OTP Zalo
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
                    <p className="text-[11px] text-blue-200">
                      Mã xác thực OTP sẽ được gửi trực tiếp đến tài khoản Zalo gắn với số điện thoại của AM Huy:
                    </p>
                    <p className="font-mono font-bold text-amber-300 text-sm tracking-wider">
                      0385852920
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Số Điện Thoại Zalo
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                        <Phone className="w-4 h-4" />
                      </div>
                      <input
                        type="tel"
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                        placeholder="0385852920"
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-slate-500 font-mono"
                        autoFocus
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm tracking-wide shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>GỬI MÃ OTP QUA ZALO</span>
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyZaloOtp} className="space-y-4">
                  <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl">
                    <p className="text-xs text-emerald-300 font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      Đã gửi mã OTP đến Zalo số: <span className="font-mono font-bold text-white">0385852920</span>
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Vui lòng kiểm tra thông báo Zalo hoặc xem tin nhắn popup phía trên góc phải màn hình.
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
                      placeholder="vd: 852920"
                      className="w-full text-center tracking-[0.5em] font-mono font-black text-2xl py-3 bg-slate-800/90 border border-slate-700 rounded-xl text-amber-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-slate-600"
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
                      onClick={() => {
                        setZaloSent(false);
                        setSimulatedZaloNotification(null);
                      }}
                      className="text-slate-400 hover:text-white"
                    >
                      Đổi số điện thoại
                    </button>
                    <button
                      type="button"
                      onClick={handleSendZaloOtp}
                      className="text-blue-400 hover:text-blue-300 font-semibold underline"
                    >
                      Gửi lại mã OTP
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
