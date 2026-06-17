import type { PriceHistory, PricePoint } from "@/lib/types";
import https from "node:https";

const STOOQ_DAILY_URL = "https://stooq.com/q/d/l/";
const YAHOO_CHART_URL = "https://query2.finance.yahoo.com/v8/finance/chart";
const STOOQ_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36";
const YAHOO_USER_AGENT = "Mozilla/5.0";

type YahooChartResponse = {
  chart?: {
    result?: [
      {
        meta?: {
          regularMarketPrice?: number;
        };
        timestamp?: number[];
        indicators?: {
          quote?: [
            {
              close?: Array<number | null>;
            },
          ];
        };
      },
    ];
    error?: {
      code?: string;
      description?: string;
    } | null;
  };
};

function parseStooqCsv(csv: string): PricePoint[] {
  if (!csv.includes("Date,Open,High,Low,Close")) {
    return [];
  }

  const rows = csv.trim().split(/\r?\n/);
  const [, ...dataRows] = rows;

  return dataRows
    .map((row) => {
      const [date, , , , close] = row.split(",");
      const closeNumber = Number(close);

      if (!date || !Number.isFinite(closeNumber)) {
        return undefined;
      }

      return {
        date,
        close: closeNumber,
      };
    })
    .filter((point): point is PricePoint => Boolean(point));
}

async function getStooqPriceHistory(symbol: string): Promise<PriceHistory> {
  const normalizedSymbol = `${symbol.trim().toLowerCase()}.us`;
  const url = `${STOOQ_DAILY_URL}?s=${encodeURIComponent(normalizedSymbol)}&i=d`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": STOOQ_USER_AGENT,
      Accept: "text/csv,text/plain,*/*",
    },
    next: { revalidate: 60 * 60 * 24 },
  });

  if (!response.ok) {
    throw new Error(`Stooq request failed (${response.status}) for ${symbol.toUpperCase()}`);
  }

  const csv = await response.text();
  const history = parseStooqCsv(csv);
  const latest = history.at(-1);

  if (!latest) {
    throw new Error("Stooq returned no usable daily price rows.");
  }

  return {
    symbol: symbol.toUpperCase(),
    latest,
    history: history.slice(-2600),
    source: {
      label: "Stooq daily prices",
      url,
      period: latest?.date,
      confidence: latest ? "medium" : "low",
      note: "Delayed/end-of-day style data. Enter a manual price if this source is unavailable.",
    },
  };
}

function parseYahooChart(symbol: string, data: YahooChartResponse, url: string): PriceHistory {
  const error = data.chart?.error;
  if (error) {
    throw new Error(error.description ?? error.code ?? "Yahoo chart request failed.");
  }

  const result = data.chart?.result?.[0];
  const timestamps = result?.timestamp ?? [];
  const closes = result?.indicators?.quote?.[0]?.close ?? [];
  const history = timestamps
    .map((timestamp, index) => {
      const close = closes[index];
      if (!Number.isFinite(timestamp) || !Number.isFinite(close)) {
        return undefined;
      }

      return {
        date: new Date(timestamp * 1000).toISOString().slice(0, 10),
        close: close as number,
      };
    })
    .filter((point): point is PricePoint => Boolean(point));

  const latestFromHistory = history.at(-1);
  const regularMarketPrice = result?.meta?.regularMarketPrice;
  const latest =
    latestFromHistory ??
    (Number.isFinite(regularMarketPrice)
      ? {
          date: new Date().toISOString().slice(0, 10),
          close: regularMarketPrice as number,
        }
      : undefined);

  if (!latest) {
    throw new Error("Yahoo returned no usable daily price rows.");
  }

  return {
    symbol: symbol.toUpperCase(),
    latest,
    history: history.slice(-2600),
    source: {
      label: "Yahoo Finance public chart",
      url,
      period: latest.date,
      confidence: "medium",
      note: "Public delayed/current-ish chart data. Enter a manual price if this source is unavailable.",
    },
  };
}

async function getYahooPriceHistory(symbol: string): Promise<PriceHistory> {
  const normalizedSymbol = symbol.trim().toUpperCase();
  const url = `${YAHOO_CHART_URL}/${encodeURIComponent(normalizedSymbol)}?range=10y&interval=1d`;
  const data = await getJsonWithHttps<YahooChartResponse>(url);
  return parseYahooChart(normalizedSymbol, data, url);
}

function getJsonWithHttps<T>(url: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const request = https.get(
      url,
      {
        headers: {
          "User-Agent": YAHOO_USER_AGENT,
          Accept: "application/json,text/plain,*/*",
          "Accept-Language": "en-US,en;q=0.9",
        },
      },
      (response) => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => {
          if (!response.statusCode || response.statusCode < 200 || response.statusCode >= 300) {
            reject(new Error(`Yahoo chart request failed (${response.statusCode ?? "unknown"})`));
            return;
          }

          try {
            resolve(JSON.parse(body) as T);
          } catch (error) {
            reject(error);
          }
        });
      },
    );

    request.setTimeout(12000, () => {
      request.destroy(new Error("Yahoo chart request timed out."));
    });
    request.on("error", reject);
  });
}

export async function getPriceHistory(symbol: string): Promise<PriceHistory> {
  const failures: string[] = [];

  try {
    return await getStooqPriceHistory(symbol);
  } catch (error) {
    failures.push(error instanceof Error ? error.message : "Stooq price request failed.");
  }

  try {
    const yahoo = await getYahooPriceHistory(symbol);
    return {
      ...yahoo,
      source: {
        ...yahoo.source,
        note: `${yahoo.source.note} Stooq fallback reason: ${failures[0]}`,
      },
    };
  } catch (error) {
    failures.push(error instanceof Error ? error.message : "Yahoo price request failed.");
  }

  throw new Error(`No free price source returned usable data. ${failures.join(" ")}`);
}
