import type { ReactNode } from "react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";

export function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="border-b border-border surface-section">
      <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
        {eyebrow ? (
          <p className="text-xs font-semibold tracking-widest text-primary uppercase">{eyebrow}</p>
        ) : null}
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{title}</h1>
        {description ? (
          <p className="mt-3 max-w-2xl text-base text-muted-foreground">{description}</p>
        ) : null}
      </div>
    </div>
  );
}
