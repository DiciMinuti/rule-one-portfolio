import type { PricePoint } from "@/lib/types";

export type IndicatorSignal = "bullish" | "bearish" | "neutral" | "insufficient";
export type SummarySignal = "bullish" | "bearish" | "mixed" | "insufficient";

export type MacdPoint = {
  date: string;
  macd: number | null;
  signal: number | null;
  histogram: number | null;
};

export type StochasticsPoint = {
  date: string;
  k: number | null;
  d: number | null;
};

export type MovingAveragePoint = {
  date: string;
  close: number;
  average: number | null;
};

export type MacdResult = {
  fastPeriod: number;
  slowPeriod: number;
  signalPeriod: number;
  points: MacdPoint[];
  latest?: MacdPoint;
  previous?: MacdPoint;
  signal: IndicatorSignal;
  detail: string;
};

export type StochasticsResult = {
  period: number;
  signalPeriod: number;
  points: StochasticsPoint[];
  latest?: StochasticsPoint;
  previous?: StochasticsPoint;
  signal: IndicatorSignal;
  detail: string;
};

export type MovingAverageResult = {
  period: number;
  points: MovingAveragePoint[];
  latest?: MovingAveragePoint;
  previous?: MovingAveragePoint;
  signal: IndicatorSignal;
  detail: string;
};

export type IndicatorSummary = {
  signal: SummarySignal;
  label: string;
  detail: string;
  bullishCount: number;
  bearishCount: number;
  availableCount: number;
  totalCount: number;
};

export type TechnicalIndicators = {
  macd: MacdResult;
  stochastics: StochasticsResult;
  movingAverage: MovingAverageResult;
  summary: IndicatorSummary;
};

export type IndicatorSettings = {
  macdFastPeriod?: number;
  macdSlowPeriod?: number;
  macdSignalPeriod?: number;
  stochasticsPeriod?: number;
  stochasticsSignalPeriod?: number;
  movingAveragePeriod?: number;
};

export const DEFAULT_INDICATOR_SETTINGS = {
  macdFastPeriod: 12,
  macdSlowPeriod: 26,
  macdSignalPeriod: 9,
  stochasticsPeriod: 14,
  stochasticsSignalPeriod: 3,
  movingAveragePeriod: 10,
} satisfies Required<IndicatorSettings>;

const EPSILON = 0.000001;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function normalizePeriod(period: number | undefined, fallback: number) {
  return Number.isInteger(period) && period && period > 0 ? period : fallback;
}

function compareValues(primary: number, secondary: number): IndicatorSignal {
  if (primary > secondary + EPSILON) {
    return "bullish";
  }

  if (primary < secondary - EPSILON) {
    return "bearish";
  }

  return "neutral";
}

function crossoverDetail(
  current: IndicatorSignal,
  previous: IndicatorSignal | undefined,
  bullishCross: string,
  bullishState: string,
  bearishCross: string,
  bearishState: string,
  neutralState: string,
) {
  if (current === "bullish") {
    return previous === "bearish" || previous === "neutral" ? bullishCross : bullishState;
  }

  if (current === "bearish") {
    return previous === "bullish" || previous === "neutral" ? bearishCross : bearishState;
  }

  return neutralState;
}

export function calculateEma(values: number[], period: number): Array<number | null> {
  const result = Array<number | null>(values.length).fill(null);

  if (period <= 0 || values.length < period) {
    return result;
  }

  const multiplier = 2 / (period + 1);
  let seedTotal = 0;

  for (let index = 0; index < period; index += 1) {
    seedTotal += values[index] ?? 0;
  }

  let ema = seedTotal / period;
  result[period - 1] = ema;

  for (let index = period; index < values.length; index += 1) {
    ema = (values[index] - ema) * multiplier + ema;
    result[index] = ema;
  }

  return result;
}

function calculateSparseEma(values: Array<number | null>, period: number): Array<number | null> {
  const result = Array<number | null>(values.length).fill(null);

  if (period <= 0) {
    return result;
  }

  const multiplier = 2 / (period + 1);
  let seedTotal = 0;
  let seedCount = 0;
  let ema: number | undefined;

  values.forEach((value, index) => {
    if (!isFiniteNumber(value)) {
      return;
    }

    if (ema === undefined) {
      seedTotal += value;
      seedCount += 1;

      if (seedCount === period) {
        ema = seedTotal / period;
        result[index] = ema;
      }
      return;
    }

    ema = (value - ema) * multiplier + ema;
    result[index] = ema;
  });

  return result;
}

function trailingAverage(values: Array<number | null>, endIndex: number, period: number) {
  let total = 0;

  for (let offset = 0; offset < period; offset += 1) {
    const value = values[endIndex - offset];
    if (!isFiniteNumber(value)) {
      return null;
    }
    total += value;
  }

  return total / period;
}

