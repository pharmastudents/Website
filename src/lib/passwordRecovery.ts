/**
 * Tracks whether the current browser session came from a Supabase password
 * recovery link. A recovery link signs the user in with a limited session, so
 * the app must not treat them as normally logged in until they set a new
 * password — otherwise clicking "reset password" would drop them straight onto
 * the dashboard while the reset page is still open.
 */
const RECOVERY_FLAG_KEY = "sp_password_recovery";

export function isPasswordRecoveryActive(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(RECOVERY_FLAG_KEY) === "1";
  } catch {
    return false;
  }
}

export function setPasswordRecoveryActive(active: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (active) window.localStorage.setItem(RECOVERY_FLAG_KEY, "1");
    else window.localStorage.removeItem(RECOVERY_FLAG_KEY);
  } catch {
    /* ignore */
  }
}
