import { Link, useNavigate } from "@tanstack/react-router";
import {
  Menu,
  LayoutDashboard,
  LogOut,
  User,
  Search,
  Bell,
  ShoppingCart,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useStore } from "@/lib/store";
import { Logo } from "./Logo";

const NAV_LINKS = [
  { to: "/", label: "Home", exact: true },
  { to: "/bpharm", label: "B.Pharm", exact: false },
  { to: "/resources", label: "Resources", exact: false },
  { to: "/packages", label: "Packages", exact: false },
  { to: "/about", label: "About", exact: false },
  { to: "/contact", label: "Contact", exact: false },
] as const;

export function Navbar() {
  const { student, isAdmin, db, logout, ready } = useStore();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setMobileOpen(false);
    void navigate({ to: "/" });
  };

  const displayName = isAdmin
    ? db.admin.name || "Siddu"
    : student?.name || "Student";

  const displayRoleLabel = isAdmin
    ? "Siddu (Main Admin)"
    : `${student?.name || "Student"} (Student)`;

  const displayEmail = isAdmin
    ? db.admin.email || "siddu@gmail.com"
    : student?.email || "student@pharmastudents.com";

  // Initials for avatar
  const initials = isAdmin
    ? "SD"
    : (student?.name || "PS")
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();

  const isLoggedIn = isAdmin || !!student;

  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-background/95 backdrop-blur-md">
      <nav
        className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"
        aria-label="Main navigation"
      >
        {/* Left: Brand + Navigation links */}
        <div className="flex items-center gap-8">
          <Logo />

          <ul className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className="rounded-full px-3.5 py-1.5 text-sm font-medium text-muted-foreground transition-all hover:text-foreground"
                  activeProps={{
                    className:
                      "bg-emerald-100 text-emerald-900 font-semibold rounded-full dark:bg-emerald-950/70 dark:text-emerald-200",
                  }}
                  activeOptions={{ exact: link.exact }}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Right side: Search, Bell, Cart, and Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Search Trigger */}
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="size-9 text-muted-foreground hover:text-foreground"
            aria-label="Search resources"
          >
            <Link to="/resources">
              <Search className="size-4.5" />
            </Link>
          </Button>

          {/* Notifications Bell */}
          <Button
            variant="ghost"
            size="icon"
            className="relative size-9 text-muted-foreground hover:text-foreground"
            aria-label="Notifications"
            onClick={() => {
              if (isAdmin) {
                void navigate({ to: "/admin" });
              } else {
                void navigate({ to: "/dashboard" });
              }
            }}
          >
            <Bell className="size-4.5" />
            <span className="absolute top-2 right-2 size-2 rounded-full bg-emerald-500 ring-2 ring-background" />
          </Button>

          {/* Shopping Cart */}
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="size-9 text-muted-foreground hover:text-foreground"
            aria-label="Shopping Cart"
          >
            <Link to="/packages">
              <ShoppingCart className="size-4.5" />
            </Link>
          </Button>

          {/* Profile Dropdown */}
          {isLoggedIn ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2.5 outline-none transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-primary"
                  aria-label="User profile menu"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#0d9488] text-xs font-bold text-white shadow-xs">
                    {initials}
                  </span>
                  <span className="hidden text-sm font-semibold text-foreground sm:inline-block">
                    {displayName}
                  </span>
                  <ChevronDown className="size-3.5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                sideOffset={8}
                className="w-56 rounded-2xl border-border/80 bg-popover p-2 shadow-xl"
              >
                {/* Header matching screenshot */}
                <div className="px-3 py-2.5">
                  <p className="text-sm font-bold text-foreground leading-tight">
                    {displayRoleLabel}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground truncate">
                    {displayEmail}
                  </p>
                </div>

                <DropdownMenuSeparator />

                {/* Dashboard */}
                <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
                  <Link
                    to={isAdmin ? "/admin" : "/dashboard"}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-sm font-medium text-foreground"
                  >
                    <User className="size-4 text-muted-foreground" />
                    <span>Dashboard</span>
                  </Link>
                </DropdownMenuItem>

                {/* Logout */}
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="rounded-xl cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive"
                >
                  <div className="flex w-full items-center gap-2.5 px-3 py-2 text-sm font-medium">
                    <LogOut className="size-4 text-destructive" />
                    <span>Log out</span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link to="/login">Login</Link>
              </Button>
              <Button asChild size="sm" className="font-semibold">
                <Link to="/register">Start Free</Link>
              </Button>
            </div>
          )}

          {/* Mobile menu trigger */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="size-9 md:hidden"
                aria-label="Open navigation menu"
              >
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[86vw] max-w-sm p-6">
              <SheetTitle className="sr-only">Mobile Navigation</SheetTitle>
              <div className="mb-6">
                <Logo />
              </div>

              <ul className="flex flex-col gap-1.5">
                {NAV_LINKS.map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      onClick={() => setMobileOpen(false)}
                      className="block rounded-xl px-3.5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                      activeProps={{
                        className: "bg-emerald-100 text-emerald-900 font-bold",
                      }}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>

              <div className="mt-8 border-t border-border pt-6">
                {isLoggedIn ? (
                  <div className="space-y-3">
                    <div className="rounded-xl bg-muted/50 p-3">
                      <p className="text-sm font-bold text-foreground">{displayRoleLabel}</p>
                      <p className="text-xs text-muted-foreground truncate">{displayEmail}</p>
                    </div>
                    <Button asChild className="w-full font-bold">
                      <Link
                        to={isAdmin ? "/admin" : "/dashboard"}
                        onClick={() => setMobileOpen(false)}
                      >
                        <LayoutDashboard className="mr-2 size-4" /> Go to Dashboard
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full text-destructive"
                      onClick={handleLogout}
                    >
                      <LogOut className="mr-2 size-4" /> Log out
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    <Button asChild variant="outline" onClick={() => setMobileOpen(false)}>
                      <Link to="/login">Student / Admin Login</Link>
                    </Button>
                    <Button asChild onClick={() => setMobileOpen(false)}>
                      <Link to="/register">Create Account</Link>
                    </Button>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
}
