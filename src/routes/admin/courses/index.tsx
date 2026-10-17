import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AcademicService,
  type Course,
  type Semester,
} from "@/lib/academicService";
import { toast } from "sonner";
import {
  GraduationCap,
  Plus,
  BookOpen,
  ArrowRight,
  X,
  Layers,
  CheckCircle2,
  Lock,
  Unlock,
} from "lucide-react";

export const Route = createFileRoute("/admin/courses/")({
  component: AdminCoursesPage,
});

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [newCourseName, setNewCourseName] = useState("");
  const [newCourseCode, setNewCourseCode] = useState("");
  const [newCourseDuration, setNewCourseDuration] = useState(4);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const data = await AcademicService.loadAll();
      setCourses(data.courses);
      setSemesters(data.semesters);
      setLoading(false);
    }
    void load();
  }, []);

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseName.trim() || !newCourseCode.trim()) {
      toast.error("Please fill in course name and code.");
      return;
    }
    const created = await AcademicService.addCourse({
      name: newCourseName.trim(),
      code: newCourseCode.trim().toUpperCase(),
      duration_years: Number(newCourseDuration),
      total_semesters: Number(newCourseDuration) * 2,
      is_active: true,
      display_order: courses.length + 1,
    });
    setCourses((prev) => [...prev, created.course]);
    const refreshed = await AcademicService.loadAll();
    setSemesters(refreshed.semesters);
    setShowAddCourse(false);
    setNewCourseName("");
    setNewCourseCode("");
    toast.success(`Course "${created.course.name}" created with ${created.course.total_semesters} semesters.`);
  };

  return (
    <AdminLayout
      title="Courses & Semesters"
      subtitle="Manage academic pharmacy programs, degrees, duration, and semester structures."
    >
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-foreground">
              Academic Courses & Degrees
            </h1>
            <p className="text-xs text-muted-foreground">
              Configure curriculum structures across all pharmacy qualification levels.
            </p>
          </div>
          <Button
            onClick={() => setShowAddCourse(true)}
            className="bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs h-10 px-4"
          >
            <Plus className="mr-1.5 size-4" /> Add Course
          </Button>
        </div>

        {/* Courses Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((crs) => {
            const courseSemesters = semesters.filter((s) => s.course_id === crs.id);
            return (
              <div
                key={crs.id}
                className="rounded-3xl border border-border bg-card p-6 shadow-xs space-y-4 hover:border-primary/40 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="flex size-11 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-700">
                      <GraduationCap className="size-6" />
                    </span>
                    <Badge variant={crs.is_active ? "default" : "secondary"}>
                      {crs.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>

                  <h3 className="mt-4 text-lg font-black text-foreground">{crs.name}</h3>
                  <p className="text-xs font-semibold text-primary">{crs.code}</p>
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                    {crs.description || `${crs.duration_years} Years undergraduate/postgraduate degree program.`}
                  </p>
                </div>

                <div className="pt-4 border-t border-border space-y-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
                    <span>Duration: {crs.duration_years} Years</span>
                    <span>{courseSemesters.length || crs.total_semesters} Semesters</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {courseSemesters.map((s) => (
                      <span
                        key={s.id}
                        className="rounded-lg bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground"
                      >
                        Sem {s.semester_number}
                      </span>
                    ))}
                  </div>

                  <Button asChild variant="outline" size="sm" className="w-full text-xs font-bold text-teal-700">
                    <Link to="/admin/materials">
                      Manage Notes & Curriculum <ArrowRight className="ml-1.5 size-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add Course Modal */}
        {showAddCourse && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-xs p-4">
            <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-base font-bold text-foreground">Add New Academic Course</h3>
                <button
                  onClick={() => setShowAddCourse(false)}
                  className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
                >
                  <X className="size-4" />
                </button>
              </div>

              <form onSubmit={handleCreateCourse} className="space-y-3.5">
                <div>
                  <label className="text-xs font-semibold text-foreground">Course Name</label>
                  <Input
                    required
                    placeholder="e.g. Pharm.D (Doctor of Pharmacy)"
                    value={newCourseName}
                    onChange={(e) => setNewCourseName(e.target.value)}
                    className="mt-1 text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground">Course Code</label>
                  <Input
                    required
                    placeholder="e.g. PHARMD"
                    value={newCourseCode}
                    onChange={(e) => setNewCourseCode(e.target.value)}
                    className="mt-1 text-xs uppercase"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground">Duration (Years)</label>
                  <select
                    value={newCourseDuration}
                    onChange={(e) => setNewCourseDuration(Number(e.target.value))}
                    className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-xs"
                  >
                    <option value={1}>1 Year (2 Semesters)</option>
                    <option value={2}>2 Years (4 Semesters)</option>
                    <option value={3}>3 Years (6 Semesters)</option>
                    <option value={4}>4 Years (8 Semesters)</option>
                    <option value={6}>6 Years (12 Semesters)</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-border">
                  <Button variant="outline" size="sm" onClick={() => setShowAddCourse(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    className="bg-teal-700 hover:bg-teal-800 text-white font-bold"
                  >
                    Create Course
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
