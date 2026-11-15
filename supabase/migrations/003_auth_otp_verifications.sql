-- ============================================================================
-- Migration: 003_auth_otp_verifications.sql
-- Module: Telegram Bot OTP High-Assurance Authentication & Fencing State Machine
-- Target: GHN Executive BI Dashboard (GHN Control Center)
-- Security: SECURITY DEFINER, SET search_path = '', Exact Function Signatures
-- Idempotency: Complete Additive Migration with Strict Data Integrity Validations
-- Clock Timing: Post-Lock clock_timestamp() sampling in all RPC transactions
-- Dynamic Crypto: Catalog-resolved pgcrypto schema resolution
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;

-- ----------------------------------------------------------------------------
-- 1. BẢNG DỮ LIỆU auth_otp_verifications (ĐẦY ĐỦ 13 CỘT CHO BẢNG MỚI)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.auth_otp_verifications (
    phone_hash VARCHAR(64) PRIMARY KEY,
    otp_hash VARCHAR(64) NOT NULL,
    salt VARCHAR(64) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    delivery_request_id VARCHAR(64) NOT NULL DEFAULT '',
    owner_token VARCHAR(64) NOT NULL DEFAULT '',
    lease_expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 5,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    activated_at TIMESTAMPTZ NULL,
    consumed_at TIMESTAMPTZ NULL,
    CONSTRAINT chk_auth_otp_status CHECK (status IN ('PENDING', 'ACTIVE', 'CONSUMED', 'FAILED', 'EXPIRED')),
    CONSTRAINT chk_auth_otp_attempts CHECK (attempts >= 0 AND attempts <= max_attempts)
);

