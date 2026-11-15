-- ============================================================================
-- GHN EXECUTIVE BI – INCIDENT CENTER (PHASE 1.1 – SQL SECURITY HARDENING)
-- Target: Supabase PostgreSQL (Region: Singapore)
-- Security Model: Backend-Only Access (Vercel Serverless via service_role)
--
-- HONEST SECURITY BOUNDARY NOTICE:
-- Database triggers, REVOKE grants, and SHA-256 hash chaining enforce
-- strict append-only integrity at the Application and service_role layers.
-- They CANNOT defeat a Supabase project owner / PostgreSQL superuser
-- (postgres role) who disables triggers or modifies tables directly.
-- Therefore, this migration provides Application/DB-Role Append-Only
-- Integrity (NOT hardware WORM / absolute immutability). Independent
-- external snapshots remain necessary to detect DBA-level tampering.
-- ============================================================================

-- Enable pgcrypto for gen_random_uuid() and digest(..., 'sha256')
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------------------
-- SHARED HELPER: Automatic updated_at maintenance
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- SHARED HELPER: Block DELETE / TRUNCATE on protected operational history
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_record_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
BEGIN
    RAISE EXCEPTION 'SECURITY VIOLATION: % on %.% is prohibited; use CLOSED, DUPLICATE, or is_archived instead',
        TG_OP, TG_TABLE_SCHEMA, TG_TABLE_NAME;
END;
$$;

-- ----------------------------------------------------------------------------
-- 1. USER RBAC POLICIES (Server-Side Authoritative Role & Permissions)
-- Zero hardcoded identities. Case-insensitive uniqueness enforced.
-- Seed template in Section 11 uses ON CONFLICT DO NOTHING (never overwrites).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_rbac_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL CHECK (BTRIM(username) <> ''),
    email TEXT,
    display_name TEXT NOT NULL CHECK (BTRIM(display_name) <> ''),
    role TEXT NOT NULL CHECK (role IN ('admin', 'area_manager', 'viewer')),
    permissions TEXT[] NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Only recognized permissions are allowed
    CONSTRAINT chk_valid_permissions CHECK (
        permissions <@ ARRAY['incident_management', 'incident_intake_submit']::TEXT[]
    ),
    -- Strict RBAC coupling:
    --   * 'incident_management' strictly requires role = 'admin'
    --   * 'incident_intake_submit' strictly requires role = 'area_manager'
    CONSTRAINT chk_rbac_permission_role_lock CHECK (
        (NOT ('incident_management' = ANY(permissions)) OR role = 'admin')
        AND
        (NOT ('incident_intake_submit' = ANY(permissions)) OR role = 'area_manager')
    )
);

-- Normalize username/email (trimmed lowercase) before insert/update
CREATE OR REPLACE FUNCTION public.normalize_rbac_identity()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
BEGIN
    NEW.username := LOWER(BTRIM(NEW.username));
    IF NEW.email IS NOT NULL THEN
        NEW.email := NULLIF(LOWER(BTRIM(NEW.email)), '');
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_rbac_identity ON public.user_rbac_policies;
CREATE TRIGGER trg_normalize_rbac_identity
BEFORE INSERT OR UPDATE ON public.user_rbac_policies
FOR EACH ROW EXECUTE FUNCTION public.normalize_rbac_identity();

DROP TRIGGER IF EXISTS trg_user_rbac_updated_at ON public.user_rbac_policies;
CREATE TRIGGER trg_user_rbac_updated_at
BEFORE UPDATE ON public.user_rbac_policies
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Case-insensitive uniqueness indexes (blocks 'AdminUser' vs 'adminuser')
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_rbac_username_ci
    ON public.user_rbac_policies (LOWER(BTRIM(username)));
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_rbac_email_ci
    ON public.user_rbac_policies (LOWER(BTRIM(email)))
    WHERE email IS NOT NULL AND BTRIM(email) <> '';

-- ----------------------------------------------------------------------------
-- 2. SLA & RETENTION CONFIGURATION POLICIES (Initially NOT CONFIGURED)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.incident_sla_policies (
    priority TEXT PRIMARY KEY CHECK (priority IN ('P1', 'P2', 'P3', 'P4')),
    ack_minutes INTEGER CHECK (ack_minutes IS NULL OR ack_minutes > 0),
    mitigation_minutes INTEGER CHECK (mitigation_minutes IS NULL OR mitigation_minutes > 0),
    resolution_minutes INTEGER CHECK (resolution_minutes IS NULL OR resolution_minutes > 0),
    is_configured BOOLEAN NOT NULL DEFAULT FALSE,
    is_24_7 BOOLEAN NOT NULL DEFAULT TRUE,
    updated_by TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_sla_policy_consistency CHECK (
        (is_configured = FALSE AND ack_minutes IS NULL AND mitigation_minutes IS NULL AND resolution_minutes IS NULL)
        OR
        (is_configured = TRUE
         AND ack_minutes IS NOT NULL
         AND mitigation_minutes IS NOT NULL
         AND resolution_minutes IS NOT NULL
         AND ack_minutes <= mitigation_minutes
         AND mitigation_minutes <= resolution_minutes)
    )
);

