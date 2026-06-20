import type { QualitativeBrief } from "@/lib/types";
import qualitativeBriefIndex from "@/lib/data/qualitative/briefs/index.json";

const qualitativeBriefs = qualitativeBriefIndex as Record<string, QualitativeBrief>;

export function getQualitativeBrief(symbol: string) {
  return qualitativeBriefs[symbol.trim().toUpperCase()];
}
