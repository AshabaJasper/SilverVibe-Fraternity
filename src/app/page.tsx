import { DemoAccess } from "@/components/landing/DemoAccess";
import { Features } from "@/components/landing/Features";
import { Footer } from "@/components/landing/Footer";
import { Hero } from "@/components/landing/Hero";
import { KpiStrip } from "@/components/landing/KpiStrip";
import { MemberExperience } from "@/components/landing/MemberExperience";
import { Nav } from "@/components/landing/Nav";

/**
 * Public landing page. A server component: only Nav (mobile menu), KpiStrip
 * (count-up) and the copy buttons inside DemoAccess ship client JS.
 * `overflow-x-clip` (not hidden) prevents horizontal scroll from the decorative
 * glows without breaking the sticky header.
 */
export default function Home() {
  return (
    <div className="min-h-screen overflow-x-clip bg-gradient-to-b from-[#0f0f0f] via-[#1a1a1a] to-[#0f0f0f] text-[#f5f5f5]">
      <Nav />
      <main id="main-content">
        <Hero />
        <KpiStrip />
        <Features />
        <MemberExperience />
        <DemoAccess />
      </main>
      <Footer />
    </div>
  );
}
