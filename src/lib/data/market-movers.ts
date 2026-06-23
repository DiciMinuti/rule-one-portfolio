import https from "node:https";

const YAHOO_SCREENER_URL = "https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved";
const YAHOO_USER_AGENT = "Mozilla/5.0";
const moverCount = 8;

type YahooScreenerResponse = {
  finance?: {
    result?: Array<{
      quotes?: YahooMoverQuote[];
    }>;
    error?: {
      code?: string;
      description?: string;
    } | null;
  };
};

type YahooMoverQuote = {
  symbol?: string;
  shortName?: string;
  longName?: string;
  regularMarketPrice?: number;
  regularMarketChangePercent?: number;
  regularMarketVolume?: number;
  marketCap?: number;
  exchange?: string;
  quoteType?: string;
};

export type MarketMover = {
  symbol: string;
  name: string;
  price?: number;
  changePercent?: number;
  volume?: number;
  marketCap?: number;
  exchange?: string;
};

export type MarketMovers = {
  gainers: MarketMover[];
  losers: MarketMover[];
  active: MarketMover[];
  source: {
    label: string;
    url: string;
  };
};

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
            reject(new Error(`Yahoo screener request failed (${response.statusCode ?? "unknown"})`));
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
      request.destroy(new Error("Yahoo screener request timed out."));
    });
    request.on("error", reject);
  });
}

function normalizeMover(quote: YahooMoverQuote): MarketMover | undefined {
  const symbol = quote.symbol?.trim().toUpperCase();
  const name = quote.shortName?.trim() || quote.longName?.trim();

  if (!symbol || !name || quote.quoteType !== "EQUITY") {
    return undefined;
  }

  return {
    symbol,
    name,
    ...(Number.isFinite(quote.regularMarketPrice) ? { price: quote.regularMarketPrice } : {}),
    ...(Number.isFinite(quote.regularMarketChangePercent)
      ? { changePercent: (quote.regularMarketChangePercent as number) / 100 }
      : {}),
    ...(Number.isFinite(quote.regularMarketVolume) ? { volume: quote.regularMarketVolume } : {}),
    ...(Number.isFinite(quote.marketCap) ? { marketCap: quote.marketCap } : {}),
    ...(quote.exchange ? { exchange: quote.exchange } : {}),
  };
}

async function getMoverSection(scrId: string) {
  const url = `${YAHOO_SCREENER_URL}?count=${moverCount}&scrIds=${encodeURIComponent(scrId)}`;
  const data = await getJsonWithHttps<YahooScreenerResponse>(url);
  const error = data.finance?.error;

  if (error) {
    throw new Error(error.description ?? error.code ?? "Yahoo screener request failed.");
  }

  return (data.finance?.result?.[0]?.quotes ?? [])
    .map(normalizeMover)
    .filter((mover): mover is MarketMover => Boolean(mover));
}

export async function getMarketMovers(): Promise<MarketMovers> {
  const [gainers, losers, active] = await Promise.all([
    getMoverSection("day_gainers"),
    getMoverSection("day_losers"),
    getMoverSection("most_actives"),
  ]);

  return {
    gainers,
    losers,
    active,
    source: {
      label: "Yahoo Finance predefined screeners",
      url: YAHOO_SCREENER_URL,
    },
  };
}
