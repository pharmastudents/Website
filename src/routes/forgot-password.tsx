import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/site/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useStore, isPasswordRecoveryActive } from "@/lib/store";
import { friendlyAuthError } from "@/lib/passwordPolicy";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Loader2, MailCheck, ShieldQuestion } from "lucide-react";

export const Route = createFileRoute("/forgot-password")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string | undefined } => ({
    redirect: typeof search["redirect"] === "string" ? search["redirect"] : undefined,
  }),
  component: ForgotPasswordPage,
});

const RESEND_COOLDOWN_SECONDS = 60;

export default function ForgotPasswordPage() {
  const { redirect } = Route.useSearch();
  const { session, isAdmin, ready } = useStore();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Signed-in users don't need a reset link — send them back to their portal.
  useEffect(() => {
    if (ready && session) {
      void navigate({ to: isAdmin ? "/admin" : "/dashboard", replace: true });
    }
  }, [ready, session, isAdmin, navigate]);

  useEffect(() => {
    if (cooldown <= 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      return;
    }
    timerRef.current = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [cooldown]);

  const resetOptions = () => {
    if (typeof window === "undefined") return {};
    const base = `${window.location.origin}/reset-password`;
    return { redirectTo: redirect ? `${base}?redirect=${encodeURIComponent(redirect)}` : base };
  };

  const sendResetLink = async (value: string) => {
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(
      value.trim().toLowerCase(),
      resetOptions(),
    );
    setLoading(false);

    // Supabase returns success even for unknown emails (no account enumeration).
    // Only a hard rate-limit or network failure is surfaced to the student.
    if (error && !/user not found/i.test(error.message ?? "")) {
      toast.error(
        friendlyAuthError(error.message, "Could not send the reset email. Please try again."),
      );
      return false;
    }

    setSentTo(value.trim().toLowerCase());
    setCooldown(RESEND_COOLDOWN_SECONDS);
    toast.success("Reset link sent. Please check your inbox.");
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Please enter the email address you registered with.");
      return;
    }
    await sendResetLink(email);
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
          {sentTo ? (
            <div className="text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
                <MailCheck className="size-6" />
              </div>
              <h1 className="mt-4 text-2xl font-extrabold text-foreground">Check your email</h1>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                If an account exists for{" "}
                <span className="font-semibold text-foreground">{sentTo}</span>, we have sent a
                password reset link. The link works once and expires shortly.
              </p>

              <div className="mt-6 space-y-2 rounded-2xl border border-border bg-muted/40 p-4 text-left text-[11px] text-muted-foreground">
                <p className="font-semibold text-foreground">Didn't get the email?</p>
                <p>• Check your spam / promotions folder.</p>
                <p>• Make sure you entered the email you registered with.</p>
                <p>• Your existing password still works until you set a new one.</p>
              </div>

              <Button
                type="button"
                variant="outline"
                disabled={loading || cooldown > 0}
                onClick={() => void sendResetLink(sentTo)}
                className="mt-6 h-11 w-full font-bold"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" /> Sending...
                  </>
                ) : cooldown > 0 ? (
                  `Resend in ${cooldown}s`
                ) : (
                  "Resend reset link"
                )}
              </Button>

              <button
                type="button"
                onClick={() => {
                  setSentTo(null);
                  setCooldown(0);
                }}
                className="mt-3 text-xs font-semibold text-primary hover:underline"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <>
              <div className="text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <ShieldQuestion className="size-6" />
                </div>
                <h1 className="mt-4 text-2xl font-extrabold text-foreground">Forgot password?</h1>
                <p className="mt-2 text-xs text-muted-foreground">
                  Enter your registered email and we'll send you a secure link to choose a new
                  password. Your account and purchased notes stay exactly as they are.
                </p>
              </div>

              {isPasswordRecoveryActive() && (
                <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-[11px] font-medium text-amber-800">
                  A reset link is already open in this browser.{" "}
                  <Link to="/reset-password" className="font-bold underline">
                    Continue setting a new password
                  </Link>
                </p>
              )}

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label
                    htmlFor="reset-email"
                    className="text-xs font-semibold text-muted-foreground"
                  >
                    Email Address
                  </label>
                  <Input
                    id="reset-email"
                    required
                    type="email"
                    autoComplete="email"
                    autoFocus
                    placeholder="student@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1.5 h-11"
                    disabled={loading}
                  />
                </div>

                <Button type="submit" disabled={loading} className="h-11 w-full font-bold">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" /> Sending reset link...
                    </>
                  ) : (
                    <>
                      Send reset link <ArrowRight className="ml-2 size-4" />
                    </>
                  )}
                </Button>
              </form>

              <p className="mt-6 text-center text-xs text-muted-foreground">
                Remembered it?{" "}
                <Link to="/login" className="font-bold text-primary hover:underline">
                  Back to sign in
                </Link>
              </p>
              <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
                New here?{" "}
                <Link to="/register" className="font-semibold text-primary hover:underline">
                  Create a student account
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
