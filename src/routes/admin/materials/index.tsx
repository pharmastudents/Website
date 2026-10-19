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
  type UnitItem,
  type MaterialItem,
} from "@/lib/academicService";
import { toast } from "sonner";
import {
  BookOpen,
  FileText,
  Users,
  Plus,
  ArrowRight,
  Eye,
  Trash2,
  Edit2,
  AlertTriangle,
  RefreshCw,
  File,
  CheckCircle2,
  ExternalLink,
  Layers,
  FolderTree,
  Filter,
  Check,
  X,
} from "lucide-react";

export const Route = createFileRoute("/admin/materials/")({
  component: AdminMaterialsPage,
});

export default function AdminMaterialsPage() {
  const navigate = useNavigate();

  // Core Data
  const [courses, setCourses] = useState<Course[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [units, setUnits] = useState<UnitItem[]>([]);
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Single-Line 4-Dependent Filters
  const [selectedCourseId, setSelectedCourseId] = useState<string>("all");
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>("all");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("all");
  const [selectedUnit, setSelectedUnit] = useState<string>("all");

  // Delete Material State
  const [deletingMaterial, setDeletingMaterial] = useState<MaterialItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load Data
  const loadData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const store = await AcademicService.loadAll();
      setCourses(store.courses);
      setSemesters(store.semesters);
      setSubjects(store.subjects);
      setUnits(store.units);
      setMaterials(store.materials);

      // Pre-select first course if only 1 exists and none selected
      if (selectedCourseId === "all" && store.courses.length === 1 && store.courses[0]) {
        setSelectedCourseId(store.courses[0].id);
      }
    } catch (err) {
      console.error("Failed to load materials data:", err);
      toast.error("Failed to load materials from database.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  // Filter 2: Available Semesters (Dependent on selected course)
  const availableSemesters = useMemo(() => {
    if (selectedCourseId === "all") return semesters;
    return semesters
      .filter((s) => s.course_id === selectedCourseId)
      .sort((a, b) => a.semester_number - b.semester_number);
  }, [semesters, selectedCourseId]);

  // Filter 3: Available Subjects (Dependent on selected semester & course)
  const availableSubjects = useMemo(() => {
    let list = subjects;
    if (selectedCourseId !== "all") {
      list = list.filter((sub) => sub.course_id === selectedCourseId);
    }
    if (selectedSemesterId !== "all") {
      list = list.filter((sub) => sub.semester_id === selectedSemesterId);
    }
    return list.sort((a, b) => (a.code || "").localeCompare(b.code || ""));
  }, [subjects, selectedCourseId, selectedSemesterId]);

  // Filter 4: Available Units (Dependent on selected subject)
  const availableUnits = useMemo(() => {
    if (selectedSubjectId === "all") {
      return [1, 2, 3, 4, 5];
    }
    const subjectUnits = units.filter((u) => u.subject_id === selectedSubjectId);
    if (subjectUnits.length > 0) {
      return Array.from(new Set(subjectUnits.map((u) => u.unit_number))).sort((a, b) => a - b);
    }
    // Also inspect existing materials for this subject
    const subjectMats = materials.filter((m) => m.subject_id === selectedSubjectId);
    const unitNums = subjectMats.map((m) => m.unit_number || 1);
    const set = new Set([...unitNums, 1, 2, 3, 4, 5]);
    return Array.from(set).sort((a, b) => a - b);
  }, [units, materials, selectedSubjectId]);

  // Parent Filter Change Handlers (with strict downstream resets)
  const handleCourseChange = (courseId: string) => {
    setSelectedCourseId(courseId);
    setSelectedSemesterId("all");
    setSelectedSubjectId("all");
    setSelectedUnit("all");
  };

  const handleSemesterChange = (semesterId: string) => {
    setSelectedSemesterId(semesterId);
    setSelectedSubjectId("all");
    setSelectedUnit("all");
  };

  const handleSubjectChange = (subjectId: string) => {
    setSelectedSubjectId(subjectId);
    setSelectedUnit("all");
  };

  // Filtered Materials based on all 4 dropdowns
  const filteredMaterials = useMemo(() => {
    return materials.filter((m) => {
      // 1. Course Filter
      if (selectedCourseId !== "all") {
        if (m.course_id && m.course_id !== selectedCourseId) return false;
        // If material doesn't have course_id directly, check parent subject
        const sub = subjects.find((s) => s.id === m.subject_id);
        if (sub && sub.course_id !== selectedCourseId) return false;
      }

      // 2. Semester Filter
      if (selectedSemesterId !== "all") {
        if (m.semester_id && m.semester_id !== selectedSemesterId) return false;
        const sub = subjects.find((s) => s.id === m.subject_id);
        if (sub && sub.semester_id !== selectedSemesterId) return false;
      }

      // 3. Subject Filter
      if (selectedSubjectId !== "all") {
        if (m.subject_id !== selectedSubjectId) return false;
      }

      // 4. Unit Filter
      if (selectedUnit !== "all") {
        const uNum = Number(selectedUnit);
        if (m.unit_number !== uNum) return false;
      }

      return true;
    });
  }, [materials, selectedCourseId, selectedSemesterId, selectedSubjectId, selectedUnit, subjects]);

  // Context-Aware Summary Metrics (respecting selected course & semester)
  const scopedMetrics = useMemo(() => {
    // Determine scoped subjects
    let scopedSubs = subjects;
    if (selectedCourseId !== "all") {
      scopedSubs = scopedSubs.filter((s) => s.course_id === selectedCourseId);
    }
    if (selectedSemesterId !== "all") {
      scopedSubs = scopedSubs.filter((s) => s.semester_id === selectedSemesterId);
    }

    // Determine scoped materials
    const scopedMats = materials.filter((m) => {
      if (selectedCourseId !== "all") {
        const sub = subjects.find((s) => s.id === m.subject_id);
        if (m.course_id !== selectedCourseId && sub?.course_id !== selectedCourseId) return false;
      }
      if (selectedSemesterId !== "all") {
        const sub = subjects.find((s) => s.id === m.subject_id);
        if (m.semester_id !== selectedSemesterId && sub?.semester_id !== selectedSemesterId) return false;
      }
      return true;
    });

    const totalMats = scopedMats.length;
    const paidMats = scopedMats.filter((m) => m.price > 0 || m.is_premium).length;
    const freeMats = totalMats - paidMats;
    const publishedMats = scopedMats.filter((m) => m.status === "Published").length;
    const draftMats = totalMats - publishedMats;
    const studentsPurchased = scopedMats.reduce((acc, m) => acc + (m.students_count || 0), 0);

    return {
      totalSubjects: scopedSubs.length,
      totalMaterials: totalMats,
      paidMaterials: paidMats,
      freeMaterials: freeMats,
      publishedMaterials: publishedMats,
      draftMaterials: draftMats,
      studentsPurchased,
    };
  }, [subjects, materials, selectedCourseId, selectedSemesterId]);

  // Toggle Material Status (Published / Draft)
  const handleToggleStatus = async (mat: MaterialItem) => {
    const current = mat.status || "Published";
    const next = current === "Published" ? "Draft" : "Published";
    try {
      const updatedStatus = await AcademicService.togglePublish(mat.id, current);
      setMaterials((prev) =>
        prev.map((m) => (m.id === mat.id ? { ...m, status: updatedStatus } : m))
      );
      toast.success(`Material status changed to ${updatedStatus}.`);
    } catch (e: any) {
      toast.error(e?.message || "Failed to update material status.");
    }
  };

  // Delete Material Handler
  const handleConfirmDelete = async () => {
    if (!deletingMaterial) return;
    setIsDeleting(true);
    try {
      const res = await AcademicService.deleteMaterial(deletingMaterial.id);
      if (!res.success) {
        toast.error(res.error || "Cannot delete study material.");
      } else {
        toast.success(`Study material "${deletingMaterial.title}" deleted.`);
        setMaterials((prev) => prev.filter((m) => m.id !== deletingMaterial.id));
        setDeletingMaterial(null);
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete material.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AdminLayout
      title="Study Materials"
      subtitle="Upload, publish, organize and manage curriculum study notes and lecture resources."
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadData(true)}
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
            <Link to="/admin/materials/create">
              <Plus className="size-4" /> Add Material
            </Link>
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* ================================================================= */}
        {/* 1. Real-Database Summary Cards (Context Aware)                   */}
        {/* ================================================================= */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Subjects */}
          <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xs">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold">
              <span className="flex size-7 items-center justify-center rounded-lg bg-teal-500/10 text-teal-700">
                <BookOpen className="size-4" />
              </span>
              Total Subjects
            </div>
            <p className="mt-2 text-2xl font-black text-foreground">
              {scopedMetrics.totalSubjects}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {selectedCourseId !== "all" ? "In selected program" : "Across all courses"}
            </p>
          </div>

          {/* Total Materials */}
          <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xs">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold">
              <span className="flex size-7 items-center justify-center rounded-lg bg-teal-500/10 text-teal-700">
                <FileText className="size-4" />
              </span>
              Total Materials
            </div>
            <p className="mt-2 text-2xl font-black text-foreground">
              {scopedMetrics.totalMaterials}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {scopedMetrics.paidMaterials} Paid · {scopedMetrics.freeMaterials} Free
            </p>
          </div>

          {/* Students Purchased */}
          <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xs">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold">
              <span className="flex size-7 items-center justify-center rounded-lg bg-teal-500/10 text-teal-700">
                <Users className="size-4" />
              </span>
              Students Purchased
            </div>
            <p className="mt-2 text-2xl font-black text-foreground">
              {scopedMetrics.studentsPurchased}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Confirmed paid orders
            </p>
          </div>

          {/* Published Materials */}
          <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xs">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold">
              <span className="flex size-7 items-center justify-center rounded-lg bg-teal-500/10 text-teal-700">
                <CheckCircle2 className="size-4" />
              </span>
              Published Materials
            </div>
            <p className="mt-2 text-2xl font-black text-foreground">
              {scopedMetrics.publishedMaterials}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {scopedMetrics.draftMaterials} Drafts
            </p>
          </div>
        </div>

        {/* ================================================================= */}
        {/* 2. Single-Line Filter Toolbar: Course -> Semester -> Subject -> Unit */}
        {/* ================================================================= */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/60 pb-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <Filter className="size-3.5 text-teal-700" />
              <span>Material Filters</span>
            </div>
            <span className="text-[11px] text-muted-foreground">
              Showing <strong className="text-foreground">{filteredMaterials.length}</strong> study notes
            </span>
          </div>

          {/* On Desktop: 4 filters in a single horizontal row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. Course Filter */}
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                1. Course
              </label>
              <select
                value={selectedCourseId}
                onChange={(e) => handleCourseChange(e.target.value)}
                className="w-full h-10 rounded-xl border border-input bg-background px-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-[#0e7490]"
              >
                <option value="all">All Courses ({courses.length})</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Semester Filter */}
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                2. Semester
              </label>
              <select
                value={selectedSemesterId}
                onChange={(e) => handleSemesterChange(e.target.value)}
                className="w-full h-10 rounded-xl border border-input bg-background px-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-[#0e7490]"
              >
                <option value="all">All Semesters ({availableSemesters.length})</option>
                {availableSemesters.map((s) => (
                  <option key={s.id} value={s.id}>
                    Semester {s.semester_number}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Subject Filter */}
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                3. Subject
              </label>
              <select
                value={selectedSubjectId}
                onChange={(e) => handleSubjectChange(e.target.value)}
                className="w-full h-10 rounded-xl border border-input bg-background px-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-[#0e7490]"
              >
                <option value="all">All Subjects ({availableSubjects.length})</option>
                {availableSubjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.code ? `[${sub.code}] ` : ""}
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. Unit Filter */}
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                4. Unit
              </label>
              <select
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
                className="w-full h-10 rounded-xl border border-input bg-background px-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-[#0e7490]"
              >
                <option value="all">All Units</option>
                {availableUnits.map((uNum) => (
                  <option key={uNum} value={String(uNum)}>
                    Unit {uNum}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* 3. Study Materials Table & Controls                              */}
        {/* ================================================================= */}
        <div className="rounded-2xl border border-border/80 bg-card shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-border/70 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Study Materials ({filteredMaterials.length} Items)
              </h3>
              <p className="text-xs text-muted-foreground">
                Lecture notes, syllabus units, and question banks.
              </p>
            </div>
            <Button
              asChild
              size="sm"
              className="bg-[#0e7490] hover:bg-[#0e7490]/90 text-white font-bold text-xs h-8 px-3 gap-1.5"
            >
              <Link to="/admin/materials/create">
                <Plus className="size-3.5" /> Add Material
              </Link>
            </Button>
          </div>

          {loading ? (
            <div className="py-16 text-center">
              <div className="size-8 mx-auto animate-spin rounded-full border-3 border-teal-700 border-t-transparent" />
              <p className="text-xs text-muted-foreground mt-3 font-medium">Loading study materials...</p>
            </div>
          ) : filteredMaterials.length === 0 ? (
            <div className="py-16 text-center space-y-3 px-4">
              <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
                <FileText className="size-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">No Materials Found</h4>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                  No study materials match the selected filters. Click "+ Add Material" to upload study notes for this selection.
                </p>
              </div>
              <Button
                asChild
                size="sm"
                className="bg-[#0e7490] hover:bg-[#0e7490]/90 text-white font-bold text-xs h-9 px-4"
              >
                <Link to="/admin/materials/create">
                  <Plus className="size-3.5 mr-1" /> Add Material
                </Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border/80 bg-slate-50/80 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    <th className="py-3 px-4">Unit</th>
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4">Material Title & Description</th>
                    <th className="py-3 px-4">Paid / Free</th>
                    <th className="py-3 px-4">Students</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredMaterials.map((mat) => {
                    const parentSub = subjects.find((s) => s.id === mat.subject_id);
                    const isPaid = mat.price > 0 || mat.is_premium;
                    const isPublished = mat.status === "Published";

                    return (
                      <tr key={mat.id} className="hover:bg-slate-50/60 transition-colors">
                        {/* Unit */}
                        <td className="py-3.5 px-4 font-bold text-foreground whitespace-nowrap">
                          <span className="rounded-lg bg-slate-100 border border-slate-200 px-2 py-1 font-mono text-[11px] font-bold text-slate-700">
                            Unit {mat.unit_number || 1}
                          </span>
                        </td>

                        {/* Subject */}
                        <td className="py-3.5 px-4 max-w-[200px]">
                          <p className="font-bold text-foreground truncate">
                            {parentSub?.name || "Subject"}
                          </p>
                          {parentSub?.code && (
                            <span className="text-[10px] font-mono text-teal-700 font-semibold">
                              {parentSub.code}
                            </span>
                          )}
                        </td>

                        {/* Title & Description */}
                        <td className="py-3.5 px-4 max-w-[300px]">
                          <p className="font-bold text-foreground line-clamp-1">{mat.title}</p>
                          {mat.description && (
                            <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                              {mat.description}
                            </p>
                          )}
                          {mat.file_name && (
                            <div className="flex items-center gap-1 text-[10px] text-teal-700 mt-1 font-medium">
                              <File className="size-3" />
                              <span className="truncate">{mat.file_name}</span>
                            </div>
                          )}
                        </td>

                        {/* Paid / Free */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {isPaid ? (
                            <Badge className="bg-teal-700 text-white font-bold text-[10px] px-2 py-0.5">
                              Paid
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="font-bold text-[10px] px-2 py-0.5">
                              Free
                            </Badge>
                          )}
                        </td>

                        {/* Students */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="flex items-center gap-1.5 text-foreground font-semibold">
                            <Users className="size-3.5 text-muted-foreground" />
                            {mat.students_count || 0}
                          </span>
                        </td>

                        {/* Status Toggle */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => void handleToggleStatus(mat)}
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold transition-colors ${isPublished
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                              : "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                              }`}
                            title="Click to toggle status"
                          >
                            <span
                              className={`size-1.5 rounded-full ${isPublished ? "bg-emerald-600" : "bg-amber-600"
                                }`}
                            />
                            {isPublished ? "Published" : "Draft"}
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            {/* View / Student Preview */}
                            <Button
                              asChild
                              variant="ghost"
                              size="icon"
                              className="size-7 text-muted-foreground hover:text-foreground"
                              title="View Material"
                            >
                              <Link to="/viewer/$materialId" params={{ materialId: mat.id }}>
                                <Eye className="size-3.5" />
                              </Link>
                            </Button>

                            {/* Edit */}
                            <Button
                              asChild
                              variant="ghost"
                              size="icon"
                              className="size-7 text-muted-foreground hover:text-foreground"
                              title="Edit Material"
                            >
                              <Link
                                to="/admin/materials/create"
                                search={{ materialId: mat.id }}
                              >
                                <Edit2 className="size-3.5" />
                              </Link>
                            </Button>

                            {/* Delete */}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                              title="Delete Material"
                              onClick={() => setDeletingMaterial(mat)}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Delete Material Confirmation Alert Dialog */}
        <AlertDialog open={!!deletingMaterial} onOpenChange={() => setDeletingMaterial(null)}>
          <AlertDialogContent className="rounded-2xl max-w-md">
            <AlertDialogHeader>
              <div className="flex size-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive mb-2">
                <AlertTriangle className="size-6" />
              </div>
              <AlertDialogTitle className="text-base font-bold text-foreground">
                Delete Study Material
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-muted-foreground space-y-2">
                <p>
                  Are you sure you want to delete <strong>{deletingMaterial?.title}</strong>?
                </p>
                <p className="text-slate-600">
                  This will remove the study notes from the student catalog and delete the attached PDF from Supabase Storage.
                </p>
                {(deletingMaterial?.students_count || 0) > 0 && (
                  <p className="rounded-lg bg-amber-50 border border-amber-200 p-2 text-amber-800 font-semibold">
                    Note: {deletingMaterial?.students_count} students have purchased this material. It cannot be deleted if active orders exist.
                  </p>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel disabled={isDeleting} className="text-xs font-semibold">
                Cancel
              </AlertDialogCancel>
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
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}
