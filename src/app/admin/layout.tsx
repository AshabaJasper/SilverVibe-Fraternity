import type { Metadata } from "next";

// Browser-tab titles: "Admin Dashboard" for the section home, "<Page> · …" for sub-pages.
export const metadata: Metadata = {
  title: { default: "Admin Dashboard", template: "%s · SilverVibe Admin" },
};

export default function SectionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
