import type { Metadata } from "next";

// Browser-tab titles: "Member Portal" for the section home, "<Page> · …" for sub-pages.
export const metadata: Metadata = {
  title: { default: "Member Portal", template: "%s · SilverVibe Member Portal" },
};

export default function SectionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
