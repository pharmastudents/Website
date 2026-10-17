import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useStore, YEARS, SEMESTERS } from "@/lib/store";
import { type Subject } from "@/lib/types";
import { toast } from "sonner";
import { PlusCircle, Search, Trash2, BookOpen, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/admin/subjects/")({
  validateSearch: (search: Record<string, unknown>): { year?: number | undefined } => {
    return {
      year: typeof search["year"] === "number" ? (search["year"] as number) : undefined,
    };
  },
  component: AdminSubjectsPage,
});

export default function AdminSubjectsPage() {
  const searchParams = useSearch({ from: "/admin/subjects/" });
  const { db, deleteSubject } = useStore();

  const [query, setQuery] = useState("");
  const [filterYear, setFilterYear] = useState<string>(
    searchParams.year ? String(searchParams.year) : "all",
  );
  const [filterSem, setFilterSem] = useState<string>("all");
  const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);

  const filtered = useMemo(() => {
    return db.subjects.filter((s) => {
      if (filterYear !== "all" && s.year !== Number(filterYear)) return false;
      if (filterSem !== "all" && s.semester !== Number(filterSem)) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        const matchName = s.name.toLowerCase().includes(q);
        const matchCode = s.code?.toLowerCase().includes(q) ?? false;
        if (!matchName && !matchCode) return false;
      }
      return true;
    });
  }, [db.subjects, filterYear, filterSem, query]);

  const confirmDelete = () => {
    if (!subjectToDelete) return;
    deleteSubject(subjectToDelete.id);
    toast.success(`Subject "${subjectToDelete.name}" was removed.`);
    setSubjectToDelete(null);
  };

  return (
    <AdminLayout
      title="Subjects Directory"
      subtitle="Complete Pharmacy Council of India (PCI) standardized curriculum subjects across all 8 semesters."
      actions={
        <Button asChild size="sm">
          <Link to="/admin/subjects/create">
            <PlusCircle className="mr-1.5 size-4" /> Create Subject
          </Link>
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Filter Bar */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search subject by name or code..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9 h-10"
              />
            </div>

            <select
              aria-label="Filter by Academic Year"
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-xs"
            >
              <option value="all">All Academic Years</option>
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  Year {y}
                </option>
              ))}
            </select>

            <select
              aria-label="Filter by Semester"
              value={filterSem}
              onChange={(e) => setFilterSem(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-xs"
            >
              <option value="all">All Semesters</option>
              {SEMESTERS.map((s) => (
                <option key={s} value={s}>
                  Semester {s}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
            <span>
              Showing <strong>{filtered.length}</strong> of {db.subjects.length} subjects
            </span>
            {(filterYear !== "all" || filterSem !== "all" || query) && (
              <button
                onClick={() => {
                  setFilterYear("all");
                  setFilterSem("all");
                  setQuery("");
                }}
                className="text-primary font-semibold hover:underline"
              >
                Reset filters
              </button>
            )}
          </div>
        </div>

        {/* Subjects Table */}
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-xs">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground">
              <tr>
                <th className="p-4">Subject Name</th>
                <th className="p-4">PCI Code</th>
                <th className="p-4">Year & Semester</th>
                <th className="p-4">Associated Notes</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((sub) => {
                const noteCount = db.materials.filter((m) => m.subjectId === sub.id).length;

                return (
                  <tr key={sub.id} className="hover:bg-muted/10">
                    <td className="p-4">
                      <p className="font-bold text-foreground text-xs">{sub.name}</p>
                      <p className="text-[10px] text-muted-foreground line-clamp-1">{sub.description}</p>
                    </td>
                    <td className="p-4">
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {sub.code || "PCI CORE"}
                      </Badge>
                    </td>
                    <td className="p-4 text-xs">
                      Year {sub.year} · Semester {sub.semester}
                    </td>
                    <td className="p-4 text-xs">
                      <Link
                        to="/admin/materials"
                        search={{ subjectId: sub.id } as any}
                        className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                      >
                        <BookOpen className="size-3.5" /> {noteCount} notes
                      </Link>
                    </td>
                    <td className="p-4">
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                        Active
                      </Badge>
                    </td>
                    <td className="p-4 text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8 text-destructive hover:text-destructive"
                        onClick={() => setSubjectToDelete(sub)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Subject Dialog */}
      {subjectToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                <AlertTriangle className="size-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Remove Subject</h3>
                <p className="text-xs text-muted-foreground">Confirm removal of subject module</p>
              </div>
            </div>

            <p className="mt-4 text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to remove <strong>"{subjectToDelete.name}"</strong>? Any materials associated with this subject will be safely archived.
            </p>

            <div className="mt-6 flex justify-end gap-2.5">
              <Button variant="outline" size="sm" onClick={() => setSubjectToDelete(null)}>
                Cancel
              </Button>
              <Button variant="destructive" size="sm" onClick={confirmDelete}>
                Delete Subject
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
