/**
 * GHN AREA OPERATION CONTROL CENTER - NORMALIZATION ENGINE
 * Phục vụ: AM Huy (ĐNB) - Area Manager • Long An
 * 
 * Centralized Data Normalization Engine adhering to Master Project Instructions:
 * - Header-name-based resolution (HeaderReader)
 * - Strict post office registry (No wide substring 'contains')
 * - Rigorous numeric, percentage, and currency parsing (0 vs null vs empty vs invalid)
 * - Multi-format date parsing (DD/MM/YYYY, ISO, text date, YY-MM-DD) with calendar validation
 * - String cleaning and staff identity resolution
 */

// ============================================================================
// 1. STRING & DIACRITIC UTILITIES
// ============================================================================

export function cleanVietnameseText(val?: string): string {
  if (!val) return '';
  return String(val)
    .replace(/^\uFEFF/, '')
    .trim()
    .replace(/\s+/g, ' ');
}

export function stripVietnameseDiacritics(val?: string): string {
  if (!val) return '';
  return String(val)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, (m) => (m === 'đ' ? 'd' : 'D'))
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeOrderId(val?: string): string {
  if (!val) return '';
  return String(val).trim().toUpperCase();
}

export function normalizeStaffIdentity(rawNameOrId?: string, rawId?: string): {
  maNV: string;
  tenNV: string;
  raw: string;
} {
  const raw = cleanVietnameseText(rawNameOrId || '');
  let maNV = cleanVietnameseText(rawId || '');
  let tenNV = raw;

  if (raw.includes('_')) {
    const parts = raw.split('_');
    if (!maNV) maNV = parts[0]?.trim() || '';
    tenNV = parts.slice(1).join('_').trim() || parts[0]?.trim() || raw;
  } else if (raw.includes('-')) {
    const parts = raw.split('-');
    if (/^\d+$/.test(parts[0]?.trim() || '')) {
      if (!maNV) maNV = parts[0].trim();
      tenNV = parts.slice(1).join('-').trim() || raw;
    }
  }

  return { maNV, tenNV, raw };
}

// ============================================================================
// 2. NUMERIC, PERCENTAGE & CURRENCY PARSERS
// ============================================================================

export interface ParseNumberOptions {
  fallback?: number | null;
  allowNegative?: boolean;
}

/**
 * Parses numbers while strictly distinguishing between 0, null, undefined, empty string, and invalid data.
 * Supports Vietnamese number formatting (thousands '.' and decimal ',') as well as standard formats.
 */
