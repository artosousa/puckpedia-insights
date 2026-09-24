import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { downloadCSV, downloadXLSX, printBrandedReport, type ExportRow } from "@/lib/exports";
import { useTeamBranding } from "@/hooks/useTeamBranding";

type Props = {
  filename: string;
  sheets: { name: string; rows: ExportRow[] }[];
  label?: string;
  printableTitle?: string;
};

export const ExportMenu = ({ filename, sheets, label = "Export", printableTitle }: Props) => {
  const { branding } = useTeamBranding();
  const totalRows = sheets.reduce((sum, s) => sum + s.rows.length, 0);
  const disabled = totalRows === 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          <Download className="w-4 h-4" />
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => downloadCSV(sheets[0].rows, `${filename}-${sheets[0].name.toLowerCase()}`)}
        >
          CSV ({sheets[0].name})
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => downloadXLSX(sheets, filename, branding ? { teamName: branding.name, logoUrl: branding.logoUrl, primaryColor: branding.primaryColor, secondaryColor: branding.secondaryColor } : undefined)}>
          Excel (.xlsx)
        </DropdownMenuItem>
        {printableTitle && branding && (
          <DropdownMenuItem onClick={() => printBrandedReport(printableTitle, sheets, { teamName: branding.name, logoUrl: branding.logoUrl, primaryColor: branding.primaryColor, secondaryColor: branding.secondaryColor })}>
            <Printer className="size-4" /> Print / Save PDF
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
