import { Header } from "@/components/sections/Header";
import { Hero } from "@/components/sections/Hero";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { Platform } from "@/components/sections/Platform";
import { PlatformMetrics } from "@/components/sections/PlatformMetrics";
import { DemoPreview } from "@/components/sections/DemoPreview";
import { Trust } from "@/components/sections/Trust";
import { Comparison } from "@/components/sections/Comparison";
import { Pricing } from "@/components/sections/Pricing";
import { Community } from "@/components/sections/Community";
import { Footer } from "@/components/sections/Footer";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        <Hero />
        <HowItWorks />
        <Platform />
        <PlatformMetrics />
        <DemoPreview />
        <Trust />
        <Comparison />
        <Pricing />
        <Community />
      </main>
      <Footer />
    </div>
  );
}