DROP TRIGGER IF EXISTS trg_sla_policies_updated_at ON public.incident_sla_policies;
CREATE TRIGGER trg_sla_policies_updated_at
BEFORE UPDATE ON public.incident_sla_policies
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed 4 priorities in strictly NOT CONFIGURED state (zero AI-invented defaults)
INSERT INTO public.incident_sla_policies (priority, ack_minutes, mitigation_minutes, resolution_minutes, is_configured, is_24_7)
VALUES
    ('P1', NULL, NULL, NULL, FALSE, TRUE),
    ('P2', NULL, NULL, NULL, FALSE, TRUE),
    ('P3', NULL, NULL, NULL, FALSE, TRUE),
    ('P4', NULL, NULL, NULL, FALSE, TRUE)
ON CONFLICT (priority) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.incident_retention_policies (
    id TEXT PRIMARY KEY DEFAULT 'default',
    status TEXT NOT NULL DEFAULT 'NOT_CONFIGURED' CHECK (status IN ('NOT_CONFIGURED', 'CONFIGURED')),
    archive_after_days INTEGER CHECK (archive_after_days IS NULL OR archive_after_days > 0),
    audit_log_purge_enabled BOOLEAN NOT NULL DEFAULT FALSE CHECK (audit_log_purge_enabled = FALSE),
    updated_by TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_retention_consistency CHECK (
        (status = 'NOT_CONFIGURED' AND archive_after_days IS NULL)
        OR
        (status = 'CONFIGURED' AND archive_after_days IS NOT NULL AND archive_after_days > 0)
    )
);

DROP TRIGGER IF EXISTS trg_retention_policies_updated_at ON public.incident_retention_policies;
CREATE TRIGGER trg_retention_policies_updated_at
BEFORE UPDATE ON public.incident_retention_policies
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.incident_retention_policies (id, status, archive_after_days, audit_log_purge_enabled)
VALUES ('default', 'NOT_CONFIGURED', NULL, FALSE)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 3. INCIDENTS (Official Incident Registry)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_code TEXT NOT NULL UNIQUE, -- Format: INC-YYYYMMDD-XXXX
    title TEXT NOT NULL CHECK (BTRIM(title) <> ''),
    description TEXT NOT NULL CHECK (BTRIM(description) <> ''),
    category TEXT NOT NULL CHECK (category IN ('SYSTEM', 'DATA', 'INTEGRATION', 'SECURITY', 'OPERATIONAL')),
    priority TEXT NOT NULL CHECK (priority IN ('P1', 'P2', 'P3', 'P4')),
    status TEXT NOT NULL CHECK (status IN (
        'NEW', 'CLASSIFIED', 'ASSIGNED', 'INVESTIGATING',
        'MITIGATED', 'RESOLVED', 'VERIFIED', 'CLOSED',
        'REOPENED', 'DUPLICATE'
    )),

    -- Actor Attribution (Backend sets from verified JWT, never client payload)
    reported_by TEXT NOT NULL,
    reporter_role TEXT NOT NULL,
    assigned_to TEXT,
    verified_by TEXT,

    -- Segregation of Duties & Traceability
    parent_incident_id UUID REFERENCES public.incidents(id) ON DELETE RESTRICT,
    source_intake_id UUID, -- FK added after incident_intakes creation
    reopen_reason TEXT,

    -- Independent Lifecycle & SLA Milestones (Acknowledgement != Assignment)
    acknowledged_at TIMESTAMPTZ,
    assigned_at TIMESTAMPTZ,
    mitigated_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    verified_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    reopened_at TIMESTAMPTZ,

    -- SLA Deadlines (Only populated when policy was CONFIGURED at creation)
    sla_configured BOOLEAN NOT NULL DEFAULT FALSE,
    ack_deadline TIMESTAMPTZ,
    mitigation_deadline TIMESTAMPTZ,
    resolution_deadline TIMESTAMPTZ,
    is_overdue BOOLEAN NOT NULL DEFAULT FALSE,
    overdue_minutes INTEGER NOT NULL DEFAULT 0 CHECK (overdue_minutes >= 0),

    -- Optimistic Concurrency Control & Archival Flag
    version INTEGER NOT NULL DEFAULT 1,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Direct self-reference guard
    CONSTRAINT chk_no_self_duplicate CHECK (parent_incident_id IS NULL OR parent_incident_id <> id),
    -- Biconditional DUPLICATE link guard: DUPLICATE must link parent; non-DUPLICATE must have NULL parent
    CONSTRAINT chk_duplicate_parent_biconditional CHECK (
        (status = 'DUPLICATE' AND parent_incident_id IS NOT NULL)
        OR
        (status <> 'DUPLICATE' AND parent_incident_id IS NULL)
    ),
    -- Status REOPENED requires non-empty reopen_reason
    CONSTRAINT chk_reopen_requires_reason CHECK (
        status <> 'REOPENED' OR (reopen_reason IS NOT NULL AND BTRIM(reopen_reason) <> '')
    ),
    -- Any VERIFIED/CLOSED incident requires a non-empty verified_by
    CONSTRAINT chk_verified_requires_verifier CHECK (
        status NOT IN ('VERIFIED', 'CLOSED')
        OR (verified_by IS NOT NULL AND BTRIM(verified_by) <> '')
    ),
    -- P1/P2 STRICT Independent Verification:
    -- Must have assigned_to AND verified_by AND verified_by != assigned_to (case-insensitive)
    CONSTRAINT chk_p1_p2_independent_verify CHECK (
        status NOT IN ('VERIFIED', 'CLOSED')
        OR priority NOT IN ('P1', 'P2')
        OR (
            assigned_to IS NOT NULL
            AND BTRIM(assigned_to) <> ''
            AND verified_by IS NOT NULL
            AND BTRIM(verified_by) <> ''
            AND LOWER(BTRIM(verified_by)) <> LOWER(BTRIM(assigned_to))
        )
    ),
    -- When SLA is NOT CONFIGURED, deadlines and overdue markers must remain unset/false
    CONSTRAINT chk_sla_unconfigured_nulls CHECK (
        sla_configured = TRUE
        OR (
            ack_deadline IS NULL
            AND mitigation_deadline IS NULL
            AND resolution_deadline IS NULL
            AND is_overdue = FALSE
            AND overdue_minutes = 0
        )
    )
);

