-- ============================================================================
-- SQL CONCURRENCY & TRANSACTION ISOLATION TEST SCRIPT
-- Phân hệ: Telegram Bot OTP - GHN Control Center
-- Mục đích: Kiểm thử giao dịch độc lập khi có môi trường PostgreSQL Staging/Preview
-- Ghi chú: Chạy trên 2 Session psql song song (Session 1 và Session 2)
-- ============================================================================

-- ============================================================================
-- KỊCH BẢN 1: CONCURRENT ACQUIRE LEASE (Hai request gửi OTP cùng 1 thời điểm)
-- Kỳ vọng: Session 1 thành công (true); Session 2 bị chặn bởi advisory lock,
--          khi Session 1 commit, Session 2 thức dậy và nhận false (đang xử lý).
-- ============================================================================

-- SESSION 1 (Bắt đầu trước 1ms):
BEGIN;
SELECT * FROM public.acquire_otp_dispatch_lease(
    'test_phone_hash_concurrent_01',
    'req_uuid_session_1',
    'owner_token_session_1',
    12,
    'otp_hash_session_1',
    'salt_session_1'
);
-- Kết quả Session 1: success = true

-- SESSION 2 (Bắt đầu song song khi Session 1 chưa COMMIT):
BEGIN;
SELECT * FROM public.acquire_otp_dispatch_lease(
    'test_phone_hash_concurrent_01',
    'req_uuid_session_2',
    'owner_token_session_2',
    12,
    'otp_hash_session_2',
    'salt_session_2'
);
-- Session 2 bị BLOCK tại pg_advisory_xact_lock...

-- SESSION 1: Hoàn tất phát lệnh
COMMIT;

-- SESSION 2: Tỉnh dậy sau khi Session 1 COMMIT:
-- Kết quả Session 2: success = false, error_message = 'Yêu cầu gửi OTP khác đang được xử lý. Vui lòng chờ vài giây.'
ROLLBACK;


-- ============================================================================
-- KỊCH BẢN 2: CONCURRENT VERIFY (Hai request verify cùng 1 mã OTP)
-- Kỳ vọng: Đúng 1 request nhận success = true (CONSUMED).
--          Request còn lại nhận false do vi phạm Single-Use.
-- ============================================================================

-- Seed mã OTP ACTIVE:
SELECT * FROM public.acquire_otp_dispatch_lease('test_phone_hash_verify_02', 'req_v2', 'token_v2', 12, encode(extensions.hmac('salt_v2:test_phone_hash_verify_02:123456'::bytea, 'super_secret_hmac_key_at_least_32_bytes_long'::bytea, 'sha256'), 'hex'), 'salt_v2');
SELECT * FROM public.activate_pending_otp('test_phone_hash_verify_02', 'req_v2', 'token_v2', 300);

-- SESSION 1:
BEGIN;
SELECT * FROM public.consume_otp_if_valid('test_phone_hash_verify_02', '123456', 'super_secret_hmac_key_at_least_32_bytes_long');

-- SESSION 2:
BEGIN;
SELECT * FROM public.consume_otp_if_valid('test_phone_hash_verify_02', '123456', 'super_secret_hmac_key_at_least_32_bytes_long');

-- SESSION 1 COMMIT:
COMMIT; -- success = true

-- SESSION 2 Tỉnh dậy:
-- Kết quả Session 2: success = false, error_message = 'Mã OTP này đã được sử dụng trước đó (Single-Use violation).'
COMMIT;


-- ============================================================================
-- KỊCH BẢN 3: STALE REQUEST REJECTION (Request cũ không thể kích hoạt đè)
-- ============================================================================
-- Session 1 timeout > 12s -> Session 2 tiếp quản lease mới
SELECT * FROM public.acquire_otp_dispatch_lease('test_phone_hash_stale_03', 'req_old', 'token_old', 5, 'hash_old', 'salt_old');
-- Giả lập hết lease:
UPDATE public.auth_otp_verifications SET lease_expires_at = clock_timestamp() - INTERVAL '1 second' WHERE phone_hash = 'test_phone_hash_stale_03';
-- Session 2 tiếp quản thành công:
SELECT * FROM public.acquire_otp_dispatch_lease('test_phone_hash_stale_03', 'req_new', 'token_new', 12, 'hash_new', 'salt_new');

-- Request 1 cũ quay lại cố gắng kích hoạt -> BỊ TỪ CHỐI
SELECT * FROM public.activate_pending_otp('test_phone_hash_stale_03', 'req_old', 'token_old', 300);
-- Kết quả: success = false, error_message = 'STALE_OR_LOST_OWNERSHIP'

-- Request 1 cũ cố gắng báo fail -> BỊ TỪ CHỐI
SELECT * FROM public.fail_pending_otp('test_phone_hash_stale_03', 'req_old', 'token_old', 'Old failure');
-- Kết quả: success = false, error_message = 'STALE_OR_LOST_OWNERSHIP'


-- ============================================================================
-- KỊCH BẢN 4: DỌN DẸP DỮ LIỆU TEST
-- ============================================================================
DELETE FROM public.auth_otp_verifications WHERE phone_hash LIKE 'test_phone_hash_%';
