import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";
import { toast } from "sonner";
import {
  HardDrive,
  Globe,
  User,
  Shield,
  CreditCard,
  Save,
  RotateCcw,
  CheckCircle2,
  Lock,
} from "lucide-react";

export const Route = createFileRoute("/admin/settings/")({
  validateSearch: (search: Record<string, unknown>): { tab?: string | undefined } => {
    return {
      tab: typeof search["tab"] === "string" ? (search["tab"] as string) : undefined,
    };
  },
  component: AdminSettingsHubPage,
});

export default function AdminSettingsHubPage() {
  const searchParams = useSearch({ from: "/admin/settings/" });
  const { db, setDrive, setWebsiteSettings, resetDemoData } = useStore();

  const [activeTab, setActiveTab] = useState<string>(searchParams.tab || "drive");

  // Drive state
  const [driveFolderId, setDriveFolderId] = useState(db.drive.rootFolderId);
  const [driveFolderName, setDriveFolderName] = useState(db.drive.rootFolderName);

  // Website settings state
  const [siteName, setSiteName] = useState(db.websiteSettings?.siteName || "PharmaStudents.com");
  const [tagline, setTagline] = useState(db.websiteSettings?.tagline || "Your B.Pharm Journey, Organized.");
  const [supportEmail, setSupportEmail] = useState(db.websiteSettings?.supportEmail || "support@pharmastudents.com");
  const [supportPhone, setSupportPhone] = useState(db.websiteSettings?.supportPhone || "+91 78010 64412");
  const [announcement, setAnnouncement] = useState(db.websiteSettings?.announcement || "");
  const [allowReg, setAllowReg] = useState(db.websiteSettings?.allowRegistrations ?? true);

  const handleSaveDrive = (e: React.FormEvent) => {
    e.preventDefault();
    setDrive({
      connected: true,
      rootFolderId: driveFolderId.trim(),
      rootFolderName: driveFolderName.trim(),
    });
    toast.success("Google Drive cloud storage settings saved.");
  };

  const handleSaveWebsite = (e: React.FormEvent) => {
    e.preventDefault();
    setWebsiteSettings({
      siteName: siteName.trim(),
      tagline: tagline.trim(),
      supportEmail: supportEmail.trim(),
      supportPhone: supportPhone.trim(),
      announcement: announcement.trim(),
      allowRegistrations: allowReg,
    });
    toast.success("Website configuration updated.");
  };

  return (
    <AdminLayout
      title="Platform Settings & Configurations"
      subtitle="Manage Google Drive cloud connections, website configuration, administrator profile, and access logs."
    >
      <div className="space-y-8 max-w-4xl">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-border pb-4">
          <button
            onClick={() => setActiveTab("drive")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
              activeTab === "drive"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "border border-border bg-card text-muted-foreground hover:bg-muted"
            }`}
          >
            <HardDrive className="size-4" /> Google Drive
          </button>
          <button
            onClick={() => setActiveTab("website")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
              activeTab === "website"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "border border-border bg-card text-muted-foreground hover:bg-muted"
            }`}
          >
            <Globe className="size-4" /> Website Settings
          </button>
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
              activeTab === "profile"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "border border-border bg-card text-muted-foreground hover:bg-muted"
            }`}
          >
            <User className="size-4" /> Admin Profile
          </button>
          <button
            onClick={() => setActiveTab("security")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
              activeTab === "security"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "border border-border bg-card text-muted-foreground hover:bg-muted"
            }`}
          >
            <Shield className="size-4" /> Security & Logs
          </button>
          <Button asChild size="sm" variant="outline" className="ml-auto">
            <Link to="/admin/settings/payment">
              <CreditCard className="mr-1.5 size-4" /> Payment Gateway Settings →
            </Link>
          </Button>
        </div>

        {/* Tab 1: Google Drive */}
        {activeTab === "drive" && (
          <form onSubmit={handleSaveDrive} className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center gap-3 border-b border-border pb-4">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <HardDrive className="size-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-foreground">Google Drive Cloud Storage</h3>
                <p className="text-xs text-muted-foreground">Manage centralized folder for B.Pharm study notes</p>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground">Drive Root Folder Name</label>
              <Input
                value={driveFolderName}
                onChange={(e) => setDriveFolderName(e.target.value)}
                placeholder="e.g. PharmaStudents Official Cloud Vault"
                className="mt-1.5 h-11"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground">Drive Folder ID or URL</label>
              <Input
                value={driveFolderId}
                onChange={(e) => setDriveFolderId(e.target.value)}
                placeholder="e.g. 1PS_PharmaVault_BPharm_2026"
                className="mt-1.5 h-11 font-mono text-xs"
              />
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                All study materials linked via Google Drive share this root directory context.
              </p>
            </div>

            <div className="flex items-center justify-between border-t border-border pt-4">
              <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
                <CheckCircle2 className="size-4" /> Storage Vault Connected
              </span>
              <Button type="submit">
                <Save className="mr-2 size-4" /> Save Cloud Settings
              </Button>
            </div>
          </form>
        )}

        {/* Tab 2: Website Settings */}
        {activeTab === "website" && (
          <form onSubmit={handleSaveWebsite} className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center gap-3 border-b border-border pb-4">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Globe className="size-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-foreground">Website & Branding Settings</h3>
                <p className="text-xs text-muted-foreground">Global application titles, contact info, and alerts</p>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Website Platform Name</label>
                <Input
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  className="mt-1.5 h-11 font-semibold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Platform Tagline</label>
                <Input
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  className="mt-1.5 h-11"
                />
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Support Email</label>
                <Input
                  type="email"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  className="mt-1.5 h-11"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Support Helpline</label>
                <Input
                  value={supportPhone}
                  onChange={(e) => setSupportPhone(e.target.value)}
                  className="mt-1.5 h-11"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground">Top Announcement Message</label>
              <Input
                value={announcement}
                onChange={(e) => setAnnouncement(e.target.value)}
                placeholder="e.g. New PCI 2026 Semester notes and formula cheat-sheets are now live!"
                className="mt-1.5 h-11"
              />
            </div>

            <div className="border-t border-border pt-4 flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                <input
                  type="checkbox"
                  checked={allowReg}
                  onChange={(e) => setAllowReg(e.target.checked)}
                  className="size-4 rounded text-primary"
                />
                <span>Allow Public Student Registrations</span>
              </label>

              <Button type="submit">
                <Save className="mr-2 size-4" /> Save Website Settings
              </Button>
            </div>
          </form>
        )}

        {/* Tab 3: Admin Profile */}
        {activeTab === "profile" && (
          <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center gap-3 border-b border-border pb-4">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <User className="size-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-foreground">Administrator Credentials</h3>
                <p className="text-xs text-muted-foreground">Master operator account info</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 rounded-2xl border border-border bg-muted/20 p-5 text-xs">
              <div>
                <span className="text-muted-foreground">User ID:</span>
                <p className="font-bold text-foreground text-sm">{db.admin.userId}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Phone:</span>
                <p className="font-bold text-foreground text-sm">{db.admin.phone}</p>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">Authentication Method:</span>
                <p className="font-medium text-foreground">SHA-256 Cryptographic Hash Check</p>
              </div>
            </div>

            <div className="border-t border-border pt-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-foreground">Reset All Demo Data</p>
                <p className="text-[11px] text-muted-foreground">
                  Restores default PCI subjects, seed materials, and demo student records.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (confirm("Reset all platform data to initial seed?")) {
                    resetDemoData();
                    toast.success("Database reset to demo state.");
                  }
                }}
              >
                <RotateCcw className="mr-1.5 size-3.5" /> Reset Demo DB
              </Button>
            </div>
          </div>
        )}

        {/* Tab 4: Security & Logs */}
        {activeTab === "security" && (
          <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center gap-3 border-b border-border pb-4">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Shield className="size-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-foreground">Document Access & Security Audit Log</h3>
                <p className="text-xs text-muted-foreground">
                  Track when students read licensed notes inside the protected document viewer
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border text-muted-foreground font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Student</th>
                    <th className="py-2.5 px-3">Study Note Title</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {db.accessLogs && db.accessLogs.length > 0 ? (
                    db.accessLogs.map((log) => (
                      <tr key={log.id}>
                        <td className="py-2.5 px-3 text-muted-foreground">
                          {new Date(log.accessedAt).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-foreground">
                          {log.studentEmail}
                        </td>
                        <td className="py-2.5 px-3 text-foreground line-clamp-1">
                          {log.materialTitle}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-muted-foreground">
                        No protected document accesses recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
