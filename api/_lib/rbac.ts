import type { SupabaseClient } from '@supabase/supabase-js';
import type { IncidentJwtClaims, IncidentPermission, RbacRole } from './jwt.ts';

export interface RbacPolicyRow {
  id: string;
  username: string;
  email: string | null;
  display_name: string;
  role: RbacRole;
  permissions: string[];
  is_active: boolean;
}

export type RbacResolutionStatus =
  | 'OK'
  | 'NOT_FOUND'
  | 'INACTIVE'
  | 'AMBIGUOUS'
  | 'IDENTITY_MISMATCH';

export interface ResolvedRbacPolicy {
  status: RbacResolutionStatus;
  found: boolean;
  isActive: boolean;
  role: RbacRole;
  permissions: IncidentPermission[];
  displayName?: string;
  canonicalUsername?: string;
  error?: string;
}

export function normalizeIdentityField(val: string | undefined | null): string {
  return typeof val === 'string' ? val.trim().toLowerCase() : '';
}

/**
 * Filter permissions strictly according to locked RBAC business rules:
 * - 'incident_management' strictly requires role === 'admin'
 * - 'incident_intake_submit' strictly requires role === 'area_manager'
 */
export function sanitizeRolePermissions(role: RbacRole, rawPermissions: unknown): IncidentPermission[] {
  if (!Array.isArray(rawPermissions)) return [];
  const valid: IncidentPermission[] = [];

  for (const item of rawPermissions) {
    if (item === 'incident_management' && role === 'admin') {
      valid.push('incident_management');
    } else if (item === 'incident_intake_submit' && role === 'area_manager') {
      valid.push('incident_intake_submit');
    }
  }
  return Array.from(new Set(valid));
}

/**
 * Reconcile all candidate rows matching upstream identity.
 * Rejects ambiguous multi-row matches and username/email inconsistencies without auto-selecting.
 */
export function reconcileRbacMatches(
  candidateRows: RbacPolicyRow[],
  identity: { username?: string; email?: string }
): ResolvedRbacPolicy {
  const normUsername = normalizeIdentityField(identity.username);
  const normEmail = normalizeIdentityField(identity.email);

  // Deduplicate by primary key id
  const uniqueMap = new Map<string, RbacPolicyRow>();
  for (const r of candidateRows) {
    if (r && r.id) uniqueMap.set(r.id, r);
  }
  const uniqueRows = Array.from(uniqueMap.values());

  if (uniqueRows.length === 0) {
    return {
      status: 'NOT_FOUND',
      found: false,
      isActive: true,
      role: 'viewer',
      permissions: []
    };
  }

  if (uniqueRows.length > 1) {
    return {
      status: 'AMBIGUOUS',
      found: true,
      isActive: false,
      role: 'viewer',
      permissions: [],
      error: 'Ambiguous RBAC identity: multiple matching records found'
    };
  }

  const row = uniqueRows[0];
  const rowUser = normalizeIdentityField(row.username);
  const rowEmail = normalizeIdentityField(row.email);

  // Verify username & email consistency if both are present
  if (normEmail && rowEmail && rowEmail !== normEmail) {
    return {
      status: 'IDENTITY_MISMATCH',
      found: true,
      isActive: false,
      role: 'viewer',
      permissions: [],
      error: 'RBAC identity mismatch: upstream email conflicts with policy record'
    };
  }

  if (normUsername && !normUsername.includes('@') && rowUser && rowUser !== normUsername) {
    return {
      status: 'IDENTITY_MISMATCH',
      found: true,
      isActive: false,
      role: 'viewer',
      permissions: [],
      error: 'RBAC identity mismatch: upstream username conflicts with policy record'
    };
  }

  if (!row.is_active) {
    return {
      status: 'INACTIVE',
      found: true,
      isActive: false,
      role: row.role,
      permissions: [],
      displayName: row.display_name,
      canonicalUsername: rowUser,
      error: 'Account RBAC status is inactive'
    };
  }

  return {
    status: 'OK',
    found: true,
    isActive: true,
    role: row.role,
    permissions: sanitizeRolePermissions(row.role, row.permissions),
    displayName: row.display_name,
    canonicalUsername: rowUser
  };
}