CREATE INDEX IF NOT EXISTS idx_incidents_status ON public.incidents (status);
CREATE INDEX IF NOT EXISTS idx_incidents_priority ON public.incidents (priority);
CREATE INDEX IF NOT EXISTS idx_incidents_category ON public.incidents (category);
CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON public.incidents (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_code ON public.incidents (incident_code);

DROP TRIGGER IF EXISTS trg_incidents_updated_at ON public.incidents;
CREATE TRIGGER trg_incidents_updated_at
BEFORE UPDATE ON public.incidents
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Concurrency-safe, unlimited-depth duplicate cycle prevention
-- Uses transaction advisory lock to serialize concurrent reverse-link attempts (A->B & B->A)
CREATE OR REPLACE FUNCTION public.prevent_duplicate_cycle()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
DECLARE
    current_parent UUID;
    next_parent UUID;
    visited UUID[];
BEGIN
    IF NEW.parent_incident_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Serialize duplicate graph mutations across concurrent transactions
    PERFORM pg_advisory_xact_lock(hashtext('public.incidents_duplicate_graph'));

    visited := ARRAY[NEW.id];
    current_parent := NEW.parent_incident_id;

    WHILE current_parent IS NOT NULL LOOP
        IF current_parent = ANY(visited) THEN
            RAISE EXCEPTION 'Circular DUPLICATE incident reference detected involving incident %', current_parent;
        END IF;
        visited := array_append(visited, current_parent);
        SELECT parent_incident_id INTO next_parent FROM public.incidents WHERE id = current_parent;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Target parent_incident_id % does not exist', current_parent;
        END IF;
        current_parent := next_parent;
    END LOOP;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_duplicate_cycle ON public.incidents;
CREATE TRIGGER trg_prevent_duplicate_cycle
BEFORE INSERT OR UPDATE OF parent_incident_id ON public.incidents
FOR EACH ROW EXECUTE FUNCTION public.prevent_duplicate_cycle();

DROP TRIGGER IF EXISTS trg_prevent_incidents_delete ON public.incidents;
CREATE TRIGGER trg_prevent_incidents_delete
BEFORE DELETE ON public.incidents
FOR EACH ROW EXECUTE FUNCTION public.prevent_record_deletion();

DROP TRIGGER IF EXISTS trg_prevent_incidents_truncate ON public.incidents;
CREATE TRIGGER trg_prevent_incidents_truncate
BEFORE TRUNCATE ON public.incidents
FOR EACH STATEMENT EXECUTE FUNCTION public.prevent_record_deletion();

-- ----------------------------------------------------------------------------
-- 4. INCIDENT INTAKES (Segregated 1-Way Reports from Area Managers)
-- Unapproved intakes are strictly isolated from official incident KPIs.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.incident_intakes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tracking_code TEXT NOT NULL UNIQUE, -- Format: INTK-YYYYMMDD-XXXX
    title TEXT NOT NULL CHECK (BTRIM(title) <> ''),
    description TEXT NOT NULL CHECK (BTRIM(description) <> ''),
    category TEXT NOT NULL CHECK (category IN ('SYSTEM', 'DATA', 'INTEGRATION', 'SECURITY', 'OPERATIONAL')),
    branch_code TEXT,
    submitted_by TEXT NOT NULL,
    submitted_role TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED')),
    reviewed_by TEXT,
    reviewed_at TIMESTAMPTZ,
    rejection_reason TEXT,
    converted_incident_id UUID REFERENCES public.incidents(id) ON DELETE RESTRICT,
    idempotency_key TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_intake_accepted_link CHECK (
        status <> 'ACCEPTED' OR converted_incident_id IS NOT NULL
    ),
    CONSTRAINT chk_intake_rejected_reason CHECK (
        status <> 'REJECTED' OR (rejection_reason IS NOT NULL AND BTRIM(rejection_reason) <> '')
    )
);

CREATE INDEX IF NOT EXISTS idx_intakes_tracking ON public.incident_intakes (tracking_code);
CREATE INDEX IF NOT EXISTS idx_intakes_status ON public.incident_intakes (status);
CREATE INDEX IF NOT EXISTS idx_intakes_submitted_by ON public.incident_intakes (submitted_by);

DROP TRIGGER IF EXISTS trg_intakes_updated_at ON public.incident_intakes;
CREATE TRIGGER trg_intakes_updated_at
BEFORE UPDATE ON public.incident_intakes
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_prevent_intakes_delete ON public.incident_intakes;
CREATE TRIGGER trg_prevent_intakes_delete
BEFORE DELETE ON public.incident_intakes
FOR EACH ROW EXECUTE FUNCTION public.prevent_record_deletion();

DROP TRIGGER IF EXISTS trg_prevent_intakes_truncate ON public.incident_intakes;
CREATE TRIGGER trg_prevent_intakes_truncate
BEFORE TRUNCATE ON public.incident_intakes
FOR EACH STATEMENT EXECUTE FUNCTION public.prevent_record_deletion();