-- ----------------------------------------------------------------------------
-- 2. P0: FULL 13-COLUMN SCHEMA COMPATIBILITY & DATA INTEGRITY VALIDATION
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    v_col RECORD;
    v_null_count INTEGER := 0;
    v_dup_count INTEGER := 0;
    v_bad_values INTEGER := 0;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'auth_otp_verifications'
    ) THEN
        
        -- ====================================================================
        -- BƯỚC 1: BỔ SUNG CỘT THIẾU (ADDITIVE MIGRATION AN TOÀN)
        -- ====================================================================
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'auth_otp_verifications' AND column_name = 'phone_hash') THEN
            RAISE EXCEPTION 'MIGRATION_BLOCKED: Bảng auth_otp_verifications thiếu cột phone_hash. Không tự ý cấu trúc lại. Cần DBA xử lý.';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'auth_otp_verifications' AND column_name = 'otp_hash') THEN
            ALTER TABLE public.auth_otp_verifications ADD COLUMN otp_hash VARCHAR(64);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'auth_otp_verifications' AND column_name = 'salt') THEN
            ALTER TABLE public.auth_otp_verifications ADD COLUMN salt VARCHAR(64);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'auth_otp_verifications' AND column_name = 'status') THEN
            ALTER TABLE public.auth_otp_verifications ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'PENDING';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'auth_otp_verifications' AND column_name = 'delivery_request_id') THEN
            ALTER TABLE public.auth_otp_verifications ADD COLUMN delivery_request_id VARCHAR(64) NOT NULL DEFAULT '';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'auth_otp_verifications' AND column_name = 'owner_token') THEN
            ALTER TABLE public.auth_otp_verifications ADD COLUMN owner_token VARCHAR(64) NOT NULL DEFAULT '';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'auth_otp_verifications' AND column_name = 'lease_expires_at') THEN
            ALTER TABLE public.auth_otp_verifications ADD COLUMN lease_expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'auth_otp_verifications' AND column_name = 'attempts') THEN
            ALTER TABLE public.auth_otp_verifications ADD COLUMN attempts INTEGER NOT NULL DEFAULT 0;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'auth_otp_verifications' AND column_name = 'max_attempts') THEN
            ALTER TABLE public.auth_otp_verifications ADD COLUMN max_attempts INTEGER NOT NULL DEFAULT 5;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'auth_otp_verifications' AND column_name = 'expires_at') THEN
            ALTER TABLE public.auth_otp_verifications ADD COLUMN expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'auth_otp_verifications' AND column_name = 'created_at') THEN
            ALTER TABLE public.auth_otp_verifications ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'auth_otp_verifications' AND column_name = 'activated_at') THEN
            ALTER TABLE public.auth_otp_verifications ADD COLUMN activated_at TIMESTAMPTZ NULL;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'auth_otp_verifications' AND column_name = 'consumed_at') THEN
            ALTER TABLE public.auth_otp_verifications ADD COLUMN consumed_at TIMESTAMPTZ NULL;
        END IF;

        -- ====================================================================
        -- BƯỚC 2: ĐỐI CHIẾU DATA TYPE & CHARACTER LENGTH TỪNG CỘT
        -- ====================================================================
        FOR v_col IN (
            SELECT column_name, data_type, character_maximum_length, is_nullable
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'auth_otp_verifications'
        ) LOOP
            -- Kiểm tra các cột chuỗi 64 ký tự
            IF v_col.column_name IN ('phone_hash', 'otp_hash', 'salt', 'delivery_request_id', 'owner_token') THEN
                IF v_col.data_type NOT IN ('character varying', 'text') OR (v_col.data_type = 'character varying' AND v_col.character_maximum_length < 64) THEN
                    RAISE EXCEPTION 'MIGRATION_BLOCKED: Cột % có kiểu % (length %) không tương thích contract VARCHAR(64). Cần DBA xử lý.', v_col.column_name, v_col.data_type, v_col.character_maximum_length;
                END IF;
            END IF;

            -- Kiểm tra cột status
            IF v_col.column_name = 'status' THEN
                IF v_col.data_type NOT IN ('character varying', 'text') OR (v_col.data_type = 'character varying' AND v_col.character_maximum_length < 20) THEN
                    RAISE EXCEPTION 'MIGRATION_BLOCKED: Cột status có kiểu % (length %) không tương thích contract VARCHAR(20).', v_col.data_type, v_col.character_maximum_length;
                END IF;
            END IF;

            -- Kiểm tra các cột timestamp
            IF v_col.column_name IN ('lease_expires_at', 'expires_at', 'created_at', 'activated_at', 'consumed_at') THEN
                IF v_col.data_type NOT IN ('timestamp with time zone', 'timestamp without time zone') THEN
                    RAISE EXCEPTION 'MIGRATION_BLOCKED: Cột % có kiểu % không phải timestamp.', v_col.column_name, v_col.data_type;
                END IF;
            END IF;

            -- Kiểm tra các cột số nguyên
            IF v_col.column_name IN ('attempts', 'max_attempts') THEN
                IF v_col.data_type NOT IN ('integer', 'smallint', 'bigint') THEN
                    RAISE EXCEPTION 'MIGRATION_BLOCKED: Cột % có kiểu % không phải integer.', v_col.column_name, v_col.data_type;
                END IF;
            END IF;
        END LOOP;

        -- ====================================================================
        -- BƯỚC 3: KIỂM TRA NULL TRÊN TẤT CẢ CÁC CỘT NOT NULL CONTRACT
        -- ====================================================================
        SELECT count(*) INTO v_null_count FROM public.auth_otp_verifications WHERE phone_hash IS NULL OR pg_catalog.btrim(phone_hash) = '';
        IF v_null_count > 0 THEN
            RAISE EXCEPTION 'MIGRATION_BLOCKED: Cột phone_hash chứa % dòng NULL hoặc rỗng. Migration bị hủy để bảo vệ dữ liệu.', v_null_count;
        END IF;

        SELECT count(*) INTO v_dup_count FROM (
            SELECT phone_hash FROM public.auth_otp_verifications GROUP BY phone_hash HAVING count(*) > 1
        ) d;
        IF v_dup_count > 0 THEN
            RAISE EXCEPTION 'MIGRATION_BLOCKED: Phát hiện % giá trị phone_hash trùng lặp. Không thể thiết lập PRIMARY KEY an toàn.', v_dup_count;
        END IF;

        SELECT count(*) INTO v_null_count FROM public.auth_otp_verifications WHERE otp_hash IS NULL OR pg_catalog.btrim(otp_hash) = '';
        IF v_null_count > 0 THEN
            RAISE EXCEPTION 'MIGRATION_BLOCKED: Cột otp_hash chứa % dòng NULL hoặc rỗng. Để đảm bảo an toàn tuyệt đối, không tự sinh hash giả. Cần DBA đối soát.', v_null_count;
        END IF;

        SELECT count(*) INTO v_null_count FROM public.auth_otp_verifications WHERE salt IS NULL OR pg_catalog.btrim(salt) = '';
        IF v_null_count > 0 THEN
            RAISE EXCEPTION 'MIGRATION_BLOCKED: Cột salt chứa % dòng NULL hoặc rỗng. Không tự sinh salt giả. Cần DBA đối soát.', v_null_count;
        END IF;

        SELECT count(*) INTO v_null_count FROM public.auth_otp_verifications WHERE status IS NULL OR pg_catalog.btrim(status) = '';
        IF v_null_count > 0 THEN
            RAISE EXCEPTION 'MIGRATION_BLOCKED: Cột status chứa % dòng NULL hoặc rỗng.', v_null_count;
        END IF;

        SELECT count(*) INTO v_null_count FROM public.auth_otp_verifications
        WHERE attempts IS NULL OR max_attempts IS NULL OR expires_at IS NULL OR created_at IS NULL OR lease_expires_at IS NULL;
        IF v_null_count > 0 THEN
            RAISE EXCEPTION 'MIGRATION_BLOCKED: Phát hiện % dòng có các trường bắt buộc mang giá trị NULL.', v_null_count;
        END IF;

        -- ====================================================================
        -- BƯỚC 4: KIỂM TRA GIÁ TRỊ HỢP LỆ VÀ GÁN CONSTRAINTS
        -- ====================================================================
        SELECT count(*) INTO v_bad_values FROM public.auth_otp_verifications
        WHERE status NOT IN ('PENDING', 'ACTIVE', 'CONSUMED', 'FAILED', 'EXPIRED');
        IF v_bad_values > 0 THEN
            RAISE EXCEPTION 'MIGRATION_BLOCKED: Có % dòng chứa status không hợp lệ.', v_bad_values;
        END IF;

        SELECT count(*) INTO v_bad_values FROM public.auth_otp_verifications
        WHERE attempts < 0 OR attempts > max_attempts OR max_attempts <> 5;
        IF v_bad_values > 0 THEN
            RAISE EXCEPTION 'MIGRATION_BLOCKED: Có % dòng chứa attempts hoặc max_attempts không hợp lệ.', v_bad_values;
        END IF;

        -- Áp dụng an toàn NOT NULL sau khi đã chứng minh 0 bản ghi NULL
        ALTER TABLE public.auth_otp_verifications ALTER COLUMN otp_hash SET NOT NULL;
        ALTER TABLE public.auth_otp_verifications ALTER COLUMN salt SET NOT NULL;

        -- Gán Primary Key nếu bảng cũ chưa có
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint c
            JOIN pg_class t ON c.conrelid = t.oid
            JOIN pg_namespace n ON t.relnamespace = n.oid
            WHERE n.nspname = 'public' AND t.relname = 'auth_otp_verifications' AND c.contype = 'p'
        ) THEN
            ALTER TABLE public.auth_otp_verifications ADD PRIMARY KEY (phone_hash);
        END IF;

        -- Gán CHECK constraints theo đúng schema public và bảng auth_otp_verifications
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint c
            JOIN pg_class t ON c.conrelid = t.oid
            JOIN pg_namespace n ON t.relnamespace = n.oid
            WHERE n.nspname = 'public' AND t.relname = 'auth_otp_verifications' AND c.conname = 'chk_auth_otp_status'
        ) THEN
            ALTER TABLE public.auth_otp_verifications ADD CONSTRAINT chk_auth_otp_status CHECK (status IN ('PENDING', 'ACTIVE', 'CONSUMED', 'FAILED', 'EXPIRED'));
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint c
            JOIN pg_class t ON c.conrelid = t.oid
            JOIN pg_namespace n ON t.relnamespace = n.oid
            WHERE n.nspname = 'public' AND t.relname = 'auth_otp_verifications' AND c.conname = 'chk_auth_otp_attempts'
        ) THEN
            ALTER TABLE public.auth_otp_verifications ADD CONSTRAINT chk_auth_otp_attempts CHECK (attempts >= 0 AND attempts <= max_attempts);
        END IF;
    END IF;
