import * as XLSX from "xlsx";

export type ExportRow = Record<string, string | number | null | undefined>;

export type ExportBranding = {
  teamName: string;
  logoUrl?: string | null;
  primaryColor: string;
  secondaryColor: string;
};

export const downloadCSV = (rows: ExportRow[], filename: string) => {
  if (rows.length === 0) return;
  const ws = XLSX.utils.json_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, `${filename}.csv`);
};

export const downloadXLSX = (
  sheets: { name: string; rows: ExportRow[] }[],
  filename: string,
  branding?: ExportBranding
) => {
  const wb = XLSX.utils.book_new();
  if (branding) {
    const brandSheet = XLSX.utils.aoa_to_sheet([
      [branding.teamName],
      ["Prepared with", "BarnNotes"],
      ["Primary color", branding.primaryColor],
      ["Secondary color", branding.secondaryColor],
      ["Exported", new Date().toLocaleString()],
    ]);
    brandSheet["!cols"] = [{ wch: 22 }, { wch: 28 }];
    XLSX.utils.book_append_sheet(wb, brandSheet, "Team");
  }
  sheets.forEach(({ name, rows }) => {
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
  });
  XLSX.writeFile(wb, `${filename}.xlsx`);
};

const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character] ?? character));

export const printBrandedReport = (title: string, sections: { name: string; rows: ExportRow[] }[], branding: ExportBranding) => {
  const popup = window.open("", "_blank", "noopener,noreferrer");
  if (!popup) throw new Error("Allow pop-ups to open the printable report.");
  const logo = branding.logoUrl ? `<img src="${escapeHtml(branding.logoUrl)}" alt="" />` : "";
  const tables = sections.map((section) => {
    if (!section.rows.length) return "";
    const headers = Object.keys(section.rows[0]);
    const body = section.rows.map((row) => `<tr>${headers.map((key) => `<td>${escapeHtml(String(row[key] ?? ""))}</td>`).join("")}</tr>`).join("");
    return `<section><h2>${escapeHtml(section.name)}</h2><table><thead><tr>${headers.map((key) => `<th>${escapeHtml(key.replace(/_/g, " "))}</th>`).join("")}</tr></thead><tbody>${body}</tbody></table></section>`;
  }).join("");
  popup.document.write(`<!doctype html><html><head><title>${escapeHtml(title)}</title><style>:root{--brand:hsl(${branding.primaryColor});--accent:hsl(${branding.secondaryColor})}*{box-sizing:border-box}body{font:13px Arial,sans-serif;color:#17202a;margin:40px}header{display:flex;align-items:center;gap:16px;border-bottom:4px solid var(--brand);padding-bottom:18px;margin-bottom:28px}img{width:64px;height:64px;object-fit:contain}h1{font-size:26px;margin:0}header p{color:#5d6670;margin:5px 0 0}h2{font-size:16px;color:var(--brand);margin:28px 0 10px}table{width:100%;border-collapse:collapse;page-break-inside:auto}tr{page-break-inside:avoid}th,td{text-align:left;vertical-align:top;padding:8px;border:1px solid #d9dee3;white-space:pre-wrap}th{background:#f2f4f6;text-transform:capitalize}footer{margin-top:28px;color:#707880;border-top:1px solid #d9dee3;padding-top:12px}@media print{body{margin:16mm}.no-print{display:none}}</style></head><body><header>${logo}<div><h1>${escapeHtml(title)}</h1><p>${escapeHtml(branding.teamName)} · BarnNotes</p></div></header>${tables}<footer>Prepared ${escapeHtml(new Date().toLocaleDateString())}</footer><script>window.addEventListener('load',()=>window.print())</script></body></html>`);
  popup.document.close();
};

const triggerDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};
