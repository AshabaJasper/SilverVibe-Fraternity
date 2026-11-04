import Link from "next/link";
import Image from "next/image";

/** Branded 404 — shown for any unknown URL. */
export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f0f0f] via-[#1a1a1a] to-[#0f0f0f] px-6">
      <div className="text-center max-w-md animate-fade-in">
        <Image src="/logo.jpg" alt="SilverVibe logo" width={72} height={72} className="w-18 h-18 rounded-full mx-auto mb-6 border-2 border-[#C0C0C0]/30" />
        <p className="text-sm font-semibold tracking-widest text-[#4A90D9]">404</p>
        <h1 className="text-3xl font-bold text-[#f5f5f5] mt-2">Page not found</h1>
        <p className="text-[#C0C0C0]/60 mt-3">
          The page you&apos;re looking for doesn&apos;t exist or has moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
          <Link href="/" className="px-5 py-2.5 rounded-xl bg-[#4A90D9] text-[#fff] text-sm font-semibold hover:bg-[#3a7bc8] transition-colors">
            Back to home
          </Link>
          <Link href="/portal" className="px-5 py-2.5 rounded-xl border border-[#C0C0C0]/20 text-[#e5e5e5] text-sm font-medium hover:bg-white/5 transition-colors">
            Member portal
          </Link>
          <Link href="/admin" className="px-5 py-2.5 rounded-xl border border-[#C0C0C0]/20 text-[#e5e5e5] text-sm font-medium hover:bg-white/5 transition-colors">
            Admin dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