export function calculateMovingAverage(
  points: PricePoint[],
  period = DEFAULT_INDICATOR_SETTINGS.movingAveragePeriod,
): MovingAverageResult {
  const normalizedPeriod = normalizePeriod(period, DEFAULT_INDICATOR_SETTINGS.movingAveragePeriod);
  const usablePoints = points.filter((point) => isFiniteNumber(point.close));
  const results = usablePoints.map((point, index): MovingAveragePoint => {
    if (index < normalizedPeriod - 1) {
      return {
        date: point.date,
        close: point.close,
        average: null,
      };
    }

    let total = 0;
    for (let offset = 0; offset < normalizedPeriod; offset += 1) {
      total += usablePoints[index - offset].close;
    }

    return {
      date: point.date,
      close: point.close,
      average: total / normalizedPeriod,
    };
  });

  const latest = results.findLast((point) => isFiniteNumber(point.average));
  const previous = results
    .slice(0, latest ? results.indexOf(latest) : 0)
    .findLast((point) => isFiniteNumber(point.average));

  if (!latest || !isFiniteNumber(latest.average)) {
    return {
      period: normalizedPeriod,
      points: results,
      signal: "insufficient",
      detail: `Need ${normalizedPeriod} closing prices`,
    };
  }

  const signal = compareValues(latest.close, latest.average);
  const previousSignal =
    previous && isFiniteNumber(previous.average) ? compareValues(previous.close, previous.average) : undefined;
  const detail = crossoverDetail(
    signal,
    previousSignal,
    `Crossed above ${normalizedPeriod}-day average`,
    `Above ${normalizedPeriod}-day average`,
    `Crossed below ${normalizedPeriod}-day average`,
    `Below ${normalizedPeriod}-day average`,
    `At ${normalizedPeriod}-day average`,
  );

  return {
    period: normalizedPeriod,
    points: results,
    latest,
    previous,
    signal,
    detail,
  };
}

export function calculateMacd(
  points: PricePoint[],
  settings: Pick<IndicatorSettings, "macdFastPeriod" | "macdSlowPeriod" | "macdSignalPeriod"> = {},
): MacdResult {
  const fastPeriod = normalizePeriod(settings.macdFastPeriod, DEFAULT_INDICATOR_SETTINGS.macdFastPeriod);
  const slowPeriod = normalizePeriod(settings.macdSlowPeriod, DEFAULT_INDICATOR_SETTINGS.macdSlowPeriod);
  const signalPeriod = normalizePeriod(settings.macdSignalPeriod, DEFAULT_INDICATOR_SETTINGS.macdSignalPeriod);
  const usablePoints = points.filter((point) => isFiniteNumber(point.close));
  const closes = usablePoints.map((point) => point.close);
  const fastEma = calculateEma(closes, fastPeriod);
  const slowEma = calculateEma(closes, slowPeriod);
  const macdValues = closes.map((_, index) =>
    isFiniteNumber(fastEma[index]) && isFiniteNumber(slowEma[index])
      ? (fastEma[index] as number) - (slowEma[index] as number)
      : null,
  );
  const signalValues = calculateSparseEma(macdValues, signalPeriod);
  const results = usablePoints.map((point, index): MacdPoint => {
    const macd = macdValues[index];
    const signalValue = signalValues[index];
    return {
      date: point.date,
      macd,
      signal: signalValue,
      histogram: isFiniteNumber(macd) && isFiniteNumber(signalValue) ? macd - signalValue : null,
    };
  });
  const latest = results.findLast((point) => isFiniteNumber(point.macd) && isFiniteNumber(point.signal));
  const previous = results
    .slice(0, latest ? results.indexOf(latest) : 0)
    .findLast((point) => isFiniteNumber(point.macd) && isFiniteNumber(point.signal));

  if (!latest || !isFiniteNumber(latest.macd) || !isFiniteNumber(latest.signal)) {
    return {
      fastPeriod,
      slowPeriod,
      signalPeriod,
      points: results,
      signal: "insufficient",
      detail: `Need ${slowPeriod + signalPeriod - 1} closing prices`,
    };
  }

  const signal = compareValues(latest.macd, latest.signal);
  const previousSignal =
    previous && isFiniteNumber(previous.macd) && isFiniteNumber(previous.signal)
      ? compareValues(previous.macd, previous.signal)
      : undefined;
  const detail = crossoverDetail(
    signal,
    previousSignal,
    "Crossed above signal",
    "Above signal",
    "Crossed below signal",
    "Below signal",
    "At signal",
  );

  return {
    fastPeriod,
    slowPeriod,
    signalPeriod,
    points: results,
    latest,
    previous,
    signal,
    detail,
  };
}

