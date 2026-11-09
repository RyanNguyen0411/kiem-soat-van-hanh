/**
 * =========================================================================================
 * GOOGLE APPS SCRIPT CHO GHN OPERATION CONTROL (AM HUY - ĐNB)
 * Tự động nhận file Excel/CSV từ Dashboard và lưu vào thư mục Google Drive:
 * https://drive.google.com/drive/folders/1HSEsr67ttGuI0r2Wo-ZxS4H7ZywnFKbw?usp=sharing
 * =========================================================================================
 *
 * HƯỚNG DẪN CÀI ĐẶT NHANH (1 PHÚT):
 * 1. Mở Google Sheet nguồn hoặc truy cập https://script.google.com tạo dự án mới.
 * 2. Copy toàn bộ nội dung file này dán vào tệp Code.gs.
 * 3. Bấm "Triển khai" (Deploy) > "Triển khai mới" (New deployment).
 * 4. Chọn loại: "Ứng dụng web" (Web app).
 *    - Mô tả: GHN Dashboard Excel Drive Exporter
 *    - Thực thi dưới dạng (Execute as): "Tôi" (Me)
 *    - Ai có quyền truy cập (Who has access): "Bất kỳ ai" (Anyone)
 * 5. Bấm "Triển khai" và cấp quyền truy cập Google Drive khi được hỏi.
 * 6. Copy URL Ứng dụng web (kết thúc bằng /exec) và dán vào Dashboard GHN để kích hoạt tự động lưu trực tiếp!
 */

const TARGET_FOLDER_ID = '1HSEsr67ttGuI0r2Wo-ZxS4H7ZywnFKbw';

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error('Dữ liệu gửi lên trống (No payload)');
    }

    const payload = JSON.parse(e.postData.contents);
    const folderId = payload.folderId || TARGET_FOLDER_ID;
    const folder = DriveApp.getFolderById(folderId);

    const filename = payload.filename || ('GHN_Export_' + Utilities.formatDate(new Date(), 'GMT+7', 'yyyyMMdd_HHmmss') + '.csv');
    const content = payload.content || '';

    // Tạo file CSV chuẩn UTF-8 có BOM để tương thích hoàn toàn tiếng Việt trên Excel
    const blob = Utilities.newBlob('\uFEFF' + content, 'text/csv;charset=utf-8', filename);
    const file = folder.createFile(blob);

    // Cài đặt quyền xem cho người có liên kết
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      fileUrl: file.getUrl(),
      fileId: file.getId(),
      filename: filename,
      folderId: folderId,
      createdAt: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'ACTIVE',
    service: 'GHN Excel Export to Google Drive Webhook',
    targetFolderId: TARGET_FOLDER_ID,
    folderUrl: 'https://drive.google.com/drive/folders/' + TARGET_FOLDER_ID
  })).setMimeType(ContentService.MimeType.JSON);
}
