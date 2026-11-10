/**
 * GHN Dashboard export service (Fast Export Optimized).
 * Sends typed rows directly to Apps Script (JSON) to avoid CSV serialization/parsing.
 * Keeps the existing UI event contract, dynamic Settings wiring, and blocks local file downloads.
 */

import {
  DEFAULT_DRIVE_FOLDER_ID,
  DEFAULT_DRIVE_FOLDER_URL,
  DEFAULT_APPS_SCRIPT_URL,
  getAppsScriptUrlOverride,
  getDriveFolderUrl
} from './settingsService';

// Giá trị MẶC ĐỊNH. Có thể được ghi đè trong Cài đặt (biểu tượng bánh răng trên thanh tiêu đề).
export const GOOGLE_DRIVE_EXPORT_FOLDER_URL = DEFAULT_DRIVE_FOLDER_URL;
export const GOOGLE_DRIVE_EXPORT_FOLDER_ID = DEFAULT_DRIVE_FOLDER_ID;

// Link triển khai Google Apps Script Web App của AM Huy (ĐNB)
export const DEFAULT_DRIVE_WEBHOOK_URL = DEFAULT_APPS_SCRIPT_URL;
export const STORAGE_KEY_DRIVE_WEBHOOK = 'ghn_drive_export_webhook_url';

export function getDriveWebhookUrl(): string {
  // Ưu tiên cấu hình người dùng đặt trong Cài đặt (đã xác thực host script.google.com)
  const override = getAppsScriptUrlOverride();
  if (override) return override;

  try {
    const stored = localStorage.getItem(STORAGE_KEY_DRIVE_WEBHOOK);
    if (stored && stored.trim()) return stored.trim();
  } catch {
    // localStorage may be unavailable in restricted browser contexts.
  }
  return (import.meta.env.VITE_DRIVE_EXPORT_WEBHOOK_URL as string) || DEFAULT_DRIVE_WEBHOOK_URL;
}

export function setDriveWebhookUrl(url: string) {
  try {
    if (url && url.trim()) {
      localStorage.setItem(STORAGE_KEY_DRIVE_WEBHOOK, url.trim());
    } else {
      localStorage.removeItem(STORAGE_KEY_DRIVE_WEBHOOK);
    }
  } catch {
    // Ignore storage restrictions; the default/environment URL remains available.
  }
}

function isTrustedGoogleUrl(url: unknown): url is string {
  return typeof url === 'string' && /^https:\/\/(docs|drive)\.google\.com\//.test(url);
}

/** Create a unique name so each export remains a separate spreadsheet. */
export function generateUniqueExportFilename(baseName: string, ext = 'csv'): string {
  const cleanBase = baseName
    .replace(/\.[^/.]+$/, '')
    .trim()
    .replace(/[^a-zA-Z0-9_\u00C0-\u1EF9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');

  const now = new Date();
  const datePart = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('');
  const timePart = [now.getHours(), now.getMinutes(), now.getSeconds()].map(v => String(v).padStart(2, '0')).join('');
  const randomSuffix = Math.floor(100 + Math.random() * 900);
  return `${cleanBase || 'GHN_XUAT_EXCEL'}_${datePart}_${timePart}_${randomSuffix}.${ext}`;
}

export interface ExportResult {
  filename: string;
  driveUrl: string;
  isUploadedToDrive: boolean;
  totalRows: number;
}

export async function exportToCSV(
  filename: string,
  headers: string[],
  rows: (string | number)[][]
): Promise<ExportResult> {
  // Retain the existing unique filename convention and no-local-download behavior.
  const uniqueFilename = generateUniqueExportFilename(filename, 'gsheet').replace(/\.gsheet$/i, '');

  // Open synchronously during the user gesture to avoid popup blockers.
  let driveTab: Window | null = null;
  try {
    driveTab = window.open('about:blank', '_blank');
    if (driveTab) {
      driveTab.document.write(`<!DOCTYPE html><html lang="vi"><head><title>Đang xuất Google Sheets</title><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>
        body{font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#0f172a;color:#f8fafc}
        .card{background:#1e293b;padding:28px 32px;border-radius:16px;text-align:center;max-width:460px;border:1px solid #334155}
        .spinner{width:36px;height:36px;border:3px solid #334155;border-top-color:#f97316;border-radius:50%;animation:spin .8s linear infinite;margin:0 auto 16px}
        @keyframes spin{to{transform:rotate(360deg)}}.name{font:700 11px monospace;color:#f97316;overflow-wrap:anywhere}
        p{font-size:13px;color:#94a3b8;line-height:1.5}a{color:#fff;background:#ea580c;padding:9px 18px;border-radius:8px;text-decoration:none}
      </style></head><body><div class="card"><div class="spinner"></div><h3>ĐANG XUẤT GOOGLE SHEETS</h3><div class="name">${uniqueFilename}</div><p>Dữ liệu đang được gửi trực tiếp lên Google Drive.<br>Vui lòng không đóng tab này.</p><a href="${getDriveFolderUrl()}">Mở thư mục Drive</a></div></body></html>`);
    }
  } catch (error) {
    console.warn('Could not open export status tab:', error);
  }

  let finalDriveUrl = getDriveFolderUrl();
  let isUploaded = false;
  const webhookUrl = getDriveWebhookUrl();

  if (webhookUrl) {
    // Send typed JSON values directly instead of building a large CSV text in browser.
    // This removes an extra full-data map/join pass and avoids CSV parsing in Apps Script.
    const payload = JSON.stringify({
      filename: uniqueFilename,
      headers,
      rows,
      totalRows: rows.length,
    });

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: payload,
        redirect: 'follow',
      });
      if (!response.ok) throw new Error(`HTTP status: ${response.status}`);
      const result = await response.json();
      if (!result || result.success !== true || !result.fileUrl) {
        throw new Error(result?.error || 'Apps Script chưa xác nhận tạo Google Sheets');
      }
      if (!isTrustedGoogleUrl(result.fileUrl)) {
        throw new Error('Apps Script trả về liên kết không thuộc Google Docs/Drive');
      }
      finalDriveUrl = result.fileUrl;
      isUploaded = true;
    } catch (error) {
      // Never blindly retry: the first request may have created a file already.
      console.error('Google Sheets export could not be confirmed:', error);
    }
  }

  if (driveTab) {
    try { driveTab.location.href = finalDriveUrl; } catch { /* ignore navigation errors */ }
  }

  window.dispatchEvent(new CustomEvent('ghn-export-completed', {
    detail: {
      filename: uniqueFilename,
      driveUrl: finalDriveUrl,
      isUploadedToDrive: isUploaded,
      totalRows: rows.length,
    },
  }));

  return { filename: uniqueFilename, driveUrl: finalDriveUrl, isUploadedToDrive: isUploaded, totalRows: rows.length };
}
