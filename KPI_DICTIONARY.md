# TỪ ĐIỂN CHỈ SỐ VẬN HÀNH & KPI (GHN KPI DICTIONARY)
**Dự án:** GHN Area Manager Dashboard (Khu vực Long An)  
**Tài liệu chuẩn hóa:** Phase 03 — KPI Engine & Business Logic Standardization  
**Phiên bản:** 3.0 — Ngày ban hành: 10/11/2026  
**Quản trị viên:** AM Huy (ĐNB) — Area Manager  

---

## NGUYÊN TẮC BẮT BUỘC TOÀN HỆ THỐNG
1. **Tuyệt đối không lấy trung bình cộng các tỷ lệ phần trăm:** Mọi tỷ lệ phần trăm (%GTC, %Gán, %Chuyển trả) khi tổng hợp nhiều ngày, nhiều ca hoặc nhiều bưu cục đều **phải tính theo công thức: `SUM(Tử số) / SUM(Mẫu số) × 100%`**.
2. **Không dùng Volume Bưu cục thay thế Tổng đơn Nhân viên:** Dữ liệu sản lượng bưu cục (hàng nhập sàn) và dữ liệu bưu tá (hàng xuất tuyến) là hai cấp độ dữ liệu độc lập.
3. **Tách biệt hoàn toàn Tồn đọng GLT và Tồn đọng LC:** Không tự động cộng gộp GLT (đơn giao nhiều ngày chưa giao thành công) và LC (đơn luân chuyển tồn sàn/kho) thành một chỉ số duy nhất nếu không có định nghĩa nghiệp vụ đồng nhất.
4. **An toàn mẫu số:** Mẫu số bằng 0 hoặc rỗng phải được xử lý qua hàm `safeDivide`, trả về `0` (hoặc `N/A`), không bao giờ sinh ra `NaN`, `Infinity` hoặc gây sập giao diện.
5. **Quy tắc loại trừ nhân sự:** Toàn bộ dữ liệu 6 nhân sự không thuộc quản lý của AM Huy (Lê Thị Hà, Đặng Ngọc Hiếu, Lương Văn Lợi, Đàm Quang Đạt, Phạm Duy Cao Nguyên, Huỳnh Tuấn Hải) bị loại trừ 100% trước khi tính toán KPI.

---

## PHẦN 1: PHÂN HỆ GTC BƯU CỤC (Sheet: `GTC Bưu cục`)

### 1.1. Volume (Sản Lượng Nhập Sàn Bưu Cục)
- **Tên KPI:** Volume Bưu Cục.
- **Mô tả nghiệp vụ:** Tổng số lượng đơn hàng nhập vào bưu cục trong ngày vận hành, bao gồm Hàng mới ca 1, Hàng mới ca 2 và Hàng tồn các ca trước chuyển qua.
- **Công thức:** `Volume = SUM(Volume_Ca1) + SUM(Volume_Ca2) + SUM(Volume_HangTon)`.
- **Đơn vị:** Đơn hàng (đơn).
- **Sheet nguồn:** `GTC Bưu cục` (Cột: `Volume`).
- **Cấp độ dữ liệu:** Bưu cục × Ngày × Loại Hàng.
- **Điều kiện lọc:** Lọc theo 5 Bưu cục chính thức `(LAN) Cần Đước 1`, `(LAN) Cần Giuộc`, `(LAN) Phước Lý`, `(LAN) Rạch Kiến`, `(LAN) Tầm Vu`.
- **Quy tắc loại trừ:** Bỏ qua các dòng không có mã/tên bưu cục hoặc bưu cục ngoài khu vực Long An.
- **Cách xử lý dữ liệu thiếu:** Nếu dòng có Volume trống hoặc null, gán mặc định = `0`.
- **Ví dụ kiểm thử:** Bưu cục Cần Giuộc ngày 15/10: Ca 1 = 100 đơn, Ca 2 = 50 đơn, Tồn = 30 đơn => Volume tổng = 180 đơn.

