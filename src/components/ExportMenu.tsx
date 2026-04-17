import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { downloadCSV, downloadXLSX, type ExportRow } from "@/lib/exports";

type Props = {
  filename: string;
  sheets: { name: string; rows: ExportRow[] }[];
  label?: string;
};

export const ExportMenu = ({ filename, sheets, label = "Export" }: Props) => {
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
        <DropdownMenuItem onClick={() => downloadXLSX(sheets, filename)}>
          Excel (.xlsx)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
