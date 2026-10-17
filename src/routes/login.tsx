import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Logo } from "@/components/site/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/store";
import { toast } from "sonner";
import { LogIn, ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string | undefined } => {
    return {
      redirect: typeof search["redirect"] === "string" ? search["redirect"] : undefined,
    };
  },
  component: LoginPage,
});

export default function LoginPage() {
  const searchParams = useSearch({ from: "/login" });
  const { login, session, isAdmin, ready } = useStore();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Auto-redirect if already authenticated
  useEffect(() => {
    if (ready && session) {
      if (isAdmin) {
        void navigate({ to: "/admin" });
      } else {
        if (searchParams.redirect) {
          window.location.href = searchParams.redirect;
        } else {
          void navigate({ to: "/dashboard" });
        }
      }
    }
  }, [ready, session, isAdmin, navigate, searchParams.redirect]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      toast.error("Please enter both email and password.");
      return;
    }

    setLoading(true);
    const res = await login(identifier, password);
    setLoading(false);

    if (res.ok) {
      toast.success("Welcome back to PharmaStudents!");
      if (searchParams.redirect) {
        window.location.href = searchParams.redirect;
      } else if (res.role === "admin") {
        void navigate({ to: "/admin" });
      } else {
        void navigate({ to: "/dashboard" });
      }
    } else {
      toast.error(res.error || "Login failed. Please verify your credentials.");
    }
  };

  return (
    <div className="flex min-h-screen flex-col justify-between bg-gradient-to-b from-muted/30 to-background px-4 py-8">
      {/* Top minimal header */}
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between">
        <Logo to="/" />
        <Button asChild variant="ghost" size="sm">
          <Link to="/">
            <ArrowLeft className="mr-1.5 size-4" /> Back to Home
          </Link>
        </Button>
      </div>

      {/* Center Auth Card */}
      <div className="mx-auto w-full max-w-md my-auto">
        <div className="rounded-3xl border border-border bg-card p-8 sm:p-10 shadow-xl">
          <div className="text-center">
            <h1 className="text-2xl font-extrabold text-foreground">Student Login</h1>
            <p className="mt-2 text-xs text-muted-foreground">
              Sign in with your registered email to access your unlocked notes, syllabus, and study materials.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">
                Email Address
              </label>
              <Input
                required
                type="email"
                autoComplete="email"
                placeholder="student@example.com"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="mt-1.5 h-11"
                disabled={loading}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground">Password</label>
              <div className="relative mt-1.5">
                <Input
                  required
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 pr-10"
                  disabled={loading}
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
            </div>

            <Button type="submit" disabled={loading} className="w-full h-11 font-bold">
              {loading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" /> Signing in...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 size-4" /> Sign In
                </>
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Don't have an account yet?{" "}
            <Link to="/register" className="font-bold text-primary hover:underline">
              Create student account
            </Link>
          </p>
        </div>
      </div>

      {/* Minimal copyright note - NO PUBLIC FOOTER */}
      <div className="text-center text-[11px] text-muted-foreground">
        © {new Date().getFullYear()} PharmaStudents.com. Protected Academic Portal.
      </div>
    </div>
  );
}

