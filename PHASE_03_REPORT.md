# BÁO CÁO NGHIỆM THU PHASE 03 — KPI ENGINE & BUSINESS LOGIC STANDARDIZATION

**Kính gửi:** **AM Huy (ĐNB) — Area Manager • Long An**  
**Dự án:** GHN Area Manager Dashboard  
**Phân hệ thực hiện:** Phase 03 — Chuẩn Hóa Công Thức KPI & Động Cơ Nghiệp Vụ Vận Hành  
**Ngày thực hiện:** 10/11/2026  
**Trạng thái kiểm tra:** Hoàn thành **100% các tiêu chí** & Vượt qua **18/18 bài kiểm thử tự động**  
**Tài liệu Từ điển KPI:** [KPI_DICTIONARY.md](file:///c:/Users/VivoBook/Desktop/GHN/ANTIGRAVITY/kiem-soat-van-hanh/KPI_DICTIONARY.md) (Bản sao lưu tại gốc: [KPI_DICTIONARY.md](file:///c:/Users/VivoBook/Desktop/GHN/ANTIGRAVITY/KPI_DICTIONARY.md))

---

## MỤC LỤC
1. [A. Từ Điển KPI (KPI Dictionary)](#a-từ-điển-kpi-kpi-dictionary)
2. [B. Chuẩn Hóa GTC Bưu Cục](#b-chuẩn-hóa-gtc-bưu-cục)
3. [C. Chuẩn Hóa GTC Nhân Viên](#c-chuẩn-hóa-gtc-nhân-viên)
4. [D. Chuẩn Hóa Hoa Hồng Ngày & Khử Trùng Lặp](#d-chuẩn-hóa-hoa-hồng-ngày--khử-trùng-lặp)
5. [E. Chuẩn Hóa & Phân Lập Tồn Đọng GLT vs LC](#e-chuẩn-hóa--phân-lập-tồn-đọng-glt-vs-lc)
6. [F. Kết Quả Kiểm Thử Thực Tế & Đối Soát Thủ Công](#f-kết-quả-kiểm-thử-thực-tế--đối-soát-thủ-công)

---

## A. TỪ ĐIỂN KPI (KPI DICTIONARY)

Đội ngũ đã biên soạn tài liệu toàn diện [KPI_DICTIONARY.md](file:///c:/Users/VivoBook/Desktop/GHN/ANTIGRAVITY/kiem-soat-van-hanh/KPI_DICTIONARY.md) bao gồm đầy đủ 10 thuộc tính nghiệp vụ chuẩn mực cho từng chỉ số vận hành:
- **Tên KPI**
- **Mô tả nghiệp vụ**
- **Công thức tính toán**
- **Đơn vị đo lường**
- **Sheet nguồn dữ liệu**
- **Cấp độ dữ liệu (Granularity level)**
- **Điều kiện lọc**
- **Quy tắc loại trừ**
- **Cách xử lý dữ liệu thiếu / Mẫu số bằng 0**
- **Ví dụ kiểm thử**

> **Nguyên tắc cốt lõi:** Bất kỳ chỉ số nào chưa xác định được công thức nghiệp vụ chuẩn hoặc nguồn dữ liệu chính thức sẽ **không được hiển thị** trên giao diện dashboard.

---

## B. CHUẨN HÓA GTC BƯU CỤC (SHEET: `GTC BƯU CỤC`)

### 1. Công thức Tỷ lệ %GTC Tổng
Tuân thủ tuyệt đối chỉ đạo nghiệp vụ của AM Huy:
$$\%GTC = \frac{\sum \text{SLĐ GTC}}{\sum \text{Volume}} \times 100\%$$

- **Nghiêm cấm lấy trung bình cộng các tỷ lệ % của từng dòng:**  
  *Minh chứng qua kiểm thử thực tế:*
  - Dòng 1: Volume = 1.000 đơn, GTC = 900 đơn (%GTC = 90.0%).
  - Dòng 2: Volume = 100 đơn, GTC = 50 đơn (%GTC = 50.0%).
  - Nếu lấy trung bình cộng sai lầm: `(90% + 50%) / 2 = 70.0%` (Gây sai lệch nghiêm trọng tới **16.36%**!).
  - Khi tính chuẩn theo AM Huy: $\frac{900 + 50}{1000 + 100} = \frac{950}{1100} = \mathbf{86.36\%}$ (Phản ánh đúng 100% năng lực giải phóng đơn của bưu cục).
- **Kiểm soát cấp độ dữ liệu (Deduplication Guard):** Dữ liệu nguồn sheet `GTC Bưu cục` có cấp độ `Bưu cục × Ngày × Loại Hàng` (Ca 1, Ca 2, Hàng tồn). Trước khi SUM, hệ thống nhóm theo đúng khóa cấp độ để không cộng trùng lặp.
- **Công thức Tồn đọng Bưu cục:**
  $$\text{Tồn Đọng Bưu Cục} = \text{Volume} - \text{SLĐ GTC}$$
- **Xử lý an toàn khi mẫu số bằng 0:** Nếu `Volume = 0`, hàm `safeDivide` trả về `0%` (hoặc `N/A`), không bao giờ sinh ra `NaN` hay `Infinity`.

---

## C. CHUẨN HÓA GTC NHÂN VIÊN (SHEET: `GTC NHÂN VIÊN`)

- **Độc lập dữ liệu:** Tuyệt đối **không sử dụng trường Volume của sheet GTC Bưu cục để thay thế Tổng đơn của nhân viên**.
  - Volume Bưu cục phản ánh tổng sản lượng hàng nhập sàn chia chọn (bao gồm đơn chưa gán và đơn tồn lưu kho sàn).
  - Tổng đơn Nhân viên phản ánh lượng đơn thực tế đã được giao cho bưu tá mang đi phát ngoài tuyến.
- **Công thức %GTC Nhân Viên:**
  $$\%GTC_{\text{Bưu tá}} = \frac{\sum \text{Tổng Đơn GTC}}{\sum \text{Tổng Đơn}} \times 100\%$$
- **Chuyến Đi & Vận Hành Ca 2:**
  - `Chuyến đi = 1`: Bưu tá chỉ đi ca 1 (ca sáng).
  - `Chuyến đi = 2`: Bưu tá tham gia xuất tuyến 2 chuyến (đã kích hoạt ca 2 chiều/tối).
  - $\text{Tỷ Lệ Phủ Sóng Ca 2} = \frac{\text{Số bưu tá đi ca 2 (2 chuyến)}}{\text{Tổng bưu tá phát sinh đi tuyến}} \times 100\%$.

---

## D. CHUẨN HÓA HOA HỒNG NGÀY & KHỬ TRÙNG LẶP (SHEET: `HOA HỒNG NGÀY`)

### 1. Cơ chế khử trùng lặp (Deduplication by Employee & Date)
- Kiểm soát nguy cơ dữ liệu nguồn bị lặp dòng cùng 1 nhân viên trong 1 ngày bằng cơ chế Map Composite Key: `Mã NV + Ngày vận hành`.
- Đảm bảo mỗi nhân viên trong một ngày vận hành chỉ được tính đúng 1 ngày công và 1 lượt sản lượng thực tế.

### 2. Các công thức chuẩn hóa
- **Số Ngày Đi Làm (Số ngày công):** Tổng số ngày có phát sinh công đi tuyến hoặc xử lý hàng của bưu tá.
- **Sản lượng Trung Bình / Ngày:**
  $$\text{Sản Lượng TB/Ngày} = \frac{\sum \text{Đơn Giao Tính Lương} + \sum \text{Đơn Lấy Tính Lương}}{\sum \text{Số Ngày Công}}$$
- **Lương Hoa Hồng Ngày, Lương Đảm Bảo & Tổng Lương:**
  - $\text{Tổng Lương} = \text{Lương Hoa Hồng Ngày} + \text{Lương Đảm Bảo} + \text{Phụ Cấp/Thưởng}$.
  - Nếu số ngày công = 0, chỉ số lương/ngày tự động trả về `0 đ`, không lỗi phép chia.

---

## E. CHUẨN HÓA & PHÂN LẬP TỒN ĐỌNG GLT VS LC (HAI SHEET ĐỘC LẬP)

Tuân thủ nghiêm ngặt nguyên tắc **Tách biệt hoàn toàn, không cộng gộp**:
1. **Tồn đọng Giao Lần Tiếp (GLT) - Sheet `Tồn đọng GLT`:**
   - Phản ánh đơn hàng bưu tá đã đi giao nhưng chưa phát thành công, đang lưu kho bưu cục chờ phát tiếp.
   - **Tập trung giám sát 2 mốc thời gian đặc biệt quan trọng:**
     - **Nhóm 120h – 192h (`urgentOrders120_192`):** Tồn từ 5 đến 8 ngày, cấp thiết chỉ đạo bưu tá giao dứt điểm.
     - **Nhóm > 192h (`urgentOrders192`):** Tồn trên 8 ngày, cấp độ nghiêm trọng cao nhất, bắt buộc đối soát log thao tác.
2. **Tồn đọng Luân Chuyển (LC) - Sheet `Tồn đọng LC`:**
   - Phản ánh hàng hóa tồn tại sàn/kho chia chọn do chưa đóng kiện hoặc chưa xuất xe luân chuyển đi tiếp.
   - Phân loại rõ ràng: **LC Giao** (chuyển tiếp tới bưu cục phát) và **LC Trả** (chuyển hoàn trả shop).
   - Giám sát đặc biệt nhóm tồn **36h – 48h** để ngăn ngừa rớt SLA toàn trình.
3. **Quy định:** Không tự ý cộng gộp `Tổng đơn GLT + Tổng đơn LC` thành một chỉ số tồn duy nhất, vì hai chỉ số do 2 nhóm nhân sự khác nhau chịu trách nhiệm (Bưu tá phát tuyến vs Nhân viên xử lý kho sàn NVXL).

---

## F. KẾT QUẢ KIỂM THỬ THỰC TẾ & ĐỐI SOÁT THỦ CÔNG

Đội ngũ đã thiết kế và chạy thành công **18/18 bài kiểm thử tự động** bao phủ toàn diện các trường hợp kiểm thử (dữ liệu bình thường, dữ liệu trùng lặp, dữ liệu thiếu, mẫu số bằng 0, đa bộ lọc, tổng hợp đa ngày và đa bưu cục):

```text
> kiem-soat-van-hanh@0.0.0 test
> node --test tests/*.test.mjs

✔ 1. safeDivide - xử lý an toàn phép chia, chống NaN và Division by Zero (1.16ms)
✔ 2. parseStrictNumber - xử lý chuỗi số tiếng Việt và định dạng tiền tệ (0.25ms)
✔ 3. formatNumberVN & formatPercentVN - định dạng hiển thị chuẩn giao diện (21.66ms)
✔ 4. GIAO THÀNH CÔNG BƯU CỤC - Công thức chuẩn Volume, Gán, GTC, Tồn Đọng (0.43ms)
✔ 5. VẬN HÀNH CA 2 - Tỷ lệ phủ sóng Ca 2 và chênh lệch Volume vs Gán (0.27ms)
✔ 6. LIÊN KẾT GTC BƯU TÁ VỚI HOA HỒNG NGÀY - Cột Gán Lấy, Lấy TC & %LTC (0.14ms)
✔ 1. GTC BƯU CỤC - Kiểm thử công thức chuẩn %GTC = SUM(GTC)/SUM(Vol) vs Sai lầm trung bình cộng (1.13ms)
✔ 2. GTC BƯU CỤC - Kiểm thử mẫu số Volume = 0 và dữ liệu thiếu (Null/NaN) (0.31ms)
✔ 3. GTC BƯU CỤC - Kiểm thử tổng hợp đa bưu cục và đa ngày (0.20ms)
✔ 4. GTC NHÂN VIÊN - Sử dụng độc lập Tổng đơn/Tổng GTC của bưu tá, không dùng Volume bưu cục (0.30ms)
✔ 5. HOA HỒNG NGÀY - Khử trùng lặp bản ghi theo (Mã NV + Ngày) và tính năng suất TB (1.49ms)
✔ 6. TỒN ĐỌNG GLT & LC - Tách biệt dữ liệu và kiểm tra nhóm cảnh báo 120h-192h và >192h (0.38ms)
✔ 7. VẬN HÀNH CA 2 - Tỷ lệ phủ sóng bưu tá Ca 2 và chênh lệch Volume vs Gán (0.40ms)
✔ 1. BẢO MẬT PHIÊN (Session Validation & Expiration) (1.30ms)
✔ 2. PHÂN QUYỀN TRUY CẬP (Role-Based Access Control - RBAC) (0.24ms)
✔ 3. CHỐNG BRUTE FORCE & KHÓA TẠM THỜI (Lockout Policy) (0.91ms)
✔ 4. DUY NHẤT MỘT NGUỒN DỮ LIỆU CHUẨN (Single Source of Truth SPREADSHEET_ID) (0.73ms)
✔ 5. QUÉT TOÀN DIỆN KHÔNG CÒN HARDCODED SECRETS (Telegram Token, Password, Fixed OTP) (47.84ms)

ℹ tests 18 | pass 18 | fail 0 | cancelled 0 | duration: 173ms
```

### Kết quả Production Build:
```text
> tsc -b && vite build
✓ 2479 modules transformed.
✓ built in 1.44s
```
**0 lỗi TypeScript, 0 lỗi biên dịch Vite.**

---

> [!IMPORTANT]
> **Tuân thủ Nguyên tắc số 10 trong Master Instructions:** Đội ngũ chuyên gia đã hoàn thành trọn vẹn **PHASE 03 — KPI ENGINE & BUSINESS LOGIC STANDARDIZATION**, lưu các tài liệu [KPI_DICTIONARY.md](file:///c:/Users/VivoBook/Desktop/GHN/ANTIGRAVITY/kiem-soat-van-hanh/KPI_DICTIONARY.md) và [PHASE_03_REPORT.md](file:///c:/Users/VivoBook/Desktop/GHN/ANTIGRAVITY/kiem-soat-van-hanh/PHASE_03_REPORT.md). Đội ngũ xin dừng lại tại đây và kính chờ ý kiến đánh giá, phê duyệt của **AM Huy (ĐNB)** trước khi bước sang giai đoạn tiếp theo!