### 1.2. SLĐ Gán (Sản Lượng Đơn Đã Gán Ra Tuyến)
- **Tên KPI:** Số Lượng Đơn Gán Ra Tuyến.
- **Mô tả nghiệp vụ:** Số lượng đơn hàng đã được điều phối và bàn giao thực tế cho các bưu tá mang ra tuyến giao.
- **Công thức:** `SLĐ Gán = SUM(sldGan)`.
- **Đơn vị:** Đơn hàng (đơn).
- **Sheet nguồn:** `GTC Bưu cục` (Cột: `SLĐ Gán`).
- **Cấp độ dữ liệu:** Bưu cục × Ngày × Loại Hàng.
- **Điều kiện lọc:** Thuộc phạm vi lọc thời gian và bưu cục được chọn.
- **Quy tắc loại trừ:** Đơn chưa xuất kho chia chọn không được tính vào SLĐ gán.
- **Cách xử lý dữ liệu thiếu:** Null / Undefined gán = `0`.
- **Ví dụ kiểm thử:** Ca 1 gán 95, Ca 2 gán 45, Hàng tồn gán 30 => Tổng SLĐ Gán = 170 đơn.

### 1.3. SLĐ GTC (Sản Lượng Đơn Giao Thành Công)
- **Tên KPI:** Số Lượng Đơn Giao Thành Công.
- **Mô tả nghiệp vụ:** Số lượng đơn hàng bưu tá đã phát thành công đến tay người nhận (POD hợp lệ).
- **Công thức:** `SLĐ GTC = SUM(sldGTC)`.
- **Đơn vị:** Đơn hàng (đơn).
- **Sheet nguồn:** `GTC Bưu cục` (Cột: `SLĐ GTC`).
- **Cấp độ dữ liệu:** Bưu cục × Ngày × Loại Hàng.
- **Điều kiện lọc:** Theo bưu cục và ngày vận hành.
- **Quy tắc loại trừ:** Đơn hủy, đơn đang phát lại, đơn chuyển hoàn không được tính vào GTC.
- **Cách xử lý dữ liệu thiếu:** Null / Undefined gán = `0`.
- **Ví dụ kiểm thử:** Ca 1 GTC 80, Ca 2 GTC 35, Tồn GTC 20 => Tổng SLĐ GTC = 135 đơn.

### 1.4. % Gán (Tỷ Lệ Gán Ra Tuyến)
- **Tên KPI:** Tỷ Lệ Đơn Gán Ra Tuyến.
- **Mô tả nghiệp vụ:** Tỷ trọng đơn hàng đã xuất kho ra tuyến so với tổng sản lượng nhập sàn bưu cục.
- **Công thức:** `% Gán = (SUM(SLĐ Gán) / SUM(Volume)) × 100%`.
- **Đơn vị:** Phần trăm (%).
- **Sheet nguồn:** Tính toán tổng hợp từ `GTC Bưu cục`.
- **Cấp độ dữ liệu:** Tổng hợp theo Bưu cục / Toàn Khu Vực.
- **Điều kiện lọc:** Theo bộ lọc đang áp dụng.
- **Quy tắc loại trừ:** Mẫu số `SUM(Volume) = 0` trả về `0%`.
- **Cách xử lý dữ liệu thiếu:** Sử dụng `safeDivide(SUM(sldGan), SUM(volume), 0, true)`.
- **Ví dụ kiểm thử:** Tổng gán = 170 đơn, Tổng Volume = 180 đơn => `% Gán = (170 / 180) × 100% = 94.44%`.

### 1.5. % GTC Bưu Cục (Tỷ Lệ Giao Thành Công Bưu Cục)
- **Tên KPI:** Tỷ Lệ Giao Thành Công Chuẩn Bưu Cục.
- **Mô tả nghiệp vụ:** Thước đo hiệu quả giao hàng cốt lõi của bưu cục, so sánh số đơn giao thành công với tổng dung lượng hàng nhập sàn.
- **Công thức:** `% GTC = (SUM(SLĐ GTC) / SUM(Volume)) × 100%`.
- **Đơn vị:** Phần trăm (%).
- **Sheet nguồn:** Tính toán tổng hợp từ `GTC Bưu cục`.
- **Cấp độ dữ liệu:** Bưu cục × Ngày hoặc Tổng hợp Khu Vực.
- **Điều kiện lọc:** Theo bộ lọc.
- **Quy tắc loại trừ:** **Nghiêm cấm lấy trung bình cộng các tỷ lệ % của từng dòng!** Nếu Volume = 0, trả về `0%`.
- **Cách xử lý dữ liệu thiếu:** `safeDivide(SUM(sldGTC), SUM(volume), 0, true)`.
- **Ví dụ kiểm thử:** Tổng SLĐ GTC = 135 đơn, Tổng Volume = 180 đơn => `% GTC = (135 / 180) × 100% = 75.00%`. Ngưỡng chuẩn khu vực: `< 62%` Cảnh báo đỏ, `62% - 67%` Đạt ngưỡng vàng, `≥ 67%` Chuẩn xanh xuất sắc.

