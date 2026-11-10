import Papa from 'papaparse';
import { getSpreadsheetId } from './settingsService';
import { normalizeHeader, normalizeNumber, normalizeString } from '../utils/normalization';

// Re-export helpers if needed elsewhere
export { normalizeNumber, normalizeString };

export interface SheetFetchResult {
  data: any[];
  error: string | null;
}

export const fetchSheetData = async (sheetName: string): Promise<SheetFetchResult> => {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${getSpreadsheetId()}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const csvText = await response.text();
    
    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => normalizeHeader(header),
        complete: (results) => {
          resolve({ data: results.data, error: null });
        },
        error: (error: Error) => {
          resolve({ data: [], error: error.message });
        }
      });
    });
  } catch (err: any) {
    return {
      data: [],
      error: err.name === 'AbortError' ? 'Timeout kết nối Google Sheets' : (err.message || 'Không thể truy cập dữ liệu Google Sheets.')
    };
  }
};
