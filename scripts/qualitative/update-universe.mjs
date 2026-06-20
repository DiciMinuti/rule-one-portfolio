#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadLocalEnv } from "./env.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../..");
const outputPath = path.join(rootDir, "src/lib/data/qualitative/universe/us-large-cap-coverage.json");
const SEC_COMPANY_TICKERS_URL = "https://www.sec.gov/files/company_tickers.json";
const COMPANIES_MARKET_CAP_URL =
  "https://companiesmarketcap.com/usa/largest-companies-in-the-usa-by-market-cap/";
const EXCLUDED_SYMBOLS = new Set([
  // Private company with SEC filings, not a normal public equity for this app.
  "SPCX",
]);

await loadLocalEnv(rootDir);

function parseArgs(argv) {
  const options = {
    limit: 300,
  };

  for (const arg of argv) {
    if (arg.startsWith("--limit=")) {
      options.limit = Number(arg.slice("--limit=".length));
    }
  }

  if (!Number.isInteger(options.limit) || options.limit < 1) {
    throw new Error("--limit must be a positive integer.");
  }

  return options;
}

function stripHtml(value) {
  return value.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").trim();
}

function pageUrl(page) {
  return page === 1 ? COMPANIES_MARKET_CAP_URL : `${COMPANIES_MARKET_CAP_URL}?page=${page}`;
}

async function fetchText(url, headers = {}) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": process.env.SEC_USER_AGENT ?? "RuleOnePortfolio/0.1 qualitative universe builder",
      Accept: "text/html,application/json,text/plain,*/*",
      ...headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) for ${url}`);
  }

  return response.text();
}

async function fetchSecSymbols() {
  const text = await fetchText(SEC_COMPANY_TICKERS_URL, { Accept: "application/json" });
  const records = Object.values(JSON.parse(text));
  return new Set(records.map((record) => record.ticker.toUpperCase()));
}

function parseRankingRows(html) {
  const rows = html.match(/<tr>[\s\S]*?<\/tr>/g) ?? [];

  return rows.flatMap((row) => {
    const sourceRank = Number(row.match(/class="rank-td td-right" data-sort="(\d+)"/)?.[1]);
    const name = row.match(/<div class="company-name">([\s\S]*?)<\/div>/)?.[1];
    const symbol = row.match(/<div class="company-code"><span class="rank d-none"><\/span>([^<]+)<\/div>/)?.[1];
    const marketCapUsd = Number(row.match(/<td class="td-right" data-sort="(\d+)">/)?.[1]);

    if (!sourceRank || !name || !symbol || !Number.isFinite(marketCapUsd)) {
      return [];
    }

    return [
      {
        sourceRank,
        symbol: stripHtml(symbol).toUpperCase(),
        name: stripHtml(name),
        marketCapUsd,
      },
    ];
  });
}

async function fetchMarketCapRows(limit, secSymbols) {
  const rows = [];
  let page = 1;

  while (rows.length < limit && page <= 20) {
    const html = await fetchText(pageUrl(page));
    const pageRows = parseRankingRows(html);
    if (!pageRows.length) {
      break;
    }

    for (const row of pageRows) {
      if (
        secSymbols.has(row.symbol) &&
        !EXCLUDED_SYMBOLS.has(row.symbol) &&
        !rows.some((item) => item.symbol === row.symbol)
      ) {
        rows.push(row);
      }

      if (rows.length === limit) {
        break;
      }
    }

    page += 1;
  }

  if (rows.length < limit) {
    throw new Error(`Only found ${rows.length} SEC-backed companies; expected ${limit}.`);
  }

  return rows;
}

const options = parseArgs(process.argv.slice(2));
const secSymbols = await fetchSecSymbols();
const rows = await fetchMarketCapRows(options.limit, secSymbols);
const generatedAt = new Date().toISOString();
const universe = {
  id: "us-large-cap-coverage",
  description:
    "Ranked qualitative-brief coverage universe for large American public businesses. Built from CompaniesMarketCap's United States market-cap ranking and filtered to symbols present in SEC company_tickers.json.",
  generatedAt,
  limit: options.limit,
  sources: [
    {
      label: "CompaniesMarketCap largest American companies by market capitalization",
      url: COMPANIES_MARKET_CAP_URL,
      retrievedAt: generatedAt,
    },
    {
      label: "SEC company_tickers.json",
      url: SEC_COMPANY_TICKERS_URL,
      retrievedAt: generatedAt,
    },
  ],
  companies: rows.map((row, index) => ({
    coverageRank: index + 1,
    ...row,
  })),
};

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(universe, null, 2)}\n`);
console.log(`Wrote ${rows.length} companies to ${path.relative(rootDir, outputPath)}`);