END $$;

-- Indexes hỗ trợ dọn dẹp và tra cứu
CREATE INDEX IF NOT EXISTS idx_auth_otp_expires_at ON public.auth_otp_verifications(expires_at);
CREATE INDEX IF NOT EXISTS idx_auth_otp_status ON public.auth_otp_verifications(status);

-- Bật RLS: Chặn 100% public access, chỉ cho phép service_role
ALTER TABLE public.auth_otp_verifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS service_role_all_otp ON public.auth_otp_verifications;
CREATE POLICY service_role_all_otp ON public.auth_otp_verifications
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- 3. RPC 1: acquire_otp_dispatch_lease
-- P0: Lấy Advisory Lock TRƯỚC, sau đó mới lấy clock_timestamp() tính TTL
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.acquire_otp_dispatch_lease(
    p_phone_hash VARCHAR(64),
    p_delivery_request_id VARCHAR(64),
    p_owner_token VARCHAR(64),
    p_lease_seconds INTEGER,
    p_otp_hash VARCHAR(64),
    p_salt VARCHAR(64)
)
RETURNS TABLE (
    success BOOLEAN,
    error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_now TIMESTAMPTZ;
    v_lease_expires TIMESTAMPTZ;
    v_otp_expires TIMESTAMPTZ;
    v_existing RECORD;
BEGIN
    -- Validate tham số trước khi lock (chặn rác sớm)
    IF p_phone_hash IS NULL OR pg_catalog.btrim(p_phone_hash) = '' OR pg_catalog.length(p_phone_hash) < 16 THEN
        RETURN QUERY SELECT FALSE, 'Tham số phone_hash không hợp lệ.';
        RETURN;
    END IF;
    IF p_delivery_request_id IS NULL OR pg_catalog.btrim(p_delivery_request_id) = '' OR pg_catalog.length(p_delivery_request_id) < 8 THEN
        RETURN QUERY SELECT FALSE, 'Tham số delivery_request_id không hợp lệ.';
        RETURN;
    END IF;
    IF p_owner_token IS NULL OR pg_catalog.btrim(p_owner_token) = '' OR pg_catalog.length(p_owner_token) < 8 THEN
        RETURN QUERY SELECT FALSE, 'Tham số owner_token không hợp lệ.';
        RETURN;
    END IF;
    IF p_otp_hash IS NULL OR pg_catalog.btrim(p_otp_hash) = '' OR pg_catalog.length(p_otp_hash) < 32 THEN
        RETURN QUERY SELECT FALSE, 'Tham số otp_hash không hợp lệ.';
        RETURN;
    END IF;
    IF p_salt IS NULL OR pg_catalog.btrim(p_salt) = '' OR pg_catalog.length(p_salt) < 16 THEN
        RETURN QUERY SELECT FALSE, 'Tham số salt không hợp lệ.';
        RETURN;
    END IF;
    IF p_lease_seconds IS NULL OR p_lease_seconds < 5 OR p_lease_seconds > 60 THEN
        RETURN QUERY SELECT FALSE, 'Tham số lease_seconds phải nằm trong khoảng từ 5 đến 60 giây.';
        RETURN;
    END IF;

    -- BƯỚC 1: LẤY TRANSACTION ADVISORY LOCK TRƯỚC
    PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_phone_hash));

    -- BƯỚC 2: SAU KHI ĐÃ CÓ LOCK, MỚI LẤY CLOCK_TIMESTAMP()
    v_now := clock_timestamp();
    v_lease_expires := v_now + (p_lease_seconds || ' seconds')::INTERVAL;
    v_otp_expires := v_now + INTERVAL '300 seconds';

    -- BƯỚC 3: Khóa dòng với FOR UPDATE
    SELECT status, owner_token, lease_expires_at INTO v_existing
    FROM public.auth_otp_verifications
    WHERE phone_hash = p_phone_hash
    FOR UPDATE;

    IF FOUND THEN
        -- Kiểm tra lease còn hiệu lực dựa trên v_now được lấy sau lock
        IF v_existing.status = 'PENDING' AND v_existing.lease_expires_at > v_now AND v_existing.owner_token <> p_owner_token THEN
            RETURN QUERY SELECT FALSE, 'Yêu cầu gửi OTP khác đang được xử lý. Vui lòng chờ vài giây.';
            RETURN;
        END IF;

        -- Ghi đè phiên mới vào trạng thái PENDING với mốc thời gian v_now mới
        UPDATE public.auth_otp_verifications
        SET otp_hash = p_otp_hash,
            salt = p_salt,
            status = 'PENDING',
            delivery_request_id = p_delivery_request_id,
            owner_token = p_owner_token,
            lease_expires_at = v_lease_expires,
            attempts = 0,
            max_attempts = 5,
            expires_at = v_otp_expires,
            created_at = v_now,
            activated_at = NULL,
            consumed_at = NULL
        WHERE phone_hash = p_phone_hash;
    ELSE
        BEGIN
            INSERT INTO public.auth_otp_verifications (
                phone_hash, otp_hash, salt, status, delivery_request_id,
                owner_token, lease_expires_at, attempts, max_attempts,
                expires_at, created_at
            ) VALUES (
                p_phone_hash, p_otp_hash, p_salt, 'PENDING', p_delivery_request_id,
                p_owner_token, v_lease_expires, 0, 5,
                v_otp_expires, v_now
            );
        EXCEPTION WHEN unique_violation THEN
            RETURN QUERY SELECT FALSE, 'Xung đột phiên tạo OTP đồng thời. Vui lòng thử lại sau giây lát.';
            RETURN;
        END;
    END IF;

    RETURN QUERY SELECT TRUE, NULL::TEXT;
