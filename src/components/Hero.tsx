import { Button } from "@/components/ui/button";
import { Lock, TrendingUp } from "lucide-react";
import heroBackground from "@/assets/hero-background.jpg";

const Hero = () => {
  return (
    <section className="relative overflow-hidden bg-gradient-hero py-20 md:py-32">
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `url(${heroBackground})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      
      <div className="container relative z-10">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
            <Lock className="h-4 w-4" />
            Fully Homomorphic Encryption
          </div>
          
          <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            Borrow Without <span className="bg-gradient-primary bg-clip-text text-transparent">Exposure</span>
          </h1>
          
          <p className="mb-8 text-lg text-muted-foreground sm:text-xl md:text-2xl">
            Exchange encrypted credit scores and offers without revealing sensitive financial data. 
            Your privacy is our priority.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="bg-gradient-primary hover:opacity-90 transition-opacity shadow-glow">
              <TrendingUp className="mr-2 h-5 w-5" />
              Start Borrowing
            </Button>
            <Button size="lg" variant="outline" className="border-primary text-primary hover:bg-primary/10">
              Become a Lender
            </Button>
          </div>
          
          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
            <div className="rounded-lg bg-card/50 p-6 shadow-card backdrop-blur-sm">
              <div className="text-3xl font-bold text-primary">$2.4B+</div>
              <div className="text-sm text-muted-foreground">Total Volume Locked</div>
            </div>
            <div className="rounded-lg bg-card/50 p-6 shadow-card backdrop-blur-sm">
              <div className="text-3xl font-bold text-secondary">100%</div>
              <div className="text-sm text-muted-foreground">Privacy Guaranteed</div>
            </div>
            <div className="rounded-lg bg-card/50 p-6 shadow-card backdrop-blur-sm">
              <div className="text-3xl font-bold text-accent">15k+</div>
              <div className="text-sm text-muted-foreground">Active Users</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