export function parseNumber(val: any, options?: ParseNumberOptions): number | null {
  const fallback = options?.fallback !== undefined ? options.fallback : null;
  const allowNegative = options?.allowNegative !== false;

  if (val === null || val === undefined) return fallback;
  if (typeof val === 'number') {
    if (isNaN(val)) return fallback;
    if (!allowNegative && val < 0) return fallback;
    return val;
  }

  const s = String(val).trim();
  if (s === '' || s.toLowerCase() === 'null' || s.toLowerCase() === 'undefined' || s === '-' || s === 'n/a') {
    return fallback;
  }

  // Handle accounting negative parentheses "(123)"
  let cleanStr = s;
  let isNegative = false;
  if (cleanStr.startsWith('(') && cleanStr.endsWith(')')) {
    isNegative = true;
    cleanStr = cleanStr.slice(1, -1).trim();
  } else if (cleanStr.startsWith('-')) {
    isNegative = true;
    cleanStr = cleanStr.slice(1).trim();
  }

  // Remove currency symbols, percentage, and units
  cleanStr = cleanStr.replace(/[^\d.,]/g, '');
  if (cleanStr === '') return fallback;

  // Detect decimal separator:
  // If string contains both '.' and ',', the last one is the decimal separator.
  const lastDot = cleanStr.lastIndexOf('.');
  const lastComma = cleanStr.lastIndexOf(',');

  let normalizedNumberStr = cleanStr;
  if (lastDot !== -1 && lastComma !== -1) {
    if (lastComma > lastDot) {
      // Vietnamese format: 1.234.567,89 -> remove '.' then replace ',' with '.'
      normalizedNumberStr = cleanStr.replace(/\./g, '').replace(',', '.');
    } else {
      // US format: 1,234,567.89 -> remove ','
      normalizedNumberStr = cleanStr.replace(/,/g, '');
    }
  } else if (lastComma !== -1) {
    // Only commas present: "123,45" or "1,234"
    // In Vietnam locale, single comma is decimal separator
    normalizedNumberStr = cleanStr.replace(',', '.');
  } else {
    // Only dots or integer: "123.45" or "123456"
    // If multiple dots, e.g. "1.234.567", it's thousands separator
    const dotCount = (cleanStr.match(/\./g) || []).length;
    if (dotCount > 1) {
      normalizedNumberStr = cleanStr.replace(/\./g, '');
    } else if (dotCount === 1) {
      // In Vietnamese locale, a single dot followed by exactly 3 digits at the end (e.g. "1.500", "269.744") is thousands separator
      if (/^\d{1,3}\.\d{3}$/.test(cleanStr)) {
        normalizedNumberStr = cleanStr.replace(/\./g, '');
      }
    }
  }

  const parsed = parseFloat(normalizedNumberStr);
  if (isNaN(parsed)) return fallback;

  const result = isNegative ? -parsed : parsed;
  if (!allowNegative && result < 0) return fallback;

  return result;
}

export function parseInteger(val: any, options?: ParseNumberOptions): number | null {
  const num = parseNumber(val, options);
  if (num === null) return options?.fallback !== undefined ? options.fallback : null;
  return Math.round(num);
}

export function parsePercentage(val: any): {
  value: number | null;
  formatted: string;
  raw: string;
} {
  const raw = String(val || '').trim();
  if (!raw || raw === '-' || raw.toLowerCase() === 'null') {
    return { value: null, formatted: '0%', raw };
  }

  const num = parseNumber(raw);
  if (num === null) {
    return { value: null, formatted: '0%', raw };
  }

  // If raw ended with % or was already 0-100, keep as percent points (e.g. 82.57)
  const percentPoints = num;
  return {
    value: percentPoints,
    formatted: `${percentPoints.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}%`,
    raw
  };
}

export function parseCurrency(val: any, options?: ParseNumberOptions): number | null {
  return parseNumber(val, options);
}

// ============================================================================
// 3. DATE & TIMEZONE NORMALIZATION (DD/MM/YYYY)
// ============================================================================

export interface NormalizedDateResult {
  standard: string | null;     // "DD/MM/YYYY"
  dateObj: Date | null;
  iso: string | null;          // "YYYY-MM-DD"
  raw: string;
  isValid: boolean;
}

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function isValidCalendarDate(d: number, m: number, y: number): boolean {
  if (y < 2000 || y > 2100) return false;
  if (m < 1 || m > 12) return false;
  const maxD = m === 2 && isLeapYear(y) ? 29 : DAYS_IN_MONTH[m - 1];
  return d >= 1 && d <= maxD;
}

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

/**
 * Normalizes dates from various formats:
 * - "15/10/2026" (DD/MM/YYYY)
 * - "2026-10-15" (YYYY-MM-DD)
 * - "2026-10-15 - Thứ 5"
 * - "26-10-09" (YY-MM-DD)
 * - "10 thg 10, 2026", "7 thg 3, 2026" (Vietnamese text date)
 */