END;
$$;

-- ----------------------------------------------------------------------------
-- 4. RPC 2: activate_pending_otp
-- P0: Lấy Advisory Lock TRƯỚC, sau đó mới lấy clock_timestamp() kiểm tra lease
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.activate_pending_otp(
    p_phone_hash VARCHAR(64),
    p_delivery_request_id VARCHAR(64),
    p_owner_token VARCHAR(64),
    p_ttl_seconds INTEGER DEFAULT 300
)
RETURNS TABLE (
    success BOOLEAN,
    error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_now TIMESTAMPTZ;
    v_row RECORD;
BEGIN
    IF p_phone_hash IS NULL OR pg_catalog.btrim(p_phone_hash) = '' THEN
        RETURN QUERY SELECT FALSE, 'Tham số phone_hash không được để trống.';
        RETURN;
    END IF;
    IF p_delivery_request_id IS NULL OR pg_catalog.btrim(p_delivery_request_id) = '' THEN
        RETURN QUERY SELECT FALSE, 'Tham số delivery_request_id không được để trống.';
        RETURN;
    END IF;
    IF p_owner_token IS NULL OR pg_catalog.btrim(p_owner_token) = '' THEN
        RETURN QUERY SELECT FALSE, 'Tham số owner_token không được để trống.';
        RETURN;
    END IF;
    IF p_ttl_seconds IS NULL OR p_ttl_seconds < 60 OR p_ttl_seconds > 600 THEN
        RETURN QUERY SELECT FALSE, 'Tham số ttl_seconds phải nằm trong khoảng từ 60 đến 600 giây.';
        RETURN;
    END IF;

    -- BƯỚC 1: LẤY TRANSACTION ADVISORY LOCK TRƯỚC
    PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_phone_hash));

    -- BƯỚC 2: SAU KHI ĐÃ CÓ LOCK, MỚI LẤY CLOCK_TIMESTAMP()
    v_now := clock_timestamp();

    SELECT status, owner_token, delivery_request_id, lease_expires_at INTO v_row
    FROM public.auth_otp_verifications
    WHERE phone_hash = p_phone_hash
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'NOT_FOUND';
        RETURN;
    END IF;

    IF v_row.owner_token <> p_owner_token OR v_row.delivery_request_id <> p_delivery_request_id THEN
        RETURN QUERY SELECT FALSE, 'STALE_OR_LOST_OWNERSHIP';
        RETURN;
    END IF;

    IF v_row.status <> 'PENDING' THEN
        RETURN QUERY SELECT FALSE, 'NOT_PENDING';
        RETURN;
    END IF;

    -- Kiểm tra hạn lease sau khi đã có lock: Nếu hết hạn trong lúc chờ lock, bị từ chối ngay!
    IF v_row.lease_expires_at <= v_now THEN
        RETURN QUERY SELECT FALSE, 'LEASE_EXPIRED';
        RETURN;
    END IF;

    UPDATE public.auth_otp_verifications
    SET status = 'ACTIVE',
        activated_at = v_now,
        expires_at = v_now + (p_ttl_seconds || ' seconds')::INTERVAL
    WHERE phone_hash = p_phone_hash;

    RETURN QUERY SELECT TRUE, NULL::TEXT;
