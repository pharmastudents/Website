import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AcademicService, type Course, type Semester } from "@/lib/academicService";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  GraduationCap,
  ArrowLeft,
  BookOpen,
  Image as ImageIcon,
  X,
  Loader2,
  Save,
} from "lucide-react";
import { SubjectThumbnail } from "@/components/subject/SubjectThumbnail";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/admin/subjects/create")({
  validateSearch: (search: Record<string, unknown>): { subjectId?: string } => ({
    subjectId: typeof search.subjectId === "string" ? search.subjectId : undefined,
  }),
  component: AdminCreateSubjectPage,
});

export default function AdminCreateSubjectPage() {
  const navigate = useNavigate();
  const { isAdmin, ready } = useStore();
  const search = Route.useSearch();
  const editingSubjectId = search.subjectId;


  // Courses & Semesters from Supabase
  const [courses, setCourses] = useState<Course[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loadingAcademic, setLoadingAcademic] = useState(true);

  // Form State
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>("");
  const [subjectName, setSubjectName] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const [subjectDescription, setSubjectDescription] = useState("");
  const [accessType, setAccessType] = useState<"free" | "paid">("paid");
  const [price, setPrice] = useState<number>(79);
  const [savedPrice, setSavedPrice] = useState<number>(79);

  // Thumbnail State
  const [thumbnailUrl, setThumbnailUrl] = useState<string>("");
  const [thumbnailPreview, setThumbnailPreview] = useState<string>("");
  const [thumbnailUploading, setThumbnailUploading] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  // Fetch real courses & semesters from Supabase
  useEffect(() => {
    let isMounted = true;
    async function loadAcademic() {
      try {
        const data = await AcademicService.loadAll();
        if (isMounted) {
          setCourses(data.courses);
          setSemesters(data.semesters);

          if (editingSubjectId) {
            // Find in loaded subjects
            let targetSub = data.subjects.find((s) => s.id === editingSubjectId);

            // Double-check with fresh direct query to ensure latest price and access type
            try {
              const { data: directSub } = await supabase
                .from("subjects")
                .select("*")
                .eq("id", editingSubjectId)
                .maybeSingle();

              if (directSub) {
                targetSub = {
                  ...(targetSub || {}),
                  ...directSub,
                  price: directSub.price !== null && directSub.price !== undefined ? Number(directSub.price) : 0,
                  is_premium: directSub.is_premium === true || Boolean(directSub.is_premium) || (Number(directSub.price) > 0),
                  thumbnail_url: directSub.thumbnail_url || null,
                } as any;
              }
            } catch (err) {
              console.warn("Could not query direct subject, using loaded cache:", err);
            }

            if (targetSub && isMounted) {
              setSelectedCourseId(targetSub.course_id || "");
              setSelectedSemesterId(targetSub.semester_id || "");
              setSubjectName(targetSub.name || "");
              setSubjectCode(targetSub.code || "");
              setSubjectDescription(targetSub.description || "");

              const isPaid = targetSub.is_premium === true || (typeof targetSub.price === "number" && targetSub.price > 0);
              setAccessType(isPaid ? "paid" : "free");

              const currentPrice = typeof targetSub.price === "number" && targetSub.price > 0 ? targetSub.price : 79;
              setPrice(currentPrice);
              setSavedPrice(currentPrice);

              setThumbnailUrl(targetSub.thumbnail_url || "");
              setThumbnailPreview(targetSub.thumbnail_url || "");
            }
          } else if (data.courses.length > 0) {
            const firstC = data.courses[0];
            setSelectedCourseId(firstC.id);
            const courseSems = data.semesters.filter((s) => s.course_id === firstC.id);
            if (courseSems.length > 0) {
              setSelectedSemesterId(courseSems[0].id);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load academic data:", err);
        toast.error("Could not load courses and semesters from database.");
      } finally {
        if (isMounted) setLoadingAcademic(false);
      }
    }
    void loadAcademic();
    return () => {
      isMounted = false;
    };
  }, []);

  // Filter semesters for selected course
  const availableSemesters = semesters
    .filter((s) => s.course_id === selectedCourseId)
    .sort((a, b) => a.semester_number - b.semester_number);

  const handleCourseChange = (courseId: string) => {
    setSelectedCourseId(courseId);
    const sems = semesters
      .filter((s) => s.course_id === courseId)
      .sort((a, b) => a.semester_number - b.semester_number);
    if (sems.length > 0) {
      setSelectedSemesterId(sems[0].id);
    } else {
      setSelectedSemesterId("");
    }
  };

  const currentCourse = courses.find((c) => c.id === selectedCourseId);
  const currentSemester = semesters.find((s) => s.id === selectedSemesterId);

  // Thumbnail File Upload to Supabase Storage bucket 'thumbnail'
  const handleThumbnailChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ready) {
      toast.error("Authentication session is initializing. Please wait a moment.");
      return;
    }

    if (!isAdmin) {
      toast.error("Administrator access is required to upload thumbnails.");
      return;
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    const isImage = file.type.startsWith("image/") || ["png", "jpg", "jpeg", "webp"].includes(ext);
    if (!isImage) {
      toast.error("Please upload a valid image file (PNG, JPG, JPEG, or WEBP).");
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setThumbnailPreview(previewUrl);
    setThumbnailUploading(true);


    try {
      const publicUrl = await AcademicService.uploadSubjectThumbnail(file);
      setThumbnailUrl(publicUrl);
      setThumbnailPreview(publicUrl);
      toast.success("Thumbnail uploaded successfully.");
    } catch (err: any) {
      console.error("Thumbnail upload failed:", err);
      toast.error(err?.message || "Failed to upload thumbnail.");
      setThumbnailUrl("");
    } finally {
      setThumbnailUploading(false);
    }
  };


  const handleRemoveThumbnail = () => {
    setThumbnailPreview("");
    setThumbnailUrl("");
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subjectName.trim()) {
      toast.error("Please enter a subject name.");
      return;
    }

    const cleanCode = subjectCode.trim().toUpperCase();
    if (!cleanCode) {
      toast.error("Subject code is required. Please enter it manually.");
      return;
    }

    if (!selectedCourseId || !selectedSemesterId) {
      toast.error("Please select a course and semester.");
      return;
    }

    if (accessType === "paid" && (!price || Number(price) <= 0)) {
      toast.error("Please enter a valid price for a paid subject (greater than ₹0).");
      return;
    }

    setSubmitting(true);
    try {
      const semNum = currentSemester?.semester_number || 1;
      const semYear = Math.ceil(semNum / 2) || 1;

      // Ensure we only store valid persistent public URLs, NEVER temporary browser blob: URLs
      const persistentThumbnail =
        thumbnailUrl && !thumbnailUrl.startsWith("blob:") ? thumbnailUrl : null;

      const isPaid = accessType === "paid";
      const finalPrice = isPaid ? Number(price) : 0;

      if (editingSubjectId) {
        const updateRes = await AcademicService.updateSubject(editingSubjectId, {
          course_id: selectedCourseId,
          semester_id: selectedSemesterId,
          semester_number: semNum,
          year: semYear,
          name: subjectName.trim(),
          code: cleanCode,
          thumbnail_url: persistentThumbnail,
          price: finalPrice,
          is_premium: isPaid,
          description: subjectDescription.trim(),
        });

        if (!updateRes.success) {
          throw new Error(updateRes.error || "Failed to update subject in database.");
        }

        toast.success(`Subject "${subjectName.trim()}" updated successfully.`);
        void navigate({ to: "/admin/subjects" });
        return;
      }

      const created = await AcademicService.addSubject({
        course_id: selectedCourseId,
        semester_id: selectedSemesterId,
        semester_number: semNum,
        year: semYear,
        name: subjectName.trim(),
        code: cleanCode,
        thumbnail_url: persistentThumbnail,
        price: finalPrice,
        is_premium: isPaid,
        description: subjectDescription.trim(),
      });

      toast.success(`Subject "${created.name}" created successfully.`);
      void navigate({ to: "/admin/subjects" });
    } catch (err: any) {
      console.error("Subject save error:", err);
      toast.error(err?.message || "Failed to save subject.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminLayout
      title={editingSubjectId ? "Edit Subject" : "Add New Subject"}
      subtitle={
        editingSubjectId
          ? "Update subject details, syllabus information, thumbnail and pricing."
          : "Enter subject details. Units will be selected when uploading study materials."
      }
    >
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-9 gap-1 text-xs"
          >
            <Link to="/admin/subjects">
              <ArrowLeft className="size-4" /> Back to Subjects
            </Link>
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          {/* Left Form */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-xs lg:col-span-7">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Selected Course & Semester Card */}
              <div className="rounded-xl border border-teal-500/20 bg-teal-500/5 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-teal-700 dark:text-teal-400">
                  <GraduationCap className="size-4" />
                  <span>Selected Course & Semester</span>
                </div>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-muted-foreground block mb-1">Course</span>
                    <select
                      aria-label="Select Course"
                      value={selectedCourseId}
                      onChange={(e) => handleCourseChange(e.target.value)}
                      disabled={loadingAcademic || courses.length === 0}
                      className="h-9 w-full rounded-md border border-input bg-background px-2.5 py-1 text-xs font-semibold shadow-xs focus:ring-2 focus:ring-primary"
                    >
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.duration_years} Years)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-1">Semester</span>
                    <select
                      aria-label="Select Semester"
                      value={selectedSemesterId}
                      onChange={(e) => setSelectedSemesterId(e.target.value)}
                      disabled={loadingAcademic || availableSemesters.length === 0}
                      className="h-9 w-full rounded-md border border-input bg-background px-2.5 py-1 text-xs font-semibold shadow-xs focus:ring-2 focus:ring-primary"
                    >
                      {availableSemesters.map((s) => (
                        <option key={s.id} value={s.id}>
                          Semester {s.semester_number}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Subject Name */}
              <div>
                <label className="text-xs font-bold text-foreground">
                  Subject Name <span className="text-destructive">*</span>
                </label>
                <Input
                  required
                  placeholder="e.g. Human Anatomy & Physiology"
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  className="mt-1.5 h-10 text-xs"
                />
              </div>

              {/* Subject Code (Manually entered, no auto-generation) */}
              <div>
                <label className="text-xs font-bold text-foreground">
                  Subject Code <span className="text-destructive">*</span>
                </label>
                <Input
                  required
                  placeholder="e.g. BP100T"
                  value={subjectCode}
                  onChange={(e) => setSubjectCode(e.target.value.toUpperCase())}
                  className="mt-1.5 h-10 text-xs font-mono uppercase"
                />
              </div>

              {/* Subject Thumbnail */}
              <div>
                <label className="text-xs font-bold text-foreground">
                  Subject Thumbnail
                </label>
                <div className="mt-1.5 flex items-center gap-3">
                  {thumbnailPreview ? (
                    <div className="relative size-12 shrink-0 rounded-lg overflow-hidden border border-border bg-muted">
                      <img
                        src={thumbnailPreview}
                        alt="Thumbnail preview"
                        className="size-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveThumbnail}
                        className="absolute top-0.5 right-0.5 rounded-full bg-background/80 p-0.5 text-foreground hover:bg-destructive hover:text-white transition-colors"
                        title="Remove image"
                      >
                        <X className="size-2.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40 text-muted-foreground">
                      <ImageIcon className="size-5" />
                    </div>
                  )}
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/jpg,.png,.jpg,.jpeg,.webp"
                      onChange={handleThumbnailChange}
                      className="text-xs file:mr-2 file:h-8 file:rounded-md file:border-0 file:bg-teal-500/10 file:px-3 file:text-xs file:font-semibold file:text-teal-700 hover:file:bg-teal-500/20"
                    />
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {thumbnailUploading ? "Uploading to bucket 'thumbnail'..." : "PNG, JPG/JPEG or WEBP image (max 10MB)"}
                    </p>

                  </div>
                </div>
              </div>

              {/* Access Type (Free or Paid) */}
              <div>
                <label className="text-xs font-bold text-foreground">Access Type</label>
                <div className="mt-1.5 flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium">
                    <input
                      type="radio"
                      name="accessType"
                      checked={accessType === "free"}
                      onChange={() => {
                        setAccessType("free");
                      }}
                      className="size-4 accent-teal-600"
                    />
                    <span>Free</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium">
                    <input
                      type="radio"
                      name="accessType"
                      checked={accessType === "paid"}
                      onChange={() => {
                        setAccessType("paid");
                        if (!price || price === 0) {
                          setPrice(savedPrice > 0 ? savedPrice : 79);
                        }
                      }}
                      className="size-4 accent-teal-600"
                    />
                    <span>Paid</span>
                  </label>
                </div>
              </div>

              {/* Subject Price (Only shown when Paid is selected; set to 0 and hidden when Free) */}
              {accessType === "paid" && (
                <div>
                  <label className="text-xs font-bold text-foreground">
                    Subject Price (₹) <span className="text-destructive">*</span>
                  </label>
                  <div className="relative mt-1.5">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                      ₹
                    </span>
                    <Input
                      type="number"
                      min={1}
                      required
                      value={price || ""}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setPrice(val);
                        if (val > 0) setSavedPrice(val);
                      }}
                      placeholder="79"
                      className="pl-7 h-10 text-xs font-bold"
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Students will pay this price to unlock all units for this subject.
                  </p>
                </div>
              )}

              {/* Description (Optional) */}
              <div>
                <label className="text-xs font-bold text-foreground">Description (Optional)</label>
                <textarea
                  rows={4}
                  placeholder="Enter subject description..."
                  value={subjectDescription}
                  onChange={(e) => setSubjectDescription(e.target.value)}
                  className="mt-1.5 w-full rounded-md border border-input bg-background p-3 text-xs"
                />
              </div>

              {/* Note on Units */}
              <div className="rounded-xl border border-border bg-muted/20 p-4 text-xs text-muted-foreground">
                <p className="font-semibold text-foreground">Note on Units:</p>
                <p className="mt-0.5">
                  No need to create units manually. Unit 1 to Unit 10 are available as selectable
                  options when adding study materials.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void navigate({ to: "/admin/subjects" })}
                  className="h-10 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting || thumbnailUploading}
                  className="h-10 bg-teal-600 text-xs text-white hover:bg-teal-700 font-semibold px-5"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                      {editingSubjectId ? "Saving..." : "Creating..."}
                    </>
                  ) : editingSubjectId ? (
                    "Save Changes"
                  ) : (
                    "Create Subject"
                  )}
                </Button>
              </div>
            </form>
          </div>

          {/* Right Preview (Preserved in existing position and style) */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-xs lg:col-span-5">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Preview (Subject)
            </span>
            <div className="mt-4 rounded-xl border border-border bg-muted/20 p-5 space-y-3">
              <div className="flex items-start gap-3">
                <SubjectThumbnail
                  src={thumbnailPreview || thumbnailUrl}
                  name={subjectName}
                  code={subjectCode}
                  className="size-14 rounded-xl"
                  fallbackSize="md"
                />
                <div className="min-w-0 flex-1">

                  <h3 className="text-sm font-bold text-foreground truncate">
                    {subjectName.trim() || "Subject Title"}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Code: <span className="font-mono font-bold text-teal-700 dark:text-teal-400">{subjectCode.trim().toUpperCase() || "BP100T"}</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {currentCourse?.name || "B.Pharm"} • {currentSemester?.title || "Semester 1"}
                  </p>
                </div>
              </div>

              {/* Free or Paid Status & Price */}
              <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs">
                <span className="text-muted-foreground font-medium">Status:</span>
                {accessType === "free" ? (
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[11px] font-bold">
                    Free
                  </Badge>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="border-teal-500/30 text-teal-700 dark:text-teal-400 text-[11px] font-bold">
                      Paid
                    </Badge>
                    <span className="font-black text-foreground text-xs">
                      ₹{price || savedPrice || 79}
                    </span>
                  </div>
                )}
              </div>

              {subjectDescription && (
                <p className="text-xs text-muted-foreground line-clamp-3 pt-1 border-t border-border/40">
                  {subjectDescription}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