export function normalizeDate(val: any): NormalizedDateResult {
  const raw = String(val || '').trim();
  if (!raw || raw.toLowerCase() === 'null' || raw === '-') {
    return { standard: null, dateObj: null, iso: null, raw, isValid: false };
  }

  let day = 0;
  let month = 0;
  let year = 0;

  // Format 1: DD/MM/YYYY
  const slashMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    day = parseInt(slashMatch[1], 10);
    month = parseInt(slashMatch[2], 10);
    year = parseInt(slashMatch[3], 10);
  }

  // Format 2: YYYY-MM-DD (e.g. "2026-10-15" or "2026-10-15 - Thứ 5")
  if (!day) {
    const isoMatch = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
      year = parseInt(isoMatch[1], 10);
      month = parseInt(isoMatch[2], 10);
      day = parseInt(isoMatch[3], 10);
    }
  }

  // Format 3: YY-MM-DD (e.g. "26-10-09")
  if (!day) {
    const yyMatch = raw.match(/^(\d{2})-(\d{1,2})-(\d{1,2})$/);
    if (yyMatch) {
      year = 2000 + parseInt(yyMatch[1], 10);
      month = parseInt(yyMatch[2], 10);
      day = parseInt(yyMatch[3], 10);
    }
  }

  // Format 4: Vietnamese text date "10 thg 10, 2026" or "7 thg 3, 2026"
  if (!day) {
    const vnMatch = raw.match(/^(\d{1,2})\s+thg\s+(\d{1,2}),\s+(\d{4})$/i);
    if (vnMatch) {
      day = parseInt(vnMatch[1], 10);
      month = parseInt(vnMatch[2], 10);
      year = parseInt(vnMatch[3], 10);
    }
  }

  if (!isValidCalendarDate(day, month, year)) {
    return { standard: null, dateObj: null, iso: null, raw, isValid: false };
  }

  const standard = `${pad2(day)}/${pad2(month)}/${year}`;
  const iso = `${year}-${pad2(month)}-${pad2(day)}`;
  const dateObj = new Date(year, month - 1, day, 12, 0, 0); // UTC+7 midday safe

  return { standard, dateObj, iso, raw, isValid: true };
}

// ============================================================================
// 4. POST OFFICE REGISTRY & STRICT MAPPING (NO WIDE CONTAINS)
// ============================================================================

export interface PostOfficeMetadata {
  standardCode: string;
  standardName: string;
  rawCode: string;
  rawName: string;
  isHistorical: boolean;
  historicalCode?: string;
  historicalName?: string;
  province: string;
  region: string;
}

/**
 * Official registry of Area Manager Huy (ĐNB) post offices in Long An
 */
export const OFFICIAL_POST_OFFICES: Record<string, { code: string; name: string }> = {
  RACH_KIEN: { code: '22206000', name: '(LAN) Rạch Kiến' },
  TAM_VU: { code: '21710000', name: '(LAN) Tầm Vu' },
  PHUOC_LY: { code: '22849000', name: '(LAN) Phước Lý' },
  CAN_GIUOC: { code: '21529000', name: '(LAN) Cần Giuộc' },
  CAN_DUOC_1: { code: '23220000', name: '(LAN) Cần Đước 1' }
};

interface RegistryEntry {
  standardCode: string;
  standardName: string;
  isHistorical: boolean;
  historicalCode?: string;
  historicalName?: string;
}

// Exact normalized aliases lookup table
const EXACT_POST_OFFICE_MAP = new Map<string, RegistryEntry>();

function registerAlias(alias: string, entry: RegistryEntry) {
  const key = stripVietnameseDiacritics(alias);
  EXACT_POST_OFFICE_MAP.set(key, entry);
}

// 1. Rạch Kiến (22206000)
const rkEntry: RegistryEntry = {
  standardCode: '22206000',
  standardName: '(LAN) Rạch Kiến',
  isHistorical: false
};
['22206000', '23230000', '(LAN) Rạch Kiến', 'Rạch Kiến', 'LAN Rạch Kiến', '22206000 - (LAN) Rạch Kiến'].forEach(a => registerAlias(a, rkEntry));