-- Link incidents.source_intake_id -> incident_intakes.id (ON DELETE RESTRICT)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_incidents_source_intake'
    ) THEN
        ALTER TABLE public.incidents
        ADD CONSTRAINT fk_incidents_source_intake
        FOREIGN KEY (source_intake_id) REFERENCES public.incident_intakes(id) ON DELETE RESTRICT;
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 5. INCIDENT HISTORY TABLES (ON DELETE RESTRICT + Deletion Guards)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.incident_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE RESTRICT,
    event_type TEXT NOT NULL,
    from_status TEXT,
    to_status TEXT,
    actor_id TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_incident_events_inc ON public.incident_events (incident_id, created_at DESC);

DROP TRIGGER IF EXISTS trg_prevent_events_mutation ON public.incident_events;
CREATE TRIGGER trg_prevent_events_mutation
BEFORE UPDATE OR DELETE ON public.incident_events
FOR EACH ROW EXECUTE FUNCTION public.prevent_record_deletion();

DROP TRIGGER IF EXISTS trg_prevent_events_truncate ON public.incident_events;
CREATE TRIGGER trg_prevent_events_truncate
BEFORE TRUNCATE ON public.incident_events
FOR EACH STATEMENT EXECUTE FUNCTION public.prevent_record_deletion();

