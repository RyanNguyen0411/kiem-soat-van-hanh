/**
 * Dịch vụ xuất file Excel/CSV từ GHN Dashboard
 * Lưu trữ tại Google Drive: https://drive.google.com/drive/folders/1HSEsr67ttGuI0r2Wo-ZxS4H7ZywnFKbw?usp=sharing
 * Folder ID: 1HSEsr67ttGuI0r2Wo-ZxS4H7ZywnFKbw
 *
 * Logics (Cập nhật theo yêu cầu AM Huy):
 * 1. Chặn hoàn toàn tải file về máy tính cá nhân.
 * 2. Tất cả file xuất được đẩy trực tiếp lên thư mục Google Drive chỉ định qua Google Apps Script Web App.
 * 3. Khi bấm xuất, tự động mở thư mục Google Drive / file xuất ở 1 tab mới trên trình duyệt.
 * 4. Data không lưu chồng lên dữ liệu: Mỗi file xuất là 1 tên độc nhất với timestamp yyyyMMdd_HHmmss và mã salt ngẫu nhiên.
 */

export const GOOGLE_DRIVE_EXPORT_FOLDER_URL = 'https://drive.google.com/drive/folders/1HSEsr67ttGuI0r2Wo-ZxS4H7ZywnFKbw?usp=sharing';
export const GOOGLE_DRIVE_EXPORT_FOLDER_ID = '1HSEsr67ttGuI0r2Wo-ZxS4H7ZywnFKbw';

// Link triển khai Google Apps Script Web App của AM Huy (ĐNB)
export const DEFAULT_DRIVE_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbxn90MNH1IukX8UMqsZDUqLhlpnsnme_MCzHdKbfkNgZ08w0O_Kpe-PHUsEobA72BUduA/exec';

export const STORAGE_KEY_DRIVE_WEBHOOK = 'ghn_drive_export_webhook_url';

export function getDriveWebhookUrl(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_DRIVE_WEBHOOK);
    if (stored && stored.trim()) return stored.trim();
  } catch {
    // ignore
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
    if (cell === null || cell === undefined || cell === '') return '""';
    
    // Nếu là số thực hợp lệ, xuất trực tiếp dạng số để Excel tính toán được
    if (typeof cell === 'number' && Number.isFinite(cell)) {
      return String(cell);
    }

    const str = String(cell);
    // Nếu chuỗi chứa dấu phẩy, dấu nháy kép hoặc xuống dòng -> bọc nháy kép và escape nháy
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return `"${str}"`;
  };

  // Thêm UTF-8 BOM (\uFEFF) để Excel hiển thị tiếng Việt hoàn hảo không bị lỗi font
  const BATCH_SIZE = 2500;
  const processedRows: string[] = [];

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const chunk = rows.slice(i, i + BATCH_SIZE);
    processedRows.push(...chunk.map(row => row.map(processCell).join(',')));
  }

  const csvContent = '\uFEFF' + [
    headers.map(processCell).join(','),
    ...processedRows
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
            <title>Đang chuyển dữ liệu lên Google Drive...</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0f172a; color: #f8fafc; }
              .card { background: #1e293b; padding: 28px 32px; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5); text-align: center; max-width: 460px; border: 1px solid #334155; }
              .spinner { width: 38px; height: 38px; border: 3px solid #334155; border-top-color: #f97316; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 16px; }
              @keyframes spin { to { transform: rotate(360deg); } }
              h3 { margin: 0 0 8px; font-size: 16px; font-weight: 800; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px; }
              p { margin: 0 0 16px; font-size: 13px; color: #94a3b8; line-height: 1.5; }
              .file-badge { display: inline-block; background: #334155; color: #f97316; padding: 5px 12px; border-radius: 6px; font-size: 11px; font-family: monospace; font-weight: 700; margin-bottom: 14px; word-break: break-all; }
              .blocked-note { font-size: 11px; color: #22c55e; font-weight: 600; margin-bottom: 12px; }
              a { display: inline-block; padding: 9px 20px; background: #ea580c; color: white; text-decoration: none; border-radius: 8px; font-size: 13px; font-weight: 700; }
              a:hover { background: #f97316; }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="spinner"></div>
              <h3>Đang Chuyển Dữ Liệu Lên Google Drive</h3>
              <div class="file-badge">${uniqueFilename}</div>
              <div class="blocked-note">✓ Đã chặn tải về máy tính cá nhân</div>
              <p>Dữ liệu đang được gửi trực tiếp vào thư mục Google Drive của AM Huy.<br>Trang sẽ tự động chuyển hướng trong giây lát...</p>
              <a href="${GOOGLE_DRIVE_EXPORT_FOLDER_URL}">Mở Thư Mục Trực Tiếp ↗</a>
            </div>
          </body>
        </html>
      `);
    }
  } catch (e) {
    console.warn('Could not open preview tab:', e);
  }

  // ĐÃ CHẶN HOÀN TOÀN TẢI FILE VỀ MÁY TÍNH CÁ NHÂN THEO YÊU CẦU CỦA AM HUY
  // Toàn bộ dữ liệu được chuyển trực tiếp vào Folder Drive qua Apps Script Web App

  let finalDriveUrl = GOOGLE_DRIVE_EXPORT_FOLDER_URL;
  let isUploaded = false;
  const webhookUrl = getDriveWebhookUrl();

  if (webhookUrl) {
    const payload = JSON.stringify({
      folderId: GOOGLE_DRIVE_EXPORT_FOLDER_ID,
      filename: uniqueFilename,
      content: csvContent,
      totalRows: rows.length
    });

    try {
      // Thử gửi bằng fetch chuẩn (có kiểm tra kết quả JSON)
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: payload
      });

      if (response.ok) {
        try {
          const data = await response.json();
          if (data && data.fileUrl) {
            finalDriveUrl = data.fileUrl;
          }
          isUploaded = true;
        } catch {
          // Response là text hoặc opaque redirect, script đã thực thi xong
          isUploaded = true;
        }
      } else {
        throw new Error(`HTTP status: ${response.status}`);
      }
    } catch (err) {
      console.warn('Standard fetch to Apps Script failed, falling back to mode: no-cors:', err);
      try {
        // Fallback gửi với mode no-cors để đảm bảo browser không chặn request khi gặp redirect
        await fetch(webhookUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: payload
        });
        isUploaded = true;
      } catch (fallbackErr) {
        console.error('All upload attempts to Apps Script failed:', fallbackErr);
      }
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
