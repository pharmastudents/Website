import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { StudentLayout } from "@/components/student/StudentLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore, YEARS, semestersForYear } from "@/lib/store";
import { toast } from "sonner";
import { User, Save, Lock, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/dashboard/profile")({
  component: ProfilePage,
});

export default function ProfilePage() {
  const { student, session, ready, updateProfile } = useStore();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [college, setCollege] = useState("");
  const [year, setYear] = useState<number>(1);
  const [semester, setSemester] = useState<number>(1);

  useEffect(() => {
    if (ready && !student && !session) {
      void navigate({ to: "/login" });
    } else if (student) {
      setName(student.name);
      setEmail(student.email);
      setMobile(student.mobile);
      setCollege(student.college);
      setYear(student.year);
      setSemester(student.semester);
    }
  }, [ready, student, navigate]);

  if (!student) return null;

  const semesters = semestersForYear(year);

  const handleYearChange = (newYear: number) => {
    setYear(newYear);
    setSemester(newYear * 2 - 1);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      mobile: mobile.trim(),
      college: college.trim(),
      year,
      semester,
    });
    toast.success("Student profile updated successfully!");
  };

  return (
    <StudentLayout
      title="Student Profile"
      subtitle="Manage your personal details, college affiliation, and academic year/semester."
    >
      <div className="max-w-2xl space-y-6">
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-xs">
          <form onSubmit={handleSave} className="space-y-5">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Full Name</label>
              <Input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Email Address</label>
                <Input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Mobile Number</label>
                <Input
                  required
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground">Pharmacy College Name</label>
              <Input
                required
                value={college}
                onChange={(e) => setCollege(e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Current B.Pharm Year</label>
                <select
                  aria-label="Select B.Pharm Year"
                  value={year}
                  onChange={(e) => handleYearChange(Number(e.target.value))}
                  className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus:outline-hidden focus:ring-2 focus:ring-primary"
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
                  className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus:outline-hidden focus:ring-2 focus:ring-primary"
                >
                  {semesters.map((s) => (
                    <option key={s} value={s}>
                      Semester {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-2">
              <Button type="submit">
                <Save className="mr-2 size-4" /> Save Profile Changes
              </Button>
            </div>
          </form>
        </div>

        {/* Security & Sessions Box */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Security & Session Status</h3>
              <p className="text-xs text-muted-foreground">Your authenticated device information</p>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-border bg-muted/20 p-4 text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Account Created:</span>
              <span className="font-medium text-foreground">{new Date(student.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Active Login:</span>
              <span className="font-medium text-foreground">
                {student.lastLogin ? new Date(student.lastLogin).toLocaleString() : "Current session"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Watermark ID:</span>
              <span className="font-mono text-primary font-semibold">{student.id}</span>
            </div>
          </div>
        </div>
      </div>
    </StudentLayout>
  );
}
