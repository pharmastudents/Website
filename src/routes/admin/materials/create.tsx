import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useRef } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AcademicService,
  type Course,
  type Semester,
  type SubjectItem,
  type UnitItem,
} from "@/lib/academicService";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ArrowLeft,
  Upload,
  FileText,
  CheckCircle2,
  X,
  FileCheck,
  Lock,
  Globe,
  Loader2,
  Save,
  Link as LinkIcon,
  Layers,
} from "lucide-react";

export const Route = createFileRoute("/admin/materials/create")({
  validateSearch: (search: Record<string, unknown>): { materialId?: string } => ({
    materialId: typeof search.materialId === "string" ? search.materialId : undefined,
  }),
  component: AdminCreateOrEditMaterialPage,
});

export default function AdminCreateOrEditMaterialPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const editingMaterialId = search.materialId;

  // Academic store state
  const [courses, setCourses] = useState<Course[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [units, setUnits] = useState<UnitItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Form Fields
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>("");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [selectedUnitNumber, setSelectedUnitNumber] = useState<number>(1);
  const [title, setTitle] = useState<string>("");
  const [materialType, setMaterialType] = useState<string>("PDF Notes");
  const [accessType, setAccessType] = useState<"free" | "paid">("free");
  const [publicationStatus, setPublicationStatus] = useState<"Published" | "Draft">("Published");
  const [driveUrl, setDriveUrl] = useState<string>("");

  // Existing file information (when editing)
  const [existingFileUrl, setExistingFileUrl] = useState<string>("");
  const [existingFileName, setExistingFileName] = useState<string>("");
  const [existingFileSize, setExistingFileSize] = useState<string>("");

  // New File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load Courses, Semesters, Subjects & Units
  useEffect(() => {
    let isMounted = true;
    async function initData() {
      try {
        const store = await AcademicService.loadAll();
        if (!isMounted) return;

        setCourses(store.courses);
        setSemesters(store.semesters);
        setSubjects(store.subjects);
        setUnits(store.units);

        if (editingMaterialId) {
          // Find in store first
          let targetMat = store.materials.find((m) => m.id === editingMaterialId);

          // Always fetch latest directly from Supabase to guarantee fresh data
          try {
            const { data: dbMat } = await supabase
              .from("materials")
              .select("*")
              .eq("id", editingMaterialId)
              .maybeSingle();

            if (dbMat) {
              targetMat = { ...(targetMat || {}), ...dbMat } as any;
            }
          } catch (e) {
            console.warn("Could not query direct material from database:", e);
          }

          if (targetMat && isMounted) {
            setTitle(targetMat.title || "");
            setMaterialType(targetMat.material_type || (targetMat as any).type || "PDF Notes");
            const isPaid =
              targetMat.is_premium === true ||
              (typeof targetMat.price === "number" && targetMat.price > 0);
            setAccessType(isPaid ? "paid" : "free");
            setDriveUrl(targetMat.drive_url || "");
            setSelectedUnitNumber(targetMat.unit_number || 1);
            setPublicationStatus(targetMat.status === "Draft" ? "Draft" : "Published");

            if (targetMat.file_url) {
              setExistingFileUrl(targetMat.file_url);
              setExistingFileName(targetMat.file_name || "Existing Attached Document.pdf");
              setExistingFileSize(targetMat.file_size ? `${targetMat.file_size}` : "");
            }

            // Associate with parent subject & hierarchy
            const parentSub = store.subjects.find((s) => s.id === targetMat.subject_id);
            if (parentSub) {
              setSelectedSubjectId(parentSub.id);
              setSelectedSemesterId(parentSub.semester_id || "");
              setSelectedCourseId(parentSub.course_id || "");
            } else if (targetMat.course_id) {
              setSelectedCourseId(targetMat.course_id);
              setSelectedSemesterId(targetMat.semester_id || "");
              setSelectedSubjectId(targetMat.subject_id || "");
            }
          }
        } else if (store.courses.length > 0 && store.courses[0]) {
          // Pre-select first course when creating
          const firstCourse = store.courses[0];
          setSelectedCourseId(firstCourse.id);

          const matchingSems = store.semesters.filter((s) => s.course_id === firstCourse.id);
          if (matchingSems.length > 0 && matchingSems[0]) {
            const firstSem = matchingSems[0];
            setSelectedSemesterId(firstSem.id);

            const matchingSubs = store.subjects.filter((sub) => sub.semester_id === firstSem.id);
            if (matchingSubs.length > 0 && matchingSubs[0]) {
              setSelectedSubjectId(matchingSubs[0].id);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load initial academic data:", err);
        toast.error("Failed to load academic programs from database.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void initData();
    return () => {
      isMounted = false;
    };
  }, [editingMaterialId]);

  // Filtered Semesters based on Course
  const availableSemesters = useMemo(() => {
    if (!selectedCourseId) return semesters;
    return semesters
      .filter((s) => s.course_id === selectedCourseId)
      .sort((a, b) => a.semester_number - b.semester_number);
  }, [semesters, selectedCourseId]);

  // Filtered Subjects based on Semester
  const availableSubjects = useMemo(() => {
    let list = subjects;
    if (selectedCourseId) {
      list = list.filter((s) => s.course_id === selectedCourseId);
    }
    if (selectedSemesterId) {
      list = list.filter((s) => s.semester_id === selectedSemesterId);
    }
    return list.sort((a, b) => (a.code || "").localeCompare(b.code || ""));
  }, [subjects, selectedCourseId, selectedSemesterId]);

  // Handle Course Change
  const handleCourseChange = (courseId: string) => {
    setSelectedCourseId(courseId);
    const sems = semesters.filter((s) => s.course_id === courseId);
    if (sems.length > 0 && sems[0]) {
      setSelectedSemesterId(sems[0].id);
      const subs = subjects.filter((sub) => sub.semester_id === sems[0].id);
      if (subs.length > 0 && subs[0]) {
        setSelectedSubjectId(subs[0].id);
      } else {
        setSelectedSubjectId("");
      }
    } else {
      setSelectedSemesterId("");
      setSelectedSubjectId("");
    }
  };

  // Handle Semester Change
  const handleSemesterChange = (semesterId: string) => {
    setSelectedSemesterId(semesterId);
    const subs = subjects.filter((sub) => sub.semester_id === semesterId);
    if (subs.length > 0 && subs[0]) {
      setSelectedSubjectId(subs[0].id);
    } else {
      setSelectedSubjectId("");
    }
  };

  // File Handling
  const handleFileSelect = (file: File) => {
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      toast.error("Invalid file format. Please select a valid PDF file.");
      return;
    }
    if (file.size > 52428800) {
      toast.error("File size exceeds 50 MB limit.");
      return;
    }
    setSelectedFile(file);
    if (!title.trim()) {
      const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
      setTitle(cleanName);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  // Submit Handler (Supports both Create and Update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSubjectId) {
      toast.error("Please select a subject.");
      return;
    }
    if (!title.trim()) {
      toast.error("Please enter a title for the study material.");
      return;
    }
    if (!selectedFile && !driveUrl.trim() && !existingFileUrl) {
      toast.error("Please either upload a PDF file or provide a Google Drive / document link.");
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(10);

    try {
      const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);
      const isPaid = accessType === "paid";
      const price = isPaid ? 79 : 0;

      if (editingMaterialId) {
        // Update existing record in Supabase
        const updateRes = await AcademicService.updateMaterial(editingMaterialId, {
          course_id: selectedCourseId || selectedSubject?.course_id,
          semester_id: selectedSemesterId || selectedSubject?.semester_id,
          subject_id: selectedSubjectId,
          unit_number: selectedUnitNumber,
          title: title.trim(),
          material_type: materialType,
          price,
          is_premium: isPaid,
          status: publicationStatus,
          drive_url: driveUrl.trim() || undefined,
          file: selectedFile || undefined,
          onProgress: (percent) => setUploadProgress(percent),
        });

        if (!updateRes.success) {
          throw new Error(updateRes.error || "Failed to update study material.");
        }

        toast.success(`Study material "${title.trim()}" updated successfully!`);
        void navigate({ to: "/admin/materials" });
        return;
      }

      // Add new material to Supabase
      await AcademicService.addMaterial({
        course_id: selectedCourseId || selectedSubject?.course_id,
        semester_id: selectedSemesterId || selectedSubject?.semester_id,
        subject_id: selectedSubjectId,
        unit_number: selectedUnitNumber,
        title: title.trim(),
        material_type: materialType,
        price,
        is_premium: isPaid,
        status: publicationStatus,
        file: selectedFile || undefined,
        drive_url: driveUrl.trim() || undefined,
        onProgress: (percent) => setUploadProgress(percent),
      });

      toast.success("Study material uploaded and published successfully!");
      void navigate({ to: "/admin/materials" });
    } catch (err: any) {
      console.error("Failed to save material:", err);
      toast.error(err?.message || "Failed to save study material.");
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  return (
    <AdminLayout
      title={editingMaterialId ? "Edit Study Material" : "Add Study Material"}
      subtitle={
        editingMaterialId
          ? "Update material title, curriculum assignment, publication status, or replace file."
          : "Upload lecture notes, question banks, or syllabus files directly to students."
      }
      actions={
        <Button asChild variant="outline" size="sm" className="gap-2 text-xs font-semibold">
          <Link to="/admin/materials">
            <ArrowLeft className="size-3.5" /> Back to Materials
          </Link>
        </Button>
      }
    >
      <div className="mx-auto max-w-4xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Main 2-Column Form Card */}
          <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-2xs space-y-6">
            {/* Header info */}
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-700">
                  <FileText className="size-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-foreground">
                    {editingMaterialId ? "Edit Material Details" : "Material Information"}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Select the curriculum hierarchy and resource details.
                  </p>
                </div>
              </div>

              {/* Publication Status Selector */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-muted-foreground uppercase">Status:</span>
                <select
                  value={publicationStatus}
                  onChange={(e) => setPublicationStatus(e.target.value as "Published" | "Draft")}
                  disabled={isSubmitting}
                  className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-[#0e7490]"
                >
                  <option value="Published">Published</option>
                  <option value="Draft">Draft</option>
                </select>
              </div>
            </div>

            {/* Dependent Hierarchy Selectors */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Course */}
              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Course *
                </label>
                <select
                  value={selectedCourseId}
                  onChange={(e) => handleCourseChange(e.target.value)}
                  disabled={loading || isSubmitting}
                  className="w-full h-10 rounded-xl border border-input bg-background px-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-[#0e7490]"
                  required
                >
                  <option value="">Select Course</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Semester */}
              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Semester *
                </label>
                <select
                  value={selectedSemesterId}
                  onChange={(e) => handleSemesterChange(e.target.value)}
                  disabled={loading || isSubmitting || !selectedCourseId}
                  className="w-full h-10 rounded-xl border border-input bg-background px-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-[#0e7490]"
                  required
                >
                  <option value="">Select Semester</option>
                  {availableSemesters.map((s) => (
                    <option key={s.id} value={s.id}>
                      Semester {s.semester_number}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject */}
              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Subject *
                </label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  disabled={loading || isSubmitting || !selectedSemesterId}
                  className="w-full h-10 rounded-xl border border-input bg-background px-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-[#0e7490]"
                  required
                >
                  <option value="">Select Subject</option>
                  {availableSubjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.code ? `[${sub.code}] ` : ""}
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Unit & Title */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Unit Selection (1 to 10) */}
              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Unit *
                </label>
                <select
                  value={selectedUnitNumber}
                  onChange={(e) => setSelectedUnitNumber(Number(e.target.value))}
                  disabled={isSubmitting}
                  className="w-full h-10 rounded-xl border border-input bg-background px-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-[#0e7490]"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((u) => (
                    <option key={u} value={u}>
                      Unit {u}
                    </option>
                  ))}
                </select>
              </div>

              {/* Material Title */}
              <div className="md:col-span-3">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Material Title *
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Unit 1 Complete Handwritten Notes"
                  disabled={isSubmitting}
                  className="h-10 text-xs font-medium"
                  required
                />
              </div>
            </div>

            {/* Type & Access Radio */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Material Type */}
              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Material Type
                </label>
                <select
                  value={materialType}
                  onChange={(e) => setMaterialType(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full h-10 rounded-xl border border-input bg-background px-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-[#0e7490]"
                >
                  <option value="PDF Notes">PDF Notes</option>
                  <option value="Handwritten Notes">Handwritten Notes</option>
                  <option value="Question Paper">Previous Year Questions</option>
                  <option value="Syllabus">Curriculum / Syllabus</option>
                  <option value="Lab Manual">Practical / Lab Manual</option>
                </select>
              </div>

              {/* Access Type (Free vs Paid) */}
              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Access Type *
                </label>
                <div className="grid grid-cols-2 gap-2 h-10">
                  <button
                    type="button"
                    onClick={() => setAccessType("free")}
                    className={`flex items-center justify-center gap-2 rounded-xl border text-xs font-bold transition-all ${
                      accessType === "free"
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-2xs"
                        : "border-border bg-background text-muted-foreground hover:bg-muted/50"
                    }`}
                  >
                    <Globe className="size-3.5" />
                    <span>Free Material</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAccessType("paid")}
                    className={`flex items-center justify-center gap-2 rounded-xl border text-xs font-bold transition-all ${
                      accessType === "paid"
                        ? "border-[#0e7490] bg-[#0e7490]/10 text-[#0e7490] shadow-2xs"
                        : "border-border bg-background text-muted-foreground hover:bg-muted/50"
                    }`}
                  >
                    <Lock className="size-3.5" />
                    <span>Paid (Locked)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Existing File Indicator (When editing) */}
            {existingFileUrl && !selectedFile && (
              <div className="flex items-center justify-between rounded-xl border border-teal-200 bg-teal-50/60 p-3.5">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-teal-700 text-white">
                    <FileCheck className="size-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">
                      Current PDF: {existingFileName}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Attached to this material. To replace it, browse or drag a new PDF below.
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-8 text-xs font-semibold border-teal-300 text-teal-800 hover:bg-teal-100"
                >
                  <Upload className="size-3.5 mr-1" /> Replace PDF
                </Button>
              </div>
            )}

            {/* PDF Upload Dropzone */}
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                {existingFileUrl
                  ? "Replace PDF Document (Optional)"
                  : "Upload PDF Document (Stored in Supabase notes bucket)"}
              </label>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelect(f);
                }}
              />

              {!selectedFile ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors ${
                    isDragging
                      ? "border-[#0e7490] bg-[#0e7490]/5"
                      : "border-border hover:border-[#0e7490]/50 hover:bg-muted/30"
                  }`}
                >
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-700 mb-3">
                    <Upload className="size-5" />
                  </div>
                  <p className="text-xs font-bold text-foreground">
                    {existingFileUrl ? "Click to replace PDF or drag new file here" : "Click to browse or drag & drop PDF here"}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Maximum allowed file size: 50 MB · Standard PDF (.pdf) format
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-between rounded-xl border border-teal-200 bg-teal-50/50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-teal-700 text-white">
                      <FileCheck className="size-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">{selectedFile.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB · Ready to upload
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedFile(null)}
                    disabled={isSubmitting}
                    className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                  >
                    <X className="size-4" /> Cancel New File
                  </Button>
                </div>
              )}
            </div>

            {/* External Google Drive Link (Optional) */}
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Google Drive or Direct URL (Optional Alternative)
              </label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  value={driveUrl}
                  onChange={(e) => setDriveUrl(e.target.value)}
                  placeholder="https://drive.google.com/file/d/..."
                  disabled={isSubmitting}
                  className="h-10 pl-9 text-xs"
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Used if your notes are hosted on Google Drive or external cloud storage.
              </p>
            </div>

            {/* Progress indicator during submission */}
            {isSubmitting && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-muted-foreground">
                  <span>Saving to Supabase...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-[#0e7490] transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => void navigate({ to: "/admin/materials" })}
              className="text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || loading}
              className="bg-[#0e7490] hover:bg-[#0e7490]/90 text-white font-bold text-xs h-10 px-6 gap-2 shadow-xs"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Saving Material...
                </>
              ) : editingMaterialId ? (
                <>
                  <Save className="size-4" /> Save Changes
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-4" /> Upload & Publish Material
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
