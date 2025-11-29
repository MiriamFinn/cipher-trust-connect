import { Button } from "@/components/ui/button";
import { Lock, TrendingUp } from "lucide-react";

const Hero = () => {
  const scrollToDashboard = (tab: 'borrow' | 'lend') => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    const dashboardElement = document.querySelector('#dashboard');
    if (dashboardElement) {
      dashboardElement.scrollIntoView({ behavior: 'smooth' });
      // Trigger tab change after scroll
      setTimeout(() => {
        const tabTrigger = document.querySelector(`[value="${tab}"]`) as HTMLElement;
        if (tabTrigger) {
          tabTrigger.click();
        }
      }, 500);
    }
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-teal-50 py-20 md:py-32">
      <div className="container relative z-10">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700">
            <Lock className="h-4 w-4" />
            Fully Homomorphic Encryption
          </div>

          <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            Borrow Without <span className="bg-gradient-to-r from-blue-600 to-teal-500 bg-clip-text text-transparent">Exposure</span>
          </h1>

          <p className="mb-8 text-lg text-muted-foreground sm:text-xl md:text-2xl">
            Exchange encrypted credit scores and offers without revealing sensitive financial data.
            Your privacy is our priority.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-teal-500 hover:opacity-90 transition-opacity shadow-lg"
              onClick={() => scrollToDashboard('borrow')}
            >
              <TrendingUp className="mr-2 h-5 w-5" />
              Start Borrowing
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-blue-600 text-blue-600 hover:bg-blue-50"
              onClick={() => scrollToDashboard('lend')}
            >
              Become a Lender
            </Button>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
            <div className="rounded-lg bg-white/50 p-6 shadow-sm backdrop-blur-sm">
              <div className="text-3xl font-bold text-blue-600">$2.4B+</div>
              <div className="text-sm text-muted-foreground">Total Volume Locked</div>
            </div>
            <div className="rounded-lg bg-white/50 p-6 shadow-sm backdrop-blur-sm">
              <div className="text-3xl font-bold text-teal-600">100%</div>
              <div className="text-sm text-muted-foreground">Privacy Guaranteed</div>
            </div>
            <div className="rounded-lg bg-white/50 p-6 shadow-sm backdrop-blur-sm">
              <div className="text-3xl font-bold text-green-600">15k+</div>
              <div className="text-sm text-muted-foreground">Active Users</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;

