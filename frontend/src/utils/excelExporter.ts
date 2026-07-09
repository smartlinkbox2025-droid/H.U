import * as XLSX from 'xlsx';

export interface ExcelExportOptions {
  filename: string;
  sheetName?: string;
  headers: string[];
  rows: (string | number | Date)[][];
  columnWidths?: number[]; // in Excel character units
}

export function exportToExcel(opts: ExcelExportOptions): void {
  const { filename, sheetName = 'التقرير', headers, rows, columnWidths } = opts;

  // Build AOA with headers first
  const aoa: any[][] = [headers, ...rows.map((r) => r.map((c) => (c instanceof Date ? c.toISOString().slice(0, 10) : c)))];
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Column widths — sensible defaults for Arabic labels
  const widths = columnWidths || headers.map(() => 24);
  ws['!cols'] = widths.map((w) => ({ wch: w }));

  // Set RTL sheet view natively
  ws['!views'] = [{ RTL: true }];

  // Style header row with bold via cell formatting (best-effort — SheetJS community edition supports basic props)
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  for (let C = range.s.c; C <= range.e.c; C++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c: C });
    if (ws[addr]) {
      ws[addr].s = { font: { bold: true }, alignment: { horizontal: 'right' } };
    }
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  // Workbook-level view — apply RTL default
  if (!wb.Workbook) wb.Workbook = {};
  wb.Workbook.Views = [{ RTL: true } as any];

  XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}
