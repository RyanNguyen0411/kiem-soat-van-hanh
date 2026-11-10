# GHN Fast Export v2

## What changed
- The typed-JSON path now checks whether rows are already rectangular.
- For normal Dashboard data, it reuses the original row arrays and only creates a new outer array. It no longer copies every individual cell into a second matrix.
- Irregular rows/null values still use a safe normalization fallback.
- Keeps one bulk `Range.setValues()` call; chunking is intentionally avoided for 1,000–5,000 rows.
- Adds separate timing metrics: `parseMs`, `createMs`, `writeMs`, `moveMs`, `totalMs`, plus payload size.
- Keeps legacy CSV compatibility and the same response fields used by the Dashboard.

## Deploy
1. Replace the full content of Apps Script `Code.gs` with `google-apps-script/Code.gs`.
2. Save and Deploy > Manage deployments > Edit > New version > Deploy.
3. Keep the current Web App URL if Google retains it.
4. Export a representative 1,000–5,000 row report from the Dashboard.
5. In Apps Script > Executions, open the latest `doPost` execution and inspect the `ghn_export_timing_v2` log.

## Important
- Do not run `doPost` manually from the Apps Script editor; it requires the POST event payload.
- The write is already a single bulk call. Splitting it into chunks is not expected to make 1,000–5,000 row exports faster.
- The optimization reduces JavaScript copying/normalization overhead. Google Drive spreadsheet creation and Google Sheets write latency remain external service costs; measure the timing log before deciding on a larger architectural change.
