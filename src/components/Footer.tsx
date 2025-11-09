import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Cpu, Lock, Activity } from "lucide-react";
import { useState, useEffect } from "react";

const Footer = () => {
  const [computationStatus, setComputationStatus] = useState("Processing");
  const [activeComputations, setActiveComputations] = useState(47);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveComputations((prev) => prev + Math.floor(Math.random() * 3) - 1);
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <footer className="border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container py-8">
        <Card className="mb-8 p-6 bg-gradient-card shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Cpu className="h-5 w-5 text-primary" />
              FHE Computation Status
            </h3>
            <Badge variant="outline" className="border-accent text-accent">
              <Activity className="mr-1 h-3 w-3" />
              {computationStatus}
            </Badge>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-lg bg-background/50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="h-4 w-4 text-encrypted" />
                <span className="text-sm font-medium">Active Computations</span>
              </div>
              <div className="text-2xl font-bold text-encrypted">{activeComputations}</div>
            </div>

            <div className="rounded-lg bg-background/50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Encrypted Matches</span>
              </div>
              <div className="text-2xl font-bold text-primary">1,247</div>
            </div>

            <div className="rounded-lg bg-background/50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-4 w-4 text-secondary" />
                <span className="text-sm font-medium">Avg. Process Time</span>
              </div>
              <div className="text-2xl font-bold text-secondary">2.4s</div>
            </div>
          </div>

          <div className="mt-4 text-xs text-muted-foreground">
            All computations performed using Fully Homomorphic Encryption (FHE) to preserve privacy
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div>
            <h4 className="mb-4 text-sm font-semibold">Product</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground transition-colors">Borrow</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Lend</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Security</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Pricing</a></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold">Resources</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground transition-colors">Documentation</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">API</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Support</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Status</a></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold">Company</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground transition-colors">About</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Careers</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Contact</a></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground transition-colors">Privacy</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Terms</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Security</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Compliance</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-border">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <p>© 2025 TrustBond Finance. All rights reserved.</p>
            <p className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Secured by Fully Homomorphic Encryption
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

const Shield = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

export default Footer;
