import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useStore, YEARS, semestersForYear, slugify } from "@/lib/store";
import { toast } from "sonner";
import { ArrowLeft, Save, FolderPlus } from "lucide-react";

export const Route = createFileRoute("/admin/subjects/create")({
  component: AdminCreateSubjectPage,
});

export default function AdminCreateSubjectPage() {
  const { saveSubject } = useStore();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [year, setYear] = useState<number>(1);
  const [semester, setSemester] = useState<number>(1);
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");

  const semesters = semestersForYear(year);

  const handleYearChange = (newYear: number) => {
    setYear(newYear);
    setSemester(newYear * 2 - 1);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Please enter a subject name.");
      return;
    }

    const subjectId = slugify(name.trim());

    saveSubject({
      id: subjectId,
      name: name.trim(),
      code: code.trim().toUpperCase() || undefined,
      year,
      semester,
      description: description.trim() || `PCI syllabus curriculum for ${name.trim()}.`,
      status,
    });

    toast.success(`Subject "${name.trim()}" successfully created!`);
    void navigate({ to: "/admin/subjects" });
  };

  return (
    <AdminLayout
      title="Create New Subject"
      subtitle="Add a new academic subject module to the PCI curriculum directory."
      actions={
        <Button asChild variant="outline" size="sm">
          <Link to="/admin/subjects">
            <ArrowLeft className="mr-1.5 size-4" /> Cancel & Back
          </Link>
        </Button>
      }
    >
      <div className="mx-auto max-w-2xl">
        <form onSubmit={handleSubmit} className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-xs space-y-6">
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Subject Name *</label>
            <Input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Pharmaceutical Biotechnology"
              className="mt-1.5 h-11"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground">PCI Subject Code</label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. BP605T"
              className="mt-1.5 h-11 uppercase"
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Academic Year *</label>
              <select
                aria-label="Academic Year"
                value={year}
                onChange={(e) => handleYearChange(Number(e.target.value))}
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
              <label className="text-xs font-semibold text-muted-foreground">Semester *</label>
              <select
                aria-label="Semester"
                value={semester}
                onChange={(e) => setSemester(Number(e.target.value))}
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

          <div>
            <label className="text-xs font-semibold text-muted-foreground">Subject Description</label>
            <Textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief overview of course modules, theory, and lab syllabus..."
              className="mt-1.5"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground">Status</label>
            <div className="mt-2 flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                <input
                  type="radio"
                  name="subjectStatus"
                  checked={status === "active"}
                  onChange={() => setStatus("active")}
                />
                <span>Active (Available for notes)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                <input
                  type="radio"
                  name="subjectStatus"
                  checked={status === "inactive"}
                  onChange={() => setStatus("inactive")}
                />
                <span>Inactive</span>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => void navigate({ to: "/admin/subjects" })}
            >
              Cancel
            </Button>
            <Button type="submit" size="lg" className="px-8 font-bold">
              <Save className="mr-2 size-5" /> Save Subject
            </Button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
