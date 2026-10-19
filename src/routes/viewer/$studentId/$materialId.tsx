import { createFileRoute } from "@tanstack/react-router";
import ProtectedDocumentViewer from "../$materialId";

export const Route = createFileRoute("/viewer/$studentId/$materialId")({
  component: ProtectedDocumentViewer,
});
