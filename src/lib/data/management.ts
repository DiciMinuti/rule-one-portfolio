import { filingHtmlToText, normalizeFilingText } from "@/lib/data/filing-text";
import { selectManagementDocuments } from "@/lib/data/management-documents";
import { getCompanyFilings } from "@/lib/data/sec";
import type {
  DataSourceRef,
  ManagementBrief,
  ManagementDocument,
  ManagementDocumentKind,
  ManagementSignal,
} from "@/lib/types";

const USER_AGENT =
  process.env.SEC_USER_AGENT ?? "RuleOnePortfolio/0.1 personal research app contact: local@example.com";

type SignalConfig = {
  id: ManagementSignal["id"];
  label: string;
  question: string;
  documentKinds: ManagementDocumentKind[];
  patterns: RegExp[];
  keywords: string[];
  foundSummary: (document: ManagementDocument) => string;
  reviewSummary: (document: ManagementDocument) => string;
  missingSummary: string;
};

type FilingTextResult = {
  document: ManagementDocument;
  text?: string;
  error?: string;
};

const signalConfigs: SignalConfig[] = [
  {
    id: "leaders",
    label: "Leadership",
    question: "Who leads the business, and how long have they been in the business?",
    documentKinds: ["annualReport", "proxy"],
    patterns: [
      /information about (our )?executive officers/i,
      /executive officers/i,
      /directors and executive officers/i,
      /management team/i,
    ],
    keywords: ["chief executive officer", "president", "age", "since", "joined", "appointed", "served"],
    foundSummary: (document) =>
      `Found an executive leadership section in the ${document.form} filed ${document.filingDate}. Use this source to confirm names, roles, background, and tenure.`,
    reviewSummary: (document) =>
      `Open the ${document.form} filed ${document.filingDate} to review executive officers and leadership tenure. The app found the filing but could not isolate the exact leadership section.`,
    missingSummary:
      "No annual report or proxy statement was available from the latest SEC filing list, so leadership details need manual review.",
  },
  {
    id: "compensation",
    label: "Compensation",
    question: "What are the leaders paid, including salary and total compensation?",
    documentKinds: ["proxy"],
    patterns: [
      /summary compensation table/i,
      /compensation discussion and analysis/i,
      /executive compensation/i,
      /named executive officers/i,
    ],
    keywords: ["salary", "bonus", "stock awards", "option awards", "non-equity", "total", "$"],
    foundSummary: (document) =>
      `Found executive compensation evidence in the latest proxy filed ${document.filingDate}. The Summary Compensation Table is the primary source for salary and total compensation.`,
    reviewSummary: (document) =>
      `Open the latest proxy filed ${document.filingDate} and review the executive compensation tables. The proxy is available, but the exact compensation table was not isolated reliably.`,
    missingSummary:
      "No latest DEF 14A proxy statement was available from the SEC filing list. Salary and total compensation usually require that proxy.",
  },
  {
    id: "ownership",
    label: "Ownership",
    question: "How much stock do leaders and directors own?",
    documentKinds: ["proxy"],
    patterns: [
      /security ownership of certain beneficial owners/i,
      /beneficial ownership/i,
      /stock ownership/i,
      /ownership of securities/i,
    ],
    keywords: ["shares", "beneficially", "percent", "%", "directors", "executive officers", "outstanding"],
    foundSummary: (document) =>
      `Found ownership evidence in the latest proxy filed ${document.filingDate}. This is the source to review insider shares and ownership percentages.`,
    reviewSummary: (document) =>
      `Open the latest proxy filed ${document.filingDate} and review the beneficial ownership table. The proxy is available, but the exact ownership section was not isolated reliably.`,
    missingSummary:
      "No latest DEF 14A proxy statement was available from the SEC filing list. Insider ownership usually requires the proxy beneficial ownership table.",
  },
  {
    id: "shareholderLetter",
    label: "CEO Letter",
    question: "What does the latest CEO or shareholder letter say?",
    documentKinds: ["annualReport", "proxy"],
    patterns: [
      /dear (fellow )?(shareholders|stockholders)/i,
      /letter to (our )?(shareholders|stockholders)/i,
      /to our (shareholders|stockholders)/i,
      /fellow (shareholders|stockholders)/i,
    ],
    keywords: ["shareholders", "stockholders", "ceo", "chief executive", "year", "capital", "customers"],
    foundSummary: (document) =>
      `Found shareholder-letter language in the ${document.form} filed ${document.filingDate}. Review the excerpt and source document for management's tone and priorities.`,
    reviewSummary: (document) =>
      `Open the ${document.form} filed ${document.filingDate} to look for shareholder communication. A dedicated CEO letter was not isolated from the SEC document text.`,
    missingSummary:
      "No CEO or shareholder letter was identifiable in the latest SEC documents. Some companies publish letters only in glossy annual reports or investor relations pages.",
  },
];

function signalSource(document: ManagementDocument, confidence: DataSourceRef["confidence"]): DataSourceRef {
  return {
    label: `${document.label} (${document.form}, filed ${document.filingDate})`,
    url: document.viewerUrl,
    period: document.filingDate,
    confidence,
  };
}

