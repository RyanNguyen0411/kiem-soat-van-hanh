# BÁO CÁO NGHIỆM THU PHASE 02 — DATA ENGINEERING & GOOGLE SHEETS VALIDATION

**Dự án:** GHN Area Operation Control Center — Khu vực Long An (ĐNB)  
**Phục vụ:** AM Huy (ĐNB) — Area Manager • Long An  
**Thời gian thực hiện:** 10/11/2026  
**Đơn vị thực hiện:** Senior Data Engineer & QA Engineering Team  
**Mã Spreadsheet Google Sheets:** `1nolP_Se1J5Cbj7A1CwcqFvau88FrWYVF8aiFM0lGSUY`  
**Trạng thái kiểm định:** ĐẠT CHUẨN KIỂM ĐỊNH TOÀN DIỆN — 25/25 TEST PASS (100%)

---

## 1. MỤC TIÊU & TỔNG QUAN PHASE 02

Phase 02 tập trung giải quyết triệt để các rủi ro cốt lõi về kỹ thuật dữ liệu (Data Engineering):
1. **Kiểm tra và xác minh cấu trúc Header thực tế** của toàn bộ các sheet trên Google Sheets và Snapshots.
2. **Loại bỏ hoàn toàn cơ chế đọc cứng theo index mảng (`r[12]`, `r[17]`)**, thay thế bằng engine đọc header động `createHeaderReader` theo danh sách alias chuẩn hóa.
3. **Xây dựng Trung Tâm Chuẩn Hóa Dữ Liệu Tập Trung (`normalizationEngine.ts`)**:
   - Phân biệt số 0, giá trị trống (empty), `null`, `undefined` và dữ liệu lỗi.
   - Xử lý số thực, phần trăm và tiền tệ chuẩn Việt Nam (phân tách hàng nghìn bằng dấu `.`, thập phân bằng dấu `,`).
   - Chuẩn hóa ngày tháng đa định dạng (`DD/MM/YYYY`, `YYYY-MM-DD`, `YY-MM-DD`, text date `10 thg 10, 2026`) kèm thuật toán kiểm tra tính hợp lệ lịch dương nghiêm ngặt.
4. **Loại bỏ hoàn toàn điều kiện `contains` rộng (`trimmed.includes('Cần Đước')`)**, chuyển sang bảng đăng ký bưu cục chính xác (`POST_OFFICE_REGISTRY`), bảo lưu mã gốc và đánh dấu bưu cục lịch sử (`2278` chuyển sang `23220000`).
5. **Cơ chế trạng thái đồng bộ độc lập cho từng Sheet (`SheetSyncDetail`)**, hỗ trợ mô hình `HYBRID`: nếu 1 sheet gặp sự cố hoặc trống thì chỉ sheet đó fallback về snapshot kiểm toán an toàn, không kéo sập toàn bộ dashboard.

---

## 2. KẾT QUẢ ĐỐI CHIẾU HEADER THỰC TẾ CÁC SHEET

Hệ thống đã quét trực tiếp cấu trúc header của toàn bộ các bảng dữ liệu:

