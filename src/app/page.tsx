"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Shield, Users } from "lucide-react";

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#0f0f0f] via-[#1a1a1a] to-[#0f0f0f] relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-20 left-20 w-72 h-72 bg-[#4A90D9]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-[#C0C0C0]/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 text-center space-y-8 animate-fade-in px-4">
        {/* Logo */}
        <div className="flex items-center justify-center mb-2">
          <Image src="/logo.jpg" alt="SilverVibe Fraternity logo" width={96} height={96} priority className="w-24 h-24 rounded-full object-cover border-2 border-[#C0C0C0]/30 shadow-2xl" />
        </div>
        <div>
          <h1 className="text-4xl md:text-5xl font-bold text-[#f5f5f5] tracking-tight">
            SilverVibe <span className="silver-text-gradient">Fraternity</span>
          </h1>
          <p className="text-[#C0C0C0]/70 mt-3 text-lg">Cooperative Society Limited</p>
        </div>

        <p className="text-[#C0C0C0]/50 max-w-md mx-auto">
          SACCO Management System — Select your portal to continue
        </p>

        {/* Portal Selection Cards */}
        <div className="flex flex-col sm:flex-row gap-6 mt-8 items-center justify-center">
          <button
            onClick={() => router.push("/portal/login")}
            className="group relative bg-white/5 hover:bg-white/10 border border-[#C0C0C0]/20 hover:border-[#4A90D9]/50 rounded-2xl p-8 w-72 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-[#4A90D9]/10 cursor-pointer"
          >
            <div className="w-14 h-14 rounded-xl bg-[#4A90D9]/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-[#4A90D9]/20 transition-colors">
              <Users className="w-7 h-7 text-[#4A90D9]" />
            </div>
            <h2 className="text-xl font-semibold text-[#f5f5f5] mb-2">Member Portal</h2>
            <p className="text-sm text-[#C0C0C0]/60">
              Access your savings, loans, shares & more
            </p>
          </button>

          <button
            onClick={() => router.push("/admin/login")}
            className="group relative bg-white/5 hover:bg-white/10 border border-[#C0C0C0]/20 hover:border-[#C0C0C0]/50 rounded-2xl p-8 w-72 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-[#C0C0C0]/10 cursor-pointer"
          >
            <div className="w-14 h-14 rounded-xl bg-[#C0C0C0]/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-[#C0C0C0]/20 transition-colors">
              <Shield className="w-7 h-7 text-[#C0C0C0]" />
            </div>
            <h2 className="text-xl font-semibold text-[#f5f5f5] mb-2">Admin Dashboard</h2>
            <p className="text-sm text-[#C0C0C0]/60">
              Manage members, transactions & reports
            </p>
          </button>
        </div>

        <p className="text-[#C0C0C0]/40 text-xs">
          Demo build · Member <span className="font-mono">SV-0042 / member123</span> · Admin <span className="font-mono">admin@silvervibe.coop / admin123</span>
        </p>

        <p className="text-[#C0C0C0]/30 text-xs mt-6">
          &copy; 2026 SilverVibe Fraternity Cooperative Society Limited
        </p>
      </div>
    </div>
  );
}
