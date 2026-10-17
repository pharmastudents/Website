import { Link } from "@tanstack/react-router";
import { BookOpen, Lock, Unlock, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/store";
import type { Material, Subject } from "@/lib/types";

export function ResourceCard({
  material,
  subject,
  owned,
}: {
  material: Material;
  subject?: Subject | undefined;
  owned?: boolean | undefined;
}) {
  const isAccessible = owned || !material.isPremium;

  return (
    <article className="card-shell card-hover flex h-full flex-col justify-between p-5">
      <div>
        <div className="flex items-start justify-between gap-3">
          {material.isPremium ? (
            <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/20 hover:bg-amber-500/15">
              <Lock className="mr-1 size-3" aria-hidden /> Premium
            </Badge>
          ) : (
            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/15">
              <Unlock className="mr-1 size-3" aria-hidden /> Free Revision
            </Badge>
          )}
          <span className="text-xs font-semibold text-muted-foreground">{material.type}</span>
        </div>

        <h3 className="mt-4 line-clamp-2 text-base font-bold text-foreground">{material.title}</h3>
        <p className="mt-1 text-xs font-semibold text-primary">{subject?.name ?? "B.Pharm Subject"}</p>
        <p className="mt-2 line-clamp-3 text-xs text-muted-foreground leading-relaxed">
          {material.description}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] font-medium text-muted-foreground">
          <span className="flex items-center gap-1">
            <BookOpen className="size-3.5" aria-hidden />
            Year {material.year} · Sem {material.semester}
          </span>
          {material.pages && <span>· {material.pages} pages</span>}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
        <span className="text-base font-black text-foreground">
          {owned ? "Unlocked" : formatPrice(material.price)}
        </span>
        <div className="flex items-center gap-2">
          {isAccessible ? (
            <Button asChild size="sm" className="font-semibold text-xs">
              <Link to="/viewer/$materialId" params={{ materialId: material.id }}>
                <Eye className="mr-1 size-3.5" /> Read Online
              </Link>
            </Button>
          ) : (
            <Button asChild size="sm" variant="default" className="font-semibold text-xs">
              <Link to="/resources/$materialId" params={{ materialId: material.id }}>
                View & Buy
              </Link>
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
