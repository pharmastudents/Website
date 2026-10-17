import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Logo } from "@/components/site/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore, YEARS, semestersForYear } from "@/lib/store";
import { toast } from "sonner";
import { UserPlus, ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
});

export default function RegisterPage() {
  const { register, session, ready } = useStore();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [college, setCollege] = useState("");
  const [year, setYear] = useState<number>(1);
  const [semester, setSemester] = useState<number>(1);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Auto-redirect if already logged in
  useEffect(() => {
    if (ready && session) {
      if (session.role === "admin") {
        void navigate({ to: "/admin" });
      } else {
        void navigate({ to: "/dashboard" });
      }
    }
  }, [ready, session, navigate]);

  const semesters = semestersForYear(year);

  const handleYearChange = (newYear: number) => {
    setYear(newYear);
    setSemester(newYear * 2 - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Please enter your full name.");
      return;
    }
    if (!email.trim()) {
      toast.error("Please enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match. Please re-enter.");
      return;
    }
    if (!agreeTerms) {
      toast.error("Please agree to the Terms of Service to continue.");
      return;
    }

    setLoading(true);
    const res = await register({
      name: name.trim(),
      email: email.trim(),
      mobile: mobile.trim(),
      college: college.trim(),
      year,
      semester,
      password,
    });
    setLoading(false);

    if (res.ok) {
      toast.success("Account created successfully! Welcome to PharmaStudents.");
      void navigate({ to: "/dashboard" });
    } else {
      toast.error(res.error || "Failed to create student account.");
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

      {/* Center Card */}
      <div className="mx-auto w-full max-w-lg my-8">
        <div className="rounded-3xl border border-border bg-card p-8 sm:p-10 shadow-xl">
          <div className="text-center">
            <h1 className="text-2xl font-extrabold text-foreground">Create Student Account</h1>
            <p className="mt-2 text-xs text-muted-foreground">
              Join thousands of B.Pharm students and organize your semester study materials.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Full Name</label>
              <Input
                required
                placeholder="e.g. Aditi Rao"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 h-11"
                disabled={loading}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Email Address</label>
                <Input
                  required
                  type="email"
                  autoComplete="email"
                  placeholder="aditi@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1.5 h-11"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Mobile Number</label>
                <Input
                  type="tel"
                  autoComplete="tel"
                  placeholder="9876543210 (optional)"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="mt-1.5 h-11"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground">Pharmacy College Name</label>
              <Input
                placeholder="e.g. Government College of Pharmacy"
                value={college}
                onChange={(e) => setCollege(e.target.value)}
                className="mt-1.5 h-11"
                disabled={loading}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Current B.Pharm Year</label>
                <select
                  aria-label="Select B.Pharm Year"
                  value={year}
                  onChange={(e) => handleYearChange(Number(e.target.value))}
                  disabled={loading}
                  className="mt-1.5 h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus:ring-2 focus:ring-primary"
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y}>
                      Year {y}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Semester</label>
                <select
                  aria-label="Select Semester"
                  value={semester}
                  onChange={(e) => setSemester(Number(e.target.value))}
                  disabled={loading}
                  className="mt-1.5 h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus:ring-2 focus:ring-primary"
                >
                  {semesters.map((s) => (
                    <option key={s} value={s}>
                      Semester {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Password Fields with Toggle */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Create Password</label>
                <div className="relative mt-1.5">
                  <Input
                    required
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Min 6 characters"
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

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Confirm Password</label>
                <div className="relative mt-1.5">
                  <Input
                    required
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Repeat password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-11 pr-10"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Terms Acceptance */}
            <div className="flex items-start gap-2 pt-1">
              <input
                id="terms"
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="mt-1 size-4 rounded border-border text-primary focus:ring-primary"
                disabled={loading}
              />
              <label htmlFor="terms" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                I agree to the{" "}
                <Link to="/terms" target="_blank" className="text-primary hover:underline font-medium">
                  Terms of Service
                </Link>{" "}
                and acknowledge the privacy policy for students.
              </label>
            </div>

            <Button type="submit" disabled={loading} className="w-full h-11 font-bold">
              {loading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" /> Creating Account...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 size-4" /> Create Student Account
                </>
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Already registered?{" "}
            <Link to="/login" className="font-bold text-primary hover:underline">
              Log in to your account
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
