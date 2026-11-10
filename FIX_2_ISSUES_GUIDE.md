# GHN Dashboard – Fast Google Sheets Export

## Tối ưu đã thực hiện

1. `src/services/excelExportService.ts`
   - Thay bước tạo CSV (map/escape/join toàn bộ 1.000–5.000 dòng) bằng payload JSON gồm `headers` và `rows` có giữ kiểu số/chuỗi.
   - Giữ nguyên tên file duy nhất, tab trạng thái, sự kiện `ghn-export-completed`, cơ chế xác nhận thành công và việc chặn tải file về máy.
   - Không tự retry khi lỗi mạng để tránh tạo file trùng.

2. `google-apps-script/Code.gs`
   - Nhận JSON `headers`/`rows` và ghi trực tiếp, không cần `Utilities.parseCsv` cho phiên bản Dashboard mới.
   - Vẫn hỗ trợ payload CSV cũ để tương thích bản Dashboard chưa cập nhật.
   - Tạo spreadsheet với kích thước cần thiết và ghi toàn bộ ma trận bằng một lệnh `setValues()`.
   - Bỏ `autoResizeColumns`, `setWrap`, `createFilter` và `flush` vì các thao tác này không cần thiết cho chế độ ưu tiên tốc độ.
   - Ghi log thời gian xử lý để có thể đo hiệu năng trong Apps Script Executions.

## Cập nhật triển khai

1. Cập nhật source Dashboard bằng ZIP này trong Antigravity; giữ nguyên repository GitHub hiện tại.
2. Trong Apps Script, thay toàn bộ `Code.gs` bằng file `google-apps-script/Code.gs` trong ZIP.
3. Save → Deploy → Manage deployments → Edit → New version → Deploy.
4. Giữ đúng tài khoản thực thi có quyền tạo file trong thư mục Drive. Không mở rộng quyền truy cập công khai nếu chưa có biện pháp bảo vệ endpoint.
5. Đảm bảo Dashboard đang dùng đúng URL `/exec` của deployment vừa cập nhật. Nếu URL đổi, cập nhật cấu hình webhook trong Dashboard.

## Kiểm thử bắt buộc

- Xuất một bảng nhỏ 5 dòng; kiểm tra file Google Sheets được tạo đúng thư mục và đủ dữ liệu.
- Xuất một bảng thực tế 1.000–5.000 dòng; đối chiếu số dòng, số cột và một số giá trị đầu/cuối.
- Kiểm tra Apps Script Executions và log `ghn_export_timing`.
- So sánh thời gian trước/sau trên cùng một bảng và cùng điều kiện mạng.
- Không xuất lặp lại ngay sau timeout/chưa xác nhận; kiểm tra Drive trước để tránh file trùng.

## Giới hạn kiểm chứng

- Tối ưu này giảm xử lý CSV ở trình duyệt, bỏ parse CSV ở Apps Script và giảm nhiều lệnh định dạng. Thời gian thực tế còn phụ thuộc mạng, tải Google và độ rộng bảng.
- Chưa thể xác nhận live performance hoặc quyền triển khai trong tài khoản Google của người dùng từ môi trường đóng gói.
- Cần chạy `npm ci` và `npm run build` trong môi trường có dependency trước khi deploy production.
