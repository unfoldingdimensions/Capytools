import { HeroSection } from '@/components/landing/HeroSection';
import { FeatureGrid } from '@/components/landing/FeatureGrid';
import { AIEngineSection } from '@/components/landing/AIEngineSection';
import { WorkflowSection } from '@/components/landing/WorkflowSection';
import { EfficiencyMetric } from '@/components/landing/EfficiencyMetric';
import { Testimonials } from '@/components/landing/Testimonials';
import { PricingSection } from '@/components/landing/PricingSection';
import { StickyCTA } from '@/components/landing/StickyCTA';
import { AuthButtons } from '@/components/landing/AuthButtons';
import { ThemeToggle } from '@/components/theme-toggle';
import { Footer } from '@/components/landing/Footer';

// Static generation for optimal performance
export const dynamic = 'force-static';
export const revalidate = 3600; // Revalidate every hour

/* 
  SWISS MODERN LANDING PAGE
  Concept: High contrast, strict grid, heavy typography, minimal decoration.
  Updated: Power User Focus v2
*/

export default function HomePage() {
    return (
        <div className="min-h-screen bg-background text-foreground font-sans selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black relative overflow-hidden">

            {/* Animated Background Elements */}
            <div className="fixed inset-0 pointer-events-none z-0">
                {/* Gradient Mesh */}
                <div className="gradient-mesh" />

                {/* Floating Orbs - hidden on small screens (blur is expensive on low-end devices) */}
                <div className="landing-orb landing-orb-1 hidden md:block" />
                <div className="landing-orb landing-orb-2 hidden md:block" />
                <div className="landing-orb landing-orb-3 hidden md:block" />

                {/* Animated Grid */}
                <div className="animated-grid" />

                {/* Noise Texture - hidden on small screens */}
                <div className="noise-overlay hidden md:block" />
            </div>

            {/* Fixed Theme Toggle */}
            <div className="fixed top-6 right-6 z-50">
                <ThemeToggle />
            </div>

            {/* Page Content */}
            <div className="relative z-10">

                <HeroSection />
                <FeatureGrid />
                <AIEngineSection />
                <EfficiencyMetric />
                <WorkflowSection />
                <Testimonials />
                <PricingSection />

                {/* FINAL CTA */}
                <section className="py-32 px-6 border-t border-border bg-background relative overflow-hidden">
                    <div className="grid-overlay" />
                    <div className="max-w-4xl mx-auto text-center relative z-10">
                        <h2 className="text-display text-5xl md:text-7xl font-medium mb-8">
                            Your career. <br />
                            <span className="text-muted-foreground">Next level.</span>
                        </h2>
                        <p className="text-xl text-muted-foreground mb-12 max-w-xl mx-auto text-pretty">
                            Join thousands of professionals who have stopped fighting with formatting and started landing interviews.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                            <AuthButtons
                                className="h-16 px-10 rounded-full text-xl shadow-pop hover:shadow-xl hover:-translate-y-1 transition-all duration-normal ease-out-expo"
                                textSignedOut="Start Building Free"
                            />
                        </div>
                        <p className="mt-8 text-sm text-muted-foreground uppercase tracking-widest font-medium opacity-80">
                            No credit card required • GDPR Compliant
                        </p>
                    </div>
                </section>

                <StickyCTA />

                <Footer />
            </div>
        </div>
    );
}
