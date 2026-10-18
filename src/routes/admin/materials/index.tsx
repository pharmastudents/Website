import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo, useRef } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Layers,
  FileText,
  Users,
  Plus,
  ArrowLeft,
  ChevronRight,
  BookOpen,
  Eye,
  Trash2,
  Edit2,
  AlertTriangle,
  RefreshCw,
  UploadCloud,
  ExternalLink,
  X,
  File,
  CheckCircle2,
  Settings2,
  XCircle,
  Link as LinkIcon,
  ShieldCheck,
} from "lucide-react";

export const Route = createFileRoute("/admin/materials/")({
  component: MaterialManagementPage,
});

type ViewMode =
  | "courses" // Screen 1: Courses Overview
  | "add-course" // Screen 2: Add New Course (Auto Create Semesters)
  | "semester" // Screen 3 & 4: Semester Page with Subject Filter & Material List
  | "add-subject" // Screen 4: Add New Subject (No manual units required)
  | "add-material"; // Screen 5: Add / Edit Material Full-Page Form

const MATERIAL_TYPES = [
  "Unit Notes",
  "PDF Notes",
  "Important Questions",
  "Previous Question Paper",
  "Study Material",
  "Lab Material",
  "Reference Material",
  "Formula Sheet",
  "Revision Notes",
  "Diagrams",
  "Video",
  "Other",
];

