-- ============================================================================
-- GHN EXECUTIVE BI – AUTH BROKER RATE LIMITING (PREVIEW MIGRATION)
-- Target: Supabase PostgreSQL (`ghn-incident-center-dev`, Region: Sydney)
-- Mode: File created for review — DO NOT EXECUTE WITHOUT EXPLICIT APPROVAL
-- ============================================================================

-- 1. RATE LIMIT COUNTERS TABLE (Zero Plaintext PII / Zero Secrets)
CREATE TABLE IF NOT EXISTS public.auth_rate_limits (
    key_hash TEXT PRIMARY KEY CHECK (BTRIM(key_hash) <> ''),
    scope TEXT NOT NULL CHECK (scope IN (
        'login_account',
        'login_ip',
        'otp_send_phone',
        'otp_send_ip',
        'otp_verify_phone',
        'otp_verify_ip',
        'inflight_lock'
    )),
    attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
    window_started_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    locked_until TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_expires
    ON public.auth_rate_limits (expires_at);

-- 2. BACKEND-ONLY SECURITY LOCKDOWN
ALTER TABLE public.auth_rate_limits ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.auth_rate_limits
FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.auth_rate_limits
TO service_role;

-- 3. HELPER: Opportunistic expired-row cleanup (bounded batch to avoid lock spikes)
CREATE OR REPLACE FUNCTION public.cleanup_expired_auth_rate_limits()
RETURNS INTEGER
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
DECLARE
    v_deleted INTEGER := 0;
BEGIN
    DELETE FROM public.auth_rate_limits
    WHERE key_hash IN (
        SELECT key_hash
        FROM public.auth_rate_limits
        WHERE expires_at < clock_timestamp()
        ORDER BY expires_at ASC
        LIMIT 100
        FOR UPDATE SKIP LOCKED
    );
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted;
END;
$$;

-- 4. RPC 1: Read-only lock check BEFORE calling upstream or incrementing other keys
CREATE OR REPLACE FUNCTION public.check_auth_rate_limit(
    p_key_hash TEXT
)
RETURNS TABLE (
    blocked BOOLEAN,
    retry_after_seconds INTEGER
)
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
DECLARE
    v_now TIMESTAMPTZ := clock_timestamp();
    v_locked_until TIMESTAMPTZ;
BEGIN
    IF p_key_hash IS NULL OR BTRIM(p_key_hash) = '' THEN
        RAISE EXCEPTION 'VALIDATION VIOLATION: p_key_hash cannot be empty';
    END IF;

    SELECT r.locked_until
    INTO v_locked_until
    FROM public.auth_rate_limits AS r
    WHERE r.key_hash = p_key_hash;

    IF FOUND AND v_locked_until IS NOT NULL AND v_locked_until > v_now THEN
        RETURN QUERY SELECT
            TRUE,
            GREATEST(1, CEIL(EXTRACT(EPOCH FROM (v_locked_until - v_now)))::INTEGER);
        RETURN;
    END IF;

    RETURN QUERY SELECT FALSE, 0;
END;
$$;

-- 5. RPC 2: Atomic check-and-increment for request counters (IP / OTP send)
-- Serialized at row level by PostgreSQL INSERT ... ON CONFLICT (key_hash) DO UPDATE.
CREATE OR REPLACE FUNCTION public.consume_auth_rate_limit(
    p_key_hash TEXT,
    p_scope TEXT,
    p_window_seconds INTEGER,
    p_max_attempts INTEGER,
    p_lock_seconds INTEGER
)
RETURNS TABLE (
    blocked BOOLEAN,
    attempt_count INTEGER,
    remaining INTEGER,
    retry_after_seconds INTEGER
)
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
#variable_conflict use_column
DECLARE
    v_now TIMESTAMPTZ := clock_timestamp();
    v_row RECORD;
    v_retry INTEGER := 0;
    v_was_locked BOOLEAN := FALSE;
BEGIN
    IF p_key_hash IS NULL OR BTRIM(p_key_hash) = '' THEN
        RAISE EXCEPTION 'VALIDATION VIOLATION: p_key_hash cannot be empty';
    END IF;
    IF p_window_seconds <= 0 OR p_max_attempts <= 0 OR p_lock_seconds <= 0 THEN
        RAISE EXCEPTION 'VALIDATION VIOLATION: rate limit parameters must be positive';
    END IF;

    -- Opportunistic bounded cleanup
    PERFORM public.cleanup_expired_auth_rate_limits();

    INSERT INTO public.auth_rate_limits (
        key_hash, scope, attempt_count, window_started_at, locked_until, expires_at, updated_at
    )
    VALUES (
        p_key_hash,
        p_scope,
        1,
        v_now,
        NULL,
        v_now + make_interval(secs => GREATEST(p_window_seconds, p_lock_seconds)),
        v_now
    )
    ON CONFLICT (key_hash) DO UPDATE
    SET
        scope = EXCLUDED.scope,
        attempt_count = CASE
            -- Already locked: freeze attempt_count without extending or resetting
            WHEN public.auth_rate_limits.locked_until IS NOT NULL
                 AND public.auth_rate_limits.locked_until > v_now THEN public.auth_rate_limits.attempt_count
            -- Previous window or expired lock finished: start fresh window at 1
            WHEN (public.auth_rate_limits.locked_until IS NOT NULL AND public.auth_rate_limits.locked_until <= v_now)
                 OR (public.auth_rate_limits.window_started_at + make_interval(secs => p_window_seconds) <= v_now) THEN 1
            -- Exceeded max_attempts on this request: freeze at max_attempts + 1 and lock
            WHEN public.auth_rate_limits.attempt_count >= p_max_attempts THEN p_max_attempts + 1
            -- Active window within quota: increment atomically
            ELSE public.auth_rate_limits.attempt_count + 1
        END,
        window_started_at = CASE
            WHEN public.auth_rate_limits.locked_until IS NOT NULL
                 AND public.auth_rate_limits.locked_until > v_now THEN public.auth_rate_limits.window_started_at
            WHEN (public.auth_rate_limits.locked_until IS NOT NULL AND public.auth_rate_limits.locked_until <= v_now)
                 OR (public.auth_rate_limits.window_started_at + make_interval(secs => p_window_seconds) <= v_now) THEN v_now
            ELSE public.auth_rate_limits.window_started_at
        END,
        locked_until = CASE
            WHEN public.auth_rate_limits.locked_until IS NOT NULL
                 AND public.auth_rate_limits.locked_until > v_now THEN public.auth_rate_limits.locked_until
            WHEN (public.auth_rate_limits.locked_until IS NOT NULL AND public.auth_rate_limits.locked_until <= v_now)
                 OR (public.auth_rate_limits.window_started_at + make_interval(secs => p_window_seconds) <= v_now) THEN NULL
            WHEN (public.auth_rate_limits.attempt_count + 1) > p_max_attempts THEN
                v_now + make_interval(secs => p_lock_seconds)
            ELSE NULL
        END,
        expires_at = v_now + make_interval(secs => GREATEST(p_window_seconds, p_lock_seconds)),
        updated_at = v_now
    RETURNING
        public.auth_rate_limits.attempt_count,
        public.auth_rate_limits.locked_until
    INTO v_row;

    v_was_locked := (v_row.locked_until IS NOT NULL AND v_row.locked_until > v_now);
    IF v_was_locked THEN
        v_retry := GREATEST(1, CEIL(EXTRACT(EPOCH FROM (v_row.locked_until - v_now)))::INTEGER);
    END IF;

    RETURN QUERY SELECT
        v_was_locked,
        v_row.attempt_count,
        GREATEST(0, p_max_attempts - v_row.attempt_count),
        v_retry;
END;
$$;

-- 6. RPC 3: Atomic failure counter (only invoked when upstream auth fails; locks at >= p_max_attempts)
CREATE OR REPLACE FUNCTION public.record_auth_failure(
    p_key_hash TEXT,
    p_scope TEXT,
    p_window_seconds INTEGER,
    p_max_attempts INTEGER,
    p_lock_seconds INTEGER
)
RETURNS TABLE (
    blocked BOOLEAN,
    attempt_count INTEGER,
    remaining INTEGER,
    retry_after_seconds INTEGER
)
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
#variable_conflict use_column
DECLARE
    v_now TIMESTAMPTZ := clock_timestamp();
    v_row RECORD;
    v_retry INTEGER := 0;
    v_is_locked BOOLEAN := FALSE;
BEGIN
    IF p_key_hash IS NULL OR BTRIM(p_key_hash) = '' THEN
        RAISE EXCEPTION 'VALIDATION VIOLATION: p_key_hash cannot be empty';
    END IF;
    IF p_window_seconds <= 0 OR p_max_attempts <= 0 OR p_lock_seconds <= 0 THEN
        RAISE EXCEPTION 'VALIDATION VIOLATION: rate limit parameters must be positive';
    END IF;

    INSERT INTO public.auth_rate_limits (
        key_hash, scope, attempt_count, window_started_at, locked_until, expires_at, updated_at
    )
    VALUES (
        p_key_hash,
        p_scope,
        1,
        v_now,
        CASE WHEN p_max_attempts <= 1 THEN v_now + make_interval(secs => p_lock_seconds) ELSE NULL END,
        v_now + make_interval(secs => GREATEST(p_window_seconds, p_lock_seconds)),
        v_now
    )
    ON CONFLICT (key_hash) DO UPDATE
    SET
        scope = EXCLUDED.scope,
        attempt_count = CASE
            WHEN public.auth_rate_limits.locked_until IS NOT NULL
                 AND public.auth_rate_limits.locked_until > v_now THEN public.auth_rate_limits.attempt_count
            WHEN (public.auth_rate_limits.locked_until IS NOT NULL AND public.auth_rate_limits.locked_until <= v_now)
                 OR (public.auth_rate_limits.window_started_at + make_interval(secs => p_window_seconds) <= v_now) THEN 1
            ELSE public.auth_rate_limits.attempt_count + 1
        END,
        window_started_at = CASE
            WHEN public.auth_rate_limits.locked_until IS NOT NULL
                 AND public.auth_rate_limits.locked_until > v_now THEN public.auth_rate_limits.window_started_at
            WHEN (public.auth_rate_limits.locked_until IS NOT NULL AND public.auth_rate_limits.locked_until <= v_now)
                 OR (public.auth_rate_limits.window_started_at + make_interval(secs => p_window_seconds) <= v_now) THEN v_now
            ELSE public.auth_rate_limits.window_started_at
        END,
        locked_until = CASE
            WHEN public.auth_rate_limits.locked_until IS NOT NULL
                 AND public.auth_rate_limits.locked_until > v_now THEN public.auth_rate_limits.locked_until
            WHEN (public.auth_rate_limits.locked_until IS NOT NULL AND public.auth_rate_limits.locked_until <= v_now)
                 OR (public.auth_rate_limits.window_started_at + make_interval(secs => p_window_seconds) <= v_now) THEN
                CASE WHEN p_max_attempts <= 1 THEN v_now + make_interval(secs => p_lock_seconds) ELSE NULL END
            WHEN (public.auth_rate_limits.attempt_count + 1) >= p_max_attempts THEN
                v_now + make_interval(secs => p_lock_seconds)
            ELSE NULL
        END,
        expires_at = v_now + make_interval(secs => GREATEST(p_window_seconds, p_lock_seconds)),
        updated_at = v_now
    RETURNING
        public.auth_rate_limits.attempt_count,
        public.auth_rate_limits.locked_until
    INTO v_row;

    v_is_locked := (v_row.locked_until IS NOT NULL AND v_row.locked_until > v_now);
    IF v_is_locked THEN
        v_retry := GREATEST(1, CEIL(EXTRACT(EPOCH FROM (v_row.locked_until - v_now)))::INTEGER);
    END IF;

    RETURN QUERY SELECT
        v_is_locked,
        v_row.attempt_count,
        GREATEST(0, p_max_attempts - v_row.attempt_count),
        v_retry;
END;
$$;

-- 7. RPC 4: Reset failure counter on successful authentication
CREATE OR REPLACE FUNCTION public.reset_auth_rate_limit(
    p_key_hash TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
BEGIN
    IF p_key_hash IS NULL OR BTRIM(p_key_hash) = '' THEN
        RETURN;
    END IF;
    DELETE FROM public.auth_rate_limits WHERE key_hash = p_key_hash;
END;
$$;

-- 8. RPC 5: Atomic dual-key check + consume (used by send-otp for phone + IP simultaneously)
-- Deadlock-safe via sorted pg_advisory_xact_lock; never increments one key if the other is blocked.
CREATE OR REPLACE FUNCTION public.consume_dual_auth_rate_limit(
    p_key_hash_1 TEXT,
    p_scope_1 TEXT,
    p_window_seconds_1 INTEGER,
    p_max_attempts_1 INTEGER,
    p_lock_seconds_1 INTEGER,
    p_key_hash_2 TEXT,
    p_scope_2 TEXT,
    p_window_seconds_2 INTEGER,
    p_max_attempts_2 INTEGER,
    p_lock_seconds_2 INTEGER
)
RETURNS TABLE (
    blocked BOOLEAN,
    retry_after_seconds INTEGER,
    blocked_scope TEXT
)
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
#variable_conflict use_column
DECLARE
    v_now TIMESTAMPTZ := clock_timestamp();
    v_row_1 RECORD;
    v_row_2 RECORD;
    v_has_1 BOOLEAN := FALSE;
    v_has_2 BOOLEAN := FALSE;
    v_locked_1 BOOLEAN := FALSE;
    v_locked_2 BOOLEAN := FALSE;
    v_expired_1 BOOLEAN := TRUE;
    v_expired_2 BOOLEAN := TRUE;
    v_eff_1 INTEGER := 0;
    v_eff_2 INTEGER := 0;
    v_retry_1 INTEGER := 0;
    v_retry_2 INTEGER := 0;
    v_block_1 BOOLEAN := FALSE;
    v_block_2 BOOLEAN := FALSE;
BEGIN
    IF p_key_hash_1 IS NULL OR BTRIM(p_key_hash_1) = '' OR p_key_hash_2 IS NULL OR BTRIM(p_key_hash_2) = '' THEN
        RAISE EXCEPTION 'VALIDATION VIOLATION: key hashes cannot be empty';
    END IF;
    IF p_window_seconds_1 <= 0 OR p_max_attempts_1 <= 0 OR p_lock_seconds_1 <= 0
       OR p_window_seconds_2 <= 0 OR p_max_attempts_2 <= 0 OR p_lock_seconds_2 <= 0 THEN
        RAISE EXCEPTION 'VALIDATION VIOLATION: rate limit parameters must be positive';
    END IF;

    -- Opportunistic bounded cleanup
    PERFORM public.cleanup_expired_auth_rate_limits();

    -- Acquire transaction-scoped advisory locks in deterministic sorted order to prevent deadlocks
    IF p_key_hash_1 <= p_key_hash_2 THEN
        PERFORM pg_advisory_xact_lock(hashtext(p_key_hash_1));
        IF p_key_hash_2 <> p_key_hash_1 THEN
            PERFORM pg_advisory_xact_lock(hashtext(p_key_hash_2));
        END IF;
    ELSE
        PERFORM pg_advisory_xact_lock(hashtext(p_key_hash_2));
        PERFORM pg_advisory_xact_lock(hashtext(p_key_hash_1));
    END IF;

    SELECT attempt_count, window_started_at, locked_until
    INTO v_row_1
    FROM public.auth_rate_limits
    WHERE key_hash = p_key_hash_1
    FOR UPDATE;
    v_has_1 := FOUND;

    SELECT attempt_count, window_started_at, locked_until
    INTO v_row_2
    FROM public.auth_rate_limits
    WHERE key_hash = p_key_hash_2
    FOR UPDATE;
    v_has_2 := FOUND;

    IF v_has_1 THEN
        v_locked_1 := (v_row_1.locked_until IS NOT NULL AND v_row_1.locked_until > v_now);
        v_expired_1 := (v_row_1.locked_until IS NOT NULL AND v_row_1.locked_until <= v_now)
                    OR (v_row_1.window_started_at + make_interval(secs => p_window_seconds_1) <= v_now);
        IF v_locked_1 THEN
            v_retry_1 := GREATEST(1, CEIL(EXTRACT(EPOCH FROM (v_row_1.locked_until - v_now)))::INTEGER);
        ELSIF NOT v_expired_1 THEN
            v_eff_1 := v_row_1.attempt_count;
        END IF;
    END IF;

    IF v_has_2 THEN
        v_locked_2 := (v_row_2.locked_until IS NOT NULL AND v_row_2.locked_until > v_now);
        v_expired_2 := (v_row_2.locked_until IS NOT NULL AND v_row_2.locked_until <= v_now)
                    OR (v_row_2.window_started_at + make_interval(secs => p_window_seconds_2) <= v_now);
        IF v_locked_2 THEN
            v_retry_2 := GREATEST(1, CEIL(EXTRACT(EPOCH FROM (v_row_2.locked_until - v_now)))::INTEGER);
        ELSIF NOT v_expired_2 THEN
            v_eff_2 := v_row_2.attempt_count;
        END IF;
    END IF;

    -- Case A: Either key is already locked -> block immediately without modifying either counter
    IF v_locked_1 OR v_locked_2 THEN
        RETURN QUERY SELECT
            TRUE,
            GREATEST(v_retry_1, v_retry_2),
            CASE WHEN v_locked_1 THEN p_scope_1 ELSE p_scope_2 END;
        RETURN;
    END IF;

    -- Case B: Either key would exceed max_attempts on this request -> lock only the exceeding key(s), do NOT increment the other
    v_block_1 := (v_eff_1 >= p_max_attempts_1);
    v_block_2 := (v_eff_2 >= p_max_attempts_2);

    IF v_block_1 OR v_block_2 THEN
        IF v_block_1 THEN
            INSERT INTO public.auth_rate_limits (
                key_hash, scope, attempt_count, window_started_at, locked_until, expires_at, updated_at
            )
            VALUES (
                p_key_hash_1,
                p_scope_1,
                p_max_attempts_1 + 1,
                COALESCE(CASE WHEN NOT v_expired_1 THEN v_row_1.window_started_at END, v_now),
                v_now + make_interval(secs => p_lock_seconds_1),
                v_now + make_interval(secs => GREATEST(p_window_seconds_1, p_lock_seconds_1)),
                v_now
            )
            ON CONFLICT (key_hash) DO UPDATE SET
                scope = EXCLUDED.scope,
                attempt_count = p_max_attempts_1 + 1,
                locked_until = v_now + make_interval(secs => p_lock_seconds_1),
                expires_at = v_now + make_interval(secs => GREATEST(p_window_seconds_1, p_lock_seconds_1)),
                updated_at = v_now;
            v_retry_1 := p_lock_seconds_1;
        END IF;

        IF v_block_2 THEN
            INSERT INTO public.auth_rate_limits (
                key_hash, scope, attempt_count, window_started_at, locked_until, expires_at, updated_at
            )
            VALUES (
                p_key_hash_2,
                p_scope_2,
                p_max_attempts_2 + 1,
                COALESCE(CASE WHEN NOT v_expired_2 THEN v_row_2.window_started_at END, v_now),
                v_now + make_interval(secs => p_lock_seconds_2),
                v_now + make_interval(secs => GREATEST(p_window_seconds_2, p_lock_seconds_2)),
                v_now
            )
            ON CONFLICT (key_hash) DO UPDATE SET
                scope = EXCLUDED.scope,
                attempt_count = p_max_attempts_2 + 1,
                locked_until = v_now + make_interval(secs => p_lock_seconds_2),
                expires_at = v_now + make_interval(secs => GREATEST(p_window_seconds_2, p_lock_seconds_2)),
                updated_at = v_now;
            v_retry_2 := p_lock_seconds_2;
        END IF;

        RETURN QUERY SELECT
            TRUE,
            GREATEST(v_retry_1, v_retry_2),
            CASE WHEN v_block_1 THEN p_scope_1 ELSE p_scope_2 END;
        RETURN;
    END IF;

    -- Case C: Both keys are valid and within quota -> increment both atomically
    INSERT INTO public.auth_rate_limits (
        key_hash, scope, attempt_count, window_started_at, locked_until, expires_at, updated_at
    )
    VALUES (
        p_key_hash_1,
        p_scope_1,
        v_eff_1 + 1,
        CASE WHEN v_has_1 AND NOT v_expired_1 THEN v_row_1.window_started_at ELSE v_now END,
        NULL,
        v_now + make_interval(secs => GREATEST(p_window_seconds_1, p_lock_seconds_1)),
        v_now
    )
    ON CONFLICT (key_hash) DO UPDATE SET
        scope = EXCLUDED.scope,
        attempt_count = EXCLUDED.attempt_count,
        window_started_at = EXCLUDED.window_started_at,
        locked_until = NULL,
        expires_at = EXCLUDED.expires_at,
        updated_at = v_now;

    INSERT INTO public.auth_rate_limits (
        key_hash, scope, attempt_count, window_started_at, locked_until, expires_at, updated_at
    )
    VALUES (
        p_key_hash_2,
        p_scope_2,
        v_eff_2 + 1,
        CASE WHEN v_has_2 AND NOT v_expired_2 THEN v_row_2.window_started_at ELSE v_now END,
        NULL,
        v_now + make_interval(secs => GREATEST(p_window_seconds_2, p_lock_seconds_2)),
        v_now
    )
    ON CONFLICT (key_hash) DO UPDATE SET
        scope = EXCLUDED.scope,
        attempt_count = EXCLUDED.attempt_count,
        window_started_at = EXCLUDED.window_started_at,
        locked_until = NULL,
        expires_at = EXCLUDED.expires_at,
        updated_at = v_now;

    RETURN QUERY SELECT FALSE, 0, NULL::TEXT;
END;
$$;

-- 9. RPC 6 & 7: Distributed per-account/phone in-flight lease to prevent parallel burst bypass
CREATE OR REPLACE FUNCTION public.acquire_auth_inflight_slot(
    p_key_hash TEXT,
    p_ttl_seconds INTEGER DEFAULT 10
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
DECLARE
    v_now TIMESTAMPTZ := clock_timestamp();
    v_acquired BOOLEAN := FALSE;
BEGIN
    IF p_key_hash IS NULL OR BTRIM(p_key_hash) = '' THEN
        RAISE EXCEPTION 'VALIDATION VIOLATION: p_key_hash cannot be empty';
    END IF;
    IF p_ttl_seconds <= 0 THEN
        RAISE EXCEPTION 'VALIDATION VIOLATION: p_ttl_seconds must be positive';
    END IF;

    INSERT INTO public.auth_rate_limits (
        key_hash, scope, attempt_count, window_started_at, locked_until, expires_at, updated_at
    )
    VALUES (
        p_key_hash,
        'inflight_lock',
        1,
        v_now,
        v_now + make_interval(secs => p_ttl_seconds),
        v_now + make_interval(secs => p_ttl_seconds),
        v_now
    )
    ON CONFLICT (key_hash) DO UPDATE
    SET
        scope = 'inflight_lock',
        attempt_count = 1,
        window_started_at = v_now,
        locked_until = v_now + make_interval(secs => p_ttl_seconds),
        expires_at = v_now + make_interval(secs => p_ttl_seconds),
        updated_at = v_now
    WHERE public.auth_rate_limits.locked_until IS NULL
       OR public.auth_rate_limits.locked_until <= v_now
    RETURNING TRUE INTO v_acquired;

    RETURN COALESCE(v_acquired, FALSE);
END;
$$;

CREATE OR REPLACE FUNCTION public.release_auth_inflight_slot(
    p_key_hash TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
BEGIN
    IF p_key_hash IS NULL OR BTRIM(p_key_hash) = '' THEN
        RETURN;
    END IF;

    DELETE FROM public.auth_rate_limits
    WHERE key_hash = p_key_hash
      AND scope = 'inflight_lock';
END;
$$;

-- 10. RESTRICT FUNCTION EXECUTION TO BACKEND (service_role) ONLY
REVOKE ALL ON FUNCTION public.cleanup_expired_auth_rate_limits() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.check_auth_rate_limit(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.consume_auth_rate_limit(TEXT, TEXT, INTEGER, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_auth_failure(TEXT, TEXT, INTEGER, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reset_auth_rate_limit(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.consume_dual_auth_rate_limit(TEXT, TEXT, INTEGER, INTEGER, INTEGER, TEXT, TEXT, INTEGER, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.acquire_auth_inflight_slot(TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_auth_inflight_slot(TEXT) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.cleanup_expired_auth_rate_limits() TO service_role;
GRANT EXECUTE ON FUNCTION public.check_auth_rate_limit(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_auth_rate_limit(TEXT, TEXT, INTEGER, INTEGER, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_auth_failure(TEXT, TEXT, INTEGER, INTEGER, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.reset_auth_rate_limit(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_dual_auth_rate_limit(TEXT, TEXT, INTEGER, INTEGER, INTEGER, TEXT, TEXT, INTEGER, INTEGER, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.acquire_auth_inflight_slot(TEXT, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_auth_inflight_slot(TEXT) TO service_role;
