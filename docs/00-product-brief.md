# Product Brief

## Product

A free, unauthenticated Next.js app for Rule #1-style business research and valuation. It is for personal/friend use, not a paid product, and should be built around free public data.

The app is not a broker, not a trading terminal, and not financial advice. It is a disciplined research workspace that helps users decide whether a business is worth studying, what it may be worth, and whether the current price is below a margin-of-safety price.

## Core User Promise

Search for a U.S. public business, select it from suggestions, and walk step by step through a Rule #1 evaluation. The app gives a clear verdict first, then lets the user inspect the data behind it: current price vs sticker price vs MOS price, Big Five quality, Four M checks, reports, and assumptions.

## Design Constraints From User

- Dark mode only.
- Inter font.
- 14px type as the default interface size.
- Minimalistic.
- Surfaces separated by rounded containers.
- Container background: pure white at 3% opacity.
- Browser-stored, unauthenticated, no paid future version.
- Calculations run on each business search.

## Data Constraints

The app should be useful without paid APIs.

Primary free sources:

- SEC EDGAR company tickers, submissions, filings, and company facts.
- Stooq or another free end-of-day price source for historical/current-ish prices.
- Manual user overrides wherever free data is missing, ambiguous, delayed, or not available.

Practical scope:

- Best support: U.S.-listed companies with SEC filings.
- International coverage: nice-to-have only if free price/company data is easy.
- Real-time prices: not required.
- Perfect company descriptions: not required; filing-based descriptions are acceptable.

## Product Principles

1. Be honest about data quality.
   Every fetched metric should show source, period, and confidence.

2. Make assumptions editable.
   Rule #1 investing depends on judgment. The app should never hide that judgment behind a black-box score.

3. Teach in the workflow.
   Lessons should appear next to the thing the user is doing, not as a separate marketing course.

4. Give a clear verdict without pretending to be an advisor.
   The app should classify companies as `Strong`, `Middle`, or `Dull`, and valuation outcomes as `Pass`, `Almost`, or `Nope`. Avoid language like "you should buy."

5. Local-first.
   Saved businesses, notes, overrides, and workspaces live in the browser through IndexedDB/localStorage.

6. Free-first.
   Do not design features that depend on paid APIs, accounts, email services, or private databases.

## V1 Feature Set

- Three main surfaces:
  - Search.
  - Saves.
  - Docs.
- U.S. business search by ticker/company with multiple suggestions.
- Guided step-by-step evaluation after a business is selected.
- Immediate top-level result:
  - Business grade: `Strong`, `Middle`, or `Dull`.
  - Price verdict: `Pass`, `Almost`, or `Nope`.
- Company overview with description, CIK, exchange/ticker, and latest filing links.
- Current/end-of-day price and historical price chart.
- Big Five analysis:
  - ROIC.
  - Sales growth.
  - EPS growth.
  - Equity/book value growth.
  - Free cash flow or operating cash flow growth.
- CAGR views over 10, 5, 3, and 1 years where data allows.
- Rule #1 valuation:
  - Current/TTM EPS.
  - Future growth assumption.
  - Future PE assumption.
  - Required return, default 15%.
  - Time horizon, default 10 years.
  - Sticker price.
  - MOS price, default 50% discount.
- Payback time view if earnings data supports it.
- Four M checklist:
  - Meaning.
  - Moat.
  - Management.
  - Margin of Safety.
- Local saved businesses list.
- Saved business grade:
  - Strong.
  - Middle.
  - Dull.
- Local notes and manual overrides.
- Lessons drawer and method reference.
- Docs surface for app/investing explanations.
- Export/import local workspace JSON.

## Explicit Non-Goals For V1

- Auth.
- Server database.
- Paid market-data provider.
- Real-time quotes.
- Email/SMS notifications.
- Automatic cross-device sync.
- Brokerage integration.
- Portfolio performance accounting.
- Recommendation engine.
