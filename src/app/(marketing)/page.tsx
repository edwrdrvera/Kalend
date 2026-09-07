import LandingNav from "@/components/landing/LandingNav";
import LandingHero from "@/components/landing/LandingHero";
import LandingProblemSolution from "@/components/landing/LandingProblemSolution";
import LandingHowItWorks from "@/components/landing/LandingHowItWorks";
import LandingFeatures from "@/components/landing/LandingFeatures";
import LandingBottomCTA from "@/components/landing/LandingBottomCTA";
import LandingFooter from "@/components/landing/LandingFooter";

// Public marketing page at "/". Static and illustrative only, not wired to
// real data (see docs/landing-page-handoff.md). Logged-in visitors never
// see this: src/lib/supabase/middleware.ts redirects them to /app instead.
export default function LandingPage() {
  return (
    <main>
      <LandingNav />
      <LandingHero />
      <LandingProblemSolution />
      <LandingFeatures />
      <LandingHowItWorks />
      <LandingBottomCTA />
      <LandingFooter />
    </main>
  );
}
