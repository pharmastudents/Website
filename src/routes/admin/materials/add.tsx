import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useStore, YEARS, semestersForYear } from "@/lib/store";
import { MATERIAL_TYPES, type Material, type MaterialType } from "@/lib/types";
import { toast } from "sonner";
import {
  Upload,
  HardDrive,
  Link as LinkIcon,
  PlusCircle,
  FileText,
  X,
  CheckCircle2,
  ArrowLeft,
  Save,
} from "lucide-react";

export const Route = createFileRoute("/admin/materials/add")({
  component: AdminAddMaterialPage,
});

export default function AdminAddMaterialPage() {
  const { db, saveMaterial, isAdmin, ready } = useStore();
  const navigate = useNavigate();

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [year, setYear] = useState<number>(1);
  const [semester, setSemester] = useState<number>(1);
  const [subjectId, setSubjectId] = useState("");
  const [materialType, setMaterialType] = useState<MaterialType>("PDF Notes");
  const [isPremium, setIsPremium] = useState(true);
  const [price, setPrice] = useState<number>(199);
  const [comboEligible, setComboEligible] = useState(true);
  const [author, setAuthor] = useState("");
  const [pages, setPages] = useState<number>(64);
  const [status, setStatus] = useState<"Published" | "Draft" | "Inactive">("Published");
  const [topics, setTopics] = useState("");

  // Source selection
  const [sourceType, setSourceType] = useState<"upload" | "drive" | "protected_url">("upload");
  const [driveUrl, setDriveUrl] = useState("");
  const [uploadedFile, setUploadedFile] = useState<{
    name: string;
    size: string;
    progress: number;
    completed: boolean;
  } | null>(null);

  const semesters = semestersForYear(year);

  // Available subjects for selected year & semester
  const availableSubjects = useMemo(() => {
    return db.subjects.filter((s) => s.year === year && s.semester === semester);
  }, [db.subjects, year, semester]);

  // Set default subject if needed
  if (!subjectId && availableSubjects.length > 0 && availableSubjects[0]) {
    setSubjectId(availableSubjects[0].id);
  }

  const handleYearChange = (newYear: number) => {
    setYear(newYear);
    const newSem = newYear * 2 - 1;
    setSemester(newSem);
    const match = db.subjects.find((s) => s.year === newYear && s.semester === newSem);
    if (match) setSubjectId(match.id);
  };

  const handleSemesterChange = (newSem: number) => {
    setSemester(newSem);
    const match = db.subjects.find((s) => s.year === year && s.semester === newSem);
    if (match) setSubjectId(match.id);
  };

  // Mock File Upload Simulator
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2) + " MB";
      setUploadedFile({
        name: file.name,
        size: sizeMB,
        progress: 100,
        completed: true,
      });
      toast.success(`File "${file.name}" uploaded successfully.`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Please enter a note title.");
      return;
    }

    const resolvedSubjectId = subjectId || (availableSubjects[0]?.id ?? "general");

    const newMaterial: Material = {
      id: `mat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: title.trim(),
      description: description.trim(),
      year,
      semester,
      subjectId: resolvedSubjectId,
      type: materialType,
      price: isPremium ? Number(price) : 0,
      isPremium,
      author: author.trim() || "PharmaStudents Academic Team",
      pages: Number(pages) || 50,
      comboEligible,
      sourceType,
      driveUrl: sourceType === "drive" ? driveUrl.trim() : undefined,
      fileName: uploadedFile?.name,
      fileSize: uploadedFile?.size,
      topics: topics.split(",").map((s) => s.trim()).filter(Boolean),
      published: status === "Published",
      status,
      order: 1,
      createdAt: new Date().toISOString(),
    };

    saveMaterial(newMaterial);
    toast.success("New study material successfully created and published!");
    void navigate({ to: "/admin/materials" });
  };

  return (
    <AdminLayout
      title="Add New Study Material"
      subtitle="Complete full-page form to publish notes, question banks, and syllabus guides."
      actions={
        <Button asChild variant="outline" size="sm">
          <Link to="/admin/materials">
            <ArrowLeft className="mr-1.5 size-4" /> Cancel & Back
          </Link>
        </Button>
      }
    >
      <div className="mx-auto max-w-4xl">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Section 1: Basic Information */}
          <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-xs space-y-5">
            <h2 className="text-base font-bold text-foreground">1. General Information</h2>

            <div>
              <label className="text-xs font-semibold text-muted-foreground">Note Title *</label>
              <Input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Pharmaceutics I — Complete Semester Master Notes"
                className="mt-1.5 h-11"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground">Description</label>
              <Textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide a comprehensive summary of units, university question patterns, and formulas covered..."
                className="mt-1.5"
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Author / Faculty Name</label>
                <Input
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="e.g. Dr. K. Raman, Dept of Pharmacology"
                  className="mt-1.5"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Number of Pages</label>
                <Input
                  type="number"
                  value={pages}
                  onChange={(e) => setPages(Number(e.target.value))}
                  placeholder="e.g. 64"
                  className="mt-1.5"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground">
                Important Topics Covered (Comma separated)
              </label>
              <Input
                value={topics}
                onChange={(e) => setTopics(e.target.value)}
                placeholder="Unit 1, Unit 2, Classification, SAR, Mechanisms, Repeated 10-markers"
                className="mt-1.5"
              />
            </div>
          </div>

          {/* Section 2: Curriculum Mapping */}
          <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-xs space-y-5">
            <h2 className="text-base font-bold text-foreground">2. Curriculum Alignment (PCI)</h2>

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
                      {y === 1 ? "1st Year" : y === 2 ? "2nd Year" : y === 3 ? "3rd Year" : "4th Year"}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Semester *</label>
                <select
                  aria-label="Semester"
                  value={semester}
                  onChange={(e) => handleSemesterChange(Number(e.target.value))}
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

            {/* Subject Selector + Create New Subject Button */}
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-muted-foreground">Subject *</label>
                <Link
                  to="/admin/subjects/create"
                  className="inline-flex items-center text-xs font-bold text-primary hover:underline"
                >
                  <PlusCircle className="mr-1 size-3.5" /> Create New Subject
                </Link>
              </div>

              <select
                aria-label="Subject"
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="mt-1.5 h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus:ring-2 focus:ring-primary"
              >
                {availableSubjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code || "PCI"})
                  </option>
                ))}
              </select>
              {availableSubjects.length === 0 && (
                <p className="mt-1.5 text-xs text-amber-600">
                  No subjects found for Year {year} Semester {semester}. Click "Create New Subject" to add one.
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground">Material Type</label>
              <select
                aria-label="Material Type"
                value={materialType}
                onChange={(e) => setMaterialType(e.target.value as MaterialType)}
                className="mt-1.5 h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus:ring-2 focus:ring-primary"
              >
                {MATERIAL_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Section 3: Pricing & Access */}
          <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-xs space-y-5">
            <h2 className="text-base font-bold text-foreground">3. Access & Pricing Control</h2>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Access Tier</label>
                <div className="mt-2 flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="radio"
                      name="access"
                      checked={!isPremium}
                      onChange={() => {
                        setIsPremium(false);
                        setPrice(0);
                      }}
                      className="text-primary"
                    />
                    <span>Free Resource</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="radio"
                      name="access"
                      checked={isPremium}
                      onChange={() => {
                        setIsPremium(true);
                        if (price === 0) setPrice(199);
                      }}
                      className="text-primary"
                    />
                    <span>Premium Licensed</span>
                  </label>
                </div>
              </div>

              {isPremium && (
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Price (₹ INR)</label>
                  <Input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="mt-1.5 h-11"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground">Combo Bundle Eligibility</label>
              <div className="mt-2 flex items-center gap-4 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="combo"
                    checked={comboEligible}
                    onChange={() => setComboEligible(true)}
                  />
                  <span>Yes, eligible for Semester & Year Combos</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="combo"
                    checked={!comboEligible}
                    onChange={() => setComboEligible(false)}
                  />
                  <span>No, standalone only</span>
                </label>
              </div>
            </div>
          </div>

          {/* Section 4: File Source & Storage */}
          <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-xs space-y-5">
            <h2 className="text-base font-bold text-foreground">4. Document Source & Upload</h2>

            {/* Source selector */}
            <div className="grid gap-3 sm:grid-cols-3">
              <label
                className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-colors ${
                  sourceType === "upload" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"
                }`}
              >
                <input
                  type="radio"
                  name="sourceType"
                  checked={sourceType === "upload"}
                  onChange={() => setSourceType("upload")}
                />
                <div>
                  <p className="text-xs font-bold text-foreground">Upload PDF File</p>
                  <p className="text-[10px] text-muted-foreground">Local storage / server</p>
                </div>
              </label>

              <label
                className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-colors ${
                  sourceType === "drive" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"
                }`}
              >
                <input
                  type="radio"
                  name="sourceType"
                  checked={sourceType === "drive"}
                  onChange={() => setSourceType("drive")}
                />
                <div>
                  <p className="text-xs font-bold text-foreground">Google Drive Link</p>
                  <p className="text-[10px] text-muted-foreground">Direct cloud folder/file</p>
                </div>
              </label>

              <label
                className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-colors ${
                  sourceType === "protected_url" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"
                }`}
              >
                <input
                  type="radio"
                  name="sourceType"
                  checked={sourceType === "protected_url"}
                  onChange={() => setSourceType("protected_url")}
                />
                <div>
                  <p className="text-xs font-bold text-foreground">Protected URL</p>
                  <p className="text-[10px] text-muted-foreground">Signed document endpoint</p>
                </div>
              </label>
            </div>

            {/* Upload Box */}
            {sourceType === "upload" && (
              <div>
                <label className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border p-8 text-center cursor-pointer hover:border-primary/50 transition-colors">
                  <Upload className="size-8 text-muted-foreground" />
                  <p className="mt-3 text-sm font-semibold text-foreground">
                    Click to browse and upload PDF notes
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Supports .pdf files up to 50MB
                  </p>
                  <input type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
                </label>

                {uploadedFile && (
                  <div className="mt-4 flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-xs">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="size-5 text-emerald-600" />
                      <div>
                        <p className="font-bold text-foreground">{uploadedFile.name}</p>
                        <p className="text-muted-foreground">{uploadedFile.size} · Upload Complete (100%)</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setUploadedFile(null)}
                      className="text-destructive hover:text-destructive"
                    >
                      <X className="size-4" /> Remove
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Google Drive Link Box */}
            {sourceType === "drive" && (
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Google Drive Shareable Link</label>
                <Input
                  value={driveUrl}
                  onChange={(e) => setDriveUrl(e.target.value)}
                  placeholder="https://drive.google.com/file/d/..."
                  className="mt-1.5 h-11"
                />
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  Ensure the Drive link permissions are configured or linked through your PharmaStudents vault.
                </p>
              </div>
            )}
          </div>

          {/* Section 5: Publishing Status */}
          <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-xs space-y-5">
            <h2 className="text-base font-bold text-foreground">5. Publishing Status</h2>

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                <input
                  type="radio"
                  name="status"
                  checked={status === "Published"}
                  onChange={() => setStatus("Published")}
                />
                <span>Published (Visible to students)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                <input
                  type="radio"
                  name="status"
                  checked={status === "Draft"}
                  onChange={() => setStatus("Draft")}
                />
                <span>Draft (Admin only)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                <input
                  type="radio"
                  name="status"
                  checked={status === "Inactive"}
                  onChange={() => setStatus("Inactive")}
                />
                <span>Inactive / Archived</span>
              </label>
            </div>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => void navigate({ to: "/admin/materials" })}
            >
              Cancel
            </Button>
            <Button type="submit" size="lg" className="px-8 font-bold">
              <Save className="mr-2 size-5" /> Save & Publish Note
            </Button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
