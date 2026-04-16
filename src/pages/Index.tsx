import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import PreviewSection from "@/components/landing/PreviewSection";
import CTASection from "@/components/landing/CTASection";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <div id="features">
        <FeaturesSection />
      </div>
      <div id="preview">
        <PreviewSection />
      </div>
      <CTASection />
      <footer className="border-t border-border/50 py-8">
        <div className="container px-6 text-center text-sm text-muted-foreground">
          © 2026 BarnNotes. Built for scouts, by scouts.
        </div>
      </footer>
    </div>
  );
};

export default Index;
