import { Link } from "@tanstack/react-router";
import { useStore } from "@/lib/store";

export function Logo({
  to,
  className = "",
  size = "md",
}: {
  to?: string;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const { session, isAdmin, student } = useStore();

  const destination =
    to !== undefined
      ? to
      : isAdmin
        ? "/admin"
        : session || student
          ? "/dashboard"
          : "/";

  const heightClasses = {
    sm: "h-8 sm:h-9",
    md: "h-9 sm:h-11",
    lg: "h-11 sm:h-13",
    xl: "h-14 sm:h-16",
  };

  return (
    <Link
      to={destination}
      className={`inline-flex items-center gap-2 group ${className}`}
      aria-label="PharmaStudents.com - B.Pharm Notes for Brighter Future"
    >
      <img
        src="/pharmastudents-logo.png"
        alt="PharmaStudents.com"
        className={`${heightClasses[size] || "h-10"} w-auto object-contain transition-transform duration-200 group-hover:scale-[1.02]`}
      />
    </Link>
  );
}
