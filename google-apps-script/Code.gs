/**
 * GHN Dashboard -> native Google Sheets export (speed-optimized).
 * Accepts typed JSON rows from the dashboard; legacy CSV payloads remain supported.
 * Deploy as a Web App and authorize SpreadsheetApp + DriveApp access.
 */
const TARGET_FOLDER_ID = '1HSEsr67ttGuI0r2Wo-ZxS4H7ZywnFKbw';

function jsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function normalizeRows(headers, rows) {
  const safeHeaders = Array.isArray(headers) ? headers : [];
  const safeRows = Array.isArray(rows) ? rows : [];
  const width = Math.max(1, safeHeaders.length, ...safeRows.map(function(row) {
    return Array.isArray(row) ? row.length : 0;
  }));

  const values = [safeHeaders];
  safeRows.forEach(function(row) {
    if (!Array.isArray(row)) throw new Error('Dữ liệu có dòng không đúng định dạng');
    values.push(row);
  });

  return values.map(function(row) {
    const normalized = new Array(width);
    for (let col = 0; col < width; col++) {
      const value = row[col];
      normalized[col] = value === null || value === undefined ? '' : value;
    }
    return normalized;
  });
}

function doPost(e) {
  const startedAt = Date.now();
  let stepAt = startedAt;
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error('Dữ liệu gửi lên trống (No payload)');
    }

    const payload = JSON.parse(e.postData.contents);
    let values;
    if (Array.isArray(payload.headers) && Array.isArray(payload.rows)) {
      // Fast path: browser sends typed arrays; no CSV serialization or parseCsv needed.
      values = normalizeRows(payload.headers, payload.rows);
    } else if (typeof payload.content === 'string' && payload.content) {
      // Backward compatibility with older dashboard builds still sending CSV.
      const csvText = payload.content.replace(/^\uFEFF/, '');
      const parsedRows = Utilities.parseCsv(csvText);
      if (!parsedRows || !parsedRows.length) throw new Error('Không đọc được dữ liệu CSV');
      values = normalizeRows(parsedRows[0], parsedRows.slice(1));
    } else {
      throw new Error('Payload thiếu headers/rows hoặc nội dung CSV');
    }

    if (!values.length || !values[0].length) throw new Error('Không có dữ liệu để xuất');
    const rowCount = values.length;
    const columnCount = values[0].length;
    stepAt = Date.now();

    const folder = DriveApp.getFolderById(TARGET_FOLDER_ID);
    const requestedName = String(payload.filename || 'GHN_Export_' +
      Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Ho_Chi_Minh', 'yyyyMMdd_HHmmss'));
    const spreadsheetName = requestedName.replace(/\.csv$/i, '').replace(/\.gsheet$/i, '');

    // Pre-size the spreadsheet and write the entire rectangular matrix in ONE call.
    const spreadsheet = SpreadsheetApp.create(spreadsheetName, rowCount, columnCount);
    const sheet = spreadsheet.getSheets()[0];
    sheet.getRange(1, 1, rowCount, columnCount).setValues(values);
    stepAt = Date.now();

    // Skip autoResizeColumns, whole-sheet wrap formatting, filters and flush.
    // These are optional UI operations and add latency for 1k-5k row exports.
    DriveApp.getFileById(spreadsheet.getId()).moveTo(folder);
    const fileUrl = spreadsheet.getUrl();
    const finishedAt = Date.now();

    console.log(JSON.stringify({
      event: 'ghn_export_timing',
      rows: rowCount - 1,
      columns: columnCount,
      prepareMs: stepAt - startedAt,
      writeAndCreateMs: finishedAt - stepAt,
      totalMs: finishedAt - startedAt,
    }));

    return jsonResponse({
      success: true,
      fileUrl: fileUrl,
      fileId: spreadsheet.getId(),
      filename: spreadsheetName,
      folderId: TARGET_FOLDER_ID,
      totalRows: Math.max(0, rowCount - 1),
      format: 'application/vnd.google-apps.spreadsheet',
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('GHN export failed: ' + String(err && err.stack ? err.stack : err));
    return jsonResponse({ success: false, error: String(err && err.message ? err.message : err) });
  }
}

function doGet() {
  return jsonResponse({
    status: 'ACTIVE',
    service: 'GHN Dashboard Native Google Sheets Export - Fast JSON',
    targetFolderId: TARGET_FOLDER_ID,
    folderUrl: 'https://drive.google.com/drive/folders/' + TARGET_FOLDER_ID,
  });
}
