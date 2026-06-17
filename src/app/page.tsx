import { Suspense } from "react";
import { EvaluationWorkspace } from "@/components/search/evaluation-workspace";

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="panel muted">Loading search...</div>}>
      <EvaluationWorkspace />
    </Suspense>
  );
}