### 1.6. Tồn Đọng Bưu Cục (Chưa Giao Thành Công)
- **Tên KPI:** Tồn Đọng Bưu Cục.
- **Mô tả nghiệp vụ:** Số lượng đơn hàng chưa giao thành công trong ngày, bao gồm đơn chưa gán, đơn đang giao dở dang hoặc đơn giao không thành công phải lưu sàn.
- **Công thức:** `Tồn Đọng = Volume - SLĐ GTC`.
- **Đơn vị:** Đơn hàng (đơn).
- **Sheet nguồn:** `GTC Bưu cục`.
- **Cấp độ dữ liệu:** Bưu cục × Ngày.
- **Cách xử lý dữ liệu thiếu:** `Math.max(0, volume - sldGTC)`.
- **Ví dụ kiểm thử:** Volume = 180 đơn, SLĐ GTC = 135 đơn => Tồn đọng = `180 - 135 = 45 đơn`.

### 1.7. Leadtime (Thời Gian Giao Hàng Trung Bình)
- **Tên KPI:** Leadtime Giao Hàng.
- **Mô tả nghiệp vụ:** Thời gian xử lý trung bình từ lúc đơn nhập kho bưu cục đến khi giao thành công.
- **Công thức:** `Leadtime TB = SUM(leadtime × Volume) / SUM(Volume)`.
- **Đơn vị:** Giờ (h).
- **Sheet nguồn:** `GTC Bưu cục` (Cột: `Leadtime`).
- **Cách xử lý dữ liệu thiếu:** Dòng thiếu leadtime gán trọng số 0.

---

## PHẦN 2: PHÂN HỆ GTC NHÂN VIÊN (Sheet: `GTC Nhân viên`)

### 2.1. Tổng Đơn (Sản Lượng Bưu Tá Phụ Trách)
- **Tên KPI:** Tổng Đơn Bưu Tá.
- **Mô tả nghiệp vụ:** Tổng số đơn hàng được giao cho từng bưu tá mang đi phát trong ngày.
- **Công thức:** `Tổng Đơn = SUM(tongDon)`.
- **Đơn vị:** Đơn hàng (đơn).
- **Sheet nguồn:** `GTC Nhân viên` (Cột: `Tổng đơn`).
- **Cấp độ dữ liệu:** Bưu tá (Mã NV) × Ngày.
- **Quy tắc loại trừ:** Loại bỏ 6 nhân sự không thuộc quản lý. **Không được dùng trường Volume của GTC Bưu cục thay thế.**
- **Ví dụ kiểm thử:** Bưu tá Nguyễn Văn A ngày 15/10 nhận 85 đơn => Tổng đơn = 85 đơn.

### 2.2. Tổng Đơn GTC Nhân Viên
- **Tên KPI:** Tổng Đơn Giao Thành Công Của Bưu Tá.
- **Mô tả nghiệp vụ:** Số đơn bưu tá đã giao thành công và thu tiền/chụp ảnh POD hợp lệ.
- **Công thức:** `Tổng Đơn GTC = SUM(tongDonGTC)`.
- **Đơn vị:** Đơn hàng (đơn).
- **Sheet nguồn:** `GTC Nhân viên` (Cột: `Tổng đơn GTC`).
- **Ví dụ kiểm thử:** Bưu tá A giao thành công 75 đơn => Tổng đơn GTC = 75 đơn.

### 2.3. % GTC Nhân Viên
- **Tên KPI:** Tỷ Lệ Giao Thành Công Của Bưu Tá.
- **Mô tả nghiệp vụ:** Đánh giá hiệu suất giao hàng của cá nhân bưu tá.
- **Công thức:** `% GTC Nhân Viên = (SUM(Tổng Đơn GTC) / SUM(Tổng Đơn)) × 100%`.
- **Đơn vị:** Phần trăm (%).
- **Ví dụ kiểm thử:** GTC = 75 đơn, Tổng đơn = 85 đơn => `% GTC = (75 / 85) × 100% = 88.24%`.