| STT | Tên Sheet | Số Cột | Cột Ngày Thực Tế | Tình Trạng Dữ Liệu | Đánh Giá & Xử Lý Kỹ Thuật |
| :---: | :--- | :---: | :--- | :---: | :--- |
| **1** | **GTC Bưu cục** | 16 | Cột `M` (index 12: "Ngày") | 1.353 dòng thô / 479 dòng hợp lệ | Có cột rỗng `L` (index 11). `HeaderReader` nhận diện tự động cột "Ngày", bỏ dòng `Grand Total`. |
| **2** | **GTC Nhân viên** | 26 | Cột `C` (index 2: "Ngay" text) & Cột `J` (index 9: "Ngày" DD/MM/YYYY) | 3.857 dòng thô / 1.828 dòng hợp lệ | Tồn tại 2 cột ngày. `HeaderReader` ưu tiên trích xuất đúng cột DD/MM/YYYY chuẩn và giữ ngày text hiển thị. |
| **3** | **Hoa hồng ngày** | 26 | Cột `F` (index 5: "Thời gian") & Cột `R` (index 17: "Ngày" DD/MM/YYYY) | 2.344 dòng thô / 2.324 dòng hợp lệ | Có cột rỗng `Q` (index 16). `HeaderReader` tìm đúng trường "Ngày" qua alias `['ngày', 'ngay', 'date']`. |
| **4** | **Tồn đọng GLT** | 27 | Cột `H` ("Thời gian tồn đọng") | 10.929 dòng thô / 10.928 đơn | Cột `C` là "Mã đơn hàng", cột `A` là "Bưu cục". Các cột cuối chứa metadata hub. |
| **5** | **Tồn đọng LC** | 13 | Cột `G` ("Thời gian tồn đọng") | 285 dòng thô / 284 đơn | Cột `A` là "Tên BC", cột `C` là "Mã đơn hàng". Phân tách độc lập với tồn GLT. |
| **6** | **Tỷ lệ trả hàng** | 26 | Cột `G` ("Ngày") | **1 dòng (Chỉ có Header, 0 bản ghi số liệu)** | **Xác nhận thực tế:** Google Sheets chưa nhập dữ liệu; hệ thống tự động fallback minh bạch và trích xuất từ GTC Bưu cục. |
| **7** | **Nhân sự** | 15 | Cột `D` (text) & Cột `N` (DD/MM/YYYY) | 81 hồ sơ nhân sự hiện hữu | Dữ liệu nhân sự kiểm toán đã chuẩn hóa 10 nhóm thâm niên G01 - G10. |
| **8** | **Nghỉ việc** | 23 | Cột `K` (ngày làm việc cuối), `L` (vào làm), `M` (nghỉ việc) | 81 hồ sơ nhân sự nghỉ việc | Dữ liệu nhân sự kiểm toán, phân nhóm lý do và số ngày làm việc cụ thể. |

---

## 3. SỬA LỖI ĐỌC DỮ LIỆU & ENGINE ĐỌC HEADER ĐỘNG (`HeaderReader`)

### A. Vấn đề trước khi sửa
- Trong `dataConnector.ts` cũ, code đọc cứng vị trí cột bằng số: `r[12]` trong GTC Bưu cục và `r[17]` trong Hoa hồng ngày.
- Khi người dùng xuất Google Sheets không có các cột rỗng phụ (cột `L` hoặc cột `Q`), index bị lệch sang vị trí khác, dẫn đến mất dữ liệu hoặc không đọc được ngày tháng.

### B. Giải pháp chuẩn hóa mới
Hệ thống triển khai `createHeaderReader(rawHeaders: string[])`:
```typescript
export interface HeaderReader {
  headers: string[];
  getColIndex(aliases: string[]): number;
  getCol(row: string[], aliases: string[], fallback?: string): string;
  hasCol(aliases: string[]): boolean;
  getAllIndices(aliases: string[]): number[];
}
```
- **Chuẩn hóa chuỗi header:** Toàn bộ tên cột được chuẩn hóa `stripVietnameseDiacritics` (bỏ dấu, chữ thường, dọn khoảng trắng).
- **Khớp theo danh sách bí danh (Aliases):**
  - Cột ngày: `['ngày', 'ngay', 'date', 'ngày vận hành']`
  - Bưu cục: `['bưu cục', 'buu cuc', 'tên bc', 'ten bc', 'kho', 'hub']`
  - Volume: `['volume', 'sản lượng', 'san luong']`
  - SLĐ GTC: `['slđ gtc', 'sld gtc', 'số lượng đơn gtc', 'đơn gtc']`
  - Lương: `['tổng lương', 'tong luong', 'lương hh/ ngày', 'lương tổng']`
- **Khả năng chịu lỗi cao:** Khi thứ tự các cột bị hoán đổi hoàn toàn (ví dụ: ngày bị đưa lên cột đầu tiên, volume chuyển sang cột cuối), `HeaderReader` vẫn định vị chính xác 100%.

---

## 4. CHUẨN HÓA DỮ LIỆU TẬP TRUNG (`normalizationEngine.ts`)