END;
$$;

-- ----------------------------------------------------------------------------
-- 5. RPC 3: fail_pending_otp
-- P0: Lấy Advisory Lock TRƯỚC, kiểm tra lease còn hạn sau lock
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fail_pending_otp(
    p_phone_hash VARCHAR(64),
    p_delivery_request_id VARCHAR(64),
    p_owner_token VARCHAR(64),
    p_reason TEXT DEFAULT 'Telegram dispatch failed'
)
RETURNS TABLE (
    success BOOLEAN,
    error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_now TIMESTAMPTZ;
    v_row_count INTEGER := 0;
BEGIN
    IF p_phone_hash IS NULL OR pg_catalog.btrim(p_phone_hash) = '' THEN
        RETURN QUERY SELECT FALSE, 'Tham số phone_hash không được để trống.';
        RETURN;
    END IF;
    IF p_delivery_request_id IS NULL OR pg_catalog.btrim(p_delivery_request_id) = '' THEN
        RETURN QUERY SELECT FALSE, 'Tham số delivery_request_id không được để trống.';
        RETURN;
    END IF;
    IF p_owner_token IS NULL OR pg_catalog.btrim(p_owner_token) = '' THEN
        RETURN QUERY SELECT FALSE, 'Tham số owner_token không được để trống.';
        RETURN;
    END IF;

    -- BƯỚC 1: LẤY TRANSACTION ADVISORY LOCK TRƯỚC
    PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_phone_hash));

    -- BƯỚC 2: SAU KHI ĐÃ CÓ LOCK, MỚI LẤY CLOCK_TIMESTAMP()
    v_now := clock_timestamp();

    -- Cập nhật FAILED chỉ khi lease còn hạn tại thời điểm thực sự lấy được lock
    UPDATE public.auth_otp_verifications
    SET status = 'FAILED'
    WHERE phone_hash = p_phone_hash
      AND delivery_request_id = p_delivery_request_id
      AND owner_token = p_owner_token
      AND status = 'PENDING'
      AND lease_expires_at > v_now;

    GET DIAGNOSTICS v_row_count = ROW_COUNT;

    IF v_row_count = 1 THEN
        RETURN QUERY SELECT TRUE, NULL::TEXT;
    ELSE
        IF EXISTS (
            SELECT 1 FROM public.auth_otp_verifications
            WHERE phone_hash = p_phone_hash
              AND delivery_request_id = p_delivery_request_id
              AND owner_token = p_owner_token
              AND status = 'PENDING'
              AND lease_expires_at <= v_now
        ) THEN
            RETURN QUERY SELECT FALSE, 'LEASE_EXPIRED';
        ELSE
            RETURN QUERY SELECT FALSE, 'STALE_OR_LOST_OWNERSHIP';
        END IF;
    END IF;