### 2.4. Chuyến Đi (Số Ca/Chuyến Giao Trong Ngày)
- **Tên KPI:** Số Chuyến Đi.
- **Mô tả nghiệp vụ:** Ghi nhận số chuyến xuất tuyến của bưu tá: `1` = Chỉ đi ca 1 (sáng), `2` = Đi ca 2 (chiều/tối - 2 chuyến).
- **Công thức:** `Chuyến Đi = r.chuyenDi`.
- **Đơn vị:** Chuyến.
- **Sheet nguồn:** `GTC Nhân viên` (Cột: `Chuyến đi`).

---

## PHẦN 3: PHÂN HỆ VẬN HÀNH CA 2 (HÀNG MỚI CA 2)

### 3.1. Volume Hàng Mới Ca 2
- **Tên KPI:** Volume Hàng Mới Ca 2.
- **Mô tả nghiệp vụ:** Sản lượng hàng mới nhập bưu cục phục vụ ca chiều/tối (từ xe tải trung chuyển trưa/chiều).
- **Công thức:** `Volume Ca 2 = SUM(Volume) với loaiHang ILIKE '%ca 2%'`.
- **Đơn vị:** Đơn hàng (đơn).
- **Sheet nguồn:** `GTC Bưu cục` (lọc `Loại hàng = Hàng Mới Ca 2`).

### 3.2. SLĐ Gán Ra Tuyến Ca 2
- **Tên KPI:** Sản Lượng Gán Ca 2.
- **Mô tả nghiệp vụ:** Số đơn hàng mới ca 2 đã được gán thực tế cho bưu tá xuất tuyến ca chiều/tối.
- **Công thức:** `SLĐ Gán Ca 2 = SUM(sldGan) với loaiHang ILIKE '%ca 2%'`.
- **Đơn vị:** Đơn hàng (đơn).

### 3.3. Chênh Lệch Gán vs Volume Ca 2 (Dồn Ứ Sàn Chia)
- **Tên KPI:** Độ Chênh Lệch Gán vs Volume Ca 2.
- **Mô tả nghiệp vụ:** Đo lường lượng đơn hàng mới ca 2 chưa được gán ra tuyến, còn tồn ứ lại tại sàn chia chọn trong ca chiều.
- **Công thức:** `Chênh Lệch Ca 2 = Volume Ca 2 - SLĐ Gán Ca 2`.
- **Đơn vị:** Đơn hàng (đơn).
- **Ví dụ kiểm thử:** Volume Ca 2 = 500 đơn, Gán Ca 2 = 420 đơn => Chênh lệch = 80 đơn đọng tại bưu cục.

### 3.4. Tỷ Lệ Phủ Sóng Ca 2 (Độ Phủ Bưu Tá Đi Tuyến)
- **Tên KPI:** Tỷ Lệ Phủ Sóng Ca 2.
- **Mô tả nghiệp vụ:** Tỷ trọng số lượng bưu tá tham gia xuất tuyến ca 2 (chuyến đi = 2) trên tổng số bưu tá có phát sinh đi tuyến trong ngày.
- **Công thức:** `Tỷ Lệ Phủ Sóng Ca 2 = (COUNT(Bưu tá đi chuyến 2) / COUNT(Tổng bưu tá đi tuyến)) × 100%`.
- **Đơn vị:** Phần trăm (%).
- **Sheet nguồn:** `GTC Nhân viên`.
- **Ví dụ kiểm thử:** Có 3 bưu tá đi 2 chuyến, 2 bưu tá chỉ đi 1 ca => Tổng = 5 bưu tá => `Tỷ lệ phủ sóng = (3 / 5) × 100% = 60.0%`.

---

## PHẦN 4: PHÂN HỆ HOA HỒNG NGÀY & LƯƠNG BƯU TÁ (Sheet: `Hoa hồng ngày`)

### 4.1. Đơn Giao / Đơn Lấy Tính Lương
- **Tên KPI:** Đơn Giao Tính Lương, Đơn Lấy Tính Lương.
- **Mô tả nghiệp vụ:** Số lượng đơn hàng giao thành công hoặc lấy hàng thành công được ghi nhận vào bảng tính thu nhập của bưu tá.
- **Công thức:** `donGiaoTinhLuong`, `donLayTinhLuong`.
- **Sheet nguồn:** `Hoa hồng ngày`.
- **Quy tắc khử trùng lặp:** Kiểm tra deduplication theo khóa `Mã NV + Ngày vận hành`.

