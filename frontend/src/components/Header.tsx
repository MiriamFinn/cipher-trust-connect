import { ConnectButton } from '@rainbow-me/rainbowkit';

const Header = () => {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-teal-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">CT</span>
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-teal-500 bg-clip-text text-transparent">
            Cipher Trust Connect
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

        <ConnectButton />
      </div>
    </header>
  );
};

export default Header;

