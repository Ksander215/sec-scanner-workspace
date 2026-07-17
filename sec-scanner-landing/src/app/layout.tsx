import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
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
  title: "SIP — Security Intelligence Platform",
  description:
    "Операционная система для безопасности бизнеса. Находите уязвимости, анализируйте инфраструктуру, получайте рекомендации AI.",
  keywords: [
    "SIP",
    "security",
    "intelligence",
    "platform",
    "vulnerability",
    "scanner",
    "OWASP",
    "API security",
    "open source",
    "информационная безопасность",
    "уязвимости",
  ],
  openGraph: {
    title: "SIP — Security Intelligence Platform",
    description: "Операционная система для безопасности бизнеса",
    url: "https://sec-scanner.pro",
    siteName: "SIP — Security Intelligence Platform",
    type: "website",
    locale: "ru_RU",
  },
  twitter: {
    card: "summary_large_image",
    title: "SIP — Security Intelligence Platform",
    description: "Операционная система для безопасности бизнеса",
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
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
