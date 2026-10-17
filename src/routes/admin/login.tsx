import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Logo } from "@/components/site/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/store";
import { toast } from "sonner";
import { ShieldCheck, LogIn, ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin/login")({
  component: AdminLoginPage,
});

export default function AdminLoginPage() {
  const { adminLogin, isAdmin, ready } = useStore();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Auto-redirect if already authenticated as administrator
  useEffect(() => {
    if (ready && isAdmin) {
      void navigate({ to: "/admin" });
    }
  }, [ready, isAdmin, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("Please provide both email and password.");
      return;
    }

    setLoading(true);
    const res = await adminLogin(email, password);
    setLoading(false);

    if (res.ok) {
      toast.success("Administrator authentication verified.");
      void navigate({ to: "/admin" });
    } else {
      toast.error(res.error || "Invalid administrator credentials.");
    }
  };

  return (
    <div className="flex min-h-screen flex-col justify-between bg-gradient-to-b from-muted/30 to-background px-4 py-8">
      {/* Top minimal bar */}
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between">
        <Logo to="/" />
        <Button asChild variant="ghost" size="sm">
          <Link to="/">
            <ArrowLeft className="mr-1.5 size-4" /> Back to Website
          </Link>
        </Button>
      </div>

      {/* Center Auth Card */}
      <div className="mx-auto w-full max-w-md my-auto">
        <div className="rounded-3xl border border-border bg-card p-8 sm:p-10 shadow-xl">
          <div className="text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ShieldCheck className="size-6" />
            </div>
            <h1 className="mt-4 text-2xl font-extrabold text-foreground">Administrator Access</h1>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Sign in with authorized administrator credentials to manage subjects, materials, and student accounts.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Admin Email</label>
              <Input
                required
                type="email"
                autoComplete="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                  <Loader2 className="mr-2 size-4 animate-spin" /> Authenticating...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 size-4" /> Access Admin Console
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-3.5 text-center text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Authorized Access Only</span>
            <p className="mt-0.5 text-[11px]">
              Administrative rights are restricted to authorized personnel. Use your Supabase administrator account to sign in.
            </p>
          </div>
        </div>
      </div>

      {/* Minimal note - NO PUBLIC FOOTER */}
      <div className="text-center text-[11px] text-muted-foreground">
        © {new Date().getFullYear()} PharmaStudents.com. Administrative Operations Only.
      </div>
    </div>
  );
}

