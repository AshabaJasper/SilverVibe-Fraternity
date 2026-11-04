"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, ArrowLeft, Eye, EyeOff, LogIn, Smartphone, MessageSquare } from "lucide-react";
import { useAuthStore, useAuthHydrated } from "@/lib/store";
import {
  DEMO_CREDENTIALS, MEMBER_USER, checkMemberCredentials, checkMemberPhone, checkOtp, safeNext,
} from "@/lib/auth";
import { ADMIN_KPI } from "@/lib/mock-data";
import { showToast } from "@/lib/storage";
import ForgotPasswordModal from "@/components/auth/ForgotPasswordModal";

const compact = (n: number) =>
  n >= 1e9 ? `UGX ${(n / 1e9).toFixed(1)}B` : n >= 1e6 ? `UGX ${(n / 1e6).toFixed(0)}M` : n.toLocaleString();

export default function MemberLoginPage() {
  return (
    <Suspense>
      <MemberLogin />
    </Suspense>
  );
}

function MemberLogin() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"), "/portal");
  const { login, isAuthenticated, userType } = useAuthStore();
  const hydrated = useAuthHydrated();

  const [loginMethod, setLoginMethod] = useState<"password" | "otp">("password");
  const [svNumber, setSvNumber] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgotOpen, setForgotOpen] = useState(false);

  useEffect(() => {
    if (hydrated && isAuthenticated && userType === "member") router.replace(next);
  }, [hydrated, isAuthenticated, userType, next, router]);

  const finish = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    login("member", MEMBER_USER);
    if (!remember) {
      // "Remember me" off: drop the persisted session when the tab closes.
      window.addEventListener("pagehide", () => localStorage.removeItem("silvervibe_auth"), { once: true });
    }
    showToast(`Welcome back, ${MEMBER_USER.name.split(" ")[0]}`);
    router.push(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loginMethod === "password") {
      const err = checkMemberCredentials(svNumber, password);
      if (err) return setError(err);
      setError(null);
      return finish();
    }
    // OTP flow: step 1 send code, step 2 verify.
    if (!otpSent) {
      const err = checkMemberPhone(phone);
      if (err) return setError(err);
      setError(null);
      setLoading(true);
      await new Promise((r) => setTimeout(r, 500));
      setLoading(false);
      setOtpSent(true);
      showToast(`Code sent to ${phone} (demo code ${DEMO_CREDENTIALS.otp})`, "info");
      return;
    }
    const err = checkOtp(otp);
    if (err) return setError(err);
    setError(null);
    return finish();
  };

  const switchMethod = (m: "password" | "otp") => {
    setLoginMethod(m);
    setError(null);
    setOtpSent(false);
    setOtp("");
  };

  const fillDemo = () => {
    setError(null);
    if (loginMethod === "password") {
      setSvNumber(DEMO_CREDENTIALS.member.svNumber);
      setPassword(DEMO_CREDENTIALS.member.password);
    } else if (!otpSent) {
      setPhone(DEMO_CREDENTIALS.member.phone);
    } else {
      setOtp(DEMO_CREDENTIALS.otp);
    }
  };

  const inputCls = `w-full bg-white/5 border rounded-xl px-4 py-3 text-[#f5f5f5] placeholder-[#C0C0C0]/30 focus:outline-none focus:ring-1 transition-all ${
    error ? "border-[#ef4444]/50 focus:ring-[#ef4444]/30" : "border-[#C0C0C0]/20 focus:border-[#4A90D9]/60 focus:ring-[#4A90D9]/30"
  }`;

  const stats = [
    { label: "Members", value: `${ADMIN_KPI.total_members.value}+` },
    { label: "Total Savings", value: compact(ADMIN_KPI.total_savings.value) },
    { label: "Loan Book", value: compact(ADMIN_KPI.total_loan_book.value) },
    { label: "Share Capital", value: compact(ADMIN_KPI.total_share_capital.value) },
  ];

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-[#0f0f0f] via-[#1a1a1a] to-[#0f0f0f] relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-[#4A90D9]/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-[#C0C0C0]/5 rounded-full blur-3xl" />
      </div>

      {/* Branding panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center relative z-10 px-16">
        <div className="max-w-md space-y-8 animate-fade-in">
          <Image src="/logo.jpg" alt="SilverVibe logo" width={80} height={80} priority className="w-20 h-20 rounded-full object-cover border-2 border-[#C0C0C0]/30" />
          <h1 className="text-4xl font-bold text-[#f5f5f5] leading-tight">
            Welcome to<br />
            <span className="silver-text-gradient">SilverVibe Fraternity</span>
          </h1>
          <p className="text-[#C0C0C0]/60 text-lg leading-relaxed">
            Your cooperative journey starts here. Access your savings, monitor your loans, track your share capital, and stay connected with your SACCO community.
          </p>
          <div className="grid grid-cols-2 gap-4 pt-4">
            {stats.map((stat) => (
              <div key={stat.label} className="bg-white/5 border border-[#C0C0C0]/10 rounded-xl p-4">
                <p className="text-2xl font-bold text-[#f5f5f5]">{stat.value}</p>
                <p className="text-sm text-[#C0C0C0]/50">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-10 relative z-10">
        <div className="w-full max-w-md animate-fade-in">
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-[#C0C0C0]/50 hover:text-[#C0C0C0] mb-6 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to home
          </Link>
          <div className="lg:hidden text-center mb-8">
            <Image src="/logo.jpg" alt="SilverVibe logo" width={64} height={64} className="w-16 h-16 rounded-full object-cover border-2 border-[#C0C0C0]/30 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-[#f5f5f5]">Member Portal</h1>
            <p className="text-[#C0C0C0]/50 text-sm mt-1">SilverVibe Fraternity Cooperative</p>
          </div>

          <div className="bg-[#1a1a1a] border border-[#C0C0C0]/10 rounded-2xl p-8 shadow-2xl">
            <h2 className="text-2xl font-bold text-[#f5f5f5] mb-1 hidden lg:block">Sign In</h2>
            <p className="text-[#C0C0C0]/50 mb-6 text-sm hidden lg:block">Access your member account</p>

            <div className="flex bg-white/5 rounded-xl p-1 mb-6" role="tablist">
              {(["password", "otp"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  aria-selected={loginMethod === m}
                  onClick={() => switchMethod(m)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
                    loginMethod === m ? "bg-[#4A90D9] text-[#fff] shadow" : "text-[#C0C0C0]/60 hover:text-[#f5f5f5]"
                  }`}
                >
                  {m === "otp" && <Smartphone className="w-3.5 h-3.5" />}
                  {m === "password" ? "Password" : "Phone OTP"}
                </button>
              ))}
            </div>

            {error && (
              <div role="alert" className="mb-5 flex items-start gap-2 p-3 rounded-xl bg-[#ef4444]/10 border border-[#ef4444]/30 text-sm text-[#fca5a5]">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {loginMethod === "password" ? (
                <>
                  <div>
                    <label htmlFor="sv" className="block text-sm font-medium text-[#C0C0C0]/80 mb-2">SV Number</label>
                    <input id="sv" type="text" autoComplete="username" value={svNumber} onChange={(e) => setSvNumber(e.target.value)} placeholder="SV-0042" className={inputCls} />
                  </div>
                  <div>
                    <label htmlFor="pw" className="block text-sm font-medium text-[#C0C0C0]/80 mb-2">Password</label>
                    <div className="relative">
                      <input
                        id="pw"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className={`${inputCls} pr-12`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#C0C0C0]/40 hover:text-[#C0C0C0]/70 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-[#C0C0C0]/80 mb-2">Registered phone number</label>
                    <input
                      id="phone"
                      type="tel"
                      autoComplete="tel"
                      value={phone}
                      disabled={otpSent}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+256 7XX XXX XXX"
                      className={`${inputCls} disabled:opacity-60`}
                    />
                  </div>
                  {otpSent && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label htmlFor="otp" className="block text-sm font-medium text-[#C0C0C0]/80">6-digit code</label>
                        <button type="button" onClick={() => { setOtpSent(false); setOtp(""); }} className="text-xs text-[#4A90D9] hover:underline">
                          Change number
                        </button>
                      </div>
                      <input
                        id="otp"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        autoFocus
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                        placeholder="••••••"
                        className={`${inputCls} tracking-[0.5em] text-center text-lg`}
                      />
                      <p className="text-xs text-[#C0C0C0]/40 mt-2 flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" /> We sent a code by SMS. It expires in 5 minutes.
                      </p>
                    </div>
                  )}
                </>
              )}

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-[#C0C0C0]/60 cursor-pointer">
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="rounded accent-[#4A90D9]" />
                  Remember me
                </label>
                <button type="button" onClick={() => setForgotOpen(true)} className="text-[#4A90D9] hover:text-[#4A90D9]/80 transition-colors">
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#4A90D9] hover:bg-[#3a7bc8] text-[#fff] font-semibold py-3.5 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-60 shadow-lg shadow-[#4A90D9]/20"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    {loginMethod === "password" ? "Sign In" : otpSent ? "Verify & Sign In" : "Send OTP"}
                  </>
                )}
              </button>
            </form>

            <button
              type="button"
              onClick={fillDemo}
              className="mt-6 w-full p-3 bg-[#4A90D9]/5 hover:bg-[#4A90D9]/10 border border-[#4A90D9]/10 rounded-xl text-xs text-[#4A90D9]/90 text-center transition-colors"
            >
              <span className="font-semibold">Demo:</span>{" "}
              {loginMethod === "password"
                ? `${DEMO_CREDENTIALS.member.svNumber} / ${DEMO_CREDENTIALS.member.password}`
                : `${DEMO_CREDENTIALS.member.phone} · code ${DEMO_CREDENTIALS.otp}`}
              <span className="block text-[10px] mt-1 opacity-80">Click to fill in</span>
            </button>
          </div>

          <p className="text-center text-[#C0C0C0]/40 text-xs mt-6">
            SACCO staff? <Link href="/admin/login" className="text-[#4A90D9] hover:underline">Admin sign in</Link>
          </p>
        </div>
      </div>

      <ForgotPasswordModal open={forgotOpen} onClose={() => setForgotOpen(false)} label="SV number or phone" placeholder="SV-0042" />
    </div>
  );
}
