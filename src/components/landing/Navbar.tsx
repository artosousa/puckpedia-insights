import { Button } from "@/components/ui/button";
import { ClipboardCheck } from "lucide-react";

const Navbar = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container flex items-center justify-between h-16 px-6">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="w-6 h-6 text-primary" />
          <span className="font-heading text-lg font-bold">BarnNotes</span>
        </div>

        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
          <a href="#preview" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Preview</a>
          <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm">Log In</Button>
          <Button variant="hero" size="sm">Sign Up</Button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
