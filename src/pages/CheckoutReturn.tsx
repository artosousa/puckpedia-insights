import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const CheckoutReturn = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");

  useEffect(() => {
    const t = setTimeout(() => navigate("/dashboard"), 4000);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="glass-card rounded-2xl p-10 max-w-md w-full text-center">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-primary" />
        </div>
        <h1 className="font-heading text-2xl font-bold mb-2">You're on the roster.</h1>
        <p className="text-sm text-muted-foreground mb-6">
          {sessionId
            ? "Payment received. Your new plan is active — redirecting you to the dashboard..."
            : "Redirecting you to the dashboard..."}
        </p>
        <Button variant="hero" onClick={() => navigate("/dashboard")} className="w-full">
          Go to dashboard
        </Button>
      </div>
    </div>
  );
};

export default CheckoutReturn;
