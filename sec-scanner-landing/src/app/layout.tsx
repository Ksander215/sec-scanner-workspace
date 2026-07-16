import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Security Intelligence Platform — Open Source Security Intelligence",
  description:
    "Open Source Security Intelligence Platform для компаний любого масштаба. Analyze. Correlate. Prioritize. Remediate.",
  keywords: [
    "security",
    "intelligence",
    "vulnerability",
    "scanner",
    "OWASP",
    "API security",
    "open source",
  ],
  openGraph: {
    title: "Security Intelligence Platform",
    description: "Open Source Security Intelligence для компаний любого масштаба",
    url: "https://sec-scanner.pro",
    siteName: "Security Intelligence Platform",
    type: "website",
    locale: "ru_RU",
  },
  twitter: {
    card: "summary_large_image",
    title: "Security Intelligence Platform",
    description: "Open Source Security Intelligence для компаний любого масштаба",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
