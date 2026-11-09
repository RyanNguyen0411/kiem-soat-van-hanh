/**
 * Dịch vụ xuất file Excel/CSV từ GHN Dashboard
 * Lưu trữ tại Google Drive: https://drive.google.com/drive/folders/1HSEsr67ttGuI0r2Wo-ZxS4H7ZywnFKbw?usp=sharing
 * Folder ID: 1HSEsr67ttGuI0r2Wo-ZxS4H7ZywnFKbw
 *
 * Logics:
 * 1. Tất cả data khi xuất excel từ dashboard đều được lưu trữ và liên kết đến thư mục Google Drive chỉ định.
 * 2. Khi xuất xong, tự động mở link vừa xuất (hoặc thư mục Google Drive) ở 1 tab mới trên trình duyệt.
 * 3. Data không lưu chồng lên dữ liệu: Mỗi file xuất là 1 tên độc nhất với timestamp yyyyMMdd_HHmmss và mã salt ngẫu nhiên.
 * 4. Tải file UTF-8 BOM trực tiếp về máy tính người dùng để mở ngay tức thì trên Microsoft Excel không bị lỗi font tiếng Việt.
 */

export const GOOGLE_DRIVE_EXPORT_FOLDER_URL = 'https://drive.google.com/drive/folders/1HSEsr67ttGuI0r2Wo-ZxS4H7ZywnFKbw?usp=sharing';
export const GOOGLE_DRIVE_EXPORT_FOLDER_ID = '1HSEsr67ttGuI0r2Wo-ZxS4H7ZywnFKbw';

export const STORAGE_KEY_DRIVE_WEBHOOK = 'ghn_drive_export_webhook_url';

export function getDriveWebhookUrl(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_DRIVE_WEBHOOK);
    if (stored && stored.trim()) return stored.trim();
  } catch {
    // ignore
  }
  return (import.meta.env.VITE_DRIVE_EXPORT_WEBHOOK_URL as string) || '';
}

export function setDriveWebhookUrl(url: string) {
  try {
    if (url && url.trim()) {
      localStorage.setItem(STORAGE_KEY_DRIVE_WEBHOOK, url.trim());
    } else {
      localStorage.removeItem(STORAGE_KEY_DRIVE_WEBHOOK);
    }
  } catch {
    // ignore
  }
}

/**
 * Tạo tên file duy nhất tuyệt đối để không bao giờ ghi đè lên dữ liệu cũ
 * Định dạng: [Tên_Bảng]_[YYYYMMDD]_[HHMMSS]_[Mã_Salt].csv
 */
export function generateUniqueExportFilename(baseName: string, ext = 'csv'): string {
  const cleanBase = baseName
    .replace(/\.[^/.]+$/, '')
    .trim()
    .replace(/[^a-zA-Z0-9_\u00C0-\u1EF9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const randomSuffix = Math.floor(100 + Math.random() * 900);

  return `${cleanBase || 'GHN_XUAT_EXCEL'}_${year}${month}${day}_${hours}${minutes}${seconds}_${randomSuffix}.${ext}`;
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
  const processCell = (cell: string | number | null | undefined): string => {
    if (cell === null || cell === undefined) return '""';
    const str = String(cell);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return `"${str}"`;
  };

  const csvContent = [
    headers.map(processCell).join(','),
    ...rows.map(row => row.map(processCell).join(','))
  ].join('\r\n');

  // Tạo tên file độc nhất vô nhị
  const uniqueFilename = generateUniqueExportFilename(filename, 'csv');

  // Mở tab mới đồng bộ ngay khi bấm click để tránh bị trình duyệt chặn popup
  let driveTab: Window | null = null;
  try {
    driveTab = window.open('about:blank', '_blank');
    if (driveTab) {
      driveTab.document.write(`
        <!DOCTYPE html>
        <html lang="vi">
          <head>
            <title>Đang mở Google Drive...</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0f172a; color: #f8fafc; }
              .card { background: #1e293b; padding: 28px 32px; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5); text-align: center; max-width: 440px; border: 1px solid #334155; }
              .spinner { width: 36px; height: 36px; border: 3px solid #334155; border-top-color: #f97316; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 16px; }
              @keyframes spin { to { transform: rotate(360deg); } }
              h3 { margin: 0 0 8px; font-size: 16px; font-weight: 800; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px; }
              p { margin: 0 0 16px; font-size: 13px; color: #94a3b8; line-height: 1.5; }
              .file-badge { display: inline-block; background: #334155; color: #f97316; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-family: monospace; font-weight: 700; margin-bottom: 14px; word-break: break-all; }
              a { display: inline-block; padding: 8px 18px; background: #ea580c; color: white; text-decoration: none; border-radius: 8px; font-size: 13px; font-weight: 700; }
              a:hover { background: #f97316; }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="spinner"></div>
              <h3>Đang Kết Nối Google Drive</h3>
              <div class="file-badge">${uniqueFilename}</div>
              <p>Dữ liệu đang được đồng bộ và lưu trữ tại thư mục Driver của AM Huy.<br>Đang tải trang trong giây lát...</p>
              <a href="${GOOGLE_DRIVE_EXPORT_FOLDER_URL}">Mở Thư Mục Trực Tiếp ↗</a>
            </div>
          </body>
        </html>
      `);
    }
  } catch (e) {
    console.warn('Could not open preview tab:', e);
  }

  // Tải file về máy tính cục bộ (UTF-8 BOM giúp mở tiếng Việt chuẩn 100% trên Excel)
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const downloadUrl = URL.createObjectURL(blob);
  const downloadLink = document.createElement('a');
  downloadLink.setAttribute('href', downloadUrl);
  downloadLink.setAttribute('download', uniqueFilename);
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
  URL.revokeObjectURL(downloadUrl);

  // Tiến hành upload lên Google Drive
  let finalDriveUrl = GOOGLE_DRIVE_EXPORT_FOLDER_URL;
  let isUploaded = false;
  const webhookUrl = getDriveWebhookUrl();

  if (webhookUrl) {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          folderId: GOOGLE_DRIVE_EXPORT_FOLDER_ID,
          filename: uniqueFilename,
          content: csvContent,
          totalRows: rows.length
        })
      });

      const data = await response.json();
      if (data && data.fileUrl) {
        finalDriveUrl = data.fileUrl;
        isUploaded = true;
      }
    } catch (err) {
      console.warn('Upload to Google Apps Script failed, falling back to Drive folder:', err);
    }
  }

  // Điều hướng tab mới đến URL đích (File trực tiếp hoặc Thư mục lưu trữ Drive)
  if (driveTab) {
    try {
      driveTab.location.href = finalDriveUrl;
    } catch (e) {
      // ignore
    }
  }

  // Bắn CustomEvent để hệ thống UI hiển thị thông báo Toast thành công
  window.dispatchEvent(new CustomEvent('ghn-export-completed', {
    detail: {
      filename: uniqueFilename,
      driveUrl: finalDriveUrl,
      isUploadedToDrive: isUploaded,
      totalRows: rows.length
    }
  }));

  return {
    filename: uniqueFilename,
    driveUrl: finalDriveUrl,
    isUploadedToDrive: isUploaded,
    totalRows: rows.length
  };
}
