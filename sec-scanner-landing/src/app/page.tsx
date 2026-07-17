import { Header } from "@/components/sections/Header";
import { Hero } from "@/components/sections/Hero";
import { Platform } from "@/components/sections/Platform";
import { Capabilities } from "@/components/sections/Capabilities";
import { Architecture } from "@/components/sections/Architecture";
import { Demo } from "@/components/sections/Demo";
import { PlatformMetrics } from "@/components/sections/PlatformMetrics";
import { Pricing } from "@/components/sections/Pricing";
import { Marketplace } from "@/components/sections/Marketplace";
import { Roadmap } from "@/components/sections/Roadmap";
import { Community } from "@/components/sections/Community";
import { Footer } from "@/components/sections/Footer";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        <Hero />
        <Platform />
        <Capabilities />
        <Architecture />
        <Demo />
        <PlatformMetrics />
        <Pricing />
        <Marketplace />
        <Roadmap />
        <Community />
      </main>
      <Footer />
    </div>
  );
}
