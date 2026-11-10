/**
 * GHN Dashboard -> native Google Sheets export.
 * Each export creates a new Google spreadsheet in the configured Drive folder.
 * Deploy as a Web App and authorize SpreadsheetApp + DriveApp access.
 */
const TARGET_FOLDER_ID = '1HSEsr67ttGuI0r2Wo-ZxS4H7ZywnFKbw';

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error('Dữ liệu gửi lên trống (No payload)');
    }

    const payload = JSON.parse(e.postData.contents);
    if (!payload.content || typeof payload.content !== 'string') {
      throw new Error('Thiếu nội dung CSV để chuyển thành Google Sheets');
    }

    // Always use the configured folder. Do not accept a folder ID from browser input.
    const folder = DriveApp.getFolderById(TARGET_FOLDER_ID);
    const requestedName = String(payload.filename || 'GHN_Export_' +
      Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Ho_Chi_Minh', 'yyyyMMdd_HHmmss'));
    const spreadsheetName = requestedName.replace(/\.csv$/i, '').replace(/\.gsheet$/i, '');

    // Parse the UTF-8 CSV sent by the dashboard and write it into a real Sheets file.
    const csvText = payload.content.replace(/^\uFEFF/, '');
    const parsedRows = Utilities.parseCsv(csvText);
    if (!parsedRows || parsedRows.length === 0) {
      throw new Error('Không đọc được dòng dữ liệu trong file xuất');
    }

    const columnCount = Math.max.apply(null, parsedRows.map(function(row) { return row.length; }));
    if (!columnCount) throw new Error('Không tìm thấy cột dữ liệu');

    const spreadsheet = SpreadsheetApp.create(spreadsheetName);
    const sheet = spreadsheet.getSheets()[0];
    sheet.setName('Du lieu xuat');

    // Google Sheets requires a rectangular 2D array for setValues.
    const normalizedRows = parsedRows.map(function(row) {
      const copy = row.slice();
      while (copy.length < columnCount) copy.push('');
      return copy;
    });

    const batchSize = 5000;
    for (let start = 0; start < normalizedRows.length; start += batchSize) {
      const batch = normalizedRows.slice(start, start + batchSize);
      sheet.getRange(start + 1, 1, batch.length, columnCount).setValues(batch);
    }

    // Basic usability formatting.
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, columnCount)
      .setFontWeight('bold')
      .setBackground('#f97316')
      .setFontColor('#ffffff');
    sheet.getDataRange().setWrap(false);
    sheet.autoResizeColumns(1, Math.min(columnCount, 30));
    if (normalizedRows.length > 1) {
      sheet.getRange(1, 1, normalizedRows.length, columnCount).createFilter();
    }
    SpreadsheetApp.flush();

    // Move the native Google Sheets file into the target folder.
    const driveFile = DriveApp.getFileById(spreadsheet.getId());
    driveFile.moveTo(folder);

    return jsonResponse({
      success: true,
      fileUrl: spreadsheet.getUrl(),
      fileId: spreadsheet.getId(),
      filename: spreadsheetName,
      folderId: TARGET_FOLDER_ID,
      totalRows: Math.max(0, normalizedRows.length - 1),
      format: 'application/vnd.google-apps.spreadsheet',
      createdAt: new Date().toISOString()
    });
  } catch (err) {
    return jsonResponse({ success: false, error: String(err && err.message ? err.message : err) });
  }
}

function doGet() {
  return jsonResponse({
    status: 'ACTIVE',
    service: 'GHN Dashboard Native Google Sheets Export',
    targetFolderId: TARGET_FOLDER_ID,
    folderUrl: 'https://drive.google.com/drive/folders/' + TARGET_FOLDER_ID
  });
}
