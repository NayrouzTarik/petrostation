import * as XLSX from 'xlsx';

export interface ExcelSheetData {
  sheetName: string;
  data: Record<string, any>[];
}

/**
 * Export data to real .xlsx Excel file with native UTF-8 support
 */
export function exportToExcel(filename: string, sheets: ExcelSheetData[]) {
  const wb = XLSX.utils.book_new();

  sheets.forEach(({ sheetName, data }) => {
    // Sanitize sheet name for Excel (max 31 chars, remove forbidden characters: : \ / ? * [ ])
    const cleanSheetName = (sheetName || 'Feuille')
      .replace(/[:\\/?*\[\]]/g, '_')
      .slice(0, 31);

    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, cleanSheetName);
  });

  const finalName = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  XLSX.writeFile(wb, finalName, { bookType: 'xlsx', type: 'binary' });
}

/**
 * Export CSV with UTF-8 Byte Order Mark (BOM \uFEFF)
 * Essential for Microsoft Excel on Windows/Mac to correctly render French accents (é, è, à, ê, É, °, etc.)
 * without showing mojibake / corrupted symbols.
 */
export function exportToCsvWithBom(filename: string, csvContent: string) {
  // \uFEFF is the UTF-8 BOM that forces Excel to open the file in UTF-8 mode
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const finalName = filename.endsWith('.csv') ? filename : `${filename}.csv`;

  link.setAttribute('href', url);
  link.setAttribute('download', finalName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Read and parse .xlsx, .xls, or .csv into an array of objects with UTF-8 codepage support
 */
export async function parseExcelOrCsvFile(file: File): Promise<Record<string, any>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        // codepage 65001 = UTF-8
        const workbook = XLSX.read(data, { type: 'array', codepage: 65001 });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
          defval: '',
        });
        resolve(json);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}
