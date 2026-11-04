"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, AlertCircle, Eye, EyeOff, LogIn, ShieldCheck } from "lucide-react";
import { useAuthStore, useAuthHydrated } from "@/lib/store";
import { ADMIN_USER, DEMO_CREDENTIALS, checkAdminCredentials, safeNext } from "@/lib/auth";
import { showToast } from "@/lib/storage";
import ForgotPasswordModal from "@/components/auth/ForgotPasswordModal";

export default function AdminLoginPage() {
  return (
    <Suspense>
      <AdminLogin />
    </Suspense>
  );
}

function AdminLogin() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"), "/admin");
  const { login, isAuthenticated, userType } = useAuthStore();
  const hydrated = useAuthHydrated();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgotOpen, setForgotOpen] = useState(false);

  // Already signed in as admin? Skip the form.
  useEffect(() => {
    if (hydrated && isAuthenticated && userType === "admin") router.replace(next);
  }, [hydrated, isAuthenticated, userType, next, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = checkAdminCredentials(email, password);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    login("admin", ADMIN_USER);
    showToast(`Welcome back, ${ADMIN_USER.name.split(" ")[0]}`);
    router.push(next);
  };

  const fillDemo = () => {
    setEmail(DEMO_CREDENTIALS.admin.email);
    setPassword(DEMO_CREDENTIALS.admin.password);
    setError(null);
  };

  const inputCls =
    "w-full bg-white/5 border rounded-xl px-4 py-3 text-[#f5f5f5] placeholder-[#C0C0C0]/30 focus:outline-none focus:ring-1 transition-all";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f0f0f] via-[#1a1a1a] to-[#0f0f0f] relative overflow-hidden px-4 py-10">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-[#C0C0C0]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[#4A90D9]/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10 animate-fade-in">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-[#C0C0C0]/50 hover:text-[#C0C0C0] mb-6 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to home
        </Link>
        <div className="text-center mb-8">
          <Image src="/logo.jpg" alt="SilverVibe logo" width={80} height={80} priority className="w-20 h-20 rounded-full object-cover border-2 border-[#C0C0C0]/30 mx-auto mb-4 shadow-2xl" />
          <h1 className="text-2xl font-bold text-[#f5f5f5]">Admin Dashboard</h1>
          <p className="text-[#C0C0C0]/50 text-sm mt-1">SilverVibe SACCO Management</p>
        </div>

        <div className="bg-[#1a1a1a] border border-[#C0C0C0]/10 rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center gap-2 mb-6">
            <ShieldCheck className="w-5 h-5 text-[#C0C0C0]" />
            <span className="text-sm text-[#C0C0C0]/60">Secure Admin Access</span>
          </div>

          {error && (
            <div role="alert" className="mb-5 flex items-start gap-2 p-3 rounded-xl bg-[#ef4444]/10 border border-[#ef4444]/30 text-sm text-[#fca5a5]">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5" noValidate>
            <div>
              <label htmlFor="admin-email" className="block text-sm font-medium text-[#C0C0C0]/80 mb-2">Email Address</label>
              <input
                id="admin-email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@silvervibe.coop"
                className={`${inputCls} ${error ? "border-[#ef4444]/50 focus:ring-[#ef4444]/30" : "border-[#C0C0C0]/20 focus:border-[#C0C0C0]/50 focus:ring-[#C0C0C0]/20"}`}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="admin-password" className="block text-sm font-medium text-[#C0C0C0]/80">Password</label>
                <button type="button" onClick={() => setForgotOpen(true)} className="text-xs text-[#4A90D9] hover:underline">
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`${inputCls} pr-12 ${error ? "border-[#ef4444]/50 focus:ring-[#ef4444]/30" : "border-[#C0C0C0]/20 focus:border-[#C0C0C0]/50 focus:ring-[#C0C0C0]/20"}`}
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

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#f5f5f5] text-[#111] font-semibold py-3.5 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-60 hover:bg-[#C0C0C0] shadow-lg"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-[#111]/30 border-t-[#111] rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-5 h-5" /> Sign In to Dashboard
                </>
              )}
            </button>
          </form>

          <button
            type="button"
            onClick={fillDemo}
            className="mt-6 w-full p-3 bg-[#C0C0C0]/5 hover:bg-[#C0C0C0]/10 border border-[#C0C0C0]/10 rounded-xl text-xs text-[#C0C0C0]/70 text-center transition-colors"
          >
            <span className="font-semibold">Demo:</span> {DEMO_CREDENTIALS.admin.email} / {DEMO_CREDENTIALS.admin.password}
            <span className="block text-[10px] text-[#4A90D9] mt-1">Click to fill in</span>
          </button>
        </div>

        <p className="text-center text-[#C0C0C0]/40 text-xs mt-6">
          Are you a member? <Link href="/portal/login" className="text-[#4A90D9] hover:underline">Go to the Member Portal</Link>
        </p>
      </div>

      <ForgotPasswordModal open={forgotOpen} onClose={() => setForgotOpen(false)} label="Email address" placeholder="admin@silvervibe.coop" />
    </div>
  );
}
