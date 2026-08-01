import { Injectable } from "@nestjs/common";
import ExcelJS from "exceljs";

/**
 * Shared Excel (.xlsx) rendering (feature 13). The SECOND output format for the
 * same report data — ReportsService builds the rows once (occupancyData,
 * duesData, …) and hands them to either PdfService.table or this. No report
 * query logic is duplicated across the PDF and Excel paths.
 */
export interface XlsxColumn {
  label: string;
  width?: number;
  /** "money" right-aligns and formats as ₹ with 2 decimals; "number" right-aligns. */
  kind?: "text" | "number" | "money";
}

const NAVY = "FF1B2A4A";

@Injectable()
export class XlsxService {
  async table(options: {
    sheetName: string;
    title: string;
    subtitle?: string;
    columns: XlsxColumn[];
    rows: (string | number)[][];
    summary?: string;
  }): Promise<Buffer> {
    const { sheetName, title, subtitle, columns, rows, summary } = options;
    const wb = new ExcelJS.Workbook();
    wb.creator = "Saahvik";
    const ws = wb.addWorksheet(sheetName.slice(0, 31)); // Excel caps sheet names at 31 chars

    const colCount = columns.length;
    // Title + optional subtitle band across all columns.
    ws.mergeCells(1, 1, 1, colCount);
    const titleCell = ws.getCell(1, 1);
    titleCell.value = title;
    titleCell.font = { bold: true, size: 14 };
    let headerRowIdx = 2;
    if (subtitle) {
      ws.mergeCells(2, 1, 2, colCount);
      const sub = ws.getCell(2, 1);
      sub.value = subtitle;
      sub.font = { italic: true, size: 10, color: { argb: "FF6E6E6E" } };
      headerRowIdx = 3;
    }

    // Column header row.
    const header = ws.getRow(headerRowIdx);
    columns.forEach((c, i) => {
      const cell = header.getCell(i + 1);
      cell.value = c.label;
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
      cell.alignment = { horizontal: c.kind === "money" || c.kind === "number" ? "right" : "left" };
      ws.getColumn(i + 1).width = c.width ?? 18;
    });

    // Data rows with per-column formatting.
    rows.forEach((r) => {
      const row = ws.addRow(r);
      columns.forEach((c, i) => {
        const cell = row.getCell(i + 1);
        if (c.kind === "money") {
          cell.numFmt = '₹#,##0.00';
          cell.alignment = { horizontal: "right" };
        } else if (c.kind === "number") {
          cell.alignment = { horizontal: "right" };
        }
      });
    });

    if (summary) {
      ws.addRow([]);
      const sRow = ws.addRow([summary]);
      ws.mergeCells(sRow.number, 1, sRow.number, colCount);
      sRow.getCell(1).font = { bold: true };
      sRow.getCell(1).alignment = { horizontal: "right" };
    }

    ws.views = [{ state: "frozen", ySplit: headerRowIdx }];
    const buf = await wb.xlsx.writeBuffer();
    return Buffer.from(buf);
  }
}