/**
 * Pure single-row evaluator (preserved for direct unit verification).
 */
export function evaluateRbacRow(row: RbacPolicyRow | null): ResolvedRbacPolicy {
  if (!row) {
    return reconcileRbacMatches([], {});
  }
  return reconcileRbacMatches([row], {
    username: row.username,
    email: row.email ?? undefined
  });
}

/**
 * Look up authoritative role & permissions from Supabase `public.user_rbac_policies`.
 * Queries across username & email (including when username is formatted as an email)
 * and fails closed if multiple conflicting records exist.
 */
export async function resolveRbacPolicyFromDb(
  supabase: SupabaseClient,
  identity: { username?: string; email?: string }
): Promise<ResolvedRbacPolicy> {
  const normUsername = normalizeIdentityField(identity.username);
  const normEmail = normalizeIdentityField(identity.email);

  if (!normUsername && !normEmail) {
    return reconcileRbacMatches([], identity);
  }

  const candidates: RbacPolicyRow[] = [];

  if (normUsername) {
    const { data, error } = await supabase
      .from('user_rbac_policies')
      .select('id, username, email, display_name, role, permissions, is_active')
      .eq('username', normUsername);

    if (error) {
      throw new Error(`RBAC lookup error: ${error.message}`);
    }
    if (Array.isArray(data)) {
      candidates.push(...(data as RbacPolicyRow[]));
    }

    // Handle case where upstream puts email into `username` and leaves `email` empty
    if (normUsername.includes('@') && !normEmail) {
      const { data: emailMatchData, error: emailMatchErr } = await supabase
        .from('user_rbac_policies')
        .select('id, username, email, display_name, role, permissions, is_active')
        .eq('email', normUsername);

      if (emailMatchErr) {
        throw new Error(`RBAC email-as-username lookup error: ${emailMatchErr.message}`);
      }
      if (Array.isArray(emailMatchData)) {
        candidates.push(...(emailMatchData as RbacPolicyRow[]));
      }
    }
  }

  if (normEmail) {
    const { data, error } = await supabase
      .from('user_rbac_policies')
      .select('id, username, email, display_name, role, permissions, is_active')
      .eq('email', normEmail);

    if (error) {
      throw new Error(`RBAC email lookup error: ${error.message}`);
    }
    if (Array.isArray(data)) {
      candidates.push(...(data as RbacPolicyRow[]));
    }
  }

  return reconcileRbacMatches(candidates, { username: normUsername, email: normEmail });
}

export interface AuthorizationCheck {
  allowed: boolean;
  status: 200 | 401 | 403;
  error?: string;
}

/**
 * Enforce backend RBAC barrier on JWT claims.
 */
export function authorizeIncidentAccess(
  claims: IncidentJwtClaims | undefined,
  requiredPermission: IncidentPermission
): AuthorizationCheck {
  if (!claims) {
    return { allowed: false, status: 401, error: 'Authentication required' };
  }

  if (!claims.rbacActive) {
    return { allowed: false, status: 403, error: 'Account RBAC status is inactive' };
  }

  if (requiredPermission === 'incident_management') {
    if (claims.role !== 'admin' || !claims.permissions.includes('incident_management')) {
      return {
        allowed: false,
        status: 403,
        error: 'Forbidden: Requires Admin role with incident_management permission'
      };
    }
    return { allowed: true, status: 200 };
  }

  if (requiredPermission === 'incident_intake_submit') {
    if (claims.role !== 'area_manager' || !claims.permissions.includes('incident_intake_submit')) {
      return {
        allowed: false,
        status: 403,
        error: 'Forbidden: Requires Area Manager role with incident_intake_submit permission'
      };
    }
    return { allowed: true, status: 200 };
  }

  return { allowed: false, status: 403, error: 'Forbidden' };
}
