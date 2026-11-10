/**
 * GHN Dashboard -> native Google Sheets export (fast path v2).
 * Receives typed JSON arrays and writes the rectangular matrix in one setValues call.
 * Legacy CSV payloads remain supported for older dashboard builds.
 */
const TARGET_FOLDER_ID = '1HSEsr67ttGuI0r2Wo-ZxS4H7ZywnFKbw';

function jsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Fast path: if the input is already rectangular and contains no null/undefined,
 * reuse row arrays instead of copying every cell into a second matrix.
 * Fallback: normalize only irregular input so Range.setValues always gets a rectangle.
 */
function buildValues(headers, rows) {
  if (!Array.isArray(headers) || headers.length === 0) {
    throw new Error('Thiếu tiêu đề cột');
  }
  if (!Array.isArray(rows)) throw new Error('Danh sách dữ liệu không hợp lệ');

  const width = headers.length;
  let needsNormalization = false;

  for (let r = 0; r < rows.length && !needsNormalization; r++) {
    const row = rows[r];
    if (!Array.isArray(row) || row.length !== width) {
      needsNormalization = true;
      break;
    }
    for (let c = 0; c < width; c++) {
      if (row[c] === null || row[c] === undefined) {
        needsNormalization = true;
        break;
      }
    }
  }
  for (let c = 0; c < width && !needsNormalization; c++) {
    if (headers[c] === null || headers[c] === undefined) needsNormalization = true;
  }

  // Most Dashboard exports already have equal-length rows: only copy the outer array.
  if (!needsNormalization) return [headers].concat(rows);

  // Defensive fallback for ragged rows or empty cells.
  const safeRows = [headers].concat(rows);
  let maxWidth = width;
  for (let r = 1; r < safeRows.length; r++) {
    if (!Array.isArray(safeRows[r])) {
      throw new Error('Dữ liệu có dòng không đúng định dạng tại dòng ' + (r + 1));
    }
    if (safeRows[r].length > maxWidth) maxWidth = safeRows[r].length;
  }
  return safeRows.map(function(row) {
    const normalized = new Array(maxWidth);
    for (let c = 0; c < maxWidth; c++) {
      const value = row[c];
      normalized[c] = value === null || value === undefined ? '' : value;
    }
    return normalized;
  });
}

function doPost(e) {
  const startedAt = Date.now();
  let parseMs = 0;
  let createMs = 0;
  let writeMs = 0;
  let moveMs = 0;
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error('Dữ liệu gửi lên trống (No payload). Hãy xuất từ Dashboard, không chạy doPost bằng nút Run.');
    }

    const parseStartedAt = Date.now();
    const payload = JSON.parse(e.postData.contents);
    let values;
    if (Array.isArray(payload.headers) && Array.isArray(payload.rows)) {
      values = buildValues(payload.headers, payload.rows);
    } else if (typeof payload.content === 'string' && payload.content) {
      const parsedRows = Utilities.parseCsv(payload.content.replace(/^\uFEFF/, ''));
      if (!parsedRows || !parsedRows.length) throw new Error('Không đọc được dữ liệu CSV');
      values = buildValues(parsedRows[0], parsedRows.slice(1));
    } else {
      throw new Error('Payload thiếu headers/rows hoặc nội dung CSV');
    }
    if (!values.length || !values[0].length) throw new Error('Không có dữ liệu để xuất');
    parseMs = Date.now() - parseStartedAt;

    const rowCount = values.length;
    const columnCount = values[0].length;
    const requestedName = String(payload.filename || 'GHN_Export_' +
      Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Ho_Chi_Minh', 'yyyyMMdd_HHmmss'));
    const spreadsheetName = requestedName.replace(/\.csv$/i, '').replace(/\.gsheet$/i, '');

    // Create the spreadsheet with its exact grid size to avoid later grid expansion.
    const createStartedAt = Date.now();
    const spreadsheet = SpreadsheetApp.create(spreadsheetName, rowCount, columnCount);
    const sheet = spreadsheet.getSheets()[0];
    createMs = Date.now() - createStartedAt;

    // One bulk write. Do not split into chunks: for this data size one call is preferable.
    const writeStartedAt = Date.now();
    sheet.getRange(1, 1, rowCount, columnCount).setValues(values);
    writeMs = Date.now() - writeStartedAt;

    // Move only after the write succeeds, so failed exports do not leave partial files in target folder.
    const moveStartedAt = Date.now();
    const folder = DriveApp.getFolderById(TARGET_FOLDER_ID);
    DriveApp.getFileById(spreadsheet.getId()).moveTo(folder);
    moveMs = Date.now() - moveStartedAt;

    const finishedAt = Date.now();
    console.log(JSON.stringify({
      event: 'ghn_export_timing_v2',
      rows: rowCount - 1,
      columns: columnCount,
      payloadBytes: e.postData.contents.length,
      parseMs: parseMs,
      createMs: createMs,
      writeMs: writeMs,
      moveMs: moveMs,
      totalMs: finishedAt - startedAt
    }));

    return jsonResponse({
      success: true,
      fileUrl: spreadsheet.getUrl(),
      fileId: spreadsheet.getId(),
      filename: spreadsheetName,
      folderId: TARGET_FOLDER_ID,
      totalRows: Math.max(0, rowCount - 1),
      format: 'application/vnd.google-apps.spreadsheet',
      createdAt: new Date().toISOString(),
      timing: { parseMs: parseMs, createMs: createMs, writeMs: writeMs, moveMs: moveMs, totalMs: finishedAt - startedAt }
    });
  } catch (err) {
    console.error('GHN export failed: ' + String(err && err.stack ? err.stack : err));
    return jsonResponse({ success: false, error: String(err && err.message ? err.message : err) });
  }
}

function doGet() {
  return jsonResponse({
    status: 'ACTIVE',
    service: 'GHN Dashboard Native Google Sheets Export - Fast JSON v2',
    targetFolderId: TARGET_FOLDER_ID,
    folderUrl: 'https://drive.google.com/drive/folders/' + TARGET_FOLDER_ID
  });
}
