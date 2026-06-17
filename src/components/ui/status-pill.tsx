import type { BusinessGrade, MetricStatus, PriceVerdict } from "@/lib/types";
import {
  businessGradeLabels,
  gradeTone,
  priceVerdictLabels,
  statusLabels,
  verdictTone,
} from "@/lib/format";

export function BusinessGradePill({ grade }: { grade: BusinessGrade }) {
  return <span className={`pill ${gradeTone(grade)}`}>{businessGradeLabels[grade]}</span>;
}

export function PriceVerdictPill({ verdict }: { verdict: PriceVerdict }) {
  return <span className={`pill ${verdictTone(verdict)}`}>{priceVerdictLabels[verdict]}</span>;
}

export function MetricStatusPill({ status }: { status: MetricStatus }) {
  const tone = status === "healthy" ? "good" : status === "caution" || status === "missing" ? "warn" : "bad";
  return <span className={`pill ${tone}`}>{statusLabels[status]}</span>;
}
