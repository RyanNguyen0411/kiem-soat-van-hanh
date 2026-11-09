# BÁO CÁO NGHIỆM THU PHASE 04 — DATA RELATIONSHIPS, FILTERS & DRILL-DOWN

**Kính gửi:** **AM Huy (ĐNB) — Area Manager • Long An**  
**Dự án:** GHN Area Manager Dashboard — Long An (ĐNB)  
**Phân hệ thực hiện:** Phase 04 — Quan Hệ Dữ Liệu, Quản Lý Bộ Lọc & Trải Nghiệm Phân Tích Drill-Down  
**Ngày thực hiện:** 10/11/2026  
**Trạng thái kiểm tra:** Hoàn thành **100% các tiêu chí** & Vượt qua **32/32 bài kiểm thử tự động (100% PASS)**  
**Mã nguồn GitHub:** Đã đẩy nhánh `main` (commit mới nhất) | File nén cập nhật: `GHN_Dashboard_SourceCode_Latest.zip` (826 KB)

---

## MỤC LỤC
1. [A. Relationship Engine & Ma Trận Liên Kết Toàn Diện](#a-relationship-engine--ma-trận-liên-kết-toàn-diện)
2. [B. Chi Tiết Từng Mối Quan Hệ Dữ Liệu & Bằng Chứng Khớp](#b-chi-tiết-từng-mối-quan-hệ-dữ-liệu--bằng-chứng-khớp)
3. [C. Quản Lý Bộ Lọc Độc Lập & Bộ Lọc Toàn Cục](#c-quản-lý-bộ-lọc-độc-lập--bộ-lọc-toàn-cục)
4. [D. Động Cơ Phân Tích Chi Tiết Drill-Down (UnifiedDrillDownModal)](#d-động-cơ-phân-tích-chi-tiết-drill-down-unifieddrilldownmodal)
5. [E. Kết Quả Kiểm Thử Tự Động (Unit Tests) & Production Build](#e-kết-quả-kiểm-thử-tự-động-unit-tests--production-build)

---

## A. RELATIONSHIP ENGINE & MA TRẬN LIÊN KẾT TOÀN DIỆN

Hệ thống đã triển khai trung tâm quản lý liên kết dữ liệu [`relationshipEngine.ts`](file:///c:/Users/VivoBook/Desktop/GHN/ANTIGRAVITY/kiem-soat-van-hanh/src/utils/relationshipEngine.ts).

### Nguyên tắc liên kết bắt buộc:
1. **Khóa liên kết chuẩn hóa:** Sử dụng `maBC` (chuẩn 8 chữ số), `maNV` (ID bưu tá), `maDonHang` (mã đơn in hoa), và `ngay` (chuẩn `DD/MM/YYYY`).
2. **Tuyệt đối không liên kết bằng tên gần giống:** Không sử dụng substring `contains` lỏng lẻo. Toàn bộ bưu cục được chuẩn hóa qua `POST_OFFICE_REGISTRY` của Phase 02.
3. **Chống nhân bản bản ghi (Zero Fan-Out):** Không tạo phép nối Many-to-Many làm phát sinh nhân bản số liệu dòng (Fan-out factor = 1.0 trên toàn hệ thống).
4. **Xử lý khóa thiếu minh bạch:** Đơn thiếu mã hoặc bưu tá thời vụ thiếu bảng lương đều được phân loại có chủ đích, không che giấu hoặc gây lỗi ứng dụng.

### BẢNG MA TRẬN QUAN HỆ TOÀN HỆ THỐNG:

| STT | Mối Quan Hệ Liên Kết | Khóa Nối (Join Keys) | Cardinality | Grain Nguồn | Grain Đích | Số Dòng Khớp | Tỷ Lệ Khớp | Fan-Out |
| :---: | :--- | :--- | :---: | :--- | :--- | :---: | :---: | :---: |
| **1** | **GTC Bưu cục ↔ GTC Nhân viên** | `buuCuc + ngay` | `1:N` | Bưu cục × Ngày × Loại Hàng | Mã NV × Ngày × Bưu cục | **1.828 / 1.828** | **100.0%** | **1.0** (Không nhân bản) |
| **2** | **GTC Nhân viên ↔ Hoa hồng ngày** | `maNV + ngay` | `1:1` | Mã NV × Ngày | Mã NV × Ngày | **1.818 / 1.828** | **99.45%** | **1.0** (Không nhân bản) |
| **3** | **GTC Bưu cục ↔ Tồn đọng GLT** | `maBC` / `buuCuc` | `1:N` | Bưu cục | Mã đơn hàng GLT | **10.928 / 10.928** | **100.0%** | **1.0** (Không nhân bản) |
| **4** | **GTC Bưu cục ↔ Tồn đọng LC** | `maBC` / `tenBC` | `1:N` | Bưu cục (Kho/Sàn) | Mã kiện LC | **284 / 284** | **100.0%** | **1.0** (Không nhân bản) |
| **5** | **Tồn đọng GLT ↔ Tồn đọng LC** | `maDonHang` | `DISJOINT` | Mã đơn GLT | Mã kiện LC | **Overlap = 0** | **Độc lập 100%** | — (Cấm gộp) |
| **6** | **GTC Nhân viên ↔ Hồ sơ Nhân sự** | `maNV` | `1:1` | Mã bưu tá (72 NV) | Mã NV (HR) | **72 / 72** | **100.0%** | **1.0** (Không nhân bản) |
| **7** | **GTC Bưu cục ↔ Tỷ lệ trả hàng** | `buuCuc + ngay` | `1:1` | Bưu cục × Ngày | Bưu cục × Ngày | — | Trích xuất % Chuyển trả | **1.0** (Không nhân bản) |

---

## B. CHI TIẾT TỪNG MỐI QUAN HỆ DỮ LIỆU & BẰNG CHỨNG KHỚP

### 1. Quan hệ 1: GTC Bưu cục ↔ GTC Nhân viên (`buuCuc + ngay`)
- **Ý nghĩa:** Cho phép AM Huy từ một bưu cục và ngày vận hành bất kỳ bấm xem ngay danh sách các bưu tá phụ trách và năng suất giao của từng người.
- **Kết quả đối soát:** Toàn bộ **1.828 dòng dữ liệu bưu tá** đều khớp chính xác vào 5 bưu cục nòng cốt thuộc AM Huy quản lý. Số dòng không khớp: **0 dòng**.

### 2. Quan hệ 2: GTC Nhân viên ↔ Hoa hồng ngày (`maNV + ngay`)
- **Ý nghĩa:** Đối chiếu chéo giữa số lượng đơn bưu tá giao thành công ngoài tuyến với thu nhập hoa hồng và đơn tính lương trong ngày.
- **Kết quả đối soát:**
  - Khớp chính xác: **1.818 dòng (99.45%)**.
  - Không khớp: **Đúng 10 dòng duy nhất**.
  - **Minh chứng kiểm toán:** 10 dòng này thuộc về bưu tá `3190580 - Nguyễn Minh Huy`. Đây là nhân sự CTV thời vụ (vào ngày 14/10/2026, nghỉ ngày 01/11/2026). Theo quy chế tài chính GHN, CTV thời vụ không có bảng lương hoa hồng kế toán. Hệ thống xử lý trường hợp này an toàn (trả về mảng rỗng, không crash và ghi rõ lý do).

### 3. Quan hệ 3 & 4: GTC Bưu cục ↔ Tồn đọng GLT & Tồn đọng LC (`maBC`)
- **Ý nghĩa:** Drill-down từ con số tồn đọng của bưu cục vào chi tiết từng đơn hàng cụ thể, phân loại theo nhóm cảnh báo cấp thiết 120h–192h và >192h.
- **Kết quả đối soát:** Khớp **100%** (10.928 đơn GLT và 284 đơn LC) vào 5 bưu cục Long An.

### 4. Quan hệ 5: Tồn đọng GLT ↔ Tồn đọng LC (Tính Độc Lập Hoàn Toàn)
- **Ý nghĩa:** Kiểm tra giao thoa giữa đơn tồn ngoài tuyến (GLT) và đơn tồn sàn luân chuyển (LC).
- **Kết quả đối soát:** **Số mã đơn trùng lặp giữa 2 tập dữ liệu = 0**. Điều này chứng minh GLT và LC là hai tập dữ liệu độc lập hoàn toàn, phản ánh 2 mảng vận hành riêng biệt (Bưu tá ngoài tuyến vs Nhân viên xử lý kho sàn NVXL) và **tuyệt đối không được cộng gộp thành một chỉ số tồn duy nhất**.

### 5. Quan hệ 6: GTC Nhân viên ↔ Hồ sơ Nhân sự (`maNV`)
- **Ý nghĩa:** Liên kết bưu tá đi tuyến với thông tin hồ sơ nhân sự (thâm niên G01 - G10, ngày vào làm, chức vụ, tình trạng làm việc).
- **Kết quả đối soát:** **100% bưu tá (72/72 người)** được định danh đầy đủ:
  - **67 nhân sự:** Khớp trong sheet `Nhân sự` (Đang làm việc).
  - **5 nhân sự:** Khớp trong sheet `Nghỉ việc` (Đã thôi việc hoặc CTV thời vụ).
  - Bưu tá không xác định: **0 người**.

---

## C. QUẢN LÝ BỘ LỌC ĐỘC LẬP & BỘ LỌC TOÀN CỤC

Hệ thống đã chuẩn hóa kiến trúc bộ lọc đáp ứng 100% yêu cầu:

1. **Phân cấp Bộ lọc Rõ Ràng:**
   - **Bộ lọc Toàn cục (Global):** Bưu cục nòng cốt (`selectedBuuCucGlobal`) và Ngày vận hành (`selectedDateGlobal`) được đồng bộ qua `DashboardContext` để giữ ngữ cảnh khi AM chuyển đổi giữa các tab.
   - **Bộ lọc Cục bộ (Scoped Filters):** Mỗi phân hệ sở hữu các bộ lọc chuyên biệt (Loại đơn, Loại hàng, Trạng thái kiện, Mức cảnh báo, Nhóm thâm niên) hoạt động độc lập, không rò rỉ hoặc gây xung đột sang phân hệ khác.
2. **Nút Xóa Bộ Lọc (Reset Filters):** Mỗi bảng và tab đều trang bị nút **"Xóa bộ lọc" / RotateCcw**, cho phép quay lại trạng thái tổng quan ban đầu tức thời chỉ bằng 1 click.
3. **Huy Hiệu Bộ Lọc Đang Áp Dụng (Filter Badges):** Hiển thị rõ ràng các tiêu chí đang được áp dụng (ví dụ: `Bưu cục: (LAN) Tầm Vu • Ngày: 15/10/2026`) kèm số lượng điều kiện lọc đang kích hoạt.
4. **Trạng Thái Không Có Dữ Liệu (Empty State):** Khi bộ lọc không có dữ liệu phù hợp, hệ thống hiển thị card cảnh báo chuyên nghiệp: *"Không có dữ liệu phù hợp với điều kiện tìm kiếm"* kèm hướng dẫn xóa bộ lọc.
5. **Cơ Chế Popover An Toàn:** Các dropdown bộ lọc ([`IndependentFilter.tsx`](file:///c:/Users/VivoBook/Desktop/GHN/ANTIGRAVITY/kiem-soat-van-hanh/src/components/common/IndependentFilter.tsx), [`IndividualFilterDropdown.tsx`](file:///c:/Users/VivoBook/Desktop/GHN/ANTIGRAVITY/kiem-soat-van-hanh/src/components/common/IndividualFilterDropdown.tsx)) sử dụng kiểm tra `containerRef.current.contains(e.target)`. Thao tác click chọn checkbox, tìm kiếm bên trong popover **không bao giờ tự động đóng popup**. Chỉ khi click ra ngoài màn hình popup mới thu gọn.
6. **Bảo Toàn Bộ Lọc Khi Drill-Down:** Khi mở chi tiết bưu tá hoặc đơn tồn, bộ lọc của bảng cha được kế thừa nguyên vẹn vào bảng chi tiết con.

---

## D. ĐỘNG CƠ PHÂN TÍCH CHI TIẾT DRILL-DOWN ([`UnifiedDrillDownModal.tsx`](file:///c:/Users/VivoBook/Desktop/GHN/ANTIGRAVITY/kiem-soat-van-hanh/src/components/common/UnifiedDrillDownModal.tsx))

Hệ thống xây dựng component drill-down hợp nhất đa năng [`UnifiedDrillDownModal`](file:///c:/Users/VivoBook/Desktop/GHN/ANTIGRAVITY/kiem-soat-van-hanh/src/components/common/UnifiedDrillDownModal.tsx):

- **Tương tác đa điểm:**
  - **Click KPI Card:** Mở danh sách chi tiết các đơn vị/đơn hàng cấu thành nên chỉ số (Volume, GTC, Tồn GLT, Tồn LC).
  - **Click Dòng Bảng / Biểu đồ:** Mở rộng dòng chi tiết (Inline Expansion) ngay bên dưới dòng đang tương tác (như danh sách bưu tá trong bảng so sánh bưu cục của `GtcPostOfficeTab`, hoặc chi tiết 3 ca trong `GtcDeliveryMatrixWidget`).
- **Thành phần chi tiết chuẩn mực:**
  - **Tiêu đề & Ngữ cảnh:** Ghi rõ bưu cục và khoảng thời gian đang kiểm tra.
  - **Huy hiệu bộ lọc kế thừa:** Hiển thị danh sách các filter đang áp dụng.
  - **Thống kê tóm tắt:** Mini KPI cards thể hiện số bản ghi, tổng sản lượng, tỷ lệ đạt được.
  - **Bảng dữ liệu tương tác:** Hỗ trợ tìm kiếm nhanh theo từ khóa, sắp xếp đa cột (tăng/giảm).
  - **Phân trang linh hoạt:** Cho phép chuyển trang và tùy chọn hiển thị (10, 15, 30, 50, 100 dòng/trang).
  - **Nút Xuất Excel/CSV:** Kết nối trực tiếp với dịch vụ xuất file lên thư mục Google Drive bảo mật của AM Huy, chống ghi đè dữ liệu.
  - **Tuyệt đối không hiển thị nhầm bưu cục:** Sử dụng mã `standardCode` đã kiểm chứng, loại bỏ 100% nguy cơ nhầm lẫn do trùng tên.

---

## E. KẾT QUẢ KIỂM THỬ TỰ ĐỘNG & PRODUCTION BUILD

Toàn bộ **32 bài kiểm thử tự động** trong dự án đã được thực thi và vượt qua 100%:

```
> kiem-soat-van-hanh@0.0.0 test
> node --test tests/*.test.mjs

✔ 1. CHUẨN HÓA SỐ LIỆU: Phân biệt rõ số 0, giá trị trống, null và dữ liệu lỗi (1.3ms)
✔ 2. CHUẨN HÓA SỐ THỰC, PHẦN TRĂM VÀ TIỀN TỆ ĐỊNH DẠNG VIỆT NAM (32.3ms)
✔ 3. CHUẨN HÓA NGÀY THÁNG VÀ MÚI GIỜ (DD/MM/YYYY) (2.2ms)
✔ 4. CHUẨN HÓA BƯU CỤC THEO MÃ XÁC NHẬN (KHÔNG DÙNG WIDE CONTAINS) (4.2ms)
✔ 5. CƠ CHẾ ĐỌC DỮ LIỆU THEO TÊN HEADER ĐỘNG (HeaderReader) (0.7ms)
✔ 6. CHUẨN HÓA MÃ ĐƠN HÀNG VÀ DANH TÍNH BƯU TÁ (0.3ms)
✔ 7. TRẠNG THÁI ĐỘC LẬP TỪNG SHEET VÀ HYBRID SYNC (0.3ms)
✔ 1. safeDivide - xử lý an toàn phép chia, chống NaN và Division by Zero (1.3ms)
✔ 2. parseStrictNumber - xử lý chuỗi số tiếng Việt và định dạng tiền tệ (0.4ms)
✔ 3. formatNumberVN & formatPercentVN - định dạng hiển thị chuẩn giao diện (33.0ms)
✔ 4. GIAO THÀNH CÔNG BƯU CỤC - Công thức chuẩn Volume, Gán, GTC, Tồn Đọng (0.8ms)
✔ 5. VẬN HÀNH CA 2 - Tỷ lệ phủ sóng Ca 2 và chênh lệch Volume vs Gán (0.5ms)
✔ 6. LIÊN KẾT GTC BƯU TÁ VỚI HOA HỒNG NGÀY - Cột Gán Lấy, Lấy TC & %LTC (0.2ms)
✔ 1. GTC BƯU CỤC - Kiểm thử công thức chuẩn %GTC = SUM(GTC)/SUM(Vol) vs Sai lầm trung bình cộng (1.3ms)
✔ 2. GTC BƯU CỤC - Kiểm thử mẫu số Volume = 0 và dữ liệu thiếu (Null/NaN) (0.3ms)
✔ 3. GTC BƯU CỤC - Kiểm thử tổng hợp đa bưu cục và đa ngày (0.2ms)
✔ 4. GTC NHÂN VIÊN - Sử dụng độc lập Tổng đơn/Tổng GTC của bưu tá, không dùng Volume bưu cục (0.3ms)
✔ 5. HOA HỒNG NGÀY - Khử trùng lặp bản ghi theo (Mã NV + Ngày) và tính năng suất TB (1.1ms)
✔ 6. TỒN ĐỌNG GLT & LC - Tách biệt dữ liệu và kiểm tra nhóm cảnh báo 120h-192h và >192h (0.3ms)
✔ 7. VẬN HÀNH CA 2 - Tỷ lệ phủ sóng bưu tá Ca 2 và chênh lệch Volume vs Gán (0.3ms)
✔ 1. QUAN HỆ GTC Bưu cục ↔ GTC Nhân viên: Khớp 100% bưu tá, không nhân bản (Zero Fan-Out) (10.6ms)
✔ 2. QUAN HỆ GTC Nhân viên ↔ Hoa hồng ngày: Tỷ lệ khớp 99.45%, xử lý an toàn bưu tá CTV thời vụ (0.5ms)
✔ 3. QUAN HỆ GTC Bưu cục ↔ Tồn đọng GLT & LC: Phân loại chính xác 5 bưu cục và ngưỡng cảnh báo 120h-192h (57.7ms)
✔ 4. QUAN HỆ ĐỘC LẬP GLT vs LC: Độ trùng lặp mã đơn hàng = 0, cấm gộp số liệu (2.0ms)
✔ 5. QUAN HỆ GTC Nhân viên ↔ Hồ sơ HR: 100% bưu tá được định danh (Đang làm việc hoặc Nghỉ việc) (0.3ms)
✔ 6. AUDIT TÍNH TOÀN VẸN: Zero Fan-Out trên toàn bộ 6 liên kết dữ liệu hệ thống (4.9ms)
✔ 7. BỘ LỌC ĐỘC LẬP & TRẠNG THÁI DRILL-DOWN: Bộ lọc phạm vi riêng, duy trì khi mở chi tiết (9.7ms)
✔ 1. BẢO MẬT PHIÊN (Session Validation & Expiration) (1.4ms)
✔ 2. PHÂN QUYỀN TRUY CẬP (Role-Based Access Control - RBAC) (0.2ms)
✔ 3. CHỐNG BRUTE FORCE & KHÓA TẠM THỜI (Lockout Policy) (4.3ms)
✔ 4. DUY NHẤT MỘT NGUỒN DỮ LIỆU CHUẨN (Single Source of Truth SPREADSHEET_ID) (1.2ms)
✔ 5. QUÉT TOÀN DIỆN KHÔNG CÒN HARDCODED SECRETS (Telegram Token, Password, Fixed OTP) (70.8ms)

ℹ tests 32 | pass 32 | fail 0 | cancelled 0 | duration: 369.4ms
```

### Kết quả Production Build:
```text
> tsc -b && vite build
✓ 2480 modules transformed.
✓ built in 1.88s
```
**0 lỗi TypeScript, 0 cảnh báo cú pháp, 0 lỗi biên dịch.**

---

> [!IMPORTANT]
> **ĐIỀU KHOẢN NGHIỆM THU (RULE #10 TRONG MASTER INSTRUCTIONS):**  
> Toàn bộ nội dung yêu cầu của **PHASE 04 — DATA RELATIONSHIPS, FILTERS & DRILL-DOWN** đã được hoàn tất 100%, bảo đảm không có nhân bản dữ liệu, liên kết chuẩn xác và trải nghiệm phân tích xuyên suốt.  
> 
> Đội ngũ chuyên gia xin **DỪNG LẠI TẠI ĐÂY** để báo cáo và kính chờ ý kiến đánh giá, phê duyệt từ **AM Huy (ĐNB)** trước khi bước sang giai đoạn tiếp theo!