export default function MaterialManagementPage() {
  // Navigation & View State
  const [view, setView] = useState<ViewMode>("courses");

  // Selection Hierarchy
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedSemesterId, setSelectedSemesterId] = useState<string | null>(null);
  const [semesterSubjectFilter, setSemesterSubjectFilter] = useState<string>("all");

  // Core Data Store (Strictly Database Driven)
  const [courses, setCourses] = useState<Course[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [registeredStudentsCount, setRegisteredStudentsCount] = useState<number>(0);
  const [totalPurchasedCount, setTotalPurchasedCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Add Course Form State (Screen 2)
  const [courseFormName, setCourseFormName] = useState("");
  const [courseFormDuration, setCourseFormDuration] = useState<number>(4);
  const [courseFormSemesters, setCourseFormSemesters] = useState<number>(8);
  const [courseFormSubmitting, setCourseFormSubmitting] = useState(false);

  // Edit Course Modal State
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editCourseName, setEditCourseName] = useState("");
  const [editCourseDuration, setEditCourseDuration] = useState<number>(4);
  const [editCourseDescription, setEditCourseDescription] = useState("");
  const [editCourseSubmitting, setEditCourseSubmitting] = useState(false);

  // Add Subject Form State (Screen 4 - No manual units required)
  const [subjectFormName, setSubjectFormName] = useState("");
  const [subjectFormDescription, setSubjectFormDescription] = useState("");
  const [subjectFormSubmitting, setSubjectFormSubmitting] = useState(false);

  // Edit Subject Modal State
  const [editingSubject, setEditingSubject] = useState<SubjectItem | null>(null);
  const [editSubjectName, setEditSubjectName] = useState("");
  const [editSubjectDescription, setEditSubjectDescription] = useState("");
  const [editSubjectSubmitting, setEditSubjectSubmitting] = useState(false);

  // Add / Edit Material Form State (Screen 5)
  const [editingMaterial, setEditingMaterial] = useState<MaterialItem | null>(null);
  const [matFormSubjectId, setMatFormSubjectId] = useState("");
  const [matFormUnitNumber, setMatFormUnitNumber] = useState<number>(1);
  const [matFormTitle, setMatFormTitle] = useState("");
  const [matFormDescription, setMatFormDescription] = useState("");
  const [matFormType, setMatFormType] = useState("Unit Notes");
  const [matFormPriceType, setMatFormPriceType] = useState<"free" | "paid">("free");
  const [matFormPrice, setMatFormPrice] = useState<number>(0);
  const [matFormFile, setMatFormFile] = useState<File | null>(null);
  const [matFormDriveUrl, setMatFormDriveUrl] = useState("");
  const [matFormStatus, setMatFormStatus] = useState<"Published" | "Draft">("Published");
  const [matFormAllowDownload, setMatFormAllowDownload] = useState(true);
  const [matFormAllowPrint, setMatFormAllowPrint] = useState(false);
  const [matFormWatermark, setMatFormWatermark] = useState(true);
  const [matFormVisibleTo, setMatFormVisibleTo] = useState("all");
  const [matFormSubmitting, setMatFormSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "saving" | "complete">("idle");
  const [uploadedBytes, setUploadedBytes] = useState<number>(0);
  const [totalBytes, setTotalBytes] = useState<number>(0);
  const [showAccessSettingsModal, setShowAccessSettingsModal] = useState<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const navigate = useNavigate();

  // Modals: Details & Preview
  const [detailsMaterial, setDetailsMaterial] = useState<MaterialItem | null>(null);
  const [previewMaterial, setPreviewMaterial] = useState<MaterialItem | null>(null);

  // Delete Target & Safe Confirmation State
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "course" | "subject" | "material";
    id: string;
    name: string;
    deps?: DependencyCheckResult;
  } | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // 1. Load Academic Data from Supabase
  const loadData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const data = await AcademicService.loadAll();
      setCourses(data.courses);
      setSemesters(data.semesters);
      setSubjects(data.subjects);
      setMaterials(data.materials);
      setRegisteredStudentsCount(data.registeredStudentsCount);
      setTotalPurchasedCount(data.totalPurchasedCount);
    } catch {
      toast.error("Failed to load academic data from database.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  // Derived current course and semester
  const currentCourse = useMemo(
    () => courses.find((c) => c.id === selectedCourseId) || courses[0],
    [courses, selectedCourseId],
  );

  const currentSemester = useMemo(
    () => semesters.find((s) => s.id === selectedSemesterId),
    [semesters, selectedSemesterId],
  );

  // Subjects in currently selected semester
  const semesterSubjects = useMemo(() => {
    if (!selectedSemesterId) return [];
    return subjects.filter((sub) => sub.semester_id === selectedSemesterId);
  }, [subjects, selectedSemesterId]);

  // Materials in currently selected semester
  const semesterMaterials = useMemo(() => {
    if (!selectedSemesterId) return [];
    const semSubIds = new Set(semesterSubjects.map((s) => s.id));
    return materials.filter(
      (m) => m.semester_id === selectedSemesterId || semSubIds.has(m.subject_id),
    );
  }, [materials, selectedSemesterId, semesterSubjects]);

  // Filtered materials by subject
  const displayedMaterials = useMemo(() => {
    if (semesterSubjectFilter === "all") return semesterMaterials;
    return semesterMaterials.filter((m) => m.subject_id === semesterSubjectFilter);
  }, [semesterMaterials, semesterSubjectFilter]);

  // Calculate semester metrics
  const semTotalSubjects = semesterSubjects.length;
  const semTotalMaterials = semesterMaterials.length;
  const semPaidMaterials = semesterMaterials.filter((m) => m.is_premium || m.price > 0).length;
  const semFreeMaterials = semTotalMaterials - semPaidMaterials;
  const semStudentsPurchased = semesterMaterials.reduce(
    (acc, m) => acc + (m.students_count || 0),
    0,
  );
  const semPublishedCount = semesterMaterials.filter((m) => m.status === "Published").length;
  const semDraftCount = semTotalMaterials - semPublishedCount;

  // Auto-calculated code for course preview
  const autoCourseCode = useMemo(() => {
    return (
      courseFormName
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 10) || "COURSE"
    );
  }, [courseFormName]);

  // Auto-calculated code for subject preview
  const autoSubjectCode = useMemo(() => {
    const semNum = currentSemester?.semester_number || 1;
    const words = subjectFormName.trim().split(/\s+/).filter(Boolean);
    const initials = words.map((w) => w[0]?.toUpperCase() || "").join("").slice(0, 4);
    return `BP${semNum}0${words.length}${initials ? initials : "T"}`;
  }, [subjectFormName, currentSemester]);

  // Duration change helper
  const handleDurationChange = (years: number) => {
    setCourseFormDuration(years);
    setCourseFormSemesters(years * 2);
  };

  // Open Add Material form
  const openAddMaterial = (prefillSubjectId?: string) => {
    setEditingMaterial(null);
    setMatFormSubjectId(prefillSubjectId || semesterSubjects[0]?.id || "");
    setMatFormUnitNumber(1);
    setMatFormTitle("");
    setMatFormDescription("");
    setMatFormType("Unit Notes");
    setMatFormPriceType("free");
    setMatFormPrice(0);
    setMatFormFile(null);
    setMatFormDriveUrl("");
    setMatFormStatus("Published");
    setMatFormAllowDownload(true);
    setMatFormAllowPrint(false);
    setMatFormWatermark(true);
    setMatFormVisibleTo("all");
    setView("add-material");
  };

  // Open Edit Material form
  const openEditMaterial = (mat: MaterialItem) => {
    setEditingMaterial(mat);
    setMatFormSubjectId(mat.subject_id);
    setMatFormUnitNumber(mat.unit_number || 1);
    setMatFormTitle(mat.title);
    setMatFormDescription(mat.description || "");
    setMatFormType(mat.material_type || "Unit Notes");
    setMatFormPriceType(mat.price > 0 ? "paid" : "free");
    setMatFormPrice(mat.price || 0);
    setMatFormFile(null);
    setMatFormDriveUrl(mat.drive_url || "");
    setMatFormStatus(mat.status === "Published" ? "Published" : "Draft");
    setMatFormAllowDownload(mat.security?.allow_download ?? true);
    setMatFormAllowPrint(mat.security?.allow_print ?? false);
    setMatFormWatermark(mat.security?.watermark_pdf ?? true);
    setMatFormVisibleTo(mat.security?.visible_to || "all");
    setView("add-material");
  };

  // 2. Submit New Course
  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseFormName.trim()) {
      toast.error("Please enter a course name.");
      return;
    }

    setCourseFormSubmitting(true);
    try {
      const res = await AcademicService.addCourse({
        name: courseFormName.trim(),
        duration_years: courseFormDuration,
        total_semesters: courseFormSemesters,
      });

      setCourses((prev) => [...prev, res.course]);
      setSemesters((prev) => [...prev, ...res.semesters]);

      toast.success(`Course "${res.course.name}" created with ${res.semesters.length} semesters.`);
      setCourseFormName("");
      setView("courses");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create course.";
      toast.error(msg);
    } finally {
      setCourseFormSubmitting(false);
    }
  };

  // 3. Save Edited Course
  const handleSaveCourseEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourse || !editCourseName.trim()) return;

    setEditCourseSubmitting(true);
    try {
      const res = await AcademicService.updateCourse(editingCourse.id, {
        name: editCourseName.trim(),
        duration_years: editCourseDuration,
        description: editCourseDescription.trim(),
      });
      if (!res.success) throw new Error(res.error);

      setCourses((prev) =>
        prev.map((c) =>
          c.id === editingCourse.id
            ? {
                ...c,
                name: editCourseName.trim(),
                duration_years: editCourseDuration,
                description: editCourseDescription.trim(),
              }
            : c,
        ),
      );
      toast.success("Course updated successfully.");
      setEditingCourse(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update course.");
    } finally {
      setEditCourseSubmitting(false);
    }
  };

  // 4. Submit New Subject (No manual units required)
  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectFormName.trim()) {
      toast.error("Please enter a subject name.");
      return;
    }
    if (!selectedCourseId || !selectedSemesterId) {
      toast.error("Please select a course and semester first.");
      return;
    }

    setSubjectFormSubmitting(true);
    try {
      const semNum = currentSemester?.semester_number || 1;
      const semYear = Math.ceil(semNum / 2) || 1;
      const res = await AcademicService.addSubject({
        course_id: selectedCourseId,
        semester_id: selectedSemesterId,
        semester_number: semNum,
        year: semYear,
        name: subjectFormName.trim(),
        description: subjectFormDescription.trim(),
      });

      setSubjects((prev) => [...prev, res]);
      toast.success(`Subject "${res.name}" created successfully.`);
      setSubjectFormName("");
      setSubjectFormDescription("");
      setView("semester");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create subject.";
      toast.error(msg);
    } finally {
      setSubjectFormSubmitting(false);
    }
  };

  // 5. Save Edited Subject
  const handleSaveSubjectEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubject || !editSubjectName.trim()) return;

    setEditSubjectSubmitting(true);
    try {
      const res = await AcademicService.updateSubject(editingSubject.id, {
        name: editSubjectName.trim(),
        description: editSubjectDescription.trim(),
      });
      if (!res.success) throw new Error(res.error);

      setSubjects((prev) =>
        prev.map((s) =>
          s.id === editingSubject.id
            ? {
                ...s,
                name: editSubjectName.trim(),
                description: editSubjectDescription.trim(),
              }
            : s,
        ),
      );
      toast.success("Subject updated successfully.");
      setEditingSubject(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update subject.");
    } finally {
      setEditSubjectSubmitting(false);
    }
  };

  // Helper to open document using in-app protected document viewer
  const handleOpenDocument = (mat: MaterialItem) => {
    void navigate({
      to: "/viewer/$materialId",
      params: { materialId: mat.id },
    });
  };

  // Cancel in-progress upload and abort network request immediately
  const handleCancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setMatFormSubmitting(false);
    setUploadStatus("idle");
    setUploadProgress(0);
    setUploadedBytes(0);
    setTotalBytes(0);
    toast.info("File upload cancelled.");
  };

  // 6. Submit Material (Add or Edit with Supabase Storage PDF upload & real-time progress %)
  const handleSaveMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matFormTitle.trim()) {
      toast.error("Please enter a material title.");
      return;
    }
    if (!matFormSubjectId) {
      toast.error("Please select a subject.");
      return;
    }

    const price = matFormPriceType === "paid" ? Number(matFormPrice || 0) : 0;
    if (matFormPriceType === "paid" && price <= 0) {
      toast.error("Price must be greater than 0 for paid materials.");
      return;
    }

    if (!editingMaterial && !matFormFile && !matFormDriveUrl.trim()) {
      toast.error("Please select a PDF file to upload or enter a Google Drive link.");
      return;
    }

    if (matFormFile) {
      const isPdf =
        matFormFile.type === "application/pdf" ||
        matFormFile.name.toLowerCase().endsWith(".pdf");
      if (!isPdf) {
        toast.error("Invalid file format. Only PDF files (.pdf) are permitted.");
        return;
      }
      if (matFormFile.size > 52428800) {
        toast.error("PDF file size exceeds the 50 MB limit.");
        return;
      }
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setMatFormSubmitting(true);
    if (matFormFile) {
      setUploadStatus("uploading");
      setUploadProgress(1);
      setUploadedBytes(0);
      setTotalBytes(matFormFile.size);
    } else {
      setUploadStatus("saving");
      setUploadProgress(100);
    }

    try {
      const semNum = currentSemester?.semester_number || 1;
      const semYear = Math.ceil(semNum / 2) || 1;

      if (editingMaterial) {
        // Update existing material
        const res = await AcademicService.updateMaterial(editingMaterial.id, {
          title: matFormTitle.trim(),
          description: matFormDescription.trim(),
          material_type: matFormType,
          price,
          status: matFormStatus,
          file: matFormFile || undefined,
          drive_url: matFormDriveUrl.trim() || undefined,
          allow_download: matFormAllowDownload,
          allow_print: matFormAllowPrint,
          add_watermark: matFormWatermark,
          visible_to: matFormVisibleTo,
          onProgress: (pct, loaded, total) => {
            setUploadProgress(pct);
            setUploadedBytes(loaded);
            setTotalBytes(total);
            if (pct >= 100) setUploadStatus("saving");
          },
          abortSignal: controller.signal,
        });
        if (!res.success) throw new Error(res.error);

        setMaterials((prev) =>
          prev.map((m) =>
            m.id === editingMaterial.id
              ? {
                  ...m,
                  title: matFormTitle.trim(),
                  description: matFormDescription.trim(),
                  material_type: matFormType,
                  price,
                  is_premium: price > 0,
                  status: matFormStatus,
                  drive_url: matFormDriveUrl.trim(),
                  file_name: matFormFile ? matFormFile.name : m.file_name,
                }
              : m,
          ),
        );
        toast.success(`Study material "${matFormTitle.trim()}" updated successfully.`);
      } else {
        // Create new material with Supabase Storage upload
        const createdMat = await AcademicService.addMaterial({
          course_id: selectedCourseId || undefined,
          semester_id: selectedSemesterId || undefined,
          subject_id: matFormSubjectId,
          unit_number: matFormUnitNumber,
          semester: semNum,
          year: semYear,
          title: matFormTitle.trim(),
          description: matFormDescription.trim(),
          material_type: matFormType,
          price,
          is_premium: price > 0,
          status: matFormStatus,
          file: matFormFile || undefined,
          drive_url: matFormDriveUrl.trim() || undefined,
          allow_download: matFormAllowDownload,
          allow_print: matFormAllowPrint,
          add_watermark: matFormWatermark,
          visible_to: matFormVisibleTo,
          onProgress: (pct, loaded, total) => {
            setUploadProgress(pct);
            setUploadedBytes(loaded);
            setTotalBytes(total);
            if (pct >= 100) setUploadStatus("saving");
          },
          abortSignal: controller.signal,
        });

        setMaterials((prev) => [createdMat, ...prev]);
        toast.success(`Study material "${createdMat.title}" saved successfully with uploaded PDF.`);
      }

      // Reset & go back
      setEditingMaterial(null);
      setMatFormFile(null);
      setUploadProgress(0);
      setUploadStatus("idle");
      setView("semester");
    } catch (err: unknown) {
      if ((err as any)?.name === "AbortError") {
        toast.info("Upload cancelled.");
      } else {
        const msg = err instanceof Error ? err.message : "Failed to save material.";
        toast.error(msg);
      }
    } finally {
      setMatFormSubmitting(false);
      setUploadStatus("idle");
      abortControllerRef.current = null;
    }
  };

  // 7. Toggle publish status on a material
  const handleTogglePublish = async (mat: MaterialItem) => {
    const nextStatus = await AcademicService.togglePublish(mat.id, mat.status);
    setMaterials((prev) =>
      prev.map((m) => (m.id === mat.id ? { ...m, status: nextStatus } : m)),
    );
    toast.success(`Material status changed to ${nextStatus}.`);
  };

  // 8. Delete Handlers with Dependency Checks
  const promptDeleteCourse = (crs: Course) => {
    const deps = AcademicService.checkCourseDependencies(crs.id);
    setDeleteTarget({
      type: "course",
      id: crs.id,
      name: crs.name,
      deps,
    });
  };

  const promptDeleteSubject = (sub: SubjectItem) => {
    const subMats = materials.filter((m) => m.subject_id === sub.id);
    const purchasesCount = subMats.reduce((acc, m) => acc + (m.students_count || 0), 0);
    setDeleteTarget({
      type: "subject",
      id: sub.id,
      name: sub.name,
      deps: {
        hasDependencies: subMats.length > 0,
        semestersCount: 0,
        subjectsCount: 0,
        unitsCount: 0,
        materialsCount: subMats.length,
        purchasesCount,
        canHardDelete: purchasesCount === 0,
        warningMessage:
          purchasesCount > 0
            ? `This subject contains materials with active student purchases (${purchasesCount} orders). Deleting will remove access for paid students.`
            : `Deleting this subject will remove ${subMats.length} study materials.`,
      },
    });
  };

  const promptDeleteMaterial = (m: MaterialItem) => {
    setDeleteTarget({
      type: "material",
      id: m.id,
      name: m.title,
      deps: {
        hasDependencies: false,
        semestersCount: 0,
        subjectsCount: 0,
        unitsCount: 0,
        materialsCount: 0,
        purchasesCount: m.students_count || 0,
        canHardDelete: (m.students_count || 0) === 0,
        warningMessage:
          (m.students_count || 0) > 0
            ? `This material has ${m.students_count} student purchases. Archiving or setting to Draft is recommended.`
            : "",
      },
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteSubmitting(true);

    try {
      if (deleteTarget.type === "course") {
        const res = await AcademicService.deleteCourse(deleteTarget.id);
        if (!res.success) throw new Error(res.error);
        setCourses((prev) => prev.filter((c) => c.id !== deleteTarget.id));
        setSemesters((prev) => prev.filter((s) => s.course_id !== deleteTarget.id));
        toast.success(`Course "${deleteTarget.name}" deleted.`);
      } else if (deleteTarget.type === "subject") {
        const res = await AcademicService.deleteSubject(deleteTarget.id);
        if (!res.success) throw new Error(res.error);
        setSubjects((prev) => prev.filter((s) => s.id !== deleteTarget.id));
        setMaterials((prev) => prev.filter((m) => m.subject_id !== deleteTarget.id));
        toast.success(`Subject "${deleteTarget.name}" deleted.`);
      } else if (deleteTarget.type === "material") {
        const res = await AcademicService.deleteMaterial(deleteTarget.id);
        if (!res.success) throw new Error(res.error);
        setMaterials((prev) => prev.filter((m) => m.id !== deleteTarget.id));
        toast.success(`Material "${deleteTarget.name}" deleted.`);
      }
      setDeleteTarget(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete.";
      toast.error(msg);
    } finally {
      setDeleteSubmitting(false);
    }
  };

  // =========================================================================
  // RENDER SCREEN 2: Add New Course (Full-Page Form)
  // =========================================================================
  if (view === "add-course") {
    return (
      <AdminLayout
        title="Add New Course"
        subtitle="Enter course details and duration. Semesters will be created automatically in the database."
      >
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setView("courses")}
              className="h-9 gap-1 text-xs"
            >
              <ArrowLeft className="size-4" /> Back to Courses
            </Button>
          </div>

          <div className="grid gap-6 lg:grid-cols-12">
            {/* Left Form */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-xs lg:col-span-7">
              <form onSubmit={handleCreateCourse} className="space-y-5">
                <div>
                  <label className="text-xs font-bold text-foreground">
                    Course Name <span className="text-destructive">*</span>
                  </label>
                  <Input
                    required
                    placeholder="e.g. B.Pharm"
                    value={courseFormName}
                    onChange={(e) => setCourseFormName(e.target.value)}
                    className="mt-1.5 h-10 text-xs"
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Auto-generated code:{" "}
                    <span className="font-mono font-bold text-teal-700">{autoCourseCode}</span>
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-foreground">
                      Duration (Years) <span className="text-destructive">*</span>
                    </label>
                    <select
                      value={courseFormDuration}
                      onChange={(e) => handleDurationChange(Number(e.target.value))}
                      className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-xs"
                    >
                      <option value={1}>1 Year</option>
                      <option value={2}>2 Years</option>
                      <option value={3}>3 Years</option>
                      <option value={4}>4 Years</option>
                      <option value={5}>5 Years</option>
                      <option value={6}>6 Years</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-foreground">
                      Number of Semesters <span className="text-destructive">*</span>
                    </label>
                    <select
                      value={courseFormSemesters}
                      onChange={(e) => setCourseFormSemesters(Number(e.target.value))}
                      className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-xs"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>
                          {n} Semesters
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="rounded-xl border border-teal-500/20 bg-teal-500/5 p-4 text-xs text-teal-800 dark:text-teal-300">
                  <div className="flex items-center gap-2 font-bold">
                    <CheckCircle2 className="size-4 text-teal-600" />
                    <span>Automatic Semester Creation</span>
                  </div>
                  <p className="mt-1 text-muted-foreground">
                    After creating the course, {courseFormSemesters} semesters (Sem 1 to Sem{" "}
                    {courseFormSemesters}) will be created automatically in Supabase.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setView("courses")}
                    className="h-10 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={courseFormSubmitting}
                    className="h-10 bg-teal-600 text-xs text-white hover:bg-teal-700"
                  >
                    {courseFormSubmitting ? "Creating..." : "Create Course"}
                  </Button>
                </div>
              </form>
            </div>

            {/* Right Live Preview */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-xs lg:col-span-5">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Preview
              </span>
              <div className="mt-4 rounded-xl border border-border bg-muted/20 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600">
                    <GraduationCap className="size-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">
                      {courseFormName.trim() || "Course Title"}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {courseFormDuration} Years · {courseFormSemesters} Semesters
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-4 gap-2">
                  {Array.from({ length: courseFormSemesters }).map((_, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-border bg-card py-2 text-center text-xs font-medium text-foreground shadow-2xs"
                    >
                      Sem {idx + 1}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // =========================================================================
  // RENDER SCREEN 4: Add New Subject (Full-Page Form)
  // =========================================================================
  if (view === "add-subject") {
    return (
      <AdminLayout
        title="Add New Subject"
        subtitle="Enter subject details. Units will be selected when uploading study materials."
      >
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setView("semester")}
              className="h-9 gap-1 text-xs"
            >
              <ArrowLeft className="size-4" /> Back to {currentSemester?.title || "Semester"}
            </Button>
          </div>

          <div className="grid gap-6 lg:grid-cols-12">
            {/* Left Form */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-xs lg:col-span-7">
              <form onSubmit={handleCreateSubject} className="space-y-5">
                {/* Selected Course & Semester Card */}
                <div className="rounded-xl border border-teal-500/20 bg-teal-500/5 p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-teal-700 dark:text-teal-400">
                    <GraduationCap className="size-4" />
                    <span>Selected Course & Semester</span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-muted-foreground">Course</span>
                      <p className="font-bold text-foreground">
                        {currentCourse?.name || "B.Pharm"} ({currentCourse?.duration_years || 4} Years)
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Semester</span>
                      <p className="font-bold text-foreground">
                        {currentSemester?.title || "Semester 1"}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground">
                    Subject Name <span className="text-destructive">*</span>
                  </label>
                  <Input
                    required
                    placeholder="e.g. Human Anatomy & Physiology"
                    value={subjectFormName}
                    onChange={(e) => setSubjectFormName(e.target.value)}
                    className="mt-1.5 h-10 text-xs"
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Auto-generated Subject Code:{" "}
                    <span className="font-mono font-bold text-teal-700">{autoSubjectCode}</span>
                  </p>
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground">Description (Optional)</label>
                  <textarea
                    rows={4}
                    placeholder="Enter subject description..."
                    value={subjectFormDescription}
                    onChange={(e) => setSubjectFormDescription(e.target.value)}
                    className="mt-1.5 w-full rounded-md border border-input bg-background p-3 text-xs"
                  />
                </div>

                <div className="rounded-xl border border-border bg-muted/20 p-4 text-xs text-muted-foreground">
                  <p className="font-semibold text-foreground">Note on Units:</p>
                  <p className="mt-0.5">
                    No need to create units manually. Unit 1 to Unit 10 are available as selectable
                    options when adding study materials.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setView("semester")}
                    className="h-10 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={subjectFormSubmitting}
                    className="h-10 bg-teal-600 text-xs text-white hover:bg-teal-700"
                  >
                    {subjectFormSubmitting ? "Creating..." : "Create Subject"}
                  </Button>
                </div>
              </form>
            </div>

            {/* Right Preview */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-xs lg:col-span-5">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Preview (Subject)
              </span>
              <div className="mt-4 rounded-xl border border-border bg-muted/20 p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600">
                    <BookOpen className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">
                      {subjectFormName.trim() || "Subject Title"}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Code: <span className="font-mono font-bold">{autoSubjectCode}</span>
                    </p>
                  </div>
                </div>

                {subjectFormDescription && (
                  <p className="text-xs text-muted-foreground line-clamp-3">
                    {subjectFormDescription}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // =========================================================================
  // RENDER SCREEN 5: Add / Edit Material (Full-Page 3-Column Form)
  // =========================================================================
  if (view === "add-material") {
    return (
      <AdminLayout
        title={editingMaterial ? "Edit Study Material" : "Add New Material"}
        subtitle={`Create study material for ${currentCourse?.name || "B.Pharm"} - ${currentSemester?.title || "Semester 1"}`}
      >
        <div className="space-y-6">
          {/* Top Bar: Back Button, Compact Course/Semester Info, and Access & Settings Icon Popup Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/60">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (uploadStatus === "uploading") {
                    handleCancelUpload();
                  }
                  setView("semester");
                }}
                className="h-9 gap-1 text-xs"
              >
                <ArrowLeft className="size-4" /> Back to {currentSemester?.title || "Semester"}
              </Button>

              {/* Course & Semester shown cleanly as text info */}
              <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50/70 px-3 py-1 text-xs font-semibold text-teal-800">
                <span>{currentCourse?.name || "B.Pharm"}</span>
                <span>•</span>
                <span>{currentSemester?.title || "Semester 1"}</span>
              </div>
            </div>

            {/* Access & Settings Icon Trigger */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAccessSettingsModal(true)}
              className="h-9 gap-2 text-xs border-slate-300 text-slate-700 hover:text-slate-900 hover:bg-slate-50 shadow-2xs"
            >
              <Settings2 className="size-4 text-teal-600" />
              <span>Access & Settings</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                matFormStatus === "Published" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
              }`}>
                {matFormStatus}
              </span>
            </Button>
          </div>

          <form onSubmit={handleSaveMaterial} className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-12 items-start">
              {/* Left Column: Material Details (Simplified side-by-side grid) */}
              <div className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-xs lg:col-span-7">
                <div className="flex items-center justify-between border-b border-border/50 pb-3">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Material Details
                  </h3>
                  <span className="text-[11px] text-muted-foreground">Required fields marked with *</span>
                </div>

                {/* Row 1: Subject and Unit Selection SIDE-BY-SIDE */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-8">
                    <label className="text-xs font-bold text-foreground">
                      Subject <span className="text-destructive">*</span>
                    </label>
                    <select
                      required
                      value={matFormSubjectId}
                      onChange={(e) => setMatFormSubjectId(e.target.value)}
                      className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-xs"
                    >
                      <option value="">Select Subject</option>
                      {semesterSubjects.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.code})
                        </option>
                      ))}
                    </select>
                    {semesterSubjects.length === 0 && (
                      <p className="mt-1 text-[11px] text-amber-600">
                        No subjects found. Please add a subject first.
                      </p>
                    )}
                  </div>

                  <div className="sm:col-span-4">
                    <label className="text-xs font-bold text-foreground">
                      Unit Selection <span className="text-destructive">*</span>
                    </label>
                    <select
                      required
                      value={matFormUnitNumber}
                      onChange={(e) => setMatFormUnitNumber(Number(e.target.value))}
                      className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-xs"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                        <option key={num} value={num}>
                          Unit {num}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Row 2: Material Title and Material Type SIDE-BY-SIDE */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-8">
                    <label className="text-xs font-bold text-foreground">
                      Material Title <span className="text-destructive">*</span>
                    </label>
                    <Input
                      required
                      placeholder="e.g. Unit 1 Notes - Overview"
                      value={matFormTitle}
                      onChange={(e) => setMatFormTitle(e.target.value)}
                      className="mt-1.5 h-10 text-xs"
                    />
                  </div>

                  <div className="sm:col-span-4">
                    <label className="text-xs font-bold text-foreground">
                      Material Type <span className="text-destructive">*</span>
                    </label>
                    <select
                      value={matFormType}
                      onChange={(e) => setMatFormType(e.target.value)}
                      className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-xs"
                    >
                      {MATERIAL_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Row 3: Description */}
                <div>
                  <label className="text-xs font-bold text-foreground">Description</label>
                  <textarea
                    rows={3}
                    placeholder="Enter detailed description or chapter coverage for students..."
                    value={matFormDescription}
                    onChange={(e) => setMatFormDescription(e.target.value)}
                    className="mt-1.5 w-full rounded-md border border-input bg-background p-3 text-xs"
                  />
                </div>

                {/* Row 4: Price Type and Amount SIDE-BY-SIDE */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end pt-1">
                  <div className={matFormPriceType === "paid" ? "sm:col-span-6" : "sm:col-span-12"}>
                    <label className="text-xs font-bold text-foreground">Price Type</label>
                    <div className="mt-1.5 flex items-center gap-3">
                      <label className={`flex-1 flex items-center justify-center gap-2 p-2.5 rounded-lg border cursor-pointer text-xs font-semibold transition-all ${
                        matFormPriceType === "free"
                          ? "border-teal-600 bg-teal-50/70 text-teal-800"
                          : "border-input bg-background hover:bg-muted/40 text-foreground"
                      }`}>
                        <input
                          type="radio"
                          name="priceType"
                          checked={matFormPriceType === "free"}
                          onChange={() => setMatFormPriceType("free")}
                          className="text-teal-600 focus:ring-teal-500"
                        />
                        <span>Free (₹0 Free)</span>
                      </label>
                      <label className={`flex-1 flex items-center justify-center gap-2 p-2.5 rounded-lg border cursor-pointer text-xs font-semibold transition-all ${
                        matFormPriceType === "paid"
                          ? "border-teal-600 bg-teal-50/70 text-teal-800"
                          : "border-input bg-background hover:bg-muted/40 text-foreground"
                      }`}>
                        <input
                          type="radio"
                          name="priceType"
                          checked={matFormPriceType === "paid"}
                          onChange={() => setMatFormPriceType("paid")}
                          className="text-teal-600 focus:ring-teal-500"
                        />
                        <span>Paid Note</span>
                      </label>
                    </div>
                  </div>

                  {matFormPriceType === "paid" && (
                    <div className="sm:col-span-6 animate-in fade-in duration-200">
                      <label className="text-xs font-bold text-foreground">
                        Price (₹) <span className="text-destructive">*</span>
                      </label>
                      <div className="relative mt-1.5">
                        <span className="absolute left-3 top-2.5 text-xs font-bold text-muted-foreground">₹</span>
                        <Input
                          type="number"
                          min={1}
                          required
                          placeholder="e.g. 49"
                          value={matFormPrice || ""}
                          onChange={(e) => setMatFormPrice(Number(e.target.value))}
                          className="h-10 pl-7 text-xs font-bold"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: File Upload & Google Drive Resource Link */}
              <div className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-xs lg:col-span-5">
                <div className="flex items-center justify-between border-b border-border/50 pb-3">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                    File & Online Resource
                  </h3>
                  <span className="text-[11px] text-muted-foreground">PDF or Drive Link</span>
                </div>

                {/* Upload Box with Real-time Uploading % and Cancel */}
                <div className="rounded-xl border-2 border-dashed border-border bg-muted/20 p-5 text-center transition-all">
                  {uploadStatus === "uploading" ? (
                    <div className="space-y-3 py-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-teal-800 flex items-center gap-1.5">
                          <UploadCloud className="size-4 animate-bounce text-teal-600" />
                          Uploading PDF to Storage...
                        </span>
                        <span className="font-black text-teal-700 text-sm">{uploadProgress}%</span>
                      </div>

                      {/* Animated Progress Bar */}
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-linear-to-r from-teal-500 to-emerald-500 transition-all duration-150"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>
                          {totalBytes > 0
                            ? `${(uploadedBytes / (1024 * 1024)).toFixed(1)} MB / ${(totalBytes / (1024 * 1024)).toFixed(1)} MB`
                            : "Uploading..."}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleCancelUpload}
                          className="h-6 px-2 text-[11px] text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <XCircle className="size-3.5 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <UploadCloud className="mx-auto size-9 text-teal-600" />
                      <p className="mt-1.5 text-xs font-bold text-foreground">Upload PDF Document</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        Drag & drop or browse. Max size 50 MB
                      </p>

                      <label className="mt-3 inline-block cursor-pointer rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-teal-700">
                        Browse PDF File
                        <input
                          type="file"
                          accept=".pdf,application/pdf"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) {
                              const isPdf =
                                f.type === "application/pdf" ||
                                f.name.toLowerCase().endsWith(".pdf");
                              if (!isPdf) {
                                toast.error("Invalid file format. Only PDF files (.pdf) are permitted.");
                                return;
                              }
                              if (f.size > 52428800) {
                                toast.error("File size exceeds 50 MB limit.");
                                return;
                              }
                              setMatFormFile(f);
                            }
                          }}
                          className="hidden"
                        />
                      </label>

                      {matFormFile ? (
                        <div className="mt-3 flex items-center justify-between text-xs text-teal-800 bg-teal-50 py-2 px-3 rounded-lg border border-teal-200">
                          <div className="flex items-center gap-2 truncate">
                            <File className="size-4 shrink-0 text-teal-600" />
                            <span className="font-semibold truncate max-w-[160px]">{matFormFile.name}</span>
                            <span className="text-[10px] text-muted-foreground shrink-0">
                              ({(matFormFile.size / (1024 * 1024)).toFixed(2)} MB)
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setMatFormFile(null)}
                            className="text-slate-400 hover:text-red-500 p-0.5"
                            title="Remove file"
                          >
                            <X className="size-4" />
                          </button>
                        </div>
                      ) : editingMaterial?.file_url ? (
                        <div className="mt-3 text-xs text-teal-800 bg-teal-50/80 p-2.5 rounded-lg border border-teal-200 text-left">
                          <p className="font-semibold flex items-center gap-1.5">
                            <CheckCircle2 className="size-3.5 text-teal-600" /> Existing Attached PDF:
                          </p>
                          <p className="text-[11px] truncate text-teal-700 mt-0.5">{editingMaterial.file_name || "Uploaded PDF"}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">Select a new PDF file above to replace it.</p>
                        </div>
                      ) : null}
                    </>
                  )}
                </div>

                {/* Google Drive Link Option (Opens protected in app viewer) */}
                <div className="pt-1">
                  <label className="text-xs font-bold text-foreground flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <LinkIcon className="size-3.5 text-teal-600" /> Google Drive or Resource Link
                    </span>
                    <span className="text-[10px] font-normal text-muted-foreground">Protected In-App</span>
                  </label>
                  <Input
                    placeholder="https://drive.google.com/file/d/..."
                    value={matFormDriveUrl}
                    onChange={(e) => setMatFormDriveUrl(e.target.value)}
                    className="mt-1.5 h-10 text-xs"
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Google Drive link opens directly inside our protected in-app viewer with student watermark overlay.
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-xs">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAccessSettingsModal(true)}
                  className="h-9 gap-1.5 text-xs border-slate-200 text-slate-700"
                >
                  <Settings2 className="size-3.5 text-teal-600" />
                  <span>Access & Security</span>
                </Button>
                <span className="text-[11px] text-muted-foreground hidden sm:inline">
                  Status: <strong className="text-foreground">{matFormStatus}</strong> • Watermark: <strong className="text-foreground">{matFormWatermark ? "Enabled" : "Off"}</strong>
                </span>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (uploadStatus === "uploading") {
                      handleCancelUpload();
                    }
                    setView("semester");
                  }}
                  className="h-10 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={matFormSubmitting}
                  className="h-10 bg-teal-600 text-xs text-white hover:bg-teal-700 font-semibold px-5 shadow-xs"
                >
                  {uploadStatus === "uploading"
                    ? `Uploading (${uploadProgress}%)...`
                    : matFormSubmitting
                      ? "Saving..."
                      : editingMaterial
                        ? "Update Material"
                        : "Save Material"}
                </Button>
              </div>
            </div>
          </form>

          {/* Access & Settings Popup Dialog (Clean modal configured on demand) */}
          <AlertDialog open={showAccessSettingsModal} onOpenChange={setShowAccessSettingsModal}>
            <AlertDialogContent className="max-w-md rounded-2xl p-6">
              <AlertDialogHeader>
                <div className="flex items-center gap-2.5">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-teal-50 text-teal-700 border border-teal-100">
                    <ShieldCheck className="size-5" />
                  </div>
                  <div>
                    <AlertDialogTitle className="text-base font-bold">Access & Security Settings</AlertDialogTitle>
                    <AlertDialogDescription className="text-xs text-muted-foreground">
                      Configure visibility and restrictions. Defaults are automatically applied.
                    </AlertDialogDescription>
                  </div>
                </div>
              </AlertDialogHeader>

              <div className="space-y-4 py-3 text-xs">
                {/* Status: Published vs Draft */}
                <div>
                  <label className="text-xs font-bold text-foreground">Publication Status</label>
                  <div className="mt-1.5 flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="modalMatStatus"
                        checked={matFormStatus === "Draft"}
                        onChange={() => setMatFormStatus("Draft")}
                        className="text-teal-600 focus:ring-teal-500"
                      />
                      <span>Draft</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="modalMatStatus"
                        checked={matFormStatus === "Published"}
                        onChange={() => setMatFormStatus("Published")}
                        className="text-teal-600 focus:ring-teal-500"
                      />
                      <span className="font-semibold text-teal-800">Published (Visible to students)</span>
                    </label>
                  </div>
                </div>

                {/* Security Flags */}
                <div className="space-y-3 pt-2 border-t border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground">Allow Download</p>
                      <p className="text-[10px] text-muted-foreground">Permit students to download original file.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={matFormAllowDownload}
                      onChange={(e) => setMatFormAllowDownload(e.target.checked)}
                      className="size-4 rounded text-teal-600"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground">Allow Print</p>
                      <p className="text-[10px] text-muted-foreground">Enable browser print function.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={matFormAllowPrint}
                      onChange={(e) => setMatFormAllowPrint(e.target.checked)}
                      className="size-4 rounded text-teal-600"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground">Add Watermark</p>
                      <p className="text-[10px] text-muted-foreground">Overlay student name, email & ID on viewer.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={matFormWatermark}
                      onChange={(e) => setMatFormWatermark(e.target.checked)}
                      className="size-4 rounded text-teal-600"
                    />
                  </div>
                </div>

                {/* Visible To */}
                <div className="pt-2 border-t border-border">
                  <label className="text-xs font-bold text-foreground">Visible To</label>
                  <select
                    value={matFormVisibleTo}
                    onChange={(e) => setMatFormVisibleTo(e.target.value)}
                    className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-xs"
                  >
                    <option value="all">All Registered Students</option>
                    <option value="purchased">Purchased Students Only</option>
                  </select>
                </div>

                <div className="rounded-lg bg-teal-50/70 border border-teal-100 p-2.5 text-[11px] text-teal-800">
                  <p>
                    <strong>Protection Active:</strong> Right-click, download, and external copying are blocked in the protected viewer.
                  </p>
                </div>
              </div>

              <AlertDialogFooter>
                <AlertDialogAction
                  onClick={() => setShowAccessSettingsModal(false)}
                  className="bg-teal-600 hover:bg-teal-700 text-white text-xs"
                >
                  Apply & Close
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </AdminLayout>
    );
  }

  // =========================================================================
  // RENDER SCREEN 3: Semester Page with Subject Filter & Material List
  // =========================================================================
  if (view === "semester" && currentSemester) {
    return (
      <AdminLayout
        title={`${currentCourse?.name || "B.Pharm"} - ${currentSemester.title}`}
        subtitle={`${semTotalSubjects} Subjects • ${semTotalMaterials} Materials • ${semStudentsPurchased} Students`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setView("add-subject")}
              className="h-9 gap-1.5 text-xs font-semibold"
            >
              <Plus className="size-4" /> Add Subject
            </Button>
            <Button
              size="sm"
              onClick={() => openAddMaterial()}
              className="h-9 gap-1.5 bg-teal-600 text-xs font-semibold text-white hover:bg-teal-700"
            >
              <Plus className="size-4" /> Add Material
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Breadcrumb Bar */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <button
              onClick={() => setView("courses")}
              className="hover:text-foreground hover:underline"
            >
              Material
            </button>
            <ChevronRight className="size-3.5" />
            <button
              onClick={() => setView("courses")}
              className="hover:text-foreground hover:underline"
            >
              {currentCourse?.name || "B.Pharm"}
            </button>
            <ChevronRight className="size-3.5" />
            <span className="font-semibold text-foreground">{currentSemester.title}</span>
          </div>

          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setView("courses")}
              className="h-9 gap-1 text-xs"
            >
              <ArrowLeft className="size-4" /> Back to Courses
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadData(true)}
              disabled={refreshing}
              className="h-8 gap-1.5 text-xs text-muted-foreground"
            >
              <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {/* 4 Real Metric Stat Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                  <BookOpen className="size-5" />
                </div>
                <div>
                  <span className="text-[11px] font-medium text-muted-foreground">Total Subjects</span>
                  <p className="text-xl font-extrabold text-foreground">{semTotalSubjects}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600">
                  <FileText className="size-5" />
                </div>
                <div>
                  <span className="text-[11px] font-medium text-muted-foreground">Total Materials</span>
                  <p className="text-xl font-extrabold text-foreground">{semTotalMaterials}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {semPaidMaterials} Paid · {semFreeMaterials} Free
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600">
                  <Users className="size-5" />
                </div>
                <div>
                  <span className="text-[11px] font-medium text-muted-foreground">
                    Students Purchased
                  </span>
                  <p className="text-xl font-extrabold text-foreground">{semStudentsPurchased}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                  <CheckCircle2 className="size-5" />
                </div>
                <div>
                  <span className="text-[11px] font-medium text-muted-foreground">Published</span>
                  <p className="text-xl font-extrabold text-foreground">{semPublishedCount}</p>
                  <p className="text-[11px] text-muted-foreground">{semDraftCount} Drafts</p>
                </div>
              </div>
            </div>
          </div>

          {/* Subject Filter & Subject Management Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-xs">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                Select Subject:
              </span>
              <select
                value={semesterSubjectFilter}
                onChange={(e) => setSemesterSubjectFilter(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-xs font-medium"
              >
                <option value="all">All Subjects ({semTotalSubjects})</option>
                {semesterSubjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Active Subjects Pills with Edit & Delete */}
            <div className="flex flex-wrap items-center gap-2">
              {semesterSubjects.map((sub) => (
                <div
                  key={sub.id}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition-colors ${
                    semesterSubjectFilter === sub.id
                      ? "border-teal-600 bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-200"
                      : "border-border bg-muted/30 text-foreground"
                  }`}
                >
                  <span
                    className="font-semibold cursor-pointer"
                    onClick={() => setSemesterSubjectFilter(sub.id)}
                  >
                    {sub.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground">({sub.code})</span>
                  <button
                    onClick={() => {
                      setEditingSubject(sub);
                      setEditSubjectName(sub.name);
                      setEditSubjectDescription(sub.description || "");
                    }}
                    className="ml-1 text-muted-foreground hover:text-foreground"
                    title="Edit Subject"
                  >
                    <Edit2 className="size-3" />
                  </button>
                  <button
                    onClick={() => promptDeleteSubject(sub)}
                    className="text-muted-foreground hover:text-destructive"
                    title="Delete Subject"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Materials Table (Requirement 4 & 7) */}
          <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
            <div className="border-b border-border p-4 flex items-center justify-between">
              <h3 className="text-xs font-bold text-foreground">
                Study Materials ({displayedMaterials.length} Items)
              </h3>
              <Button
                size="sm"
                onClick={() => openAddMaterial()}
                className="h-8 gap-1.5 bg-teal-600 text-xs text-white hover:bg-teal-700"
              >
                <Plus className="size-3.5" /> Add Material
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/10 font-semibold text-muted-foreground">
                  <tr>
                    <th className="p-3.5">Unit</th>
                    <th className="p-3.5">Subject Title</th>
                    <th className="p-3.5">Material Title & Description</th>
                    <th className="p-3.5">Paid / Free</th>
                    <th className="p-3.5">Students</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {displayedMaterials.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground">
                        No materials found for this selection. Click "+ Add Material" to upload study
                        notes.
                      </td>
                    </tr>
                  ) : (
                    displayedMaterials.map((mat) => {
                      const parentSub = subjects.find((s) => s.id === mat.subject_id);
                      const unitLabel = mat.unit_label || `Unit ${mat.unit_number || 1}`;

                      return (
                        <tr key={mat.id} className="hover:bg-muted/10 transition-colors">
                          <td className="p-3.5 font-bold">
                            <Badge variant="outline" className="text-[10px] font-bold">
                              {unitLabel}
                            </Badge>
                          </td>
                          <td className="p-3.5">
                            <p className="font-bold text-foreground">
                              {parentSub?.name || "Subject"}
                            </p>
                            <p className="text-[10px] text-muted-foreground font-mono">
                              {parentSub?.code || ""}
                            </p>
                          </td>
                          <td className="p-3.5 max-w-xs">
                            <p className="font-bold text-foreground">{mat.title}</p>
                            <Badge variant="secondary" className="mt-0.5 text-[9px]">
                              {mat.material_type}
                            </Badge>
                            {mat.description ? (
                              <div className="mt-1">
                                <p className="text-[11px] text-muted-foreground line-clamp-1">
                                  {mat.description}
                                </p>
                                <button
                                  type="button"
                                  onClick={() => setDetailsMaterial(mat)}
                                  className="text-[10px] font-semibold text-teal-600 hover:underline"
                                >
                                  View Details
                                </button>
                              </div>
                            ) : null}
                          </td>
                          <td className="p-3.5 font-bold">
                            {mat.price > 0 ? (
                              <span>₹{mat.price}</span>
                            ) : (
                              <span className="text-teal-600 font-semibold">₹0 Free</span>
                            )}
                          </td>
                          <td className="p-3.5 font-medium text-foreground">
                            {mat.students_count || 0}
                          </td>
                          <td className="p-3.5">
                            <button
                              onClick={() => void handleTogglePublish(mat)}
                              className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold transition-opacity hover:opacity-80 ${
                                mat.status === "Published"
                                  ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                                  : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                              }`}
                            >
                              {mat.status}
                            </button>
                          </td>
                          <td className="p-3.5 text-right">
                            <div className="inline-flex items-center gap-1">
                              {(mat.file_url || mat.drive_url) && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                                  onClick={() => void handleOpenDocument(mat)}
                                  title="Open PDF"
                                >
                                  <FileText className="size-3.5" />
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                onClick={() => openEditMaterial(mat)}
                                title="Edit Material"
                              >
                                <Edit2 className="size-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-teal-600"
                                onClick={() => setPreviewMaterial(mat)}
                                title="Preview Material"
                              >
                                <Eye className="size-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                onClick={() => promptDeleteMaterial(mat)}
                                title="Delete Material"
                              >
                                <Trash2 className="size-3.5" />
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
        </div>

        {/* Modal: View Details */}
        {detailsMaterial && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-xs p-4">
            <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-base font-bold text-foreground">{detailsMaterial.title}</h3>
                <button
                  onClick={() => setDetailsMaterial(null)}
                  className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-xs">
                <div>
                  <span className="font-semibold text-muted-foreground">Unit:</span>
                  <span className="ml-2 font-bold text-foreground">
                    {detailsMaterial.unit_label || `Unit ${detailsMaterial.unit_number || 1}`}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-muted-foreground">Type:</span>
                  <span className="ml-2">{detailsMaterial.material_type}</span>
                </div>
                <div>
                  <span className="font-semibold text-muted-foreground">Price:</span>
                  <span className="ml-2 font-bold">
                    {detailsMaterial.price > 0 ? `₹${detailsMaterial.price}` : "Free"}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-muted-foreground">Description:</span>
                  <p className="mt-1 rounded-lg border border-border bg-muted/20 p-3 text-foreground whitespace-pre-wrap">
                    {detailsMaterial.description || "No description provided."}
                  </p>
                </div>
                {detailsMaterial.file_url && (
                  <div>
                    <span className="font-semibold text-muted-foreground">PDF Document:</span>
                    <div className="mt-1 flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => void handleOpenDocument(detailsMaterial)}
                        className="h-8 gap-1.5 bg-teal-600 text-xs text-white hover:bg-teal-700"
                      >
                        <FileText className="size-3.5" /> Open Secure PDF
                      </Button>
                      <span className="text-[11px] text-muted-foreground">
                        {detailsMaterial.file_name || "Uploaded PDF"}
                      </span>
                    </div>
                  </div>
                )}
                {detailsMaterial.drive_url && (
                  <div className="flex items-center justify-between gap-2 rounded-lg border border-teal-200 bg-teal-50/60 p-2.5">
                    <div className="min-w-0">
                      <span className="font-semibold text-teal-900 block text-xs">Google Drive Resource:</span>
                      <span className="text-[11px] text-teal-700 font-mono truncate max-w-[280px] block">
                        {detailsMaterial.drive_url}
                      </span>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => void handleOpenDocument(detailsMaterial)}
                      className="h-8 shrink-0 gap-1.5 rounded-lg bg-teal-600 px-3 text-xs font-semibold text-white hover:bg-teal-700"
                    >
                      <Eye className="size-3.5" /> View In-App
                    </Button>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDetailsMaterial(null)}
                  className="h-9 text-xs"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </AdminLayout>
    );
  }

  // =========================================================================
  // RENDER SCREEN 1: Courses Overview
  // =========================================================================
  const totalCourses = courses.length;
  const totalSemestersCount = semesters.length;
  const totalMaterialsCount = materials.length;
  const totalPaidMaterials = materials.filter((m) => m.is_premium || m.price > 0).length;
  const totalFreeMaterials = totalMaterialsCount - totalPaidMaterials;

  return (
    <AdminLayout
      title="Material"
      subtitle="Manage courses, semesters, subjects and study materials"
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadData(true)}
            disabled={refreshing}
            className="h-9 gap-1.5 text-xs text-muted-foreground"
          >
            <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => setView("add-course")}
            className="h-9 gap-1.5 bg-teal-600 text-xs font-semibold text-white hover:bg-teal-700"
          >
            <Plus className="size-4" /> Add Course
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* 4 Stat Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600">
                <GraduationCap className="size-5" />
              </div>
              <div>
                <span className="text-[11px] font-medium text-muted-foreground">Total Courses</span>
                <p className="text-xl font-extrabold text-foreground">{totalCourses}</p>
                <p className="text-[11px] text-muted-foreground">
                  {courses.map((c) => c.name).join(", ") || "No courses"}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                <Layers className="size-5" />
              </div>
              <div>
                <span className="text-[11px] font-medium text-muted-foreground">
                  Total Semesters
                </span>
                <p className="text-xl font-extrabold text-foreground">{totalSemestersCount}</p>
                <p className="text-[11px] text-muted-foreground">Across all courses</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600">
                <FileText className="size-5" />
              </div>
              <div>
                <span className="text-[11px] font-medium text-muted-foreground">
                  Total Materials
                </span>
                <p className="text-xl font-extrabold text-foreground">{totalMaterialsCount}</p>
                <p className="text-[11px] text-muted-foreground">
                  {totalPaidMaterials} Paid · {totalFreeMaterials} Free
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                <Users className="size-5" />
              </div>
              <div>
                <span className="text-[11px] font-medium text-muted-foreground">
                  Students Purchased
                </span>
                <p className="text-xl font-extrabold text-foreground">{totalPurchasedCount}</p>
                <p className="text-[11px] text-muted-foreground">
                  Out of {registeredStudentsCount} registered
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Course Cards Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((crs) => {
            const crsSems = semesters
              .filter((s) => s.course_id === crs.id)
              .sort((a, b) => a.semester_number - b.semester_number);
            const crsSubs = subjects.filter(
              (sub) => sub.course_id === crs.id || crsSems.some((s) => s.id === sub.semester_id),
            );
            const crsMats = materials.filter(
              (m) => m.course_id === crs.id || crsSubs.some((sub) => sub.id === m.subject_id),
            );
            const crsPurchases = crsMats.reduce((acc, m) => acc + (m.students_count || 0), 0);

            return (
              <div
                key={crs.id}
                className="group relative flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-xs hover:border-teal-500/40 hover:shadow-md transition-all"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex size-12 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600">
                        <GraduationCap className="size-6" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-foreground">{crs.name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {crs.duration_years} Years · {crsSems.length} Semesters
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setEditingCourse(crs);
                          setEditCourseName(crs.name);
                          setEditCourseDuration(crs.duration_years);
                          setEditCourseDescription(crs.description || "");
                        }}
                        title="Edit Course"
                      >
                        <Edit2 className="size-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => promptDeleteCourse(crs)}
                        title="Delete Course"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-2 border-y border-border/60 py-3 text-center">
                    <div>
                      <p className="text-base font-extrabold text-foreground">{crsSems.length}</p>
                      <span className="text-[10px] text-muted-foreground">Semesters</span>
                    </div>
                    <div>
                      <p className="text-base font-extrabold text-foreground">{crsMats.length}</p>
                      <span className="text-[10px] text-muted-foreground">Materials</span>
                    </div>
                    <div>
                      <p className="text-base font-extrabold text-foreground">{crsPurchases}</p>
                      <span className="text-[10px] text-muted-foreground">Purchased</span>
                    </div>
                  </div>
                </div>

                {/* Semester Navigation Pills */}
                <div className="mt-5">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Semesters
                  </span>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {crsSems.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setSelectedCourseId(crs.id);
                          setSelectedSemesterId(s.id);
                          setSemesterSubjectFilter("all");
                          setView("semester");
                        }}
                        className="rounded-lg border border-border bg-muted/40 px-2.5 py-1 text-xs font-semibold text-foreground hover:border-teal-600 hover:bg-teal-50 hover:text-teal-700 transition-colors"
                      >
                        Sem {s.semester_number}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal: Edit Course */}
      {editingCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground">Edit Course</h3>
              <button
                onClick={() => setEditingCourse(null)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCourseEdit} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-bold text-foreground">Course Name</label>
                <Input
                  required
                  value={editCourseName}
                  onChange={(e) => setEditCourseName(e.target.value)}
                  className="mt-1.5 h-10 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-foreground">Duration (Years)</label>
                <select
                  value={editCourseDuration}
                  onChange={(e) => setEditCourseDuration(Number(e.target.value))}
                  className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-xs"
                >
                  {[1, 2, 3, 4, 5, 6].map((y) => (
                    <option key={y} value={y}>
                      {y} Years
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground">Description</label>
                <textarea
                  rows={3}
                  value={editCourseDescription}
                  onChange={(e) => setEditCourseDescription(e.target.value)}
                  className="mt-1.5 w-full rounded-md border border-input bg-background p-3 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingCourse(null)}
                  className="h-9 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={editCourseSubmitting}
                  className="h-9 bg-teal-600 text-xs text-white hover:bg-teal-700"
                >
                  {editCourseSubmitting ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Subject */}
      {editingSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground">Edit Subject</h3>
              <button
                onClick={() => setEditingSubject(null)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSubjectEdit} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-bold text-foreground">Subject Name</label>
                <Input
                  required
                  value={editSubjectName}
                  onChange={(e) => setEditSubjectName(e.target.value)}
                  className="mt-1.5 h-10 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-foreground">Description</label>
                <textarea
                  rows={3}
                  value={editSubjectDescription}
                  onChange={(e) => setEditSubjectDescription(e.target.value)}
                  className="mt-1.5 w-full rounded-md border border-input bg-background p-3 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingSubject(null)}
                  className="h-9 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={editSubjectSubmitting}
                  className="h-9 bg-teal-600 text-xs text-white hover:bg-teal-700"
                >
                  {editSubjectSubmitting ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Preview Material */}
      {previewMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground">Material Preview</h3>
              <button
                onClick={() => setPreviewMaterial(null)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div>
                <span className="font-semibold text-muted-foreground">Title:</span>
                <p className="font-bold text-foreground text-sm">{previewMaterial.title}</p>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-muted-foreground">Type:</span>
                  <p>{previewMaterial.material_type}</p>
                </div>
                <div>
                  <span className="font-semibold text-muted-foreground">Price:</span>
                  <p className="font-bold">
                    {previewMaterial.price > 0 ? `₹${previewMaterial.price}` : "Free"}
                  </p>
                </div>
                <div>
                  <span className="font-semibold text-muted-foreground">Status:</span>
                  <p className="font-bold text-emerald-600">{previewMaterial.status}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2">
                {previewMaterial.file_url && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void handleOpenDocument(previewMaterial)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-700"
                  >
                    <FileText className="size-3.5" /> Open Secure PDF
                  </Button>
                )}
                {previewMaterial.drive_url && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void handleOpenDocument(previewMaterial)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-800 hover:bg-teal-100"
                  >
                    <Eye className="size-3.5 text-teal-600" /> Open In-App Viewer
                  </Button>
                )}
                {!previewMaterial.file_url && !previewMaterial.drive_url && (
                  <p className="text-muted-foreground italic">No document file attached.</p>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreviewMaterial(null)}
                className="h-9 text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog: Safe Deletion */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-5" />
              <AlertDialogTitle>Confirm Safe Deletion</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="space-y-2 pt-2 text-xs">
              <p>
                Are you sure you want to delete{" "}
                <strong className="text-foreground">{deleteTarget?.name}</strong>?
              </p>
              {deleteTarget?.deps?.warningMessage && (
                <p className="rounded-lg bg-destructive/10 p-2.5 font-medium text-destructive">
                  {deleteTarget.deps.warningMessage}
                </p>
              )}
              {deleteTarget?.deps && !deleteTarget.deps.canHardDelete && (
                <p className="font-semibold text-destructive">
                  Notice: This record has active student transaction history. Deletion is blocked
                  to protect user libraries.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteSubmitting || (deleteTarget?.deps && !deleteTarget.deps.canHardDelete)}
              onClick={() => void handleConfirmDelete()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteSubmitting ? "Deleting..." : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
