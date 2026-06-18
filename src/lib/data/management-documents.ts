import type {
  FilingLink,
  ManagementDocument,
  ManagementDocumentKind,
  MetricConfidence,
} from "@/lib/types";

type ManagementDocumentConfig = {
  kind: ManagementDocumentKind;
  label: string;
  purpose: string;
  confidence: MetricConfidence;
};

const documentConfigs: Record<ManagementDocumentKind, ManagementDocumentConfig> = {
  annualReport: {
    kind: "annualReport",
    label: "Latest annual report",
    purpose: "Leadership background, executive officers, annual shareholder communication, and business context.",
    confidence: "high",
  },
  proxy: {
    kind: "proxy",
    label: "Latest proxy statement",
    purpose: "Executive compensation, beneficial ownership, governance, board structure, and shareholder alignment.",
    confidence: "high",
  },
  quarterly: {
    kind: "quarterly",
    label: "Latest quarterly report",
    purpose: "Recent operating context when the annual report is stale.",
    confidence: "medium",
  },
};

export function filingViewerUrl(filing: FilingLink) {
  return `/filing-viewer?url=${encodeURIComponent(filing.url)}&title=${encodeURIComponent(
    `${filing.form} filed ${filing.filingDate}`,
  )}`;
}

function toManagementDocument(
  filing: FilingLink | undefined,
  kind: ManagementDocumentKind,
): ManagementDocument | undefined {
  if (!filing) {
    return undefined;
  }

  const config = documentConfigs[kind];
  return {
    ...filing,
    ...config,
    viewerUrl: filingViewerUrl(filing),
  };
}

export function selectManagementDocuments(filings: FilingLink[]): ManagementDocument[] {
  const sortedFilings = filings.toSorted((a, b) => b.filingDate.localeCompare(a.filingDate));
  const annualReport =
    sortedFilings.find((filing) => filing.form === "10-K") ??
    sortedFilings.find((filing) => filing.form === "10-K/A");
  const proxy = sortedFilings.find((filing) => filing.form === "DEF 14A");
  const quarterly =
    sortedFilings.find((filing) => filing.form === "10-Q") ??
    sortedFilings.find((filing) => filing.form === "10-Q/A");

  return [
    toManagementDocument(annualReport, "annualReport"),
    toManagementDocument(proxy, "proxy"),
    toManagementDocument(quarterly, "quarterly"),
  ].filter((document): document is ManagementDocument => document !== undefined);
}