END;
$$;

-- ----------------------------------------------------------------------------
-- 6. RPC 4: consume_otp_if_valid
-- P0: Lấy Advisory Lock TRƯỚC, sau đó lấy clock_timestamp() kiểm tra TTL
-- P1: Truy vấn Catalog động để gọi đúng schema của pgcrypto hmac()
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.consume_otp_if_valid(
    p_phone_hash VARCHAR(64),
    p_entered_otp VARCHAR(16),
    p_hmac_secret TEXT
)
RETURNS TABLE (
    success BOOLEAN,
    error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_now TIMESTAMPTZ;
    v_rec RECORD;
    v_calc_hash VARCHAR(64);
    v_crypto_schema TEXT;
BEGIN
    IF p_phone_hash IS NULL OR pg_catalog.btrim(p_phone_hash) = '' THEN
        RETURN QUERY SELECT FALSE, 'Tham số phone_hash không được để trống.';
        RETURN;
    END IF;

    -- Bắt buộc OTP phải gồm đúng 6 chữ số
    IF p_entered_otp IS NULL OR p_entered_otp !~ '^\d{6}$' THEN
        RETURN QUERY SELECT FALSE, 'Mã OTP không hợp lệ (phải gồm đúng 6 chữ số).';
        RETURN;
    END IF;

    IF p_hmac_secret IS NULL OR pg_catalog.length(p_hmac_secret) < 32 THEN
        RETURN QUERY SELECT FALSE, 'Khóa hmac_secret máy chủ không đạt chuẩn bảo mật.';
        RETURN;
    END IF;

    -- BƯỚC 1: LẤY TRANSACTION ADVISORY LOCK TRƯỚC
    PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_phone_hash));

    -- BƯỚC 2: SAU KHI ĐÃ CÓ LOCK, MỚI LẤY CLOCK_TIMESTAMP()
    v_now := clock_timestamp();

    SELECT * INTO v_rec
    FROM public.auth_otp_verifications
    WHERE phone_hash = p_phone_hash
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'Không tìm thấy mã OTP cho tài khoản này.';
        RETURN;
    END IF;

    IF v_rec.status = 'CONSUMED' THEN
        RETURN QUERY SELECT FALSE, 'Mã OTP này đã được sử dụng trước đó (Single-Use violation).';
        RETURN;
    END IF;

    IF v_rec.status <> 'ACTIVE' THEN
        RETURN QUERY SELECT FALSE, 'Mã OTP không ở trạng thái sẵn sàng xác thực.';
        RETURN;
    END IF;

    -- Kiểm tra hết hạn TTL dựa trên v_now được lấy sau khi có lock
    IF v_rec.expires_at < v_now THEN
        UPDATE public.auth_otp_verifications
        SET status = 'EXPIRED'
        WHERE phone_hash = p_phone_hash;
        RETURN QUERY SELECT FALSE, 'Mã OTP đã hết hiệu lực (quá 5 phút). Vui lòng yêu cầu mã mới.';
        RETURN;
    END IF;

    IF v_rec.attempts >= v_rec.max_attempts THEN
        RETURN QUERY SELECT FALSE, 'Tài khoản tạm thời bị khóa do nhập sai quá 5 lần.';
        RETURN;
    END IF;

    -- BƯỚC 3: DYNAMIC PGCRYPTO SCHEMA RESOLUTION QUA POSTGRESQL CATALOG
    SELECT n.nspname INTO v_crypto_schema
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'hmac'
      AND pg_catalog.pg_get_function_identity_arguments(p.oid) = 'bytea, bytea, text'
    LIMIT 1;

    IF v_crypto_schema IS NULL THEN
        SELECT n.nspname INTO v_crypto_schema
        FROM pg_catalog.pg_extension e
        JOIN pg_catalog.pg_namespace n ON e.extnamespace = n.oid
        WHERE e.extname = 'pgcrypto'
        LIMIT 1;
    END IF;

    IF v_crypto_schema IS NULL THEN
        v_crypto_schema := 'extensions';
    END IF;

    -- Gọi HMAC động theo đúng schema catalog tìm được
    EXECUTE format('SELECT encode(%I.hmac($1, $2, ''sha256''), ''hex'')', v_crypto_schema)
    INTO v_calc_hash
    USING (v_rec.salt || ':' || p_phone_hash || ':' || trim(p_entered_otp))::bytea, p_hmac_secret::bytea;

    IF v_calc_hash <> v_rec.otp_hash THEN
        UPDATE public.auth_otp_verifications
        SET attempts = attempts + 1,
            status = CASE WHEN attempts + 1 >= max_attempts THEN 'EXPIRED' ELSE status END
        WHERE phone_hash = p_phone_hash;

        IF v_rec.attempts + 1 >= v_rec.max_attempts THEN
            RETURN QUERY SELECT FALSE, 'Mã OTP không chính xác. Bạn đã hết số lần thử.';
        ELSE
            RETURN QUERY SELECT FALSE, 'Mã OTP không chính xác. Bạn còn ' || (v_rec.max_attempts - (v_rec.attempts + 1)) || ' lần thử.';
        END IF;
        RETURN;
    END IF;

    UPDATE public.auth_otp_verifications
    SET status = 'CONSUMED',
        consumed_at = v_now
    WHERE phone_hash = p_phone_hash;

    RETURN QUERY SELECT TRUE, NULL::TEXT;