CREATE TABLE IF NOT EXISTS public.incident_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE RESTRICT,
    assigned_to TEXT NOT NULL,
    assigned_by TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    unassigned_at TIMESTAMPTZ,

    CONSTRAINT chk_assignment_active_unassigned_consistency CHECK (
        (is_active = TRUE AND unassigned_at IS NULL)
        OR
        (is_active = FALSE AND unassigned_at IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_incident_assign_inc ON public.incident_assignments (incident_id, is_active);

-- Enforce at most ONE active assignment per incident at any time
CREATE UNIQUE INDEX IF NOT EXISTS uq_incident_single_active_assignment
    ON public.incident_assignments (incident_id)
    WHERE is_active = TRUE;

-- Guard INSERT: enforce active initial state, block forged unassigned_at/assigned_at timestamps
CREATE OR REPLACE FUNCTION public.guard_assignment_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
BEGIN
    IF NEW.assigned_to IS NULL OR BTRIM(NEW.assigned_to) = ''
       OR NEW.assigned_by IS NULL OR BTRIM(NEW.assigned_by) = '' THEN
        RAISE EXCEPTION 'VALIDATION VIOLATION: assigned_to and assigned_by cannot be empty';
    END IF;

    IF NEW.is_active IS DISTINCT FROM TRUE THEN
        RAISE EXCEPTION 'HISTORY VIOLATION: new assignment records must be created with is_active = TRUE';
    END IF;

    IF NEW.unassigned_at IS NOT NULL THEN
        RAISE EXCEPTION 'SECURITY VIOLATION: unassigned_at must be NULL on new assignment creation';
    END IF;

    NEW.assigned_to := BTRIM(NEW.assigned_to);
    NEW.assigned_by := BTRIM(NEW.assigned_by);
    NEW.assigned_at := clock_timestamp();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_assignment_insert ON public.incident_assignments;
CREATE TRIGGER trg_guard_assignment_insert
BEFORE INSERT ON public.incident_assignments
FOR EACH ROW EXECUTE FUNCTION public.guard_assignment_insert();

-- Only allow closing an active assignment (is_active: TRUE -> FALSE);
-- PostgreSQL enforces authoritative unassigned_at = clock_timestamp() and rejects manual timestamp injection.
CREATE OR REPLACE FUNCTION public.protect_assignment_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
BEGIN
    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.incident_id IS DISTINCT FROM OLD.incident_id
       OR NEW.assigned_to IS DISTINCT FROM OLD.assigned_to
       OR NEW.assigned_by IS DISTINCT FROM OLD.assigned_by
       OR NEW.assigned_at IS DISTINCT FROM OLD.assigned_at THEN
        RAISE EXCEPTION 'SECURITY VIOLATION: immutable columns on public.incident_assignments cannot be modified';
    END IF;

    IF OLD.is_active = FALSE THEN
        RAISE EXCEPTION 'HISTORY VIOLATION: closed assignment record % cannot be altered', OLD.id;
    END IF;

    IF NEW.is_active <> FALSE THEN
        RAISE EXCEPTION 'HISTORY VIOLATION: incident_assignments updates may only deactivate (is_active = FALSE)';
    END IF;

    IF NEW.unassigned_at IS DISTINCT FROM OLD.unassigned_at THEN
        RAISE EXCEPTION 'SECURITY VIOLATION: unassigned_at cannot be manually supplied; PostgreSQL sets it automatically on close';
    END IF;

    NEW.unassigned_at := clock_timestamp();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_assignment_history ON public.incident_assignments;
CREATE TRIGGER trg_protect_assignment_history
BEFORE UPDATE ON public.incident_assignments
FOR EACH ROW EXECUTE FUNCTION public.protect_assignment_history();

DROP TRIGGER IF EXISTS trg_prevent_assignments_delete ON public.incident_assignments;
CREATE TRIGGER trg_prevent_assignments_delete
BEFORE DELETE ON public.incident_assignments
FOR EACH ROW EXECUTE FUNCTION public.prevent_record_deletion();

DROP TRIGGER IF EXISTS trg_prevent_assignments_truncate ON public.incident_assignments;
CREATE TRIGGER trg_prevent_assignments_truncate
BEFORE TRUNCATE ON public.incident_assignments
FOR EACH STATEMENT EXECUTE FUNCTION public.prevent_record_deletion();

CREATE TABLE IF NOT EXISTS public.incident_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE RESTRICT,
    author_id TEXT NOT NULL,
    author_role TEXT NOT NULL,
    body TEXT NOT NULL CHECK (BTRIM(body) <> ''),
    is_edited BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ,

    CONSTRAINT chk_comment_edit_consistency CHECK (
        (is_edited = FALSE AND updated_at IS NULL)
        OR
        (is_edited = TRUE AND updated_at IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_incident_comments_inc ON public.incident_comments (incident_id, created_at ASC);

-- Only body text may be corrected; author/incident/timestamps remain strictly immutable.
-- Backend Phase 2 MUST wrap comment updates with incident_audit_logs insertion (before_value & after_value)
-- in the same DB transaction.
CREATE OR REPLACE FUNCTION public.protect_comment_immutable_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
BEGIN
    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.incident_id IS DISTINCT FROM OLD.incident_id
       OR NEW.author_id IS DISTINCT FROM OLD.author_id
       OR NEW.author_role IS DISTINCT FROM OLD.author_role
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
        RAISE EXCEPTION 'SECURITY VIOLATION: immutable metadata on public.incident_comments cannot be modified';
    END IF;

    IF NEW.body IS NOT DISTINCT FROM OLD.body THEN
        RAISE EXCEPTION 'VALIDATION VIOLATION: comment body was not changed';
    END IF;

    NEW.is_edited := TRUE;
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_comment_immutable_fields ON public.incident_comments;
CREATE TRIGGER trg_protect_comment_immutable_fields
BEFORE UPDATE ON public.incident_comments
FOR EACH ROW EXECUTE FUNCTION public.protect_comment_immutable_fields();

DROP TRIGGER IF EXISTS trg_prevent_comments_delete ON public.incident_comments;
CREATE TRIGGER trg_prevent_comments_delete
BEFORE DELETE ON public.incident_comments
FOR EACH ROW EXECUTE FUNCTION public.prevent_record_deletion();

DROP TRIGGER IF EXISTS trg_prevent_comments_truncate ON public.incident_comments;
CREATE TRIGGER trg_prevent_comments_truncate
BEFORE TRUNCATE ON public.incident_comments
FOR EACH STATEMENT EXECUTE FUNCTION public.prevent_record_deletion();

CREATE TABLE IF NOT EXISTS public.incident_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE RESTRICT,
    file_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    byte_size BIGINT NOT NULL CHECK (byte_size > 0),
    storage_provider TEXT NOT NULL CHECK (storage_provider IN ('SUPABASE_STORAGE', 'GOOGLE_DRIVE')),
    storage_path TEXT NOT NULL,
    sha256_hash TEXT,
    uploaded_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_incident_evidence_inc ON public.incident_evidence (incident_id);

-- Evidence forensic metadata is strictly append-only (upload new record rather than mutating hashes/paths)
DROP TRIGGER IF EXISTS trg_prevent_evidence_mutation ON public.incident_evidence;
CREATE TRIGGER trg_prevent_evidence_mutation
BEFORE UPDATE OR DELETE ON public.incident_evidence
FOR EACH ROW EXECUTE FUNCTION public.prevent_record_deletion();

DROP TRIGGER IF EXISTS trg_prevent_evidence_truncate ON public.incident_evidence;
CREATE TRIGGER trg_prevent_evidence_truncate
BEFORE TRUNCATE ON public.incident_evidence
FOR EACH STATEMENT EXECUTE FUNCTION public.prevent_record_deletion();

-- ----------------------------------------------------------------------------
-- 6. MANUAL GLT/LC ORDER SNAPSHOT LINKAGES (Zero Customer PII)
-- Point-in-time snapshots are immutable once linked.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.incident_order_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE RESTRICT,
    order_id TEXT NOT NULL CHECK (BTRIM(order_id) <> ''),
    source TEXT NOT NULL CHECK (source IN ('GLT', 'LC')),
    post_office TEXT,
    operation_type TEXT CHECK (operation_type IN ('PICKUP', 'DELIVERY', 'RETURN')),
    order_status_at_snapshot TEXT,
    snapshot_timestamp TIMESTAMPTZ NOT NULL,
    linked_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_incident_order_source UNIQUE (incident_id, order_id, source)
);

CREATE INDEX IF NOT EXISTS idx_order_links_order_id ON public.incident_order_links (order_id);
CREATE INDEX IF NOT EXISTS idx_order_links_incident ON public.incident_order_links (incident_id);

DROP TRIGGER IF EXISTS trg_prevent_order_links_mutation ON public.incident_order_links;
CREATE TRIGGER trg_prevent_order_links_mutation
BEFORE UPDATE OR DELETE ON public.incident_order_links
FOR EACH ROW EXECUTE FUNCTION public.prevent_record_deletion();

DROP TRIGGER IF EXISTS trg_prevent_order_links_truncate ON public.incident_order_links;
CREATE TRIGGER trg_prevent_order_links_truncate
BEFORE TRUNCATE ON public.incident_order_links
FOR EACH STATEMENT EXECUTE FUNCTION public.prevent_record_deletion();

-- ----------------------------------------------------------------------------
-- 7. CONTROLLED TECHNICAL AUTO-DETECTION FINGERPRINTS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.incident_fingerprints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fingerprint_hash TEXT NOT NULL UNIQUE,
    source TEXT NOT NULL,
    error_type TEXT NOT NULL,
    component_context TEXT,
    incident_id UUID REFERENCES public.incidents(id) ON DELETE RESTRICT,
    occurrence_count INTEGER NOT NULL DEFAULT 1 CHECK (occurrence_count >= 1),
    first_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
    suppressed_until TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_fingerprints_hash ON public.incident_fingerprints (fingerprint_hash);

-- Atomic concurrency-safe technical fingerprint registration / deduplication.
-- Uses per-fingerprint pg_advisory_xact_lock so two concurrent sessions reporting the
-- same fingerprint_hash serialize cleanly: first creates the Incident, second deduplicates
-- onto it (incrementing occurrence_count) without unique_violation or orphan incidents.
CREATE OR REPLACE FUNCTION public.register_technical_fingerprint_incident(
    p_fingerprint_hash TEXT,
    p_source TEXT,
    p_error_type TEXT,
    p_component_context TEXT,
    p_incident_code TEXT,
    p_title TEXT,
    p_description TEXT,
    p_category TEXT,
    p_priority TEXT,
    p_actor_id TEXT,
    p_actor_role TEXT,
    p_audit_source TEXT DEFAULT 'SYSTEM_AUTO',
    p_suppression_window_minutes INTEGER DEFAULT NULL
)
RETURNS TABLE (
    deduplicated BOOLEAN,
    incident_id UUID,
    fingerprint_id UUID,
    occurrence_count INTEGER
)
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
#variable_conflict use_column
DECLARE
    v_now TIMESTAMPTZ;
    v_fp RECORD;
    v_sla RECORD;
    v_new_incident_id UUID;
    v_new_fp_id UUID;
    v_new_count INTEGER;
    v_ack_deadline TIMESTAMPTZ := NULL;
    v_mitigation_deadline TIMESTAMPTZ := NULL;
    v_resolution_deadline TIMESTAMPTZ := NULL;
    v_sla_configured BOOLEAN := FALSE;
    v_suppressed_until TIMESTAMPTZ := NULL;
BEGIN
    IF p_fingerprint_hash IS NULL OR BTRIM(p_fingerprint_hash) = '' THEN
        RAISE EXCEPTION 'VALIDATION VIOLATION: fingerprint_hash cannot be empty';
    END IF;
    IF p_actor_id IS NULL OR BTRIM(p_actor_id) = '' OR p_actor_role IS NULL OR BTRIM(p_actor_role) = '' THEN
        RAISE EXCEPTION 'SECURITY VIOLATION: verified actor_id and actor_role are required';
    END IF;

    -- Serialize concurrent sessions sharing the exact same fingerprint_hash
    PERFORM pg_advisory_xact_lock(hashtext('public.incident_fingerprints:' || p_fingerprint_hash));

    -- Capture authoritative timestamp strictly AFTER acquiring the advisory lock
    v_now := clock_timestamp();

    SELECT f.id, f.incident_id, f.occurrence_count, f.last_seen
    INTO v_fp
    FROM public.incident_fingerprints AS f
    WHERE f.fingerprint_hash = p_fingerprint_hash;

    IF FOUND THEN
        v_new_count := v_fp.occurrence_count + 1;

        UPDATE public.incident_fingerprints
        SET occurrence_count = v_new_count,
            last_seen = v_now
        WHERE id = v_fp.id;

        INSERT INTO public.incident_audit_logs (
            entity_type, entity_id, action, actor_id, actor_role, source,
            before_value, after_value, comment
        )
        VALUES (
            'INCIDENT',
            COALESCE(v_fp.incident_id::text, v_fp.id::text),
            'FINGERPRINT_DEDUPLICATED',
            p_actor_id,
            p_actor_role,
            p_audit_source,
            jsonb_build_object('fingerprint_hash', p_fingerprint_hash, 'occurrence_count', v_fp.occurrence_count, 'last_seen', v_fp.last_seen),
            jsonb_build_object('fingerprint_hash', p_fingerprint_hash, 'occurrence_count', v_new_count, 'last_seen', v_now),
            'Concurrent/repeated technical error deduplicated onto existing fingerprint'
        );

        RETURN QUERY SELECT TRUE, v_fp.incident_id, v_fp.id, v_new_count;
        RETURN;
    END IF;

    -- Evaluate SLA policy (remains NULL/FALSE while NOT CONFIGURED)
    SELECT ack_minutes, mitigation_minutes, resolution_minutes, is_configured
    INTO v_sla
    FROM public.incident_sla_policies
    WHERE priority = p_priority;

    IF FOUND AND v_sla.is_configured = TRUE THEN
        v_sla_configured := TRUE;
        v_ack_deadline := v_now + make_interval(mins => v_sla.ack_minutes);
        v_mitigation_deadline := v_now + make_interval(mins => v_sla.mitigation_minutes);
        v_resolution_deadline := v_now + make_interval(mins => v_sla.resolution_minutes);
    END IF;

    INSERT INTO public.incidents (
        incident_code, title, description, category, priority, status,
        reported_by, reporter_role,
        sla_configured, ack_deadline, mitigation_deadline, resolution_deadline
    )
    VALUES (
        p_incident_code, p_title, p_description, p_category, p_priority, 'NEW',
        p_actor_id, p_actor_role,
        v_sla_configured, v_ack_deadline, v_mitigation_deadline, v_resolution_deadline
    )
    RETURNING id INTO v_new_incident_id;

    INSERT INTO public.incident_events (
        incident_id, event_type, from_status, to_status, actor_id, actor_role, note
    )
    VALUES (
        v_new_incident_id, 'INCIDENT_DETECTED', NULL, 'NEW',
        p_actor_id, p_actor_role, 'Auto-detected via controlled technical fingerprint'
    );

    IF p_suppression_window_minutes IS NOT NULL AND p_suppression_window_minutes > 0 THEN
        v_suppressed_until := v_now + make_interval(mins => p_suppression_window_minutes);
    END IF;

    INSERT INTO public.incident_fingerprints (
        fingerprint_hash, source, error_type, component_context,
        incident_id, occurrence_count, first_seen, last_seen, suppressed_until
    )
    VALUES (
        p_fingerprint_hash, p_source, p_error_type, p_component_context,
        v_new_incident_id, 1, v_now, v_now, v_suppressed_until
    )
    RETURNING id INTO v_new_fp_id;

    INSERT INTO public.incident_audit_logs (
        entity_type, entity_id, action, actor_id, actor_role, source,
        before_value, after_value, comment
    )
    VALUES (
        'INCIDENT',
        v_new_incident_id::text,
        'INCIDENT_AUTO_DETECTED',
        p_actor_id,
        p_actor_role,
        p_audit_source,
        NULL,
        jsonb_build_object(
            'incident_code', p_incident_code,
            'category', p_category,
            'priority', p_priority,
            'status', 'NEW',
            'fingerprint_hash', p_fingerprint_hash
        ),
        'Atomic incident creation from controlled technical fingerprint'
    );

    RETURN QUERY SELECT FALSE, v_new_incident_id, v_new_fp_id, 1;
END;
$$;

-- ----------------------------------------------------------------------------
-- 8. IDEMPOTENCY KEYS (Per-Actor Concurrency & Duplicate Request Guard)
-- Composite PK (actor_id, endpoint, idempotency_key) strictly isolates
-- idempotency keys per authenticated actor across endpoints.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.incident_idempotency_keys (
    actor_id TEXT NOT NULL CHECK (BTRIM(actor_id) <> ''),
    endpoint TEXT NOT NULL CHECK (BTRIM(endpoint) <> ''),
    idempotency_key TEXT NOT NULL CHECK (BTRIM(idempotency_key) <> ''),
    request_hash TEXT NOT NULL CHECK (BTRIM(request_hash) <> ''),
    status TEXT NOT NULL DEFAULT 'IN_PROGRESS' CHECK (status IN ('IN_PROGRESS', 'COMPLETED')),
    response_status INTEGER,
    response_body JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
    PRIMARY KEY (actor_id, endpoint, idempotency_key),

    CONSTRAINT chk_idempotency_state_consistency CHECK (
        (status = 'IN_PROGRESS' AND response_status IS NULL AND response_body IS NULL)
        OR
        (status = 'COMPLETED'
         AND response_status IS NOT NULL
         AND response_status BETWEEN 100 AND 599
         AND response_body IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_idempotency_expires ON public.incident_idempotency_keys (expires_at);

-- ----------------------------------------------------------------------------
-- 9. APPEND-ONLY AUDIT LOGS WITH SERIALIZED HASH CHAIN
-- ----------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.incident_audit_logs_seq_no_seq
    AS BIGINT
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE IF NOT EXISTS public.incident_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seq_no BIGINT UNIQUE NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    action TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('UI', 'API', 'SYSTEM_AUTO')),
    before_value JSONB,
    after_value JSONB,
    comment TEXT,
    prev_hash TEXT NOT NULL,
    row_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER SEQUENCE public.incident_audit_logs_seq_no_seq OWNED BY public.incident_audit_logs.seq_no;

CREATE INDEX IF NOT EXISTS idx_audit_entity ON public.incident_audit_logs (entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_seq ON public.incident_audit_logs (seq_no DESC);

-- Serialize concurrent audit inserts & compute deterministic SHA-256 hash chain in DB.
-- Advisory xact lock guarantees seq_no assignment and prev_hash lookup are atomic.
-- NOTE ON SEQUENCE GAPS:
--   If a transaction rolls back after allocating nextval(), seq_no may contain
--   monotonic gaps (e.g. 10, 12). However, rolled-back rows do not commit, so the
--   committed hash chain (prev_hash[n] == row_hash[n-1] ordered by seq_no ASC)
--   remains unbroken and cryptographically verifiable.
-- HASH VERIFICATION CONTRACT (Backend & External Backup Verifier):
--   1. Genesis prev_hash = 'GENESIS_000000000000000000000000000000000000000000000000000000000000'
--   2. Element order [0..11]: [prev_hash, seq_no, entity_type, entity_id, action, actor_id,
--      actor_role, source, before_value, after_value, comment, utc_micros_iso]
--   3. Timestamp [11]: to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
--   4. Serialization: PostgreSQL jsonb_build_array(...)::text (keys sorted by length then
--      lexicographically, ", " after commas, ": " after colons, RFC-8259 string escaping).
--   5. Digest: lowercase hex SHA-256 of UTF-8 canonical text.
CREATE OR REPLACE FUNCTION public.compute_audit_log_hash_chain()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
DECLARE
    v_prev_hash TEXT;
    v_canonical_payload TEXT;
BEGIN
    PERFORM pg_advisory_xact_lock(hashtext('public.incident_audit_logs_hash_chain'));

    -- Assign monotonic seq_no & authoritative wall-clock UTC timestamp inside the lock
    NEW.seq_no := nextval('public.incident_audit_logs_seq_no_seq');
    NEW.created_at := clock_timestamp();

    SELECT row_hash
    INTO v_prev_hash
    FROM public.incident_audit_logs
    ORDER BY seq_no DESC
    LIMIT 1;

    IF v_prev_hash IS NULL THEN
        v_prev_hash := 'GENESIS_000000000000000000000000000000000000000000000000000000000000';
    END IF;

    NEW.prev_hash := v_prev_hash;

    -- Canonical RFC-8259 JSONB array serialization eliminates delimiter collision ('|', newlines)
    v_canonical_payload := jsonb_build_array(
        NEW.prev_hash,
        NEW.seq_no,
        NEW.entity_type,
        NEW.entity_id,
        NEW.action,
        NEW.actor_id,
        NEW.actor_role,
        NEW.source,
        NEW.before_value,
        NEW.after_value,
        NEW.comment,
        to_char(NEW.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
    )::text;

    NEW.row_hash := encode(digest(v_canonical_payload, 'sha256'), 'hex');
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_compute_audit_log_hash_chain ON public.incident_audit_logs;
CREATE TRIGGER trg_compute_audit_log_hash_chain
BEFORE INSERT ON public.incident_audit_logs
FOR EACH ROW EXECUTE FUNCTION public.compute_audit_log_hash_chain();

-- Block UPDATE, DELETE, and TRUNCATE on incident_audit_logs
CREATE OR REPLACE FUNCTION public.prevent_audit_log_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
BEGIN
    RAISE EXCEPTION 'SECURITY VIOLATION: % on public.incident_audit_logs is strictly prohibited (append-only log)', TG_OP;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_audit_log_mutation ON public.incident_audit_logs;
CREATE TRIGGER trg_prevent_audit_log_mutation
BEFORE UPDATE OR DELETE ON public.incident_audit_logs
FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_mutation();

DROP TRIGGER IF EXISTS trg_prevent_audit_log_truncate ON public.incident_audit_logs;
CREATE TRIGGER trg_prevent_audit_log_truncate
BEFORE TRUNCATE ON public.incident_audit_logs
FOR EACH STATEMENT EXECUTE FUNCTION public.prevent_audit_log_mutation();

-- ----------------------------------------------------------------------------
-- 10. BACKEND-ONLY SECURITY LOCKDOWN (13 TABLES RLS + LEAST-PRIVILEGE GRANTS)
-- ----------------------------------------------------------------------------
ALTER TABLE public.user_rbac_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_sla_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_retention_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_intakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_order_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_fingerprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_idempotency_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_audit_logs ENABLE ROW LEVEL SECURITY;

-- Zero access for browser-facing roles (PUBLIC, anon, authenticated)
REVOKE ALL ON public.user_rbac_policies,
              public.incident_sla_policies,
              public.incident_retention_policies,
              public.incidents,
              public.incident_intakes,
              public.incident_events,
              public.incident_assignments,
              public.incident_comments,
              public.incident_evidence,
              public.incident_order_links,
              public.incident_fingerprints,
              public.incident_idempotency_keys,
              public.incident_audit_logs
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON SEQUENCE public.incident_audit_logs_seq_no_seq
FROM PUBLIC, anon, authenticated;

-- Least-privilege table & sequence grants for Vercel Serverless (service_role)
GRANT USAGE ON SCHEMA public TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.incident_audit_logs_seq_no_seq TO service_role;

GRANT SELECT, INSERT, UPDATE ON
    public.user_rbac_policies,
    public.incident_sla_policies,
    public.incident_retention_policies,
    public.incidents,
    public.incident_intakes,
    public.incident_assignments,
    public.incident_comments,
    public.incident_fingerprints
TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON
    public.incident_idempotency_keys
TO service_role;

GRANT SELECT, INSERT ON
    public.incident_events,
    public.incident_evidence,
    public.incident_order_links,
    public.incident_audit_logs
TO service_role;

-- Explicit revoke of destructive verbs even on service_role
REVOKE DELETE, TRUNCATE ON
    public.incidents,
    public.incident_intakes,
    public.incident_assignments,
    public.incident_comments
FROM service_role;

REVOKE UPDATE, DELETE, TRUNCATE ON
    public.incident_events,
    public.incident_evidence,
    public.incident_order_links,
    public.incident_audit_logs
FROM service_role;

-- Restrict atomic fingerprint RPC strictly to Backend (service_role)
REVOKE ALL ON FUNCTION public.register_technical_fingerprint_incident(
    TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.register_technical_fingerprint_incident(
    TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER
) TO service_role;

-- ----------------------------------------------------------------------------
-- 11. SAFE RBAC SEED TEMPLATE FOR AM HUY (MANUAL EXECUTION ONLY)
-- Instructions:
--   1. Uncomment the block below ONLY when ready to insert approved accounts.
--   2. Replace <PLACEHOLDER> values with actual approved usernames & emails.
--   3. ON CONFLICT DO NOTHING ensures existing roles/permissions are NEVER
--      silently overwritten on duplicate username or email.
-- ----------------------------------------------------------------------------
/*
INSERT INTO public.user_rbac_policies (username, email, display_name, role, permissions)
VALUES
    ('<ADMIN_USERNAME>', '<ADMIN_EMAIL>', '<ADMIN_DISPLAY_NAME>', 'admin', ARRAY['incident_management']),
    ('<AM_USERNAME>', '<AM_EMAIL>', '<AM_DISPLAY_NAME>', 'area_manager', ARRAY['incident_intake_submit'])
ON CONFLICT DO NOTHING;
*/
