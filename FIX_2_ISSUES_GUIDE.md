# GHN Dashboard – Fix 2 lỗi Drill-down và Google Drive export

## Đã sửa trong mã nguồn

1. `src/components/common/UnifiedDrillDownModal.tsx`
   - Di chuyển `if (!isOpen) return null` xuống sau toàn bộ React hooks.
   - Nguyên nhân gốc: component return trước 3 `useMemo`, khiến thứ tự hooks thay đổi giữa trạng thái đóng/mở. React có thể báo `Rendered more hooks than during the previous render` và làm vùng ứng dụng lỗi trắng/đen.

2. `google-apps-script/Code.gs`
   - Không còn tạo file CSV blob.
   - Đọc CSV payload bằng `Utilities.parseCsv`, tạo file bảng tính native bằng `SpreadsheetApp.create`, ghi dữ liệu vào sheet, cố định hàng tiêu đề, bật filter, rồi di chuyển spreadsheet vào thư mục đích.
   - Trả về URL Google Sheets trực tiếp.
   - Không tự bật quyền `ANYONE_WITH_LINK`; quyền kế thừa từ thư mục Drive.
   - Bỏ qua folderId do trình duyệt gửi lên và luôn dùng folder ID cấu hình ở Apps Script.

3. `src/services/excelExportService.ts` và `GoogleDriveExportToast.tsx`
   - Đổi tên export sang tên bảng tính không có đuôi `.csv`.
   - Chỉ hiển thị thành công khi nhận được JSON `success: true` và `fileUrl`.
   - Bỏ retry `no-cors` mù vì request đầu có thể đã tạo file; retry có thể tạo bản sao. Nếu trình duyệt không đọc được phản hồi do CORS, toast sẽ nói chưa xác nhận, người dùng cần kiểm tra thư mục trước khi xuất lại.

## Việc cần làm ở Google Apps Script

1. Mở dự án Apps Script đang gắn với webhook xuất Drive.
2. Thay toàn bộ nội dung `Code.gs` bằng phiên bản trong thư mục `google-apps-script` của gói mã nguồn đã sửa.
3. Save.
4. Chọn Deploy → Manage deployments → Edit (biểu tượng bút chì).
5. Chọn New version rồi Deploy.
6. Giữ đúng quyền chạy bằng tài khoản có quyền tạo file trong thư mục đích. Không bật chia sẻ công khai file xuất.
7. Mở URL `/exec` để kiểm tra trạng thái `ACTIVE`.

## Kiểm thử bắt buộc

- Mở Dashboard, click một KPI/bảng có drill-down: modal phải mở, tìm kiếm/sắp xếp/phân trang/đóng không làm đen màn hình.
- Xuất một bảng nhỏ trước: kiểm tra thư mục Drive có file Google Sheets (biểu tượng bảng tính xanh), mở được, số dòng/cột khớp dữ liệu.
- Kiểm tra toast: chỉ hiện đã tạo khi nhận được phản hồi thành công có URL file.
- Nếu toast báo chưa xác nhận, kiểm tra Drive trước khi bấm xuất lại để tránh tạo file trùng.

## Giới hạn kiểm thử của gói này

- Không thể xác nhận Apps Script đã triển khai thành công hoặc quyền Drive của tài khoản thực tế nếu chưa thao tác trong tài khoản Google của chủ dự án.
- Cần chạy `npm ci` và `npm run build` trong môi trường có thể cài đủ dependency trước khi deploy.
- Không dùng dữ liệu nhạy cảm thật để thử trước khi xử lý các snapshot frontend còn tồn tại trong `src/data/snapshots`.
