import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/admin/materials/$id/edit")({
  component: AdminEditMaterialRoute,
});

function AdminEditMaterialRoute() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  useEffect(() => {
    void navigate({
      to: "/admin/materials/create",
      search: { materialId: id },
      replace: true,
    });
  }, [id, navigate]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}
