# GHN Dashboard Final Edition — QA Notes

## Source baseline
- Built from the user-uploaded `GHN_Dashboard_Fast_Export_Optimized_v2(1).zip`.
- Existing business modules, dashboard data snapshots, V2 Apps Script, and export service are retained.

## Changes included
1. Drill-down crash fix in `src/pages/OverviewTab.tsx`: post-office drill-down rows are normalized from the real source schema (`tiLeGan`, `tiLeGTC`, `volume`, `sldGan`, `sldGTC`) into numeric `assignedRate` and `gtcRate` fields. Rates are recomputed from numerator/denominator to preserve the dashboard's KPI formula. Numeric rendering has safe fallbacks.
2. Drive folder access confirmation: added `GoogleDriveLockModal.tsx`, replaced the direct Drive anchor with a confirmation action, and checks the app role before opening the folder. Google Drive sharing permissions remain authoritative; this is not a substitute for server-side authorization.
3. Org chart control remains in the global Header only; removed its duplicate from the breadcrumb bar.
4. DQ controls removed from the Header and breadcrumb UI. The DQ component source is retained but no longer mounted in the main app.
5. Executive UI refinements: improved typography/focus visibility, screen-width utilization, table numeric alignment, and sequential section markers.
6. Existing V2 export code and Apps Script are retained unchanged.

## Verification status
- Archive extraction: passed.
- Targeted source inspection: passed.
- Drill-down schema mismatch: corrected in source.
- `npm ci`: could not complete in this execution environment (npm exited with an internal error / timed out).
- `tsc -b`: blocked because dependencies/type definitions are unavailable (`vite/client`, `node`).
- Production build, browser regression, live Google Sheets export, and role/Drive access tests: NOT VERIFIED here.

Do not describe this archive as production-certified or 100% verified until dependency installation, production build, and the browser regression checklist pass in the project environment.
