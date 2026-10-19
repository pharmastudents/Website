import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  AcademicService,
  type Course,
  type Semester,
  type SubjectItem,
  type MaterialItem,
  type DependencyCheckResult,
} from "@/lib/academicService";
import { toast } from "sonner";
import {
  GraduationCap,
  Plus,
  BookOpen,
  ArrowRight,
  FolderTree,
  Edit2,
  Trash2,
  Users,
  FileText,
  AlertTriangle,
  RefreshCw,
  Layers,
  Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/admin/courses/")({
  component: AdminCoursesPage,
});

export default function AdminCoursesPage() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Deletion Dialog State
  const [deletingCourse, setDeletingCourse] = useState<Course | null>(null);
  const [deleteDeps, setDeleteDeps] = useState<DependencyCheckResult | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadAllData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await AcademicService.loadAll();
      setCourses(data.courses);
      setSemesters(data.semesters);
      setSubjects(data.subjects);
      setMaterials(data.materials);
    } catch (e) {
      console.error("Error loading courses:", e);
      toast.error("Failed to load courses from Supabase.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadAllData();
  }, []);

  const handleOpenDelete = (course: Course) => {
    const deps = AcademicService.checkCourseDependencies(course.id);
    setDeleteDeps(deps);
    setDeletingCourse(course);
  };

  const handleConfirmDelete = async () => {
    if (!deletingCourse) return;
    setIsDeleting(true);
    try {
      const res = await AcademicService.deleteCourse(deletingCourse.id);
      if (!res.success) {
        toast.error(res.error || "Cannot delete course.");
      } else {
        toast.success(`Course "${deletingCourse.name}" deleted successfully.`);
        setDeletingCourse(null);
        await loadAllData(true);
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete course.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AdminLayout
      title="Courses & Programs"
      subtitle="Manage degree programs, curriculum duration, semesters, and course statistics."
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadAllData(true)}
            disabled={refreshing || loading}
            className="text-xs font-semibold gap-1.5 h-9"
          >
            <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            asChild
            className="bg-[#0e7490] hover:bg-[#0e7490]/90 text-white font-bold text-xs h-9 px-4 gap-1.5 shadow-xs"
          >
            <Link to="/admin/courses/create">
              <Plus className="size-4" /> Add Course
            </Link>
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Top Summary Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xs">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold">
              <FolderTree className="size-4 text-teal-700" /> Total Courses
            </div>
            <p className="mt-2 text-2xl font-black text-foreground">{courses.length}</p>
          </div>
          <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xs">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold">
              <Layers className="size-4 text-teal-700" /> Total Semesters
            </div>
            <p className="mt-2 text-2xl font-black text-foreground">{semesters.length}</p>
          </div>
          <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xs">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold">
              <BookOpen className="size-4 text-teal-700" /> Total Subjects
            </div>
            <p className="mt-2 text-2xl font-black text-foreground">{subjects.length}</p>
          </div>
          <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xs">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold">
              <FileText className="size-4 text-teal-700" /> Study Materials
            </div>
            <p className="mt-2 text-2xl font-black text-foreground">{materials.length}</p>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-72 rounded-3xl border border-border bg-card/50 animate-pulse p-6"
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && courses.length === 0 && (
          <div className="rounded-3xl border border-dashed border-border bg-card p-12 text-center space-y-4">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
              <GraduationCap className="size-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">No Academic Courses Found</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                Get started by creating your first academic pharmacy program (e.g., B.Pharm).
              </p>
            </div>
            <Button
              asChild
              className="bg-[#0e7490] hover:bg-[#0e7490]/90 text-white font-bold text-xs h-9 px-4 gap-1.5"
            >
              <Link to="/admin/courses/create">
                <Plus className="size-4" /> Add First Course
              </Link>
            </Button>
          </div>
        )}

        {/* Course Cards Grid */}
        {!loading && courses.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {courses.map((crs) => {
              const courseSemesters = semesters.filter((s) => s.course_id === crs.id);
              const semIds = courseSemesters.map((s) => s.id);
              const courseSubjects = subjects.filter(
                (sub) => sub.course_id === crs.id || semIds.includes(sub.semester_id)
              );
              const subIds = courseSubjects.map((s) => s.id);
              const courseMaterials = materials.filter(
                (m) =>
                  m.course_id === crs.id ||
                  semIds.includes(m.semester_id || "") ||
                  subIds.includes(m.subject_id)
              );

              const publishedMaterials = courseMaterials.filter((m) => m.status === "Published");
              const draftMaterials = courseMaterials.filter((m) => m.status === "Draft");
              const totalPurchased = courseMaterials.reduce(
                (acc, m) => acc + (m.students_count || 0),
                0
              );

              return (
                <div
                  key={crs.id}
                  className="rounded-3xl border border-border bg-card p-6 shadow-xs hover:border-[#0e7490]/40 transition-all flex flex-col justify-between space-y-4"
                >
                  {/* Top Details & Badges */}
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-teal-500/10 text-[#0e7490]">
                        <GraduationCap className="size-6" />
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={crs.is_active ? "default" : "secondary"}
                          className={crs.is_active ? "bg-teal-700 text-white" : ""}
                        >
                          {crs.is_active ? "Active" : "Inactive"}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground hover:text-foreground rounded-lg"
                          title="Edit Course"
                          onClick={() =>
                            void navigate({
                              to: "/admin/courses/create",
                              search: { courseId: crs.id },
                            })
                          }
                        >
                          <Edit2 className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                          title="Delete Course"
                          onClick={() => handleOpenDelete(crs)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>

                    <h3 className="mt-4 text-lg font-black text-foreground tracking-tight">
                      {crs.name}
                    </h3>
                    <p className="text-xs font-mono font-bold text-teal-700">{crs.code}</p>
                    <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2">
                      {crs.description ||
                        `${crs.duration_years} Years undergraduate/postgraduate degree program.`}
                    </p>

                    {/* Stats Matrix */}
                    <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl border border-border/80 bg-slate-50/70 p-3 text-center">
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground">Semesters</p>
                        <p className="text-sm font-black text-foreground">
                          {courseSemesters.length || crs.total_semesters}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground">Subjects</p>
                        <p className="text-sm font-black text-foreground">{courseSubjects.length}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground">Materials</p>
                        <p className="text-sm font-black text-foreground">{courseMaterials.length}</p>
                      </div>
                    </div>

                    {/* Published & Purchases Highlights */}
                    <div className="mt-3 flex items-center justify-between text-[11px] font-medium text-muted-foreground px-1">
                      <span className="flex items-center gap-1.5">
                        <Users className="size-3.5 text-teal-600" />
                        <strong className="text-foreground">{totalPurchased}</strong> purchased
                      </span>
                      <span>
                        <strong className="text-teal-700 font-bold">{publishedMaterials.length}</strong> published
                        {draftMaterials.length > 0 && (
                          <span className="text-muted-foreground"> · {draftMaterials.length} drafts</span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Semesters Pills & Footer Actions */}
                  <div className="pt-4 border-t border-border space-y-3">
                    <div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold mb-2">
                        <span>Duration: {crs.duration_years} Years</span>
                        <span>{courseSemesters.length || crs.total_semesters} Terms</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {(courseSemesters.length > 0
                          ? courseSemesters
                          : Array.from({ length: crs.total_semesters || crs.duration_years * 2 }, (_, i) => ({
                            id: `temp-${i + 1}`,
                            semester_number: i + 1,
                          }))
                        ).map((s) => (
                          <span
                            key={s.id}
                            className="rounded-lg bg-slate-100 border border-slate-200/80 px-2 py-0.5 text-[10px] font-bold text-slate-700"
                          >
                            Sem {s.semester_number}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs font-bold text-[#0e7490] hover:bg-teal-50"
                      >
                        <Link to="/admin/materials">
                          View Materials <ArrowRight className="ml-1 size-3.5" />
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs font-bold"
                        onClick={() =>
                          void navigate({
                            to: "/admin/courses/create",
                            search: { courseId: crs.id },
                          })
                        }
                      >
                        Edit
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Course Deletion Confirmation Dialog */}
        <AlertDialog open={!!deletingCourse} onOpenChange={() => setDeletingCourse(null)}>
          <AlertDialogContent className="rounded-2xl max-w-md">
            <AlertDialogHeader>
              <div className="flex size-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive mb-2">
                <AlertTriangle className="size-6" />
              </div>
              <AlertDialogTitle className="text-base font-bold text-foreground">
                Confirm Deleting Course
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-muted-foreground space-y-2">
                <p>
                  You are about to delete <strong>{deletingCourse?.name}</strong>.
                </p>
                {deleteDeps && (
                  <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-destructive font-medium text-xs leading-relaxed">
                    {deleteDeps.warningMessage ||
                      `This course contains ${deleteDeps.semestersCount} semesters, ${deleteDeps.subjectsCount} subjects, and ${deleteDeps.materialsCount} study materials.`}
                  </div>
                )}
                {!deleteDeps?.canHardDelete && (
                  <p className="text-rose-600 font-semibold text-xs">
                    This course cannot be deleted because students have purchased access to its materials.
                  </p>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel disabled={isDeleting} className="text-xs font-semibold">
                Cancel
              </AlertDialogCancel>
              {deleteDeps?.canHardDelete && (
                <AlertDialogAction
                  onClick={(e) => {
                    e.preventDefault();
                    void handleConfirmDelete();
                  }}
                  disabled={isDeleting}
                  className="bg-destructive hover:bg-destructive/90 text-white font-bold text-xs"
                >
                  {isDeleting ? "Deleting..." : "Permanently Delete"}
                </AlertDialogAction>
              )}
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}
