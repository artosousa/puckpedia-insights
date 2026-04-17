import { Button } from "@/components/ui/button";
import { ClipboardCheck } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const Navbar = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
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
          {user ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>Dashboard</Button>
              <Button variant="hero" size="sm" onClick={async () => { await signOut(); navigate("/"); }}>Log out</Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild><Link to="/auth">Log In</Link></Button>
              <Button variant="hero" size="sm" asChild><Link to="/auth">Sign Up</Link></Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
