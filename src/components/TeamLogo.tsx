import { ClipboardCheck } from "lucide-react";
import { useTeamBranding } from "@/hooks/useTeamBranding";
import { cn } from "@/lib/utils";

export function TeamLogo({ className }: { className?: string }) {
  const { branding } = useTeamBranding();
  if (branding?.logoUrl) {
    return <img src={branding.logoUrl} alt={`${branding.name} logo`} className={cn("size-7 rounded object-contain", className)} />;
  }
  return <ClipboardCheck className={cn("size-5 text-primary shrink-0", className)} aria-hidden />;
}