import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Mail, 
  ArrowRight, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft 
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../api/auth.api';
import CanvasCaptcha from '../components/CanvasCaptcha';

// Dynamic headline rotating phrases
const ROTATING_PHRASES = [
  'every market movement.',
  'the clean power economy.',
  '96-slot dispatch analytics.',
  'real-time price discovery.',
  'landed-cost optimization.',
];

export default function LoginPage() {
  // Login page is permanently locked to the cinematic dark theme aesthetic
  const isDark = true;

  // Step: 'EMAIL' (enter email + captcha) | 'OTP' (enter 6-digit code)
  const [step, setStep] = useState<'EMAIL' | 'OTP'>('EMAIL');

  // Form state
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [captchaCode, setCaptchaCode] = useState('');
  const [userCaptcha, setUserCaptcha] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Status & error state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dynamic Typewriter effect state
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [currentText, setCurrentText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();

  // Zero-scroll & Dark theme enforcement for Login Page
  useEffect(() => {
    document.documentElement.classList.add('login-page', 'dark');
    document.body.classList.add('login-page', 'dark');
    generateNewCaptcha();

    // Prevent Shift + D shortcut on login page so user cannot bypass
    const blockThemeShortcut = (e: KeyboardEvent) => {
      if (e.shiftKey && (e.key === 'D' || e.key === 'd' || e.code === 'KeyD')) {
        e.stopImmediatePropagation();
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', blockThemeShortcut, true);

    return () => {
      document.documentElement.classList.remove('login-page');
      document.body.classList.remove('login-page');
      window.removeEventListener('keydown', blockThemeShortcut, true);

      // Restore user's selected theme when navigating into app
      const storedTheme = localStorage.getItem('prolt-theme') || localStorage.getItem('prolt_theme');
      if (storedTheme === 'light') {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
        document.body.classList.remove('dark');
        document.body.classList.add('light');
      }
    };
  }, []);




  // Smooth Typewriter Animation Loop
  useEffect(() => {
    const fullPhrase = ROTATING_PHRASES[phraseIndex];
    let speed = isDeleting ? 30 : 65;

    if (!isDeleting && currentText === fullPhrase) {
      speed = 2200;
    } else if (isDeleting && currentText === '') {
      setIsDeleting(false);
      setPhraseIndex((prev) => (prev + 1) % ROTATING_PHRASES.length);
      speed = 400;
      return;
    }

    const timer = setTimeout(() => {
      if (!isDeleting) {
        if (currentText === fullPhrase) {
          setIsDeleting(true);
        } else {
          setCurrentText(fullPhrase.slice(0, currentText.length + 1));
        }
      } else {
        setCurrentText(fullPhrase.slice(0, currentText.length - 1));
      }
    }, speed);

    return () => clearTimeout(timer);
  }, [currentText, isDeleting, phraseIndex]);

  // Countdown timer for OTP resend
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [resendCooldown]);

  const generateNewCaptcha = () => {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptchaCode(code);
    setUserCaptcha('');
  };

  const handleAutoFillCaptcha = () => {
    if (!captchaCode) return;
    setUserCaptcha(captchaCode);
    setError(null);
  };

  // 1. Send OTP Handler
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Corporate email is required.');
      return;
    }

    if (step === 'EMAIL') {
      if (userCaptcha.trim().toUpperCase() !== captchaCode) {
        setError('Security CAPTCHA did not match. Please enter the fresh code.');
        generateNewCaptcha();
        return;
      }
    }

    setLoading(true);
    try {
      const response = await authApi.sendOtp(trimmedEmail);
      if (response.success) {
        setStep('OTP');
        setResendCooldown(30);
      } else {
        setError(response.message || 'Failed to dispatch verification passcode.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch verification passcode. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Verify OTP Handler
  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    if (!otp || otp.length !== 6) {
      setError('Please enter the full 6-digit verification passcode.');
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.verifyOtp(email.trim(), otp);
      if (response.success) {
        login(response.token, response.user);
        navigate('/dashboard', { replace: true });
      } else {
        setError('Verification passcode could not be validated.');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid verification passcode. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 w-full h-full min-h-screen min-w-full flex flex-col lg:flex-row overflow-hidden font-sans select-none bg-[#070A12] text-[#F1F5F9] m-0 p-0 border-0 z-10"
      style={{
        backgroundColor: '#070A12',
        color: '#F1F5F9',
        backgroundImage: `
          radial-gradient(circle at 18% 30%, rgba(37, 99, 235, 0.12) 0%, transparent 55%),
          radial-gradient(circle at 85% 85%, rgba(225, 29, 72, 0.07) 0%, transparent 45%),
          linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px)
        `,
        backgroundSize: '100% 100%, 100% 100%, 48px 48px, 48px 48px',
      }}
    >
      {/* ========================================================================= */}
      {/* ANIMATED BACKGROUND VIDEO                                                 */}
      {/* ========================================================================= */}
      <video
        autoPlay
        loop
        muted
        playsInline
        src="/assets/login_bg.mp4"
        className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0 opacity-85 transition-opacity duration-700"
      />

      {/* Sleek Cinematic Contrast Layer (Active in Dark Mode) */}
      <div 
        className="absolute inset-0 pointer-events-none z-0 opacity-100 bg-gradient-to-r from-[#070A12]/80 via-[#070A12]/45 to-[#070A12]/85 transition-opacity duration-700" 
      />




      {/* ========================================================================= */}
      {/* LEFT SECTION: BRAND & ENERGY MARKET INTELLIGENCE CANVAS                   */}
      {/* ========================================================================= */}
      <div className={`hidden lg:flex lg:w-[57%] xl:w-[59%] flex-col justify-between p-8 xl:p-12 2xl:p-14 border-r relative z-10 h-full overflow-hidden ${
        isDark ? 'border-white/[0.06]' : 'border-black/[0.06]'
      }`}>
        {/* Top Bar: Official Prolt Energy by Probus Brand Lockup */}
        <div className="flex items-center flex-shrink-0">
          <div className="transition-transform duration-300 hover:scale-[1.01]">
            <img 
              src={isDark ? "/assets/prolt_by_probus_dark.png" : "/assets/prolt_by_probus_light.png"} 
              onError={(e: any) => { e.currentTarget.src = '/assets/logo.png'; }}
              alt="Prolt Energy by Probus" 
              className={`h-11 sm:h-12 xl:h-13 w-auto object-contain transition-all duration-300 ${
                isDark 
                  ? 'drop-shadow-[0_8px_28px_rgba(239,68,68,0.22)]' 
                  : 'drop-shadow-[0_6px_18px_rgba(0,0,0,0.1)]'
              }`}
            />
          </div>
        </div>


        {/* Center Editorial Statement & Dynamic Typewriter Headline */}
        <div className="my-auto py-3 xl:py-5 max-w-2xl 2xl:max-w-3xl w-full flex-shrink-0">
          {/* Dynamic Editorial Headline with Cobalt-to-Crimson Gradient Typewriter Effect */}
          <h1 className={`text-3xl xl:text-4xl 2xl:text-5xl font-extrabold tracking-tight leading-[1.15] mb-3 min-h-[76px] xl:min-h-[92px] ${
            isDark ? 'text-white' : 'text-slate-900'
          }`}>
            Clarity in <br />
            <span className="bg-gradient-to-r from-blue-500 via-indigo-400 to-rose-500 bg-clip-text text-transparent">
              {currentText}
            </span>
            <span className="inline-block w-[3px] h-7 xl:h-9 ml-1.5 align-middle bg-rose-500 animate-pulse" />
          </h1>

          {/* Narrative copy */}
          <p className={`text-sm xl:text-base leading-relaxed max-w-xl mb-5 font-normal ${
            isDark ? 'text-slate-400' : 'text-slate-600'
          }`}>
            Institutional dispatch intelligence, real-time 15-minute settlement clearing, and tariff optimization designed specifically for Indian power trading desks, utilities, and commercial consumers.
          </p>
        </div>

        {/* Bottom Bar: Clean Enterprise Notice */}
        <div className={`flex items-center justify-between pt-4 border-t flex-shrink-0 text-xs ${
          isDark ? 'border-white/[0.06] text-slate-500' : 'border-black/[0.06] text-slate-400'
        }`}>
          <span>© 2026 Probus Smart Things Pvt. Ltd. All rights reserved.</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RIGHT SECTION: STREAMLINED AUTHENTICATION TERMINAL                        */}
      {/* ========================================================================= */}
      <div className="flex-1 h-full flex flex-col justify-center items-center p-6 sm:p-10 xl:p-14 relative z-10 overflow-y-auto">
        
        {/* Mobile / Tablet Header Branding */}
        <div className="lg:hidden flex items-center justify-center mb-6">
          <img 
            src={isDark ? "/assets/prolt_by_probus_dark.png" : "/assets/prolt_by_probus_light.png"} 
            onError={(e: any) => { e.currentTarget.src = '/assets/logo.png'; }}
            alt="Prolt Energy by Probus" 
            className={`h-10 sm:h-12 w-auto max-w-[220px] sm:max-w-[260px] object-contain transition-all duration-300 ${
              isDark 
                ? 'drop-shadow-[0_6px_24px_rgba(239,68,68,0.25)]' 
                : 'drop-shadow-[0_4px_12px_rgba(0,0,0,0.1)]'
            }`}
          />
        </div>


        {/* Clean, Elevated Login Terminal Card */}
        <div 
          className="w-full max-w-[430px] xl:max-w-[460px] rounded-2xl border p-8 sm:p-9 xl:p-10 relative backdrop-blur-2xl transition-all duration-300 shadow-2xl"
          style={{
            backgroundColor: isDark ? 'rgba(11, 15, 25, 0.72)' : 'rgba(255, 255, 255, 0.85)',
            borderColor: isDark ? 'rgba(59, 130, 246, 0.22)' : 'rgba(0, 0, 0, 0.08)',
            boxShadow: isDark 
              ? '0 24px 70px -15px rgba(0, 0, 0, 0.85), 0 0 1px 1px rgba(59, 130, 246, 0.1)'
              : '0 20px 50px -10px rgba(0, 0, 0, 0.08), 0 0 1px 1px rgba(0, 0, 0, 0.04)',
          }}
        >
          {/* Subtle Top Accent Line in Royal Cobalt to Kinetic Crimson */}
          <div className="absolute top-0 left-8 right-8 h-[3px] bg-gradient-to-r from-blue-600 via-indigo-500 to-rose-500 rounded-full" />

          {/* Terminal Card Header */}
          <div className="mb-6">
            <h2 className={`text-2xl sm:text-[26px] font-bold tracking-tight leading-tight ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}>
              {step === 'EMAIL' ? 'Welcome Back!' : 'Verify Passcode'}
            </h2>
            <p className={`text-xs sm:text-sm mt-1.5 leading-relaxed font-normal ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}>
              {step === 'EMAIL' 
                ? 'Enter your corporate email to receive a secure one-time access token.' 
                : `Enter the 6-digit authentication token dispatched to ${email}.`
              }
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className={`mb-4 p-3.5 rounded-xl text-xs flex items-start gap-2.5 animate-fade-in-up border ${
              isDark 
                ? 'bg-red-950/40 border-red-500/30 text-red-200' 
                : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed font-medium">
                {error}
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* STEP 1: CORPORATE EMAIL & SECURITY CAPTCHA                          */}
          {/* =================================================================== */}
          {step === 'EMAIL' ? (
            <form onSubmit={handleSendOtp} noValidate className="space-y-4 sm:space-y-4.5">
              {/* Corporate Email Address */}
              <div>
                <label 
                  htmlFor="login-email" 
                  className={`block text-xs font-mono tracking-wider uppercase font-semibold mb-1.5 ${
                    isDark ? 'text-slate-300' : 'text-slate-700'
                  }`}
                >
                  Corporate Email Address
                </label>
                <div className={`relative rounded-xl border transition-all ${
                  isDark 
                    ? 'bg-[#070A12] border-white/[0.1] focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/40' 
                    : 'bg-[#F8FAFC] border-slate-200 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/40'
                }`}>
                  <div className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none ${
                    isDark ? 'text-slate-400' : 'text-slate-400'
                  }`}>
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="login-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    autoFocus
                    disabled={loading}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@enterprise.com"
                    className={`w-full pl-10 pr-3.5 py-2.5 text-sm bg-transparent focus:outline-none disabled:opacity-50 ${
                      isDark ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'
                    }`}
                  />
                </div>
              </div>

              {/* Security CAPTCHA */}
              <div>
                <label 
                  htmlFor="login-captcha" 
                  className={`block text-xs font-mono tracking-wider uppercase font-semibold mb-1.5 ${
                    isDark ? 'text-slate-300' : 'text-slate-700'
                  }`}
                >
                  Security Verification Code
                </label>
                <div className="flex items-center gap-2.5">
                  <div className={`flex-1 relative rounded-xl border transition-all ${
                    isDark 
                      ? 'bg-[#070A12] border-white/[0.1] focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/40' 
                      : 'bg-[#F8FAFC] border-slate-200 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/40'
                  }`}>
                    <input
                      id="login-captcha"
                      name="captcha"
                      type="text"
                      disabled={loading}
                      placeholder="ENTER CODE"
                      value={userCaptcha}
                      onChange={(e) => setUserCaptcha(e.target.value.toUpperCase())}
                      className={`w-full px-3.5 py-2.5 text-sm font-mono tracking-widest bg-transparent focus:outline-none disabled:opacity-50 font-semibold ${
                        isDark ? 'text-blue-300 placeholder-slate-500' : 'text-blue-800 placeholder-slate-400'
                      }`}
                    />
                  </div>

                  {/* Canvas Captcha (Secret click to auto-fill) */}
                  <div 
                    onClick={handleAutoFillCaptcha}
                    className="cursor-pointer select-none flex-shrink-0 active:scale-[0.98] transition-transform"
                  >
                    <CanvasCaptcha code={captchaCode} theme={isDark ? 'dark' : 'light'} />
                  </div>

                  {/* Refresh Button */}
                  <button
                    type="button"
                    onClick={generateNewCaptcha}
                    disabled={loading}
                    className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-colors focus:outline-none cursor-pointer flex-shrink-0 ${
                      isDark 
                        ? 'bg-[#0E1422] border-white/[0.1] text-slate-400 hover:text-blue-400 hover:border-blue-500/40' 
                        : 'bg-[#F8FAFC] border-slate-200 text-slate-500 hover:text-blue-700 hover:border-blue-500/40'
                    }`}
                    aria-label="Refresh Security Captcha"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Submit Button in Royal Cobalt Gradient */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-sm tracking-wide text-white bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 hover:from-blue-500 hover:via-blue-600 hover:to-indigo-700 active:scale-[0.99] transition-all shadow-lg shadow-blue-700/25 hover:shadow-blue-600/40 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed group cursor-pointer"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Dispatching Token...</span>
                  </div>
                ) : (
                  <>
                    <span>Send Verification Passcode</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* =================================================================== */
            /* STEP 2: 6-DIGIT OTP PASSCODE VERIFICATION                           */
            /* =================================================================== */
            <form onSubmit={handleVerifyOtp} noValidate className="space-y-4 sm:space-y-5">
              {/* Dispatched info chip */}
              <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                isDark 
                  ? 'bg-blue-950/30 border-blue-500/30 text-blue-300' 
                  : 'bg-blue-50 border-blue-200 text-blue-800'
              }`}>
                <CheckCircle2 className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  Passcode dispatched to <strong className={isDark ? 'text-white' : 'text-slate-900'}>{email}</strong>. Check your corporate inbox.
                </div>
              </div>

              {/* 6-Digit Code Input */}
              <div>
                <label 
                  htmlFor="otp-token" 
                  className={`block text-xs font-mono tracking-wider uppercase font-semibold mb-2 text-center ${
                    isDark ? 'text-slate-300' : 'text-slate-700'
                  }`}
                >
                  Enter 6-Digit Passcode
                </label>
                <div className="relative">
                  <input
                    id="otp-token"
                    name="otp"
                    type="text"
                    autoFocus
                    disabled={loading}
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="••••••"
                    className={`w-full py-3.5 px-4 text-center text-2xl sm:text-3xl font-mono tracking-[0.45em] font-bold rounded-xl border focus:outline-none transition-all placeholder:tracking-normal shadow-inner ${
                      isDark 
                        ? 'bg-[#070A12] border-white/[0.12] text-blue-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 placeholder-slate-600' 
                        : 'bg-[#F8FAFC] border-slate-200 text-blue-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 placeholder-slate-300'
                    }`}
                  />
                </div>
              </div>

              {/* Verify Button in Royal Cobalt */}
              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full py-3 px-4 rounded-xl font-bold text-sm tracking-wide text-white bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 hover:from-blue-500 hover:via-blue-600 hover:to-indigo-700 active:scale-[0.99] transition-all shadow-lg shadow-blue-700/25 hover:shadow-blue-600/40 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Verifying Authorization...</span>
                  </div>
                ) : (
                  <>
                    <span>Authorize Session & Enter</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Resend & Change Email Navigation */}
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  disabled={resendCooldown > 0 || loading}
                  onClick={() => handleSendOtp()}
                  className="text-xs font-mono text-blue-400 hover:text-blue-300 disabled:text-slate-500 transition-colors cursor-pointer font-semibold"
                >
                  {resendCooldown > 0 ? `Resend Code (${resendCooldown}s)` : 'Resend Code'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStep('EMAIL');
                    setOtp('');
                    generateNewCaptcha();
                  }}
                  className={`text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                    isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Change Email</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