// 2. Tầm Vu (21710000)
const tvEntry: RegistryEntry = {
  standardCode: '21710000',
  standardName: '(LAN) Tầm Vu',
  isHistorical: false
};
['21710000', '(LAN) Tầm Vu', 'Tầm Vu', 'LAN Tầm Vu', '21710000 - (LAN) Tầm Vu'].forEach(a => registerAlias(a, tvEntry));

// 3. Phước Lý (22849000)
const plEntry: RegistryEntry = {
  standardCode: '22849000',
  standardName: '(LAN) Phước Lý',
  isHistorical: false
};
['22849000', '23240000', '21539000', '(LAN) Phước Lý', 'Phước Lý', 'LAN Phước Lý', '22849000 - (LAN) Phước Lý'].forEach(a => registerAlias(a, plEntry));

// 4. Cần Giuộc (21529000)
const cgEntry: RegistryEntry = {
  standardCode: '21529000',
  standardName: '(LAN) Cần Giuộc',
  isHistorical: false
};
['21529000', '23210000', '(LAN) Cần Giuộc', 'Cần Giuộc', 'LAN Cần Giuộc', '21529000 - (LAN) Cần Giuộc'].forEach(a => registerAlias(a, cgEntry));

// 5. Cần Đước 1 (23220000)
const cd1Entry: RegistryEntry = {
  standardCode: '23220000',
  standardName: '(LAN) Cần Đước 1',
  isHistorical: false
};
['23220000', '(LAN) Cần Đước 1', 'Cần Đước 1', 'LAN Cần Đước 1', '23220000 - (LAN) Cần Đước 1'].forEach(a => registerAlias(a, cd1Entry));

// 6. Historical Cần Đước (2278) -> maps strictly to Cần Đước 1 (23220000)
const cdHistoricalEntry: RegistryEntry = {
  standardCode: '23220000',
  standardName: '(LAN) Cần Đước 1',
  isHistorical: true,
  historicalCode: '2278',
  historicalName: '(LAN) Cần Đước'
};
['2278', '(LAN) Cần Đước', 'Cần Đước', 'LAN Cần Đước', '2278 - (LAN) Cần Đước'].forEach(a => registerAlias(a, cdHistoricalEntry));

/**
 * Looks up post office with zero wide substring matching.
 * Handles inputs like "23220000 - (LAN) Cần Đước 1", "2278", "(LAN) Rạch Kiến", etc.
 */
export function lookupPostOffice(input: string | { code?: string; name?: string }): PostOfficeMetadata {
  let rawCode = '';
  let rawName = '';

  if (typeof input === 'object' && input !== null) {
    rawCode = cleanVietnameseText(input.code || '');
    rawName = cleanVietnameseText(input.name || '');
  } else {
    const raw = cleanVietnameseText(String(input || ''));
    if (raw.includes('-')) {
      const parts = raw.split('-');
      const p0 = parts[0]?.trim() || '';
      if (/^\d+$/.test(p0)) {
        rawCode = p0;
        rawName = parts.slice(1).join('-').trim();
      } else {
        rawName = raw;
      }
    } else if (/^\d+$/.test(raw)) {
      rawCode = raw;
    } else {
      rawName = raw;
    }
  }

  // 1. Check code exact lookup
  if (rawCode) {
    const codeMatch = EXACT_POST_OFFICE_MAP.get(rawCode.toLowerCase());
    if (codeMatch) {
      return {
        standardCode: codeMatch.standardCode,
        standardName: codeMatch.standardName,
        rawCode,
        rawName: rawName || codeMatch.standardName,
        isHistorical: codeMatch.isHistorical,
        historicalCode: codeMatch.historicalCode,
        historicalName: codeMatch.historicalName,
        province: 'Long An',
        region: 'Khu vực Long An (ĐNB)'
      };
    }
  }

  // 2. Check name exact lookup
  if (rawName) {
    const key = stripVietnameseDiacritics(rawName);
    const nameMatch = EXACT_POST_OFFICE_MAP.get(key);
    if (nameMatch) {
      return {
        standardCode: nameMatch.standardCode,
        standardName: nameMatch.standardName,
        rawCode: rawCode || nameMatch.standardCode,
        rawName,
        isHistorical: nameMatch.isHistorical,
        historicalCode: nameMatch.historicalCode,
        historicalName: nameMatch.historicalName,
        province: 'Long An',
        region: 'Khu vực Long An (ĐNB)'
      };
    }
  }

  // 3. Fallback: Unrecognized post office (never guess or use wide contains)
  return {
    standardCode: rawCode || '',
    standardName: rawName || rawCode || 'Chưa xác định',
    rawCode,
    rawName,
    isHistorical: false,
    province: '',
    region: ''
  };
}

