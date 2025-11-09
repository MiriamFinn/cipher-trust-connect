import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";
import logo from "@/assets/trustbond-logo.png";

const Header = () => {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={logo} alt="TrustBond Finance" className="h-10 w-10" />
          <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            TrustBond Finance
          </span>
        </div>
        
        <nav className="hidden md:flex items-center gap-6">
          <a href="#borrow" className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors">
            Borrow
          </a>
          <a href="#lend" className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors">
            Lend
          </a>
          <a href="#security" className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors">
            Security
          </a>
        </nav>

        <Button className="bg-gradient-primary hover:opacity-90 transition-opacity">
          <Shield className="mr-2 h-4 w-4" />
          Connect Wallet
        </Button>
      </div>
    </header>
  );
};

export default Header;
