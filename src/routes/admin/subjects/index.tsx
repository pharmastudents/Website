import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AcademicService, type Course, type Semester, type SubjectItem, type DependencyCheckResult } from "@/lib/academicService";
import { toast } from "sonner";
import {
  PlusCircle,
  Search,
  Trash2,
  BookOpen,
  AlertTriangle,
  Layers,
  Image as ImageIcon,
  ExternalLink,
  Loader2,
  Edit2,
} from "lucide-react";
import { SubjectThumbnail } from "@/components/subject/SubjectThumbnail";


export const Route = createFileRoute("/admin/subjects/")({
  validateSearch: (search: Record<string, unknown>): { year?: number | undefined } => {
    return {
      year: typeof search["year"] === "number" ? (search["year"] as number) : undefined,
    };
  },
  component: AdminSubjectsPage,
});

export default function AdminSubjectsPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [filterCourse, setFilterCourse] = useState<string>("all");
  const [filterSem, setFilterSem] = useState<string>("all");
  const [subjectToDelete, setSubjectToDelete] = useState<SubjectItem | null>(null);
  const [deleteDeps, setDeleteDeps] = useState<DependencyCheckResult | null>(null);
  const [checkingDeps, setCheckingDeps] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load Real Supabase Data
  const loadData = async () => {
    setLoading(true);
    try {
      const data = await AcademicService.loadAll();
      setCourses(data.courses);
      setSemesters(data.semesters);
      setSubjects(data.subjects);
    } catch (err: any) {
      console.error("Error loading subjects:", err);
      toast.error("Could not load subjects from database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const filtered = useMemo(() => {
    return subjects.filter((s) => {
      if (filterCourse !== "all" && s.course_id !== filterCourse) return false;
      if (filterSem !== "all" && s.semester !== Number(filterSem)) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        const matchName = s.name.toLowerCase().includes(q);
        const matchCode = s.code?.toLowerCase().includes(q) ?? false;
        if (!matchName && !matchCode) return false;
      }
      return true;
    });
  }, [subjects, filterCourse, filterSem, query]);

  const promptDelete = async (sub: SubjectItem) => {
    setSubjectToDelete(sub);
    setCheckingDeps(true);
    setDeleteDeps(null);
    try {
      const deps = await AcademicService.checkSubjectDependencies(sub.id);
      setDeleteDeps(deps);
    } catch (e) {
      console.error("Dependency check error:", e);
    } finally {
      setCheckingDeps(false);
    }
  };

  const confirmDelete = async () => {
    if (!subjectToDelete) return;
    setIsDeleting(true);
    try {
      const res = await AcademicService.deleteSubject(subjectToDelete.id);
      if (res.success) {
        toast.success(`Subject "${subjectToDelete.name}" was removed.`);
        setSubjectToDelete(null);
        setDeleteDeps(null);
        await loadData();
      } else {
        toast.error(res.error || "Cannot delete subject.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete subject.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AdminLayout
      title="Subjects Directory"
      subtitle="Manage PCI standardized subjects, unit notes, thumbnails and pricing."
      actions={
        <Button asChild size="sm" className="rounded-xl bg-[#0e7490] hover:bg-[#0f766e] text-white font-bold">
          <Link to="/admin/subjects/create">
            <PlusCircle className="mr-1.5 size-4" /> Add Subject
          </Link>
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Filter Bar */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search subject by name or code..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9 h-10 rounded-xl border-slate-200"
              />
            </div>

            <select
              aria-label="Filter by Course"
              value={filterCourse}
              onChange={(e) => setFilterCourse(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold"
            >
              <option value="all">All Courses</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              aria-label="Filter by Semester"
              value={filterSem}
              onChange={(e) => setFilterSem(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold"
            >
              <option value="all">All Semesters</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                <option key={s} value={s}>
                  Semester {s}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
            <span>
              Showing <strong>{filtered.length}</strong> of {subjects.length} subjects
            </span>
            {(filterCourse !== "all" || filterSem !== "all" || query) && (
              <button
                onClick={() => {
                  setFilterCourse("all");
                  setFilterSem("all");
                  setQuery("");
                }}
                className="text-teal-700 font-bold hover:underline"
              >
                Reset filters
              </button>
            )}
          </div>
        </div>

        {/* Subjects Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-xs">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/70 text-xs font-bold text-slate-500">
              <tr>
                <th className="p-4">Subject</th>
                <th className="p-4">Code</th>
                <th className="p-4">Course & Semester</th>
                <th className="p-4">Units & Notes</th>
                <th className="p-4">Access & Price</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-400">
                    <Loader2 className="mx-auto size-6 animate-spin text-teal-600 mb-2" />
                    Loading subjects from database...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-400">
                    <BookOpen className="mx-auto size-8 text-slate-300 mb-2" />
                    No subjects found. Click <strong>Add Subject</strong> to create one.
                  </td>
                </tr>
              ) : (
                filtered.map((sub) => {
                  const courseObj = courses.find((c) => c.id === sub.course_id);
                  const isPaid = sub.is_premium || (sub.price && sub.price > 0);

                  return (
                    <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <SubjectThumbnail
                            src={sub.thumbnail_url}
                            name={sub.name}
                            code={sub.code}
                            className="size-11 rounded-lg shrink-0"
                            fallbackSize="sm"
                          />
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 text-xs truncate max-w-xs">{sub.name}</p>
                            <p className="text-[11px] text-slate-500 line-clamp-1">{sub.description || "PCI syllabus"}</p>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <Badge variant="outline" className="font-mono text-[11px] uppercase tracking-wider font-bold">
                          {sub.code || "BP-CORE"}
                        </Badge>
                      </td>
                      <td className="p-4 text-xs font-medium text-slate-600">
                        {courseObj?.name || "B.Pharm"} • Semester {sub.semester || 1}
                      </td>
                      <td className="p-4 text-xs">
                        <Link
                          to={`/admin/subjects/${sub.id}` as any}
                          className="inline-flex items-center gap-1.5 font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200/60 hover:bg-teal-100 transition-colors"
                        >
                          <Layers className="size-3.5" />
                          <span>{sub.units_count || 0} Units</span>
                        </Link>
                      </td>
                      <td className="p-4">
                        {isPaid ? (
                          <div className="flex items-center gap-1.5">
                            <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-800 border border-amber-200">
                              Paid
                            </span>
                            <span className="text-xs font-black text-slate-900">
                              ₹{sub.price || 99}
                            </span>
                          </div>
                        ) : (
                          <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                            Free
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button asChild size="sm" variant="outline" className="h-8 gap-1 rounded-lg text-xs font-bold border-slate-200 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-300">
                            <Link to="/admin/subjects/create" search={{ subjectId: sub.id }}>
                              <Edit2 className="size-3.5" />
                              <span>Edit</span>
                            </Link>
                          </Button>
                          <Button asChild size="sm" variant="outline" className="h-8 gap-1 rounded-lg text-xs font-bold border-slate-200">
                            <Link to={`/admin/subjects/${sub.id}` as any}>
                              <Layers className="size-3.5" />
                              <span>Units</span>
                            </Link>
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-8 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                            onClick={() => void promptDelete(sub)}
                            title="Delete Subject"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Subject Dialog with Safe Dependency Checking */}
      {subjectToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
                <AlertTriangle className="size-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Remove Subject</h3>
                <p className="text-xs text-slate-500">Database primary key verification</p>
              </div>
            </div>

            <div className="mt-4 space-y-2 text-xs text-slate-600 leading-relaxed">
              <p>
                Are you sure you want to remove <strong>"{subjectToDelete.name}"</strong> (Code: <code className="font-mono font-bold text-slate-800">{subjectToDelete.code}</code>)?
              </p>
              <p className="text-[11px] text-slate-400">
                Subject ID: <code className="font-mono">{subjectToDelete.id}</code>
              </p>

              {checkingDeps && (
                <div className="flex items-center gap-2 rounded-lg bg-slate-50 p-2.5 text-slate-500">
                  <Loader2 className="size-4 animate-spin text-teal-600" />
                  <span>Checking active purchases and dependent records...</span>
                </div>
              )}

              {deleteDeps && (
                <div className="mt-2 space-y-1.5">
                  {deleteDeps.purchasesCount > 0 ? (
                    <div className="rounded-xl border border-red-200 bg-red-50/80 p-3 text-red-800">
                      <p className="font-bold flex items-center gap-1.5 text-xs text-red-900">
                        <AlertTriangle className="size-4 text-red-600 shrink-0" /> Deletion Blocked
                      </p>
                      <p className="mt-1 text-[11px] leading-normal">
                        This subject has <strong>{deleteDeps.purchasesCount}</strong> active student purchases or enrolled orders. Deletion is blocked to protect student purchase history and their unlocked libraries.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-2.5 text-[11px] text-amber-900">
                      <p>
                        This will permanently remove <strong>{deleteDeps.unitsCount}</strong> units and <strong>{deleteDeps.materialsCount}</strong> study materials associated with this subject.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-2.5">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl border-slate-200 text-xs"
                onClick={() => {
                  setSubjectToDelete(null);
                  setDeleteDeps(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={isDeleting || checkingDeps || (deleteDeps ? !deleteDeps.canHardDelete : false)}
                className="rounded-xl font-bold text-xs"
                onClick={confirmDelete}
              >
                {isDeleting ? "Deleting..." : "Delete Subject"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