function globalRegExp(pattern: RegExp) {
  const flags = new Set(`${pattern.flags}gi`.split(""));
  return new RegExp(pattern.source, Array.from(flags).join(""));
}

function scoreExcerpt(excerpt: string, keywords: string[]) {
  const lowerExcerpt = excerpt.toLowerCase();
  const keywordScore = keywords.reduce(
    (score, keyword) => score + (lowerExcerpt.includes(keyword.toLowerCase()) ? 2 : 0),
    0,
  );
  const tableScore = /salary|shares|\$|%|total|chief executive officer/i.test(excerpt) ? 2 : 0;
  const yearScore = /\b(?:19|20)\d{2}\b/.test(excerpt) ? 1 : 0;
  const tocPenalty = /table of contents/i.test(excerpt) ? -5 : 0;

  return keywordScore + tableScore + yearScore + tocPenalty;
}

function truncateExcerpt(value: string, maxLength = 680) {
  if (value.length <= maxLength) {
    return value;
  }

  const cutIndex = value.lastIndexOf(" ", maxLength - 1);
  return `${value.slice(0, cutIndex > 0 ? cutIndex : maxLength).trim()}...`;
}

function excerptAround(text: string, index: number) {
  return truncateExcerpt(
    text
      .slice(index, Math.min(text.length, index + 1_400))
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function findBestExcerpt(text: string, config: SignalConfig) {
  const normalizedText = normalizeFilingText(text);
  let best: { index: number; score: number } | undefined;

  for (const pattern of config.patterns) {
    const matcher = globalRegExp(pattern);
    let match: RegExpExecArray | null;
    let matchCount = 0;

    while ((match = matcher.exec(normalizedText)) && matchCount < 80) {
      const index = match.index;
      const window = normalizedText.slice(
        Math.max(0, index - 250),
        Math.min(normalizedText.length, index + 2_200),
      );
      const score = scoreExcerpt(window, config.keywords);

      if (!best || score > best.score) {
        best = { index, score };
      }

      matchCount += 1;
    }
  }

  if (!best || best.score < 1) {
    return undefined;
  }

  return excerptAround(normalizedText, best.index);
}

function signalFromConfig(
  config: SignalConfig,
  documents: ManagementDocument[],
  documentTexts: Partial<Record<ManagementDocumentKind, string>>,
): ManagementSignal {
  const candidateDocuments = config.documentKinds
    .map((kind) => documents.find((document) => document.kind === kind))
    .filter((document): document is ManagementDocument => document !== undefined);

  for (const document of candidateDocuments) {
    const text = documentTexts[document.kind];
    if (!text) {
      continue;
    }

    const excerpt = findBestExcerpt(text, config);
    if (excerpt) {
      return {
        id: config.id,
        label: config.label,
        question: config.question,
        status: "found",
        summary: config.foundSummary(document),
        source: signalSource(document, "high"),
        excerpts: [excerpt],
      };
    }
  }

  const reviewDocument = candidateDocuments[0];
  if (reviewDocument) {
    return {
      id: config.id,
      label: config.label,
      question: config.question,
      status: "needs-review",
      summary: config.reviewSummary(reviewDocument),
      source: signalSource(reviewDocument, "medium"),
      excerpts: [],
    };
  }

  return {
    id: config.id,
    label: config.label,
    question: config.question,
    status: "missing",
    summary: config.missingSummary,
    excerpts: [],
  };
}

export function buildManagementBriefFromTexts({
  symbol,
  documents,
  documentTexts,
  warnings = [],
}: {
  symbol: string;
  documents: ManagementDocument[];
  documentTexts: Partial<Record<ManagementDocumentKind, string>>;
  warnings?: string[];
}): ManagementBrief {
  return {
    symbol: symbol.toUpperCase(),
    generatedAt: new Date().toISOString(),
    documents,
    signals: signalConfigs.map((config) => signalFromConfig(config, documents, documentTexts)),
    warnings,
  };
}

async function fetchFilingText(document: ManagementDocument): Promise<FilingTextResult> {
  try {
    const response = await fetch(document.url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,text/plain,*/*",
      },
      next: { revalidate: 60 * 60 * 24 },
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      throw new Error(`SEC document request failed (${response.status})`);
    }

    return {
      document,
      text: filingHtmlToText(await response.text()),
    };
  } catch (error) {
    return {
      document,
      error: error instanceof Error ? error.message : "Filing text extraction failed.",
    };
  }
}

export async function getCompanyManagement(symbol: string): Promise<ManagementBrief> {
  const normalizedSymbol = symbol.trim().toUpperCase();
  const filings = await getCompanyFilings(normalizedSymbol);
  const documents = selectManagementDocuments(filings);
  const textResults = await Promise.all(documents.map((document) => fetchFilingText(document)));
  const documentTexts: Partial<Record<ManagementDocumentKind, string>> = {};
  const warnings: string[] = [];

  textResults.forEach((result) => {
    if (result.text) {
      documentTexts[result.document.kind] = result.text;
      return;
    }

    if (result.error) {
      warnings.push(`${result.document.label}: ${result.error}`);
    }
  });

  return buildManagementBriefFromTexts({
    symbol: normalizedSymbol,
    documents,
    documentTexts,
    warnings,
  });
}
