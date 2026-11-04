import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

const SITE_URL = "https://silvervibe-sacco-app.vercel.app";
const DESCRIPTION =
  "SilverVibe Fraternity Cooperative Society Ltd — member portal and SACCO management dashboard for savings, loans, shares, accounting and reports.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "SilverVibe Fraternity — SACCO Management System",
    template: "%s · SilverVibe Fraternity",
  },
  description: DESCRIPTION,
  applicationName: "SilverVibe SACCO",
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "SilverVibe Fraternity",
    title: "SilverVibe Fraternity — SACCO Management System",
    description: DESCRIPTION,
    images: [{ url: "/logo.jpg", width: 512, height: 512, alt: "SilverVibe Fraternity logo" }],
  },
  twitter: { card: "summary", title: "SilverVibe Fraternity SACCO", description: DESCRIPTION, images: ["/logo.jpg"] },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F8F9FA" },
    { media: "(prefers-color-scheme: dark)", color: "#0f0f0f" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Root App Router layout applies to every page, so this rule (written for pages/_document) does not apply. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap" rel="stylesheet" />
        <script dangerouslySetInnerHTML={{
          __html: `try{if(localStorage.getItem('silvervibe_theme')==='dark'){document.documentElement.classList.add('dark')}}catch(e){}`
        }} />
      </head>
      <body className="antialiased">
        <a href="#main-content" className="skip-link">Skip to content</a>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
