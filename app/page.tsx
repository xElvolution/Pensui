import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Features } from "@/components/landing/features";
import { LiveStats } from "@/components/landing/live-stats";
import { FeaturedCreators } from "@/components/landing/featured-creators";
import { CtaBand } from "@/components/landing/cta-band";

export default function Home() {
  return (
    <>
      <Hero />
      <LiveStats />
      <HowItWorks />
      <Features />
      <FeaturedCreators />
      <CtaBand />
    </>
  );
}
