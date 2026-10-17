import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, type ReactNode } from "react";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  FolderTree,
  CreditCard,
  BarChart3,
  GraduationCap,
  Bell,
  LogOut,
  Menu,
  ChevronDown,
  X,
  ExternalLink,
  AlertTriangle,
  User,
} from "lucide-react";
import { Logo } from "@/components/site/Logo";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type AdminLayoutProps = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
};

export function AdminLayout({ children, title, subtitle, actions }: AdminLayoutProps) {
  const { logout, isAdmin, ready, userProfile } = useStore();
  const navigate = useNavigate();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  // Strict route guard
  useEffect(() => {
    if (ready && !isAdmin) {
      toast.error("Administrator access required. Please sign in.");
      void navigate({ to: "/admin/login" });
    }
  }, [ready, isAdmin, navigate]);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Array<{ id: string; title: string; time: string }>>([]);

  useEffect(() => {
    async function loadNotifications() {
      try {
        const { data: newStudents } = await supabase
          .from("profiles")
          .select("id, full_name, created_at")
          .eq("role", "student")
          .order("created_at", { ascending: false })
          .limit(5);

        const { data: pendingOrders } = await supabase
          .from("orders")
          .select("id, amount, order_date")
          .ilike("status", "pending")
          .limit(5);

        const list: Array<{ id: string; title: string; time: string }> = [];
        (newStudents || []).forEach((s) => {
          list.push({
            id: `st-${s.id}`,
            title: `Student registered: ${s.full_name || "New Student"}`,
            time: new Date(s.created_at).toLocaleDateString(),
          });
        });
        (pendingOrders || []).forEach((o) => {
          list.push({
            id: `ord-${o.id}`,
            title: `Pending order ${o.id.slice(0, 8)} for ₹${o.amount}`,
            time: new Date(o.order_date).toLocaleDateString(),
          });
        });
        setNotifications(list);
      } catch (e) {
        console.error("Error loading notifications:", e);
      }
    }
    loadNotifications();
  }, []);

  const handleLogout = () => {
    logout();
    toast.success("Administrator logged out safely.");
    void navigate({ to: "/" });
  };

  const navItems = [
    { label: "Dashboard", to: "/admin", icon: LayoutDashboard, exact: true },
    { label: "Students", to: "/admin/students", icon: Users },
    { label: "Material", to: "/admin/materials", icon: BookOpen },
    { label: "Orders", to: "/admin/orders", icon: CreditCard },
    { label: "Reports", to: "/admin/reports", icon: BarChart3 },
  ];

  const isItemActive = (to: string, exact = false) => {
    if (exact) return currentPath === to || currentPath === `${to}/`;
    return currentPath === to || currentPath.startsWith(`${to}/`);
  };

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-xs text-muted-foreground font-medium">Verifying administrator credentials...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-foreground flex flex-col font-sans">
      {/* ===================================================================== */}
      {/* 1. TOP NAVIGATION HEADER (Replaces Left Sidebar for Maximum Space)    */}
      {/* ===================================================================== */}
      <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-white/95 backdrop-blur-md shadow-2xs">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          
          {/* Left: Brand Logo & Mobile Toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="flex size-9 items-center justify-center rounded-xl border border-border/70 hover:bg-muted text-foreground lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Toggle Navigation"
            >
              <Menu className="size-5" />
            </button>
            <Logo to="/admin" />
          </div>

          {/* Center: Desktop Horizontal Navigation Pills */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
            {navItems.map((item) => {
              const active = isItemActive(item.to, item.exact);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                    active
                      ? "bg-[#0e7490] text-white shadow-xs"
                      : "text-muted-foreground hover:bg-slate-100 hover:text-foreground"
                  }`}
                >
                  <Icon className="size-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right: Notification Bell & Admin Profile Pill */}
          <div className="flex items-center gap-3">
            {/* Notification Bell with Badge & Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotificationsOpen((prev) => !prev)}
                className="relative flex size-9 items-center justify-center rounded-xl border border-border/70 hover:bg-slate-100 text-muted-foreground hover:text-foreground transition-colors"
                title="Notifications"
                aria-label="Notifications"
              >
                <Bell className="size-4" />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white shadow-xs">
                    {notifications.length}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setNotificationsOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 z-50 w-72 sm:w-80 rounded-2xl border border-border bg-card p-3 shadow-xl">
                    <div className="flex items-center justify-between border-b border-border/70 pb-2 px-2">
                      <p className="text-xs font-bold text-foreground">Notifications</p>
                      <span className="text-[10px] text-muted-foreground font-semibold">
                        {notifications.length} unread
                      </span>
                    </div>
                    <div className="max-h-60 overflow-y-auto divide-y divide-border/60 py-1">
                      {notifications.length === 0 ? (
                        <div className="py-6 text-center text-xs text-muted-foreground">
                          No new notifications. All caught up!
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div key={n.id} className="p-2.5 text-xs hover:bg-muted/40 rounded-lg transition-colors">
                            <p className="font-semibold text-foreground">{n.title}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{n.time}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Admin Profile Pill & Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileDropdownOpen((prev) => !prev)}
                className="flex items-center gap-2.5 rounded-xl border border-border/70 bg-card px-2.5 py-1.5 hover:bg-slate-100 transition-all shadow-2xs"
                aria-expanded={profileDropdownOpen}
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#0e7490] text-white font-bold text-xs shadow-xs">
                  <User className="size-4" />
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-bold leading-tight text-foreground">
                    {userProfile?.full_name?.split(" ")[0] || "Admin"}
                  </div>
                </div>
                <ChevronDown className="size-3.5 text-muted-foreground hidden sm:block" />
              </button>

              {/* Profile Dropdown Menu */}
              {profileDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setProfileDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 z-50 w-64 rounded-2xl border border-border bg-card p-3 shadow-xl">
                    <div className="border-b border-border/70 px-3 py-2.5">
                      <p className="text-xs font-bold text-foreground">
                        {userProfile?.full_name || "Siddu Admin"}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {userProfile?.email || "siddu@gmail.com"}
                      </p>
                      <span className="mt-1.5 inline-block rounded-md bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-700 border border-teal-200">
                        Main Administrator
                      </span>
                    </div>

                    <div className="py-1.5">
                      <Link
                        to="/"
                        target="_blank"
                        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                        onClick={() => setProfileDropdownOpen(false)}
                      >
                        <ExternalLink className="size-3.5" />
                        <span>View Student Website</span>
                      </Link>
                    </div>

                    <div className="border-t border-border/70 pt-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          setShowLogoutConfirm(true);
                        }}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <LogOut className="size-3.5" />
                        <span>Logout Admin</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div
              className="fixed inset-0 bg-background/80 backdrop-blur-xs"
              onClick={() => setMobileOpen(false)}
            />
            <div className="relative flex w-72 max-w-[85vw] flex-1 flex-col bg-card border-r border-border p-5 shadow-2xl">
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <Logo to="/admin" />
                <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)} aria-label="Close menu">
                  <X className="size-5" />
                </Button>
              </div>

              <div className="mt-4 flex-1 space-y-1.5 overflow-y-auto">
                {navItems.map((item) => {
                  const active = isItemActive(item.to, item.exact);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={`flex items-center gap-3 rounded-xl px-4 py-3 text-xs font-bold transition-all ${
                        active
                          ? "bg-[#0e7490] text-white shadow-xs"
                          : "text-muted-foreground hover:bg-slate-100 hover:text-foreground"
                      }`}
                      onClick={() => setMobileOpen(false)}
                    >
                      <Icon className="size-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>

              <div className="border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    setShowLogoutConfirm(true);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50"
                >
                  <LogOut className="size-4" />
                  <span>Logout Admin</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ===================================================================== */}
      {/* 2. FULL WIDTH MAIN WORKING AREA (No Sidebar, Maximum Productivity)   */}
      {/* ===================================================================== */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {title && (
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-foreground">{title}</h1>
              {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
            </div>
            {actions && <div className="flex items-center gap-2.5">{actions}</div>}
          </div>
        )}
        {children}
      </main>

      {/* Confirmation Dialog: Safe Logout */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                <AlertTriangle className="size-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Confirm Logout</h3>
                <p className="text-xs text-muted-foreground">Are you sure you want to end your admin session?</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2.5">
              <Button variant="outline" size="sm" onClick={() => setShowLogoutConfirm(false)}>
                Cancel
              </Button>
              <Button variant="destructive" size="sm" onClick={handleLogout}>
                Logout Now
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