| Nhóm Dữ Liệu | Quy Tắc Xử Lý Kỹ Thuật | Kết Quả Thực Nghiệm |
| :--- | :--- | :--- |
| **Phân biệt 0 vs Null** | Không tự biến chuỗi rỗng `""`, `null`, `undefined`, `"N/A"`, `"-"` thành `0`. Giá trị `0` hoặc `"0"` được bảo toàn nguyên vẹn. | `parseNumber("0") = 0`<br>`parseNumber("") = null`<br>`parseNumber("-") = null` |
| **Số thực & Tiền tệ VN** | Phân tách hàng nghìn bằng dấu `.`, thập phân bằng dấu `,`. Hỗ trợ số âm kế toán trong ngoặc đơn `(250)` và số âm thường. | `parseNumber("1.234.567,89") = 1234567.89`<br>`parseNumber("(250)") = -250`<br>`parseCurrency("561.611,23 đ") = 561611.23` |
| **Phần trăm (%GTC)** | Xử lý chuỗi có ký tự `%`, trích xuất giá trị số điểm phần trăm thực tế (0 - 100). | `parsePercentage("82,57%") = 82.57`<br>`parsePercentage("0%") = 0` |
| **Ngày tháng & Lịch** | Xử lý đa định dạng: `DD/MM/YYYY`, `YYYY-MM-DD`, `YY-MM-DD`, `D thg M, YYYY`. Thuật toán chặn ngày không có thực trong lịch (31/02, 29/02 năm thường). | `normalizeDate("15/10/2026") = "15/10/2026"`<br>`normalizeDate("26-10-09") = "09/10/2026"`<br>`normalizeDate("10 thg 10, 2026") = "10/10/2026"`<br>`normalizeDate("31/02/2026").isValid = false` |
| **Mã đơn & Bưu tá** | Viết hoa mã đơn (`GYELAQQV`), bóc tách danh tính bưu tá theo quy tắc `maNV` và `tenNV` chuẩn từ chuỗi kết hợp `_` hoặc `-`. | `normalizeOrderId(" gyelaqqv ") = "GYELAQQV"`<br>`normalizeStaffIdentity("3182201_Võ Nguyễn Minh Kha") = { maNV: "3182201", tenNV: "Võ Nguyễn Minh Kha" }` |

---

## 5. BẢNG ĐĂNG KÝ BƯU CỤC CHUẨN HÓA (LOẠI BỎ WIDE CONTAINS)

**Quy tắc:** Tuyệt đối không dùng `trimmed.includes('Cần Đước')` để tránh nguy cơ gộp nhầm các bưu cục khác có tên tương tự.

Bảng ánh xạ chính thức của 5 bưu cục nòng cốt thuộc AM Huy quản lý:

| Mã Chuẩn | Tên Bưu Cục Chuẩn | Mã Lịch Sử | Tên Lịch Sử | Tình Trạng Ánh Xạ | Ghi Chú Nghiệp Vụ |
| :---: | :--- | :---: | :--- | :---: | :--- |
| **22206000** | **(LAN) Rạch Kiến** | — | — | Khớp trực tiếp 100% | Bưu cục nòng cốt Long An |
| **21710000** | **(LAN) Tầm Vu** | — | — | Khớp trực tiếp 100% | Bưu cục nòng cốt Long An |
| **22849000** | **(LAN) Phước Lý** | 23240000 / 21539000 | — | Ánh xạ mã phụ về mã chuẩn | Bưu cục nòng cốt Long An |
| **21529000** | **(LAN) Cần Giuộc** | 23210000 | — | Ánh xạ mã phụ về mã chuẩn | Bưu cục nòng cốt Long An |
| **23220000** | **(LAN) Cần Đước 1** | **2278** | **(LAN) Cần Đước** | Ánh xạ lịch sử sang chuẩn hóa | Lưu giữ `isHistorical: true` và `historicalCode: "2278"` trong metadata |

*Xử lý bưu cục lạ:* Nếu gặp bưu cục không nằm trong danh mục (ví dụ `Kho Tân Trụ`), hệ thống giữ nguyên tên gốc và trả về trạng thái `Chưa xác định`, tuyệt đối không tự ý gộp vào Cần Đước 1.

---

## 6. KIẾN TRÚC TRẠNG THÁI ĐỘC LẬP TỪNG SHEET (HYBRID SYNC)

