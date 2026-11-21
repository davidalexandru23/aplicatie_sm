import ExcelJS from 'exceljs';

export const EXCEL_COLORS = {
  NAVY_PRIMARY: 'FF17365D',
  NAVY_ACCENT: 'FF1F4E79',
  BLUE_DEEP: 'FF1E40AF',
  BLUE_OCEAN: 'FF0284C7',
  TEAL: 'FF0D9488',
  INDIGO: 'FF4F46E5',
  SLATE_DARK: 'FF334155',
  EMERALD: 'FF059669',
  ICE_BLUE: 'FFD9EAF7',
  ICE_BLUE_LIGHT: 'FFF0F7FC',
  CARD_LABEL_BG: 'FFF1F5F9',
  CARD_VALUE_BG: 'FFFFFFFF',
  ZEBRA_BG: 'FFF8FAFC',
  WHITE: 'FFFFFFFF',
  TEXT_DARK: 'FF0F172A',
  TEXT_MUTED: 'FF475569',
  BORDER_GRAY: 'FFCBD5E1',
  BORDER_LIGHT: 'FFE2E8F0',
  BORDER_DARK: 'FF64748B',
  ADMIS_BG: 'FFDCFCE7',
  ADMIS_TEXT: 'FF166534',
  RESPINS_BG: 'FFFEE2E2',
  RESPINS_TEXT: 'FF991B1B',
};

export const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: EXCEL_COLORS.BORDER_GRAY } },
  left: { style: 'thin', color: { argb: EXCEL_COLORS.BORDER_GRAY } },
  bottom: { style: 'thin', color: { argb: EXCEL_COLORS.BORDER_GRAY } },
  right: { style: 'thin', color: { argb: EXCEL_COLORS.BORDER_GRAY } },
};

export const HEADER_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: EXCEL_COLORS.BORDER_DARK } },
  left: { style: 'thin', color: { argb: EXCEL_COLORS.BORDER_DARK } },
  bottom: { style: 'medium', color: { argb: EXCEL_COLORS.NAVY_PRIMARY } },
  right: { style: 'thin', color: { argb: EXCEL_COLORS.BORDER_DARK } },
};

export function styleCell(
  cell: ExcelJS.Cell,
  options: {
    font?: Partial<ExcelJS.Font>;
    fillColor?: string;
    alignment?: Partial<ExcelJS.Alignment>;
    border?: Partial<ExcelJS.Borders>;
    numFmt?: string;
  }
) {
  if (options.font) {
    cell.font = {
      name: options.font.name || 'Calibri',
      size: options.font.size || 11,
      bold: options.font.bold || false,
      italic: options.font.italic || false,
      color: options.font.color || { argb: EXCEL_COLORS.TEXT_DARK },
    };
  }
  if (options.fillColor) {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: options.fillColor },
    };
  }
  if (options.alignment) {
    cell.alignment = {
      vertical: options.alignment.vertical || 'middle',
      horizontal: options.alignment.horizontal || 'left',
      wrapText: options.alignment.wrapText ?? false,
    };
  }
  if (options.border) {
    cell.border = options.border;
  }
  if (options.numFmt) {
    cell.numFmt = options.numFmt;
  }
}

export function autoFitColumnWidths(
  ws: ExcelJS.Worksheet,
  minWidth = 12,
  maxWidth = 40,
  overrides: Record<number, number> = {}
) {
  ws.columns.forEach((col, idx) => {
    const colNumber = idx + 1;
    if (overrides[colNumber]) {
      col.width = overrides[colNumber];
      return;
    }
    let maxLen = minWidth;
    col.eachCell?.({ includeEmpty: false }, (cell) => {
      const valStr = cell.value !== undefined && cell.value !== null ? String(cell.value) : '';
      if (valStr.length > maxLen) {
        maxLen = valStr.length;
      }
    });
    col.width = Math.min(Math.max(maxLen + 3, minWidth), maxWidth);
  });
}
