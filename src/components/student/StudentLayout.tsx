import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, type ReactNode } from "react";
import {
  LayoutDashboard,
  BookOpen,
  Bookmark,
  ShoppingBag,
  Receipt,
  Bell,
  User,
  Headphones,
  Search,
  ChevronDown,
  LogOut,
  Menu,
  X,
  AlertTriangle,
  Home,
  Heart,
  ExternalLink,
  ShoppingCart,
} from "lucide-react";
import { Logo } from "@/components/site/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";
import { useCart } from "@/lib/cartContext";
import { toast } from "sonner";

type StudentLayoutProps = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
};

export function StudentLayout({
  children,
  title,
  subtitle,
  actions,
  searchQuery,
  onSearchChange,
}: StudentLayoutProps) {
  const { student, session, logout, ready, db, userProfile } = useStore();
  const { count: cartCount } = useCart();
  const navigate = useNavigate();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchQuery || "");

  // Student authentication guard: ensure session exists
  useEffect(() => {
    if (ready && !session) {
      toast.error("Please sign in to access your student portal.");
      void navigate({
        to: "/login",
        search: { redirect: currentPath } as any,
      });
    }
  }, [ready, session, navigate, currentPath]);

  // Notifications calculation
  const notifications: any[] = (db as any).notifications || [
    {
      id: "notif-1",
      title: "Semester Notes Ready",
      description: "Pharmaceutical Chemistry & Anatomy notes available.",
      time: "2 hours ago",
    },
    {
      id: "notif-2",
      title: "PCI Syllabus Aligned",
      description: "High-yield question banks updated for exam prep.",
      time: "1 day ago",
    },
    {
      id: "notif-3",
      title: "Welcome to PharmaStudents",
      description: "Your verified student learning portal is active.",
      time: "3 days ago",
    },
  ];
  const unreadCount = notifications.length;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearchChange) {
      onSearchChange(localSearch);
    } else {
      void navigate({
        to: "/resources",
        search: { q: localSearch.trim() } as any,
      });
    }
  };

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully.");
    void navigate({ to: "/" });
  };

  const isLinkActive = (to: string, exact = false) => {
    if (exact) return currentPath === to || currentPath === `${to}/`;
    return currentPath === to || (to !== "/dashboard" && currentPath.startsWith(`${to}/`));
  };

  // Student display info
  const studentName = student?.name || userProfile?.full_name || "Student";
  const studentFirstName = studentName.split(" ")[0] || "Student";
  const studentEmail = student?.email || userProfile?.email || "student@pharmastudents.com";
  const studentInitials =
    studentName
      .split(" ")
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "ST";

  type NavItem = {
    label: string;
    to: string;
    icon: any;
    exact?: boolean;
    search?: any;
    badge?: number;
  };

  const navItems: NavItem[] = [
    {
      label: "Dashboard",
      to: "/dashboard",
      icon: LayoutDashboard,
      exact: true,
    },
    {
      label: "Browse Notes",
      to: "/bpharm",
      icon: BookOpen,
      exact: false,
    },
    {
      label: "My Notes",
      to: "/dashboard/my-resources",
      icon: Bookmark,
      exact: true,
    },
    {
      label: "Saved Notes",
      to: "/dashboard",
      search: { tab: "saved" },
      icon: Heart,
      exact: false,
    },
    {
      label: "Purchases",
      to: "/dashboard/orders",
      icon: ShoppingBag,
      exact: false,
    },
    {
      label: "Profile",
      to: "/dashboard/profile",
      icon: User,
      exact: true,
    },
  ];

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="size-9 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
          <p className="text-xs text-slate-500 font-medium">Loading student portal...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans antialiased">
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 1. TOP NAVIGATION HEADER (Matching AdminLayout Style - NO LEFT SIDEBAR)   */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-white/95 backdrop-blur-md shadow-2xs">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          
          {/* Left: Brand Logo & Mobile Toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="flex size-9 items-center justify-center rounded-xl border border-border/70 hover:bg-slate-100 text-slate-700 lg:hidden"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Toggle Navigation"
            >
              <Menu className="size-5" />
            </button>
            <Logo to="/dashboard" />
          </div>

          {/* Center: Desktop Horizontal Navigation Pills (Identical to Admin layout) */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
            {navItems.map((item) => {
              const active = isLinkActive(item.to, item.exact);
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  search={item.search as any}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                    active
                      ? "bg-[#0e7490] text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <Icon className="size-4 shrink-0" />
                  <span>{item.label}</span>
                  {item.badge ? (
                    <span className="flex size-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white">
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>

          {/* Right: Cart, Notification Bell & Student Profile Pill (No Search in Header) */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            {/* Cart Icon Button */}
            <Link
              to="/cart"
              className="relative flex size-9 items-center justify-center rounded-xl border border-slate-200/70 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              title="Shopping Cart"
              aria-label="Shopping Cart"
            >
              <ShoppingCart className="size-4" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white shadow-xs">
                  {cartCount}
                </span>
              )}
            </Link>

            {/* Notification Bell with Dropdown Popover */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotificationsOpen((prev) => !prev)}
                className="relative flex size-9 items-center justify-center rounded-xl border border-slate-200/70 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                title="Notifications"
                aria-label="Notifications"
              >
                <Bell className="size-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white shadow-xs">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setNotificationsOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 z-50 w-72 sm:w-80 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl animate-in fade-in zoom-in-95">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2 px-2">
                      <p className="text-xs font-bold text-slate-900">Notifications</p>
                      <Badge variant="outline" className="text-[10px] font-bold text-teal-700 bg-teal-50 border-teal-200">
                        {unreadCount} New
                      </Badge>
                    </div>
                    <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 py-1 space-y-1">
                      {notifications.map((n) => (
                        <div key={n.id} className="p-2.5 text-xs hover:bg-slate-50 rounded-lg transition-colors">
                          <p className="font-bold text-slate-900">{n.title}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">{n.description}</p>
                          <span className="text-[9px] text-teal-600 font-semibold mt-1 block">{n.time}</span>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-slate-100 pt-2 text-center">
                      <button
                        onClick={() => setNotificationsOpen(false)}
                        className="text-[11px] font-semibold text-teal-600 hover:underline"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Student Profile Pill & Dropdown (Matching AdminLayout Style) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileDropdownOpen((prev) => !prev)}
                className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-2.5 py-1.5 hover:bg-slate-100 transition-all shadow-2xs"
                aria-expanded={profileDropdownOpen}
              >
                <div className="flex size-7 sm:size-8 shrink-0 items-center justify-center rounded-full bg-[#0e7490] text-white font-bold text-xs shadow-xs">
                  {studentInitials}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-bold leading-tight text-slate-900 truncate max-w-[100px]">
                    {studentFirstName}
                  </div>
                </div>
                <ChevronDown className="size-3.5 text-slate-400 hidden sm:block" />
              </button>

              {/* Profile Dropdown Menu */}
              {profileDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setProfileDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 z-50 w-64 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl animate-in fade-in zoom-in-95">
                    <div className="border-b border-slate-100 px-3 py-2.5">
                      <p className="text-xs font-bold text-slate-900">{studentName}</p>
                      <p className="text-[11px] text-slate-400 truncate">{studentEmail}</p>
                      <span className="mt-1.5 inline-block rounded-md bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-700 border border-teal-200">
                        B.Pharm Student
                      </span>
                    </div>

                    <div className="py-1.5 space-y-0.5 text-xs">
                      <Link
                        to="/dashboard/profile"
                        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium"
                        onClick={() => setProfileDropdownOpen(false)}
                      >
                        <User className="size-3.5 text-slate-400" />
                        <span>My Profile</span>
                      </Link>
                      <Link
                        to="/dashboard/my-resources"
                        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium"
                        onClick={() => setProfileDropdownOpen(false)}
                      >
                        <Bookmark className="size-3.5 text-slate-400" />
                        <span>My Notes & Library</span>
                      </Link>
                      <Link
                        to="/dashboard/orders"
                        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium"
                        onClick={() => setProfileDropdownOpen(false)}
                      >
                        <Receipt className="size-3.5 text-slate-400" />
                        <span>Orders & Purchases</span>
                      </Link>
                      <Link
                        to="/contact"
                        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium"
                        onClick={() => setProfileDropdownOpen(false)}
                      >
                        <Headphones className="size-3.5 text-slate-400" />
                        <span>Help & Support</span>
                      </Link>
                      <Link
                        to="/"
                        target="_blank"
                        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium"
                        onClick={() => setProfileDropdownOpen(false)}
                      >
                        <ExternalLink className="size-3.5 text-slate-400" />
                        <span>View Public Site</span>
                      </Link>
                    </div>

                    <div className="border-t border-slate-100 pt-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          setShowLogoutConfirm(true);
                        }}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <LogOut className="size-3.5" />
                        <span>Logout Student</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative flex w-72 max-w-[85vw] flex-1 flex-col bg-white border-r border-slate-200 p-5 shadow-2xl">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <Logo to="/dashboard" />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Close menu"
                >
                  <X className="size-5" />
                </Button>
              </div>

              <div className="mt-4 flex-1 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                  const active = isLinkActive(item.to, item.exact);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.label}
                      to={item.to}
                      search={item.search as any}
                      className={`flex items-center justify-between rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
                        active
                          ? "bg-[#0e7490] text-white shadow-xs"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="size-4" />
                        <span>{item.label}</span>
                      </div>
                      {item.badge ? (
                        <span className="flex size-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white">
                          {item.badge}
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>

              <div className="border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setShowLogoutConfirm(true);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50"
                >
                  <LogOut className="size-4" />
                  <span>Logout Student</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 2. FULL WIDTH MAIN WORKING AREA (No Sidebar, Maximum Screen Space)        */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-24 lg:pb-8">
        {title && (
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900">{title}</h1>
              {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
            </div>
            {actions && <div className="flex items-center gap-2.5">{actions}</div>}
          </div>
        )}
        {children}
      </main>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 3. MOBILE BOTTOM FIXED NAVIGATION (Home, Browse, My Notes, Cart, Profile) */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <nav className="fixed bottom-0 inset-x-0 z-40 flex h-16 items-center justify-around border-t border-slate-200 bg-white/95 backdrop-blur-md px-2 lg:hidden shadow-lg">
        <Link
          to="/dashboard"
          className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors ${
            currentPath === "/dashboard" || currentPath === "/dashboard/"
              ? "text-teal-600"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <Home className="size-5" />
          <span>Home</span>
        </Link>
        <Link
          to="/bpharm"
          className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors ${
            currentPath.startsWith("/bpharm") || currentPath.startsWith("/resources")
              ? "text-teal-600"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <BookOpen className="size-5" />
          <span>Browse</span>
        </Link>
        <Link
          to="/dashboard/my-resources"
          className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors ${
            currentPath.startsWith("/dashboard/my-resources")
              ? "text-teal-600"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <Bookmark className="size-5" />
          <span>My Notes</span>
        </Link>
        <Link
          to="/cart"
          className={`relative flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors ${
            currentPath.startsWith("/cart")
              ? "text-teal-600"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <ShoppingCart className="size-5" />
          {cartCount > 0 && (
            <span className="absolute -top-1 right-2 flex size-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white">
              {cartCount}
            </span>
          )}
          <span>Cart</span>
        </Link>
        <Link
          to="/dashboard/profile"
          className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors ${
            currentPath.startsWith("/dashboard/profile")
              ? "text-teal-600"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <User className="size-5" />
          <span>Profile</span>
        </Link>
      </nav>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 4. LOGOUT CONFIRMATION MODAL                                              */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                <AlertTriangle className="size-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Sign Out</h3>
                <p className="text-xs text-slate-500 mt-0.5">Are you sure you want to end your session?</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowLogoutConfirm(false)}
                className="h-9 text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleLogout}
                className="h-9 bg-rose-600 text-xs font-bold text-white hover:bg-rose-700 shadow-xs"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
