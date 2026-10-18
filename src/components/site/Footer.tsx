import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";
import { ShieldCheck, Zap } from "lucide-react";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-20 border-t border-border surface-section">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-sm text-sm text-muted-foreground leading-relaxed">
            Premium digital learning platform for B.Pharm students. Structured notes, exam-focused guides,
            and semester-wise revision material aligned with PCI syllabus.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 font-medium text-foreground">
              <ShieldCheck className="size-3.5 text-emerald-500" /> 100% Secure Payments
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 font-medium text-foreground">
              <Zap className="size-3.5 text-primary" /> Instant Digital Access
            </span>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-foreground">Academic Resources</h3>
          <ul className="mt-4 space-y-2.5">
            <li>
              <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
                Home
              </Link>
            </li>
            <li>
              <Link to="/bpharm" className="text-sm text-muted-foreground hover:text-foreground">
                B.Pharm Subjects
              </Link>
            </li>
            <li>
              <Link to="/resources" className="text-sm text-muted-foreground hover:text-foreground">
                Study Notes & Guides
              </Link>
            </li>
            <li>
              <Link to="/about" className="text-sm text-muted-foreground hover:text-foreground">
                About Us
              </Link>
            </li>
            <li>
              <Link to="/contact" className="text-sm text-muted-foreground hover:text-foreground">
                Contact & Support
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-foreground">Legal & Policies</h3>
          <ul className="mt-4 space-y-2.5">
            <li>
              <Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link to="/terms" className="text-sm text-muted-foreground hover:text-foreground">
                Terms & Conditions
              </Link>
            </li>
            <li>
              <Link to="/refund" className="text-sm text-muted-foreground hover:text-foreground">
                Refund & Cancellation Policy
              </Link>
            </li>
            <li>
              <Link to="/shipping" className="text-sm text-muted-foreground hover:text-foreground">
                Shipping & Delivery Policy (Digital)
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <p>© {year} Student Pharma B.Pharm. All rights reserved.</p>
            <span className="hidden sm:inline text-muted-foreground/60">•</span>
            <p className="font-semibold text-teal-700">Designed &amp; Developed by RSP Softwares</p>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <span>•</span>
            <Link to="/terms" className="hover:text-foreground">
              Terms
            </Link>
            <span>•</span>
            <Link to="/refund" className="hover:text-foreground">
              Refunds
            </Link>
            <span>•</span>
            <Link to="/shipping" className="hover:text-foreground">
              Delivery
            </Link>
            <span>•</span>
            <Link to="/admin/login" className="hover:text-foreground">
              Admin
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