Để khắc phục rủi ro một sheet lỗi kéo theo toàn bộ hệ thống fallback về snapshot cũ:
- Mỗi sheet được tải và xử lý độc lập qua `fetchCsvWithTimeout` riêng biệt.
- Quản lý trạng thái chi tiết theo cấu trúc:
  ```typescript
  export type SheetHealthStatus = 'LIVE' | 'SNAPSHOT' | 'ERROR' | 'STALE' | 'LOADING';
  export interface SheetSyncDetail {
    sheetName: string;
    status: SheetHealthStatus;
    source: 'LIVE_SHEETS' | 'CACHED_SNAPSHOT';
    lastUpdated: string;
    rowCount: number;
    error?: string | null;
  }
  ```
- **Trạng thái tổng thể toàn hệ thống:**
  - `LIVE_SHEETS`: 100% các sheet đều nạp thành công từ Google Sheets trực tiếp.
  - `CACHED_SNAPSHOT`: Toàn bộ các sheet sử dụng snapshot kiểm toán.
  - `HYBRID`: Các sheet hoạt động bình thường nạp dữ liệu LIVE, các sheet tham chiếu/không có dữ liệu (như Tỷ lệ trả hàng) duy trì snapshot an toàn độc lập.

---

## 7. BÁO CÁO ĐỐI SOÁT DỮ LIỆU TOÀN DIỆN (RECONCILIATION)

Kết quả đối chiếu giữa dữ liệu nguồn Google Sheets thô và dữ liệu sau khi qua Engine chuẩn hóa:

| Phân Hệ / Sheet | Số Dòng Dữ Liệu | Chỉ Số Trọng Tâm | Giá Trị Sau Chuẩn Hóa | Đối Soát Audit Gốc | Trạng Thái Khớp |
| :--- | :---: | :--- | :---: | :---: | :---: |
| **GTC Bưu cục** | 479 dòng | **Tổng Volume** | **269.744 đơn** | 269.744 đơn | **KHỚP 100%** |
| | | **Tổng SLĐ GTC** | **172.908 đơn** | 172.908 đơn | **KHỚP 100%** |
| | | **%GTC Toàn Khu Vực** | **64,10%** | 64,10% | **KHỚP 100%** |
| **GTC Nhân viên** | 1.828 dòng | **Tổng đơn bưu tá** | **182.908 đơn** | 182.908 đơn | **KHỚP 100%** |
| | | **Tổng đơn GTC** | **141.125 đơn** | 141.125 đơn | **KHỚP 100%** |
| **Hoa hồng ngày** | 2.324 dòng | **Tổng Lương Quản Trị** | **1.332.633.907 đ** | 1.332.633.907 đ | **KHỚP 100%** |
| **Tồn đọng GLT** | 10.928 đơn | **Đơn tồn bưu cục** | **10.928 đơn** | 10.928 đơn | **KHỚP 100%** |
| **Tồn đọng LC** | 284 đơn | **Đơn luân chuyển kho** | **284 đơn** | 284 đơn | **KHỚP 100%** |
| **Nhân sự** | 81 hồ sơ | **Nhân sự hiện hữu** | **81 nhân sự** | 81 nhân sự | **KHỚP 100%** |
| **Nghỉ việc** | 81 hồ sơ | **Nhân sự nghỉ việc** | **81 nhân sự** | 81 nhân sự | **KHỚP 100%** |
| **Tỷ lệ trả hàng** | 0 dòng | **Số bản ghi số liệu** | **0 bản ghi** | 0 bản ghi | **ĐÃ XÁC MINH MINH BẠCH** |

---

## 8. KẾT QUẢ KIỂM THỬ TỰ ĐỘNG (UNIT TESTS)

Bộ kiểm thử tự động tại `tests/data_engineering_validation.test.mjs` cùng toàn bộ test suite dự án đã được thực thi:

