import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AcademicService, type Course, type Semester } from "@/lib/academicService";
import { toast } from "sonner";
import {
  FolderTree,
  ArrowLeft,
  Save,
  Loader2,
  GraduationCap,
  Layers,
  Sparkles,
  Info,
} from "lucide-react";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/admin/courses/create")({
  validateSearch: (search: Record<string, unknown>): { courseId?: string } => ({
    courseId: typeof search.courseId === "string" ? search.courseId : undefined,
  }),
  component: AdminCreateCoursePage,
});

export default function AdminCreateCoursePage() {
  const navigate = useNavigate();
  const { isAdmin, ready } = useStore();
  const search = Route.useSearch();
  const editingCourseId = search.courseId;

  // Existing courses (for duplication check & editing)
  const [existingCourses, setExistingCourses] = useState<Course[]>([]);
  const [existingSemesters, setExistingSemesters] = useState<Semester[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [durationYears, setDurationYears] = useState<number>(4);
  const [totalSemesters, setTotalSemesters] = useState<number>(8);
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState<boolean>(true);

  // Auto-generate code from name if user hasn't explicitly customized it
  const [codeTouched, setCodeTouched] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      try {
        const store = await AcademicService.loadAll();
        if (!isMounted) return;
        setExistingCourses(store.courses);
        setExistingSemesters(store.semesters);

        if (editingCourseId) {
          const match = store.courses.find((c) => c.id === editingCourseId);
          if (match) {
            setName(match.name);
            setCode(match.code);
            setDurationYears(match.duration_years || 4);
            setTotalSemesters(match.total_semesters || (match.duration_years || 4) * 2);
            setDescription(match.description || "");
            setIsActive(match.is_active ?? true);
            setCodeTouched(true);
          } else {
            toast.error("Requested course not found for editing.");
          }
        }
      } catch (e: any) {
        console.error("Failed to load courses:", e);
        toast.error("Failed to load course details.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    void loadData();
    return () => {
      isMounted = false;
    };
  }, [editingCourseId]);

  // Handle course name change and auto-generate code
  const handleNameChange = (val: string) => {
    setName(val);
    if (!codeTouched && !editingCourseId) {
      const generated = val
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 8);
      setCode(generated);
    }
  };

  // When duration changes, auto-adjust semesters to duration * 2 by default
  const handleDurationChange = (years: number) => {
    setDurationYears(years);
    setTotalSemesters(years * 2);
  };

  // Preview generated semester tags
  const previewSemesters = useMemo(() => {
    const sems: number[] = [];
    const count = Math.max(1, Math.min(16, totalSemesters || durationYears * 2));
    for (let i = 1; i <= count; i++) {
      sems.push(i);
    }
    return sems;
  }, [totalSemesters, durationYears]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Please enter a valid course name.");
      return;
    }

    const cleanCode = code.trim().toUpperCase() || name.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) || "CRS";

    // Duplicate check
    const isDuplicate = existingCourses.some((c) => {
      if (editingCourseId && c.id === editingCourseId) return false;
      return (
        c.name.trim().toLowerCase() === name.trim().toLowerCase() ||
        c.code.trim().toUpperCase() === cleanCode
      );
    });

    if (isDuplicate) {
      toast.error("A course with this name or code already exists.");
      return;
    }

    setSubmitting(true);
    try {
      if (editingCourseId) {
        const res = await AcademicService.updateCourse(editingCourseId, {
          name: name.trim(),
          code: cleanCode,
          duration_years: Number(durationYears),
          total_semesters: Number(totalSemesters),
          description: description.trim(),
          is_active: isActive,
        });

        if (!res.success) {
          throw new Error(res.error || "Failed to update course.");
        }
        toast.success(`Course "${name.trim()}" updated successfully.`);
      } else {
        await AcademicService.addCourse({
          name: name.trim(),
          code: cleanCode,
          duration_years: Number(durationYears),
          total_semesters: Number(totalSemesters),
          description: description.trim(),
          is_active: isActive,
          display_order: existingCourses.length + 1,
        });
        toast.success(`Course "${name.trim()}" created with ${totalSemesters} semesters.`);
      }

      void navigate({ to: "/admin/courses" });
    } catch (err: any) {
      console.error("Course save error:", err);
      toast.error(err?.message || "Failed to save course. Please check your network.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!ready || loading) {
    return (
      <AdminLayout title="Course Management">
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="size-8 animate-spin text-[#0e7490]" />
            <p className="text-xs text-muted-foreground font-medium">Loading course configuration...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title={editingCourseId ? "Edit Academic Course" : "Add New Academic Course"}
      subtitle="Configure curriculum degree programs, duration, and automatic semester generation."
    >
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground text-xs font-semibold gap-1.5"
          >
            <Link to="/admin/courses">
              <ArrowLeft className="size-4" /> Back to Courses
            </Link>
          </Button>

          <span className="text-[11px] font-bold text-teal-800 bg-teal-50 border border-teal-200 px-3 py-1 rounded-full">
            {editingCourseId ? "Editing Mode" : "New Program Setup"}
          </span>
        </div>

        {/* Main Grid: Form on Left, Live Preview on Right */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Form Card */}
          <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-xs">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <h2 className="text-base font-bold text-foreground">Course Details</h2>
                <p className="text-xs text-muted-foreground">
                  Semesters will be automatically generated and linked to this course.
                </p>
              </div>

              {/* Course Name */}
              <div>
                <label className="text-xs font-bold text-foreground">
                  Course Name <span className="text-rose-500">*</span>
                </label>
                <Input
                  required
                  placeholder="e.g. B.Pharm (Bachelor of Pharmacy)"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="mt-1.5 text-xs h-10"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Full official degree or diploma qualification title.
                </p>
              </div>

              {/* Course Code (Auto-generated with manual override option) */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground">Course Code</label>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Sparkles className="size-3 text-teal-600" /> Auto-generated if left unchanged
                  </span>
                </div>
                <Input
                  placeholder="e.g. BPHARM"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.toUpperCase());
                    setCodeTouched(true);
                  }}
                  className="mt-1.5 text-xs h-10 uppercase font-mono"
                />
              </div>

              {/* Duration and Semesters Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-foreground">
                    Duration (Years) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={durationYears}
                    onChange={(e) => handleDurationChange(Number(e.target.value))}
                    className="mt-1.5 w-full h-10 rounded-xl border border-input bg-background px-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#0e7490]"
                  >
                    <option value={1}>1 Year Program</option>
                    <option value={2}>2 Years Program (D.Pharm / M.Pharm)</option>
                    <option value={3}>3 Years Program (B.Sc)</option>
                    <option value={4}>4 Years Program (B.Pharm)</option>
                    <option value={5}>5 Years Program</option>
                    <option value={6}>6 Years Program (Pharm.D)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground">
                    Number of Semesters <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={totalSemesters}
                    onChange={(e) => setTotalSemesters(Number(e.target.value))}
                    className="mt-1.5 w-full h-10 rounded-xl border border-input bg-background px-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#0e7490]"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                      <option key={num} value={num}>
                        {num} Semesters ({num} terms)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Course Description */}
              <div>
                <label className="text-xs font-bold text-foreground">Course Description</label>
                <Textarea
                  placeholder="Comprehensive pharmacy curriculum covering pharmaceutics, pharmacology, medicinal chemistry, and clinical pharmacy."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1.5 text-xs min-h-[90px] resize-none"
                />
              </div>

              {/* Active Status Toggle */}
              <div className="flex items-center justify-between rounded-xl border border-border/80 bg-slate-50/60 p-3.5">
                <div>
                  <p className="text-xs font-bold text-foreground">Course Status</p>
                  <p className="text-[11px] text-muted-foreground">
                    {isActive ? "Visible across admin and student portals" : "Hidden from students"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsActive(!isActive)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isActive ? "bg-teal-700" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      isActive ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  asChild
                  className="text-xs font-bold h-10 px-5"
                >
                  <Link to="/admin/courses">Cancel</Link>
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-[#0e7490] hover:bg-[#0e7490]/90 text-white font-bold text-xs h-10 px-6 gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <Save className="size-4" /> {editingCourseId ? "Update Course" : "Save Course"}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>

          {/* Right Column: Live Curriculum Preview & Notice */}
          <div className="space-y-5">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <GraduationCap className="size-4 text-teal-700" />
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Live Course Preview
                </h3>
              </div>

              <div className="rounded-2xl border border-border/80 bg-slate-50/50 p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-700">
                    <FolderTree className="size-5" />
                  </div>
                  <Badge variant={isActive ? "default" : "secondary"}>
                    {isActive ? "Active" : "Draft"}
                  </Badge>
                </div>

                <div>
                  <h4 className="text-sm font-black text-foreground">
                    {name || "Course Title Here"}
                  </h4>
                  <p className="text-[11px] font-mono font-bold text-teal-700">
                    {code || "CODE"}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                    {description || "No description specified yet."}
                  </p>
                </div>

                <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                  <span>Duration: {durationYears} Years</span>
                  <span>{totalSemesters} Semesters</span>
                </div>

                <div className="space-y-1.5 pt-1">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">
                    Auto-generated Semesters ({previewSemesters.length}):
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {previewSemesters.map((semNum) => (
                      <span
                        key={semNum}
                        className="rounded-md bg-white border border-border/70 px-2 py-0.5 text-[10px] font-bold text-slate-700 shadow-2xs"
                      >
                        Sem {semNum}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-teal-100 bg-teal-50/60 p-4 text-xs space-y-2 text-teal-900">
              <div className="flex items-center gap-2 font-bold">
                <Info className="size-4 text-teal-700 shrink-0" />
                <span>Automated Generation</span>
              </div>
              <p className="text-[11px] text-teal-800 leading-relaxed">
                Saving this course automatically generates Semester 1 through Semester {totalSemesters}{" "}
                in the Supabase database. You can immediately assign subjects and upload materials.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
