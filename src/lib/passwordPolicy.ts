/**
 * Shared password policy for every place a student sets a password
 * (registration, password reset, profile). Keep this in one place so the
 * rules the UI shows always match the rules the UI enforces.
 *
 * NOTE: Supabase Auth itself is configured with password_min_length = 6.
 * The client policy is intentionally a little stricter (8 + letter + number).
 */
export const PASSWORD_MIN_LENGTH = 8;

export type PasswordRule = { id: string; label: string; ok: boolean };

export function passwordRules(password: string): PasswordRule[] {
  const value = password ?? "";
  return [
    {
      id: "length",
      label: `At least ${PASSWORD_MIN_LENGTH} characters`,
      ok: value.length >= PASSWORD_MIN_LENGTH,
    },
    {
      id: "letter",
      label: "One letter (A–Z)",
      ok: /[a-zA-Z]/.test(value),
    },
    {
      id: "number",
      label: "One number (0–9)",
      ok: /[0-9]/.test(value),
    },
  ];
}

export function isPasswordAllowed(password: string): boolean {
  return passwordRules(password).every((r) => r.ok);
}

/** Rough 0–4 strength score used only for the strength meter UI. */
export function passwordStrength(password: string): {
  score: number;
  label: string;
  tone: "weak" | "fair" | "good" | "strong";
} {
  const value = password ?? "";
  if (!value) return { score: 0, label: "", tone: "weak" };

  let score = 0;
  if (value.length >= PASSWORD_MIN_LENGTH) score += 1;
  if (value.length >= 12) score += 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
  if (/[0-9]/.test(value) && /[^a-zA-Z0-9]/.test(value)) score += 1;

  if (score <= 1) return { score: 1, label: "Weak", tone: "weak" };
  if (score === 2) return { score: 2, label: "Fair", tone: "fair" };
  if (score === 3) return { score: 3, label: "Good", tone: "good" };
  return { score: 4, label: "Strong", tone: "strong" };
}

/** Turns Supabase auth errors into copy a student can act on. */
export function friendlyAuthError(message: string | undefined, fallback: string): string {
  const raw = (message ?? "").toLowerCase();

  if (
    raw.includes("rate limit") ||
    raw.includes("only request this after") ||
    raw.includes("too many")
  ) {
    return "Too many reset emails requested. Please wait a few minutes and try again.";
  }
  if (raw.includes("same password") || raw.includes("should be different")) {
    return "Your new password must be different from your current password.";
  }
  if (raw.includes("weak") || raw.includes("password should be")) {
    return `Please choose a stronger password (at least ${PASSWORD_MIN_LENGTH} characters, with a letter and a number).`;
  }
  if (raw.includes("user not found")) {
    // Never reveal whether an account exists.
    return "If an account exists for that email, a reset link has been sent.";
  }
  if (
    raw.includes("expired") ||
    raw.includes("invalid token") ||
    raw.includes("token has expired")
  ) {
    return "This reset link has expired or was already used. Please request a new one.";
  }
  if (raw.includes("network") || raw.includes("failed to fetch")) {
    return "Network error. Please check your connection and try again.";
  }
  return message?.trim() || fallback;
}
