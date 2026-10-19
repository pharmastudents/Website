import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState, useEffect, useId } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AcademicService, type SubjectItem, type UnitItem } from "@/lib/academicService";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ArrowLeft,
  Upload,
  FileText,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  File,
  Plus,
} from "lucide-react";

export const Route = createFileRoute("/admin/subjects/$subjectId")({
  component: AdminSubjectUnitsPage,
});

export default function AdminSubjectUnitsPage() {
  const { subjectId } = useParams({ from: "/admin/subjects/$subjectId" });
  const fileInputId = useId();

  const [subject, setSubject] = useState<SubjectItem | null>(null);
  const [units, setUnits] = useState<UnitItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State for Add / Edit Unit
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [unitTitle, setUnitTitle] = useState("");
  const [accessType, setAccessType] = useState<"free" | "paid">("free");
  const [file, setFile] = useState<File | null>(null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string>("");
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [uploadedFileSize, setUploadedFileSize] = useState<string>("");
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Load Subject & Its Units directly from Supabase
  const loadSubjectAndUnits = async () => {
    setLoading(true);
    try {
      const data = await AcademicService.loadAll();
      const currentSub = data.subjects.find((s) => s.id === subjectId);
      if (currentSub) {
        setSubject(currentSub);
        const subUnits = data.units
          .filter((u) => u.subject_id === subjectId)
          .sort((a, b) => a.unit_number - b.unit_number);
        setUnits(subUnits);

        // Pre-fill unit title with next unit number
        if (!editingUnitId) {
          const nextUnitNum = subUnits.length + 1;
          setUnitTitle(`Unit ${nextUnitNum} - `);
        }
      } else {
        toast.error("Subject not found in directory.");
      }
    } catch (err: any) {
      console.error("Error loading subject details:", err);
      toast.error("Failed to load subject units: " + err?.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSubjectAndUnits();
  }, [subjectId]);

  // Format file size nicely
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  // Handle File Drop / Selection & Upload to Supabase Storage
  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Check size limit: 100MB
    if (selectedFile.size > 100 * 1024 * 1024) {
      toast.error("File size cannot exceed 100MB.");
      return;
    }

    setFile(selectedFile);
    const formattedSize = formatFileSize(selectedFile.size);
    setUploadedFileName(selectedFile.name);
    setUploadedFileSize(formattedSize);

    // Upload immediately to Supabase Storage
    setUploading(true);
    setUploadProgress(10);
    try {
      const cleanName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const storagePath = `units/${subjectId}_${Date.now()}_${cleanName}`;

      let publicUrl = "";
      try {
        await AcademicService.uploadStorageWithProgress({
          bucket: "notes",
          path: storagePath,
          file: selectedFile,
          onProgress: (percent) => setUploadProgress(percent),
        });
        const { data: pData } = supabase.storage.from("notes").getPublicUrl(storagePath);
        publicUrl = pData.publicUrl;
      } catch (uploadErr) {
        // Fallback to standard Supabase client upload
        const { error: fbErr } = await supabase.storage
          .from("notes")
          .upload(storagePath, selectedFile, {
            contentType: "application/pdf",
            upsert: true,
          });

        if (fbErr) throw fbErr;
        const { data: pData } = supabase.storage.from("notes").getPublicUrl(storagePath);
        publicUrl = pData.publicUrl;
      }

      setUploadedFileUrl(publicUrl);
      setUploadProgress(100);
      toast.success("Study material uploaded successfully!");
    } catch (err: any) {
      console.error("File upload error:", err);
      toast.error("File upload failed: " + (err?.message || "Storage error"));
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setUploadedFileUrl("");
    setUploadedFileName("");
    setUploadedFileSize("");
    setUploadProgress(0);
  };

  // Reset Form
  const resetForm = () => {
    setEditingUnitId(null);
    const nextNum = units.length + 1;
    setUnitTitle(`Unit ${nextNum} - `);
    setAccessType("free");
    handleRemoveFile();
  };

  // Populate form for Edit
  const handleEditUnit = (unit: UnitItem) => {
    setEditingUnitId(unit.id);
    setUnitTitle(unit.title);
    setAccessType(unit.is_premium ? "paid" : "free");
    setUploadedFileUrl(unit.file_url || "");
    setUploadedFileName(unit.file_name || "Study_Material.pdf");
    setUploadedFileSize(String(unit.file_size || "Available"));
  };

  // Submit Unit (Create or Update)
  const handleSubmitUnit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!unitTitle.trim()) {
      toast.error("Please enter a Unit Title.");
      return;
    }

    if (!uploadedFileUrl && !editingUnitId) {
      toast.error("Please upload the PDF / Study Material for this unit.");
      return;
    }

    setSubmitting(true);
    try {
      if (editingUnitId) {
        // Update existing unit in Supabase
        const updateRes = await AcademicService.updateUnit(editingUnitId, {
          title: unitTitle.trim(),
          is_premium: accessType === "paid",
          file_url: uploadedFileUrl || undefined,
          file_name: uploadedFileName || undefined,
          file_size: uploadedFileSize || undefined,
        });
        if (!updateRes.success) {
          throw new Error(updateRes.error || "Failed to update unit in database.");
        }
        toast.success(`Unit updated successfully!`);
      } else {
        // Create new unit in Supabase
        const nextUnitNum = units.length + 1;
        await AcademicService.addUnit({
          subject_id: subjectId,
          unit_number: nextUnitNum,
          title: unitTitle.trim(),
          file_url: uploadedFileUrl || undefined,
          file_name: uploadedFileName || undefined,
          file_size: uploadedFileSize || undefined,
          is_premium: accessType === "paid",
        });
        toast.success(`Unit added successfully!`);
      }

      await loadSubjectAndUnits();
      resetForm();
    } catch (err: any) {
      console.error("Failed to save unit:", err);
      toast.error(err?.message || "Failed to save unit.");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Unit with confirmation
  const handleDeleteUnit = async (unit: UnitItem) => {
    if (!window.confirm(`Are you sure you want to delete "${unit.title}"?`)) {
      return;
    }

    setDeletingId(unit.id);
    try {
      const res = await AcademicService.deleteUnit(unit.id);
      if (res.success) {
        toast.success(`Unit "${unit.title}" removed.`);
        await loadSubjectAndUnits();
        if (editingUnitId === unit.id) {
          resetForm();
        }
      } else {
        toast.error(res.error || "Could not delete unit.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete unit.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AdminLayout
      title={subject ? `${subject.name} - Units` : "Manage Subject Units"}
      subtitle={subject ? `Code: ${subject.code} • Add notes and manage PCI curriculum units.` : "Manage notes and access."}
      actions={
        <Button asChild variant="outline" size="sm" className="rounded-xl border-slate-200">
          <Link to="/admin/subjects">
            <ArrowLeft className="mr-1.5 size-4" /> Back to Subjects
          </Link>
        </Button>
      }
    >
      {/* Breadcrumb matching Reference Image */}
      <div className="mb-6 flex items-center gap-2 text-xs font-semibold text-slate-500">
        <Link to="/admin/subjects" className="hover:text-teal-700 transition-colors">
          Subjects
        </Link>
        <span>&gt;</span>
        <span className="text-slate-700">
          {subject?.name || "Subject"}
        </span>
        <span>&gt;</span>
        <span className="text-slate-900 font-bold">
          {editingUnitId ? "Edit Unit" : "Add Unit"}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: Add New Unit Form */}
        <div className="lg:col-span-5">
          <form
            onSubmit={handleSubmitUnit}
            className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-6"
          >
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                {editingUnitId ? "Edit Unit" : "Add New Unit"}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Upload notes and specify whether this unit is Free for preview or Paid.
              </p>
            </div>

            {/* Unit Title */}
            <div>
              <label className="text-xs font-bold text-slate-700">
                Unit Title <span className="text-red-500">*</span>
              </label>
              <Input
                required
                value={unitTitle}
                onChange={(e) => setUnitTitle(e.target.value)}
                placeholder="Unit 1 - Introduction to Human Body"
                className="mt-1.5 h-11 rounded-xl border-slate-200 focus:border-teal-600 focus:ring-teal-600/20"
              />
            </div>

            {/* Upload PDF / Material */}
            <div>
              <label className="text-xs font-bold text-slate-700">
                Upload PDF <span className="text-red-500">*</span>
              </label>

              {uploadedFileName || uploadedFileUrl ? (
                <div className="mt-2 flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/70">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-teal-800">
                      <FileText className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {uploadedFileName || "Study Material Notes.pdf"}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {uploadedFileSize || "Ready for students"}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-slate-200/60 transition-colors"
                    title="Remove file"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ) : (
                <div className="mt-2">
                  <input
                    id={fileInputId}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileSelected}
                    className="hidden"
                  />
                  <label
                    htmlFor={fileInputId}
                    className={`flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 hover:bg-slate-100/50 cursor-pointer transition-colors ${
                      uploading ? "pointer-events-none opacity-60" : ""
                    }`}
                  >
                    {uploading ? (
                      <div className="text-center space-y-2">
                        <Loader2 className="mx-auto size-7 animate-spin text-teal-600" />
                        <p className="text-xs font-bold text-teal-700">
                          Uploading to secure storage ({uploadProgress}%)...
                        </p>
                      </div>
                    ) : (
                      <div className="text-center space-y-1.5">
                        <Upload className="mx-auto size-7 text-slate-400" />
                        <p className="text-xs font-bold text-slate-700">
                          Click to upload PDF study notes
                        </p>
                        <p className="text-[11px] text-slate-400">
                          PDF, DOC, DOCX up to 100MB
                        </p>
                      </div>
                    )}
                  </label>
                </div>
              )}
            </div>

            {/* Access Type (Free or Paid) - Strict: No unit price, No unit description */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-700">
                Access Type <span className="text-red-500">*</span>
              </label>

              <div className="flex items-center gap-6 pt-1">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="radio"
                    name="unitAccess"
                    checked={accessType === "free"}
                    onChange={() => setAccessType("free")}
                    className="size-4 text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
                  />
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    Free
                  </span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="radio"
                    name="unitAccess"
                    checked={accessType === "paid"}
                    onChange={() => setAccessType("paid")}
                    className="size-4 text-amber-600 focus:ring-amber-500 accent-amber-600"
                  />
                  <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                    Paid
                  </span>
                </label>
              </div>

              <p className="text-[11px] text-slate-400 pt-1">
                Paid units require students to purchase the subject. Free units can be read without purchase.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={resetForm}
                className="rounded-xl border-slate-200 px-5 text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting || uploading}
                className="rounded-xl bg-[#0e7490] hover:bg-[#0f766e] text-white px-6 font-bold text-xs shadow-sm"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Plus className="mr-1.5 size-3.5" />
                    {editingUnitId ? "Save Changes" : "Add Unit"}
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>

        {/* RIGHT COLUMN: Units for this Subject */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-slate-900 tracking-tight">
              Units for this Subject ({units.length})
            </h3>
            <span className="text-xs text-slate-500 font-medium">
              {units.filter((u) => !u.is_premium).length} Free • {units.filter((u) => u.is_premium).length} Paid
            </span>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden divide-y divide-slate-100">
            {loading ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <Loader2 className="mx-auto size-6 animate-spin text-teal-600" />
                <p className="text-xs font-medium">Loading units from database...</p>
              </div>
            ) : units.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <FileText className="mx-auto size-10 text-slate-300" />
                <h4 className="text-sm font-bold text-slate-700">No units added yet</h4>
                <p className="text-xs text-slate-500">
                  Use the form on the left to add Unit 1 notes for {subject?.name || "this subject"}.
                </p>
              </div>
            ) : (
              units.map((unit) => (
                <div
                  key={unit.id}
                  className={`flex items-center justify-between p-4 transition-colors hover:bg-slate-50/70 ${
                    editingUnitId === unit.id ? "bg-teal-50/40" : ""
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0 pr-4">
                    {/* Unit Number */}
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-700">
                      {unit.unit_number}
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">
                        {unit.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                        {unit.file_name ? (
                          <span className="flex items-center gap-1 text-slate-600 truncate max-w-[200px]">
                            <File className="size-3 text-slate-400" />
                            {unit.file_name}
                          </span>
                        ) : (
                          <span className="text-amber-600">No file uploaded</span>
                        )}
                        {unit.file_size && (
                          <span>• {unit.file_size}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Access Badge & Actions */}
                  <div className="flex items-center gap-3 shrink-0">
                    {unit.is_premium ? (
                      <span className="inline-flex items-center rounded-md bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-800 border border-amber-200">
                        Paid
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-md bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                        Free
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => handleEditUnit(unit)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                      title="Edit unit"
                    >
                      <Edit2 className="size-4" />
                    </button>

                    <button
                      type="button"
                      disabled={deletingId === unit.id}
                      onClick={() => void handleDeleteUnit(unit)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Delete unit"
                    >
                      {deletingId === unit.id ? (
                        <Loader2 className="size-4 animate-spin text-red-500" />
                      ) : (
                        <Trash2 className="size-4 text-red-500" />
                      )}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