### 4.2. Số Ngày Đi Làm (Số Ngày Công)
- **Tên KPI:** Số Ngày Công Thực Tế.
- **Mô tả nghiệp vụ:** Số ngày làm việc có ghi nhận công đi tuyến hoặc xử lý hàng của bưu tá trong kỳ xét lương.
- **Công thức:** `Số Ngày Công = SUM(soNgayDiLam)` (khử trùng theo ngày/nhân viên).
- **Đơn vị:** Ngày công.

### 4.3. Sản Lượng Trung Bình / Ngày
- **Tên KPI:** Năng Suất Giao Lấy Trung Bình Ngày.
- **Mô tả nghiệp vụ:** Năng suất giải phóng đơn trung bình của bưu tá trên mỗi ngày công đi làm.
- **Công thức:** `Sản Lượng TB/Ngày = (SUM(Đơn Giao TL) + SUM(Đơn Lấy TL)) / SUM(Số Ngày Công)`.
- **Đơn vị:** Đơn/ngày công.
- **Xử lý mẫu số 0:** Nếu ngày công = 0, trả về `0`.

### 4.4. Lương Hoa Hồng Ngày, Lương Đảm Bảo & Tổng Lương
- **Tên KPI:** Thu Nhập Bưu Tá.
- **Mô tả nghiệp vụ:**
  - `Lương Hoa Hồng Ngày`: Thu nhập tính theo đơn giá trên từng đơn giao/lấy thành công.
  - `Lương Đảm Bảo`: Mức bù lương hỗ trợ theo chính sách công ty đối với bưu tá mới/khu vực khó khăn.
  - `Tổng Lương`: `Tổng Lương = Lương Hoa Hồng Ngày + Lương Đảm Bảo + Thưởng/Phụ Cấp khác`.
- **Đơn vị:** VNĐ.

---

## PHẦN 5: PHÂN HỆ TỒN ĐỌNG GLT & TỒN ĐỌNG LC (Hai Sheet Độc Lập)

### 5.1. Tồn Đọng Giao Lần Tiếp (GLT) (Sheet: `Tồn đọng GLT`)
- **Tên KPI:** Tồn Đọng GLT.
- **Mô tả nghiệp vụ:** Đơn hàng giao không thành công ở lần phát trước, đang lưu kho bưu cục chờ bưu tá đi phát tiếp.
- **Phân nhóm thời gian cảnh báo bắt buộc:**
  - `Nhóm 120h - 192h` (`urgentOrders120_192`): Đơn tồn từ 5 đến 8 ngày, cấp thiết phải xử lý gấp.
  - `Nhóm > 192h` (`urgentOrders192`): Đơn tồn trên 8 ngày, mức độ nghiêm trọng cao nhất, có nguy cơ bồi thường/khiếu nại.
  - `Nhóm < 120h`: Đơn tồn trong hạn kiểm soát thông thường.
- **Công thức:** Tổng số dòng đơn thuộc sheet `Tồn đọng GLT` thỏa mãn bộ lọc.

### 5.2. Tồn Đọng Luân Chuyển (LC) (Sheet: `Tồn đọng LC`)
- **Tên KPI:** Tồn Đọng Luân Chuyển (LC).
- **Mô tả nghiệp vụ:** Đơn hàng lưu tại kho/sàn chưa được đóng kiện hoặc xuất xe luân chuyển đi tiếp (LC Giao hoặc LC Trả).
- **Phân loại bắt buộc:**
  - `LC Giao`: Đơn chuyển tiếp đến bưu cục đích để giao người nhận.
  - `LC Trả`: Đơn chuyển hoàn về kho shop/người gửi.
  - `Cảnh báo nhóm 36h - 48h`: Đơn luân chuyển có nguy cơ rớt cam kết thời hiệu chuyển tiếp.
- **Nguyên tắc tách biệt:** **Không cộng gộp số lượng đơn GLT và số lượng đơn LC thành một con số tổng duy nhất**, vì GLT phản ánh năng lực giao hàng của bưu tá ngoài tuyến, còn LC phản ánh năng lực trung chuyển/đóng gói của nhân viên xử lý kho sàn (NVXL).
