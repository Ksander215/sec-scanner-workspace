import { Header } from "@/components/sections/Header";
import { Hero } from "@/components/sections/Hero";
import { Platform } from "@/components/sections/Platform";
import { PlatformMetrics } from "@/components/sections/PlatformMetrics";
import { DemoPreview } from "@/components/sections/DemoPreview";
import { Community } from "@/components/sections/Community";
import { Footer } from "@/components/sections/Footer";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        <Hero />
        <Platform />
        <PlatformMetrics />
        <DemoPreview />
        <Community />
      </main>
      <Footer />
    </div>
  );
}