export function normalizePostOfficeName(input?: string): string {
  if (!input) return '';
  return lookupPostOffice(input).standardName;
}

export function normalizePostOfficeCode(code?: string, name?: string): string {
  const meta = lookupPostOffice({ code, name });
  return meta.standardCode || (code || '').trim();
}

// ============================================================================
// 5. DYNAMIC HEADER-NAME-BASED PARSER (HeaderReader)
// ============================================================================

export interface HeaderReader {
  headers: string[];
  getColIndex(aliases: string[]): number;
  getCol(row: string[], aliases: string[], fallback?: string): string;
  hasCol(aliases: string[]): boolean;
  getAllIndices(aliases: string[]): number[];
}

/**
 * Creates a robust HeaderReader from an array of header names.
 * Matches column headers by normalized aliases rather than hardcoded array indices.
 */
export function createHeaderReader(rawHeaders: string[]): HeaderReader {
  const cleanHeaders = rawHeaders.map(h => cleanVietnameseText(h));
  const normalizedHeaders = cleanHeaders.map(h => stripVietnameseDiacritics(h));

  function findIndex(aliases: string[]): number {
    for (const alias of aliases) {
      const target = stripVietnameseDiacritics(alias);
      if (!target) continue;
      // Exact match first
      const exactIdx = normalizedHeaders.findIndex(h => h === target);
      if (exactIdx !== -1) return exactIdx;
    }
    // Prefix or boundary match (with word boundary protection for short identifiers like 'id')
    for (const alias of aliases) {
      const target = stripVietnameseDiacritics(alias);
      if (!target) continue;
      const isShort = target.length <= 2;
      const boundaryIdx = normalizedHeaders.findIndex(h => {
        if (h === target) return true;
        if (isShort) {
          const words = h.split(' ');
          return words.includes(target);
        }
        return h.startsWith(target) || h.endsWith(target);
      });
      if (boundaryIdx !== -1) return boundaryIdx;
    }
    return -1;
  }

  function findAllIndices(aliases: string[]): number[] {
    const indices: number[] = [];
    for (const alias of aliases) {
      const target = stripVietnameseDiacritics(alias);
      if (!target) continue;
      const isShort = target.length <= 2;
      normalizedHeaders.forEach((h, i) => {
        const matches = h === target || (isShort ? h.split(' ').includes(target) : (h.startsWith(target) || h.endsWith(target)));
        if (matches && !indices.includes(i)) {
          indices.push(i);
        }
      });
    }
    return indices;
  }

  return {
    headers: cleanHeaders,
    getColIndex(aliases: string[]): number {
      return findIndex(aliases);
    },
    getCol(row: string[], aliases: string[], fallback = ''): string {
      const idx = findIndex(aliases);
      if (idx === -1 || idx >= row.length) return fallback;
      const val = row[idx];
      return val !== undefined && val !== null ? cleanVietnameseText(val) : fallback;
    },
    hasCol(aliases: string[]): boolean {
      return findIndex(aliases) !== -1;
    },
    getAllIndices(aliases: string[]): number[] {
      return findAllIndices(aliases);
    }
  };
}
