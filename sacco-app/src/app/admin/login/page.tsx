"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LogIn, ShieldCheck } from "lucide-react";

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("sarah@silvervibe.coop");
  const [password, setPassword] = useState("admin1234");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    router.push("/admin");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f0f0f] via-[#1a1a1a] to-[#0f0f0f] relative overflow-hidden px-4">
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-[#C0C0C0]/3 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[#4A90D9]/3 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10 animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full silver-gradient flex items-center justify-center border-2 border-[#C0C0C0]/30 mx-auto mb-4 shadow-2xl">
            <span className="text-2xl font-bold silver-text-gradient">SV</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-[#C0C0C0]/50 text-sm mt-1">SilverVibe SACCO Management</p>
        </div>

        <div className="bg-[#1a1a1a] border border-[#C0C0C0]/10 rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center gap-2 mb-6">
            <ShieldCheck className="w-5 h-5 text-[#C0C0C0]" />
            <span className="text-sm text-[#C0C0C0]/60">Secure Admin Access</span>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-[#C0C0C0]/80 mb-2">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@silvervibe.coop"
                className="w-full bg-white/5 border border-[#C0C0C0]/20 rounded-xl px-4 py-3 text-white placeholder-[#C0C0C0]/30 focus:outline-none focus:border-[#C0C0C0]/50 focus:ring-1 focus:ring-[#C0C0C0]/20 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#C0C0C0]/80 mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-[#C0C0C0]/20 rounded-xl px-4 py-3 text-white placeholder-[#C0C0C0]/30 focus:outline-none focus:border-[#C0C0C0]/50 focus:ring-1 focus:ring-[#C0C0C0]/20 transition-all pr-12"
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

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-[#1A1A1A] font-semibold py-3.5 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-60 hover:bg-[#C0C0C0] shadow-lg cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-[#1A1A1A]/30 border-t-[#1A1A1A] rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  Sign In to Dashboard
                </>
              )}
            </button>
          </form>

          <div className="mt-6 p-3 bg-[#C0C0C0]/5 border border-[#C0C0C0]/10 rounded-xl">
            <p className="text-xs text-[#C0C0C0]/60 text-center">
              <span className="font-semibold">Demo:</span> sarah@silvervibe.coop / admin1234
            </p>
          </div>
        </div>

        <p className="text-center text-[#C0C0C0]/30 text-xs mt-6">
          &copy; 2026 SilverVibe Fraternity Cooperative Society Ltd
        </p>
      </div>
    </div>
  );
}
