import { useState } from "react";
import { BookOpen, Image as ImageIcon } from "lucide-react";

interface SubjectThumbnailProps {
  src?: string | null;
  name?: string;
  code?: string;
  className?: string;
  iconClassName?: string;
  fallbackSize?: "sm" | "md" | "lg" | "xl";
}

/**
 * Bulletproof Subject Thumbnail component.
 * - Filters out expired local `blob:` URLs from prior sessions.
 * - Smoothly handles image loading errors with a clean fallback (no broken image icons).
 * - Displays a curated pharmaceutical/academic placeholder when thumbnail is missing.
 */
export function SubjectThumbnail({
  src,
  name = "Subject",
  code,
  className = "size-12 rounded-xl",
  iconClassName = "size-5",
  fallbackSize = "md",
}: SubjectThumbnailProps) {
  const [imgError, setImgError] = useState(false);

  // If src is a temporary blob URL from an expired session or empty, treat as invalid
  const isInvalidSrc = !src || typeof src !== "string" || src.trim() === "" || src.startsWith("blob:") || imgError;

  if (isInvalidSrc) {
    const displayCode = code?.trim() || name?.trim().substring(0, 3).toUpperCase() || "SUB";

    return (
      <div
        className={`relative flex items-center justify-center shrink-0 overflow-hidden bg-gradient-to-br from-teal-500/10 via-teal-600/5 to-slate-100 border border-teal-200/50 text-teal-700 select-none ${className}`}
        title={name}
        aria-label={name}
      >
        <div className="flex flex-col items-center justify-center gap-0.5 text-center px-1">
          <BookOpen className={`${iconClassName} text-teal-600`} />
          {fallbackSize !== "sm" && (
            <span className="text-[9px] font-black uppercase tracking-wider text-teal-800 line-clamp-1 max-w-full">
              {displayCode}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      className={`object-cover border border-slate-200 bg-slate-100 shrink-0 select-none ${className}`}
      onError={() => setImgError(true)}
      loading="lazy"
    />
  );
}