END;
$$;

-- ----------------------------------------------------------------------------
-- 7. PHÂN QUYỀN VÀ QUẢN LÝ OWNER
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    v_admin_role TEXT := 'postgres';
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgres') THEN
        SELECT session_user INTO v_admin_role;
    END IF;

    EXECUTE format('ALTER FUNCTION public.acquire_otp_dispatch_lease(VARCHAR, VARCHAR, VARCHAR, INTEGER, VARCHAR, VARCHAR) OWNER TO %I;', v_admin_role);
    EXECUTE format('ALTER FUNCTION public.activate_pending_otp(VARCHAR, VARCHAR, VARCHAR, INTEGER) OWNER TO %I;', v_admin_role);
    EXECUTE format('ALTER FUNCTION public.fail_pending_otp(VARCHAR, VARCHAR, VARCHAR, TEXT) OWNER TO %I;', v_admin_role);
    EXECUTE format('ALTER FUNCTION public.consume_otp_if_valid(VARCHAR, VARCHAR, TEXT) OWNER TO %I;', v_admin_role);
END $$;

REVOKE ALL ON FUNCTION public.acquire_otp_dispatch_lease(VARCHAR, VARCHAR, VARCHAR, INTEGER, VARCHAR, VARCHAR) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.activate_pending_otp(VARCHAR, VARCHAR, VARCHAR, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fail_pending_otp(VARCHAR, VARCHAR, VARCHAR, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.consume_otp_if_valid(VARCHAR, VARCHAR, TEXT) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.acquire_otp_dispatch_lease(VARCHAR, VARCHAR, VARCHAR, INTEGER, VARCHAR, VARCHAR) TO service_role;
GRANT EXECUTE ON FUNCTION public.activate_pending_otp(VARCHAR, VARCHAR, VARCHAR, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.fail_pending_otp(VARCHAR, VARCHAR, VARCHAR, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_otp_if_valid(VARCHAR, VARCHAR, TEXT) TO service_role;

REVOKE ALL ON TABLE public.auth_otp_verifications FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.auth_otp_verifications TO service_role;
