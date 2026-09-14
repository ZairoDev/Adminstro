/**
 * Single source of truth for PIP-lock user-facing copy.
 *
 * Used by:
 * - the login route (403 response when a PIP-locked employee tries to sign in)
 * - the force-logout socket payload (real-time kick toast for an already-open session)
 * - the "Issue PIP" confirmation/success messaging in the People / employee details pages
 *
 * Keeping this centralized means the wording never drifts across surfaces.
 */
export const PIP_LOCK_LOGIN_MESSAGE =
  "Your profile has been locked because you've been placed on a Performance Improvement Plan (PIP). Please contact HR to have your account unlocked.";
export const PIP_LOCK_SESSION_MESSAGE =
  "You've been logged out because your profile has been locked for a Performance Improvement Plan (PIP). Please contact HR to have your account unlocked.";
export const MANUAL_LOCK_LOGIN_MESSAGE =
  "Your account has been locked. Please contact the administrator to unlock your account.";