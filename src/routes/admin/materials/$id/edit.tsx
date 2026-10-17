import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useStore, YEARS, semestersForYear } from "@/lib/store";
import { MATERIAL_TYPES, type Material, type MaterialType } from "@/lib/types";
import { toast } from "sonner";
import { ArrowLeft, Save, Upload, CheckCircle2, X } from "lucide-react";

export const Route = createFileRoute("/admin/materials/$id/edit")({
  component: AdminEditMaterialPage,
});

export default function AdminEditMaterialPage() {
  const { id } = Route.useParams();
  const { db, saveMaterial, ready } = useStore();
  const navigate = useNavigate();

  const existing = db.materials.find((m) => m.id === id);

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
  const [driveUrl, setDriveUrl] = useState("");
  const [topics, setTopics] = useState("");

  useEffect(() => {
    if (existing) {
      setTitle(existing.title);
      setDescription(existing.description);
      setYear(existing.year);
      setSemester(existing.semester);
      setSubjectId(existing.subjectId);
      setMaterialType(existing.type);
      setIsPremium(existing.isPremium);
      setPrice(existing.price);
      setComboEligible(existing.comboEligible ?? true);
      setAuthor(existing.author ?? "");
      setPages(existing.pages ?? 60);
      setStatus(existing.status ?? (existing.published ? "Published" : "Draft"));
      setDriveUrl(existing.driveUrl ?? "");
      setTopics(existing.topics?.join(", ") ?? "");
    }
  }, [existing]);

  const semesters = semestersForYear(year);
  const availableSubjects = useMemo(() => {
    return db.subjects.filter((s) => s.year === year && s.semester === semester);
  }, [db.subjects, year, semester]);

  if (!ready) return null;

  if (!existing) {
    return (
      <AdminLayout title="Note Not Found">
        <div className="py-20 text-center">
          <h2 className="text-xl font-bold">Study Note Not Found</h2>
          <Button asChild className="mt-4">
            <Link to="/admin/materials">Back to Materials Directory</Link>
          </Button>
        </div>
      </AdminLayout>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const updated: Material = {
      ...existing,
      title: title.trim(),
      description: description.trim(),
      year,
      semester,
      subjectId: subjectId || existing.subjectId,
      type: materialType,
      price: isPremium ? Number(price) : 0,
      isPremium,
      author: author.trim(),
      pages: Number(pages) || 50,
      comboEligible,
      driveUrl: driveUrl.trim() || undefined,
      topics: topics.split(",").map((s) => s.trim()).filter(Boolean),
      published: status === "Published",
      status,
    };

    saveMaterial(updated);
    toast.success("Study material updated successfully.");
    void navigate({ to: "/admin/materials" });
  };

  return (
    <AdminLayout
      title="Edit Study Material"
      subtitle={`Editing "${existing.title}"`}
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
          <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-xs space-y-5">
            <h2 className="text-base font-bold text-foreground">1. General Information</h2>

            <div>
              <label className="text-xs font-semibold text-muted-foreground">Title *</label>
              <Input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1.5 h-11"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground">Description</label>
              <Textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1.5"
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Author / Faculty</label>
                <Input
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="mt-1.5"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Pages</label>
                <Input
                  type="number"
                  value={pages}
                  onChange={(e) => setPages(Number(e.target.value))}
                  className="mt-1.5"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground">
                Topics Covered (Comma separated)
              </label>
              <Input
                value={topics}
                onChange={(e) => setTopics(e.target.value)}
                className="mt-1.5"
              />
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-xs space-y-5">
            <h2 className="text-base font-bold text-foreground">2. Curriculum Alignment</h2>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Year</label>
                <select
                  aria-label="Year"
                  value={year}
                  onChange={(e) => {
                    const y = Number(e.target.value);
                    setYear(y);
                    setSemester(y * 2 - 1);
                  }}
                  className="mt-1.5 h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs"
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y}>
                      Year {y}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Semester</label>
                <select
                  aria-label="Semester"
                  value={semester}
                  onChange={(e) => setSemester(Number(e.target.value))}
                  className="mt-1.5 h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs"
                >
                  {semesters.map((s) => (
                    <option key={s} value={s}>
                      Semester {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground">Subject</label>
              <select
                aria-label="Subject"
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="mt-1.5 h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs"
              >
                {availableSubjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code || "PCI"})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground">Material Type</label>
              <select
                aria-label="Material Type"
                value={materialType}
                onChange={(e) => setMaterialType(e.target.value as MaterialType)}
                className="mt-1.5 h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs"
              >
                {MATERIAL_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-xs space-y-5">
            <h2 className="text-base font-bold text-foreground">3. Pricing & Source</h2>

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
                    />
                    <span>Free</span>
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
                    />
                    <span>Premium</span>
                  </label>
                </div>
              </div>

              {isPremium && (
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Price (₹)</label>
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
              <label className="text-xs font-semibold text-muted-foreground">Google Drive Link</label>
              <Input
                value={driveUrl}
                onChange={(e) => setDriveUrl(e.target.value)}
                placeholder="https://drive.google.com/..."
                className="mt-1.5 h-11"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground">Status</label>
              <div className="mt-2 flex items-center gap-6 text-xs font-semibold">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    checked={status === "Published"}
                    onChange={() => setStatus("Published")}
                  />
                  <span>Published</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    checked={status === "Draft"}
                    onChange={() => setStatus("Draft")}
                  />
                  <span>Draft</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    checked={status === "Inactive"}
                    onChange={() => setStatus("Inactive")}
                  />
                  <span>Inactive</span>
                </label>
              </div>
            </div>
          </div>

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
              <Save className="mr-2 size-5" /> Save Changes
            </Button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
