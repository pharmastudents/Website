import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Logo } from "@/components/site/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/store";
import { isPasswordRecoveryActive } from "@/lib/passwordRecovery";
import {
  friendlyAuthError,
  isPasswordAllowed,
  passwordRules,
  passwordStrength,
} from "@/lib/passwordPolicy";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  CircleCheck,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  ShieldAlert,
  X,
} from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string | undefined } => ({
    redirect: typeof search["redirect"] === "string" ? search["redirect"] : undefined,
  }),
  component: ResetPasswordPage,
});

type LinkState = "checking" | "ready" | "invalid";

export default function ResetPasswordPage() {
  const { redirect } = Route.useSearch();
  const { updatePassword } = useStore();
  const navigate = useNavigate();

  const [linkState, setLinkState] = useState<LinkState>("checking");
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const rules = useMemo(() => passwordRules(password), [password]);
  const strength = useMemo(() => passwordStrength(password), [password]);
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;

  // The recovery link arrives as a PKCE `?code=` or `#access_token=` fragment.
  // supabase-js parses the fragment automatically; the PKCE code has to be
  // exchanged here before updateUser() can run.
  useEffect(() => {
    let cancelled = false;

    async function establishRecoverySession() {
      const query = new URLSearchParams(window.location.search);
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));

      const errorDescription =
        query.get("error_description") ?? hash.get("error_description") ?? hash.get("error");
      if (errorDescription) {
        if (!cancelled) setLinkState("invalid");
        return;
      }

      // Preferred, device-independent form: /reset-password?token_hash=...&type=recovery
      // (works even if the email is opened on a different phone/laptop).
      const tokenHash = query.get("token_hash");
      if (tokenHash) {
        const { error } = await supabase.auth.verifyOtp({
          type: "recovery",
          token_hash: tokenHash,
        });
        if (error && !cancelled) {
          setLinkState("invalid");
          return;
        }
      }

      const code = query.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error && !cancelled) {
          setLinkState("invalid");
          return;
        }
        // Strip the one-time code so a refresh can't replay it.
        window.history.replaceState({}, "", "/reset-password" + window.location.hash);
      }

      const { data } = await supabase.auth.getSession();
      if (cancelled) return;

      if (data.session?.user) {
        setAccountEmail(data.session.user.email ?? null);
        setLinkState("ready");
      } else {
        setLinkState("invalid");
      }
    }

    void establishRecoverySession();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isPasswordAllowed(password)) {
      toast.error("Please choose a password that meets all the requirements below.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match. Please re-enter them.");
      return;
    }

    setSaving(true);
    const res = await updatePassword(password);
    setSaving(false);

    if (!res.ok) {
      toast.error(
        friendlyAuthError(res.error, "Could not update your password. Please try again."),
      );
      if (/expired|missing|session/i.test(res.error ?? "")) setLinkState("invalid");
      return;
    }

    setDone(true);
    toast.success("Password updated. You can sign in with your new password.");
  };

  const goToLogin = () => {
    if (redirect) window.location.href = `/login?redirect=${encodeURIComponent(redirect)}`;
    else void navigate({ to: "/login" });
  };

  return (
    <div className="flex min-h-screen flex-col justify-between bg-gradient-to-b from-muted/30 to-background px-4 py-8">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between">
        <Logo to="/" />
        <Button asChild variant="ghost" size="sm">
          <Link to="/login">
            <ArrowLeft className="mr-1.5 size-4" /> Back to Login
          </Link>
        </Button>
      </div>

      <div className="mx-auto my-auto w-full max-w-md">
        <div className="rounded-3xl border border-border bg-card p-8 shadow-xl sm:p-10">
          {done ? (
            <div className="text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
                <CircleCheck className="size-6" />
              </div>
              <h1 className="mt-4 text-2xl font-extrabold text-foreground">Password updated</h1>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Your account, college details, purchases and unlocked notes are all unchanged. Sign
                in again with your new password.
              </p>
              <Button type="button" onClick={goToLogin} className="mt-6 h-11 w-full font-bold">
                Continue to Sign In
              </Button>
            </div>
          ) : linkState === "invalid" ? (
            <div className="text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600">
                <ShieldAlert className="size-6" />
              </div>
              <h1 className="mt-4 text-2xl font-extrabold text-foreground">Link expired</h1>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                This password reset link is invalid, has expired, or was already used. Reset links
                can only be used once. Request a fresh one and it will work for the next hour.
              </p>
              <Button asChild className="mt-6 h-11 w-full font-bold">
                <Link to="/forgot-password">Request a new reset link</Link>
              </Button>
              <p className="mt-3 text-[11px] text-muted-foreground">
                Your current password is still active until you change it.
              </p>
            </div>
          ) : linkState === "checking" ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <Loader2 className="size-7 animate-spin text-primary" />
              <p className="text-xs font-semibold text-muted-foreground">
                Verifying your reset link...
              </p>
            </div>
          ) : (
            <>
              <div className="text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <KeyRound className="size-6" />
                </div>
                <h1 className="mt-4 text-2xl font-extrabold text-foreground">Set a new password</h1>
                <p className="mt-2 text-xs text-muted-foreground">
                  {accountEmail ? (
                    <>
                      Resetting the password for{" "}
                      <span className="font-semibold text-foreground">{accountEmail}</span>.
                    </>
                  ) : (
                    "Choose a new password for your account."
                  )}
                </p>
              </div>

              {!isPasswordRecoveryActive() && (
                <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-[11px] font-medium text-amber-800">
                  Heads up: this page was opened directly. If your reset link has expired,{" "}
                  <Link to="/forgot-password" className="font-bold underline">
                    request a new one
                  </Link>
                  .
                </p>
              )}

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label
                    htmlFor="new-password"
                    className="text-xs font-semibold text-muted-foreground"
                  >
                    New Password
                  </label>
                  <div className="relative mt-1.5">
                    <Input
                      id="new-password"
                      required
                      autoFocus
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11 pr-10"
                      disabled={saving}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>

                  {password.length > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex h-1.5 flex-1 gap-1" aria-hidden="true">
                        {[1, 2, 3, 4].map((step) => (
                          <span
                            key={step}
                            className={`h-full flex-1 rounded-full transition-colors ${
                              strength.score >= step
                                ? strength.tone === "weak"
                                  ? "bg-red-500"
                                  : strength.tone === "fair"
                                    ? "bg-amber-500"
                                    : strength.tone === "good"
                                      ? "bg-teal-500"
                                      : "bg-emerald-600"
                                : "bg-muted"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="w-14 text-right text-[11px] font-semibold text-muted-foreground">
                        {strength.label}
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="confirm-password"
                    className="text-xs font-semibold text-muted-foreground"
                  >
                    Confirm New Password
                  </label>
                  <Input
                    id="confirm-password"
                    required
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="mt-1.5 h-11"
                    disabled={saving}
                    aria-describedby="confirm-hint"
                  />
                  {confirmPassword.length > 0 && (
                    <p
                      id="confirm-hint"
                      className={`mt-1.5 text-[11px] font-semibold ${
                        passwordsMatch ? "text-emerald-600" : "text-destructive"
                      }`}
                    >
                      {passwordsMatch ? "Passwords match" : "Passwords do not match"}
                    </p>
                  )}
                </div>

                <ul className="space-y-1 rounded-2xl border border-border bg-muted/40 p-3">
                  {rules.map((rule) => (
                    <li
                      key={rule.id}
                      className={`flex items-center gap-2 text-[11px] ${
                        rule.ok ? "font-semibold text-emerald-700" : "text-muted-foreground"
                      }`}
                    >
                      {rule.ok ? (
                        <Check className="size-3.5" />
                      ) : (
                        <X className="size-3.5 opacity-60" />
                      )}
                      {rule.label}
                    </li>
                  ))}
                </ul>

                <Button
                  type="submit"
                  disabled={saving || !isPasswordAllowed(password) || password !== confirmPassword}
                  className="h-11 w-full font-bold"
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" /> Updating password...
                    </>
                  ) : (
                    "Update Password"
                  )}
                </Button>
              </form>

              <p className="mt-6 text-center text-[11px] text-muted-foreground">
                Remembered your password?{" "}
                <Link to="/login" className="font-semibold text-primary hover:underline">
                  Sign in instead
                </Link>
              </p>
            </>
          )}
        </div>
      </div>

      <div className="text-center text-[11px] text-muted-foreground">
        © {new Date().getFullYear()} PharmaStudents.com. Protected Academic Portal.
      </div>
    </div>
  );
}