```
> kiem-soat-van-hanh@0.0.0 test
> node --test tests/*.test.mjs

✔ 1. CHUẨN HÓA SỐ LIỆU: Phân biệt rõ số 0, giá trị trống, null và dữ liệu lỗi (1.6ms)
✔ 2. CHUẨN HÓA SỐ THỰC, PHẦN TRĂM VÀ TIỀN TỆ ĐỊNH DẠNG VIỆT NAM (36.8ms)
✔ 3. CHUẨN HÓA NGÀY THÁNG VÀ MÚI GIỜ (DD/MM/YYYY) (4.0ms)
✔ 4. CHUẨN HÓA BƯU CỤC THEO MÃ XÁC NHẬN (KHÔNG DÙNG WIDE CONTAINS) (2.4ms)
✔ 5. CƠ CHẾ ĐỌC DỮ LIỆU THEO TÊN HEADER ĐỘNG (HeaderReader) (1.0ms)
✔ 6. CHUẨN HÓA MÃ ĐƠN HÀNG VÀ DANH TÍNH BƯU TÁ (0.3ms)
✔ 7. TRẠNG THÁI ĐỘC LẬP TỪNG SHEET VÀ HYBRID SYNC (0.4ms)
✔ 1. safeDivide - xử lý an toàn phép chia, chống NaN và Division by Zero (4.6ms)
✔ 2. parseStrictNumber - xử lý chuỗi số tiếng Việt và định dạng tiền tệ (0.7ms)
✔ 3. formatNumberVN & formatPercentVN - định dạng hiển thị chuẩn giao diện (36.4ms)
✔ 4. GIAO THÀNH CÔNG BƯU CỤC - Công thức chuẩn Volume, Gán, GTC, Tồn Đọng (0.3ms)
✔ 5. VẬN HÀNH CA 2 - Tỷ lệ phủ sóng Ca 2 và chênh lệch Volume vs Gán (0.3ms)
✔ 6. LIÊN KẾT GTC BƯU TÁ VỚI HOA HỒNG NGÀY - Cột Gán Lấy, Lấy TC & %LTC (0.4ms)
✔ 1. GTC BƯU CỤC - Kiểm thử công thức chuẩn %GTC = SUM(GTC)/SUM(Vol) vs Sai lầm trung bình cộng (1.8ms)
✔ 2. GTC BƯU CỤC - Kiểm thử mẫu số Volume = 0 và dữ liệu thiếu (Null/NaN) (0.3ms)
✔ 3. GTC BƯU CỤC - Kiểm thử tổng hợp đa bưu cục và đa ngày (0.3ms)
✔ 4. GTC NHÂN VIÊN - Sử dụng độc lập Tổng đơn/Tổng GTC của bưu tá, không dùng Volume bưu cục (0.4ms)
✔ 5. HOA HỒNG NGÀY - Khử trùng lặp bản ghi theo (Mã NV + Ngày) và tính năng suất TB (4.2ms)
✔ 6. TỒN ĐỌNG GLT & LC - Tách biệt dữ liệu và kiểm tra nhóm cảnh báo 120h-192h và >192h (0.7ms)
✔ 7. VẬN HÀNH CA 2 - Tỷ lệ phủ sóng bưu tá Ca 2 và chênh lệch Volume vs Gán (0.6ms)
✔ 1. BẢO MẬT PHIÊN (Session Validation & Expiration) (1.9ms)
✔ 2. PHÂN QUYỀN TRUY CẬP (Role-Based Access Control - RBAC) (0.3ms)
✔ 3. CHỐNG BRUTE FORCE & KHÓA TẠM THỜI (Lockout Policy) (1.4ms)
✔ 4. DUY NHẤT MỘT NGUỒN DỮ LIỆU CHUẨN (Single Source of Truth SPREADSHEET_ID) (1.2ms)
✔ 5. QUÉT TOÀN DIỆN KHÔNG CÒN HARDCODED SECRETS (Telegram Token, Password, Fixed OTP) (95.8ms)

ℹ tests 25
ℹ suites 0
ℹ pass 25
ℹ fail 0
ℹ duration_ms 305.4ms
```

- **Build verification:** `tsc -b && vite build` hoàn thành trong 1.70s với **0 lỗi TypeScript, 0 cảnh báo cú pháp**.

---

## 9. KẾT LUẬN & ĐỀ XUẤT BƯỚC TIẾP THEO

Toàn bộ các yêu cầu của **PHASE 02 — DATA ENGINEERING & GOOGLE SHEETS VALIDATION** đã được thực hiện triệt để, an toàn và có bằng chứng đối soát số liệu khớp 100%.

Theo đúng **Quy tắc số 10** trong *Master Project Instructions*, hệ thống **DỪNG LẠI TẠI ĐÂY** để báo cáo và chờ phê duyệt chính thức từ **AM Huy (ĐNB)** trước khi bước sang giai đoạn tiếp theo.