export function calculateStochastics(
  points: PricePoint[],
  settings: Pick<IndicatorSettings, "stochasticsPeriod" | "stochasticsSignalPeriod"> = {},
): StochasticsResult {
  const period = normalizePeriod(settings.stochasticsPeriod, DEFAULT_INDICATOR_SETTINGS.stochasticsPeriod);
  const signalPeriod = normalizePeriod(
    settings.stochasticsSignalPeriod,
    DEFAULT_INDICATOR_SETTINGS.stochasticsSignalPeriod,
  );
  const usablePoints = points.filter((point) => isFiniteNumber(point.close));
  const kValues = usablePoints.map((point, index) => {
    if (index < period - 1) {
      return null;
    }

    const window = usablePoints.slice(index - period + 1, index + 1);
    if (!window.every((item) => isFiniteNumber(item.high) && isFiniteNumber(item.low))) {
      return null;
    }

    const high = Math.max(...window.map((item) => item.high as number));
    const low = Math.min(...window.map((item) => item.low as number));
    const range = high - low;

    if (Math.abs(range) <= EPSILON) {
      return 50;
    }

    return Math.min(100, Math.max(0, ((point.close - low) / range) * 100));
  });
  const results = usablePoints.map((point, index): StochasticsPoint => ({
    date: point.date,
    k: kValues[index],
    d: index >= signalPeriod - 1 ? trailingAverage(kValues, index, signalPeriod) : null,
  }));
  const latest = results.findLast((point) => isFiniteNumber(point.k) && isFiniteNumber(point.d));
  const previous = results
    .slice(0, latest ? results.indexOf(latest) : 0)
    .findLast((point) => isFiniteNumber(point.k) && isFiniteNumber(point.d));

  if (!latest || !isFiniteNumber(latest.k) || !isFiniteNumber(latest.d)) {
    return {
      period,
      signalPeriod,
      points: results,
      signal: "insufficient",
      detail: `Need ${period} days with high, low, and close`,
    };
  }

  const signal = compareValues(latest.k, latest.d);
  const previousSignal =
    previous && isFiniteNumber(previous.k) && isFiniteNumber(previous.d)
      ? compareValues(previous.k, previous.d)
      : undefined;
  const detail = crossoverDetail(
    signal,
    previousSignal,
    "%K crossed above %D",
    "%K above %D",
    "%K crossed below %D",
    "%K below %D",
    "%K at %D",
  );

  return {
    period,
    signalPeriod,
    points: results,
    latest,
    previous,
    signal,
    detail,
  };
}

export function buildIndicatorSummary(signals: IndicatorSignal[]): IndicatorSummary {
  const totalCount = signals.length;
  const availableSignals = signals.filter((signal) => signal !== "insufficient");
  const availableCount = availableSignals.length;
  const bullishCount = availableSignals.filter((signal) => signal === "bullish").length;
  const bearishCount = availableSignals.filter((signal) => signal === "bearish").length;

  if (!availableCount) {
    return {
      signal: "insufficient",
      label: "Insufficient data",
      detail: "Need more price history",
      bullishCount,
      bearishCount,
      availableCount,
      totalCount,
    };
  }

  const unavailableCount = totalCount - availableCount;
  const availabilityDetail = unavailableCount ? ` (${unavailableCount} unavailable)` : "";

  if (bullishCount > bearishCount) {
    return {
      signal: "bullish",
      label: `${bullishCount} of ${totalCount} bullish`,
      detail: `${availableCount} of ${totalCount} indicators available${availabilityDetail}`,
      bullishCount,
      bearishCount,
      availableCount,
      totalCount,
    };
  }

  if (bearishCount > bullishCount) {
    return {
      signal: "bearish",
      label: `${bearishCount} of ${totalCount} bearish`,
      detail: `${availableCount} of ${totalCount} indicators available${availabilityDetail}`,
      bullishCount,
      bearishCount,
      availableCount,
      totalCount,
    };
  }

  return {
    signal: "mixed",
    label: "Mixed",
    detail: `${availableCount} of ${totalCount} indicators available${availabilityDetail}`,
    bullishCount,
    bearishCount,
    availableCount,
    totalCount,
  };
}

export function buildTechnicalIndicators(
  points: PricePoint[],
  settings: IndicatorSettings = {},
): TechnicalIndicators {
  const macd = calculateMacd(points, settings);
  const stochastics = calculateStochastics(points, settings);
  const movingAverage = calculateMovingAverage(points, settings.movingAveragePeriod);
  const summary = buildIndicatorSummary([macd.signal, stochastics.signal, movingAverage.signal]);

  return {
    macd,
    stochastics,
    movingAverage,
    summary,
  };
}
