"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LogIn, Smartphone } from "lucide-react";

export default function MemberLogin() {
  const router = useRouter();
  const [svNumber, setSvNumber] = useState("SV-0042");
  const [password, setPassword] = useState("demo1234");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginMethod, setLoginMethod] = useState<"password" | "otp">("password");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    router.push("/portal");
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-[#0f0f0f] via-[#1a1a1a] to-[#0f0f0f] relative overflow-hidden">
      {/* Decorative */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-[#4A90D9]/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-[#C0C0C0]/5 rounded-full blur-3xl" />
      </div>

      {/* Left Panel — Branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center relative z-10 px-16">
        <div className="max-w-md space-y-8 animate-fade-in">
          <div className="w-20 h-20 rounded-full silver-gradient flex items-center justify-center border-2 border-[#C0C0C0]/30">
            <span className="text-2xl font-bold silver-text-gradient">SV</span>
          </div>
          <h1 className="text-4xl font-bold text-white leading-tight">
            Welcome to<br />
            <span className="silver-text-gradient">SilverVibe Fraternity</span>
          </h1>
          <p className="text-[#C0C0C0]/60 text-lg leading-relaxed">
            Your cooperative journey starts here. Access your savings, monitor your loans,
            track your share capital, and stay connected with your SACCO community.
          </p>
          <div className="grid grid-cols-2 gap-4 pt-4">
            {[
              { label: "Members", value: "847+" },
              { label: "Total Savings", value: "UGX 4.8B" },
              { label: "Loans Disbursed", value: "UGX 2.1B" },
              { label: "Share Capital", value: "UGX 1.2B" },
            ].map((stat) => (
              <div key={stat.label} className="dm-surface/5 border border-[#C0C0C0]/10 rounded-xl p-4">
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-sm text-[#C0C0C0]/50">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 relative z-10">
        <div className="w-full max-w-md animate-fade-in">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-16 h-16 rounded-full silver-gradient flex items-center justify-center border-2 border-[#C0C0C0]/30 mx-auto mb-4">
              <span className="text-xl font-bold silver-text-gradient">SV</span>
            </div>
            <h1 className="text-2xl font-bold text-white">Member Portal</h1>
            <p className="text-[#C0C0C0]/50 text-sm mt-1">SilverVibe Fraternity Cooperative</p>
          </div>

          <div className="bg-[#1a1a1a] border border-[#C0C0C0]/10 rounded-2xl p-8 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-1 hidden lg:block">Sign In</h2>
            <p className="text-[#C0C0C0]/50 mb-6 text-sm hidden lg:block">Access your member account</p>

            {/* Login Method Toggle */}
            <div className="flex dm-surface/5 rounded-xl p-1 mb-6">
              <button
                onClick={() => setLoginMethod("password")}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  loginMethod === "password"
                    ? "bg-[#4A90D9] text-white shadow"
                    : "text-[#C0C0C0]/60 hover:text-white"
                }`}
              >
                Password
              </button>
              <button
                onClick={() => setLoginMethod("otp")}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
                  loginMethod === "otp"
                    ? "bg-[#4A90D9] text-white shadow"
                    : "text-[#C0C0C0]/60 hover:text-white"
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" /> OTP
              </button>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-[#C0C0C0]/80 mb-2">
                  SV Number
                </label>
                <input
                  type="text"
                  value={svNumber}
                  onChange={(e) => setSvNumber(e.target.value)}
                  placeholder="SV-0042"
                  className="w-full dm-surface/5 border border-[#C0C0C0]/20 rounded-xl px-4 py-3 text-white placeholder-[#C0C0C0]/30 focus:outline-none focus:border-[#4A90D9]/60 focus:ring-1 focus:ring-[#4A90D9]/30 transition-all"
                />
              </div>

              {loginMethod === "password" ? (
                <div>
                  <label className="block text-sm font-medium text-[#C0C0C0]/80 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full dm-surface/5 border border-[#C0C0C0]/20 rounded-xl px-4 py-3 text-white placeholder-[#C0C0C0]/30 focus:outline-none focus:border-[#4A90D9]/60 focus:ring-1 focus:ring-[#4A90D9]/30 transition-all pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#C0C0C0]/40 hover:text-[#C0C0C0]/70 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-[#C0C0C0]/80 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="+256 7XX XXX XXX"
                    className="w-full dm-surface/5 border border-[#C0C0C0]/20 rounded-xl px-4 py-3 text-white placeholder-[#C0C0C0]/30 focus:outline-none focus:border-[#4A90D9]/60 focus:ring-1 focus:ring-[#4A90D9]/30 transition-all"
                  />
                </div>
              )}

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-[#C0C0C0]/60 cursor-pointer">
                  <input type="checkbox" className="rounded border-[#C0C0C0]/30 bg-transparent accent-[#4A90D9]" />
                  Remember me
                </label>
                <button type="button" className="text-[#4A90D9] hover:text-[#4A90D9]/80 transition-colors">
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#4A90D9] hover:bg-[#3a7bc8] text-white font-semibold py-3.5 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-60 shadow-lg shadow-[#4A90D9]/20 cursor-pointer"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    {loginMethod === "password" ? "Sign In" : "Send OTP"}
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 p-3 bg-[#4A90D9]/5 border border-[#4A90D9]/10 rounded-xl">
              <p className="text-xs text-[#4A90D9]/80 text-center">
                <span className="font-semibold">Demo:</span> SV-0042 / demo1234
              </p>
            </div>
          </div>

          <p className="text-center text-[#C0C0C0]/30 text-xs mt-6">
            &copy; 2026 SilverVibe Fraternity Cooperative Society Ltd
          </p>
        </div>
      </div>
    </div>
  );
}
