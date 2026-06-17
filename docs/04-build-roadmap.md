# Build Roadmap

## Phase 0 - Foundation

- Create Next.js app.
- Add Inter font.
- Add dark design tokens.
- Build app shell:
  - Top bar.
  - Three primary surfaces: Search, Saves, and Docs.
  - Main panel.
  - Contextual drawer shell for docs/formulas/notes.
- Add local workspace storage.
- Add data types.

Done when:

- App opens directly to Search.
- Local workspace persists.
- UI matches the minimal dark style.

## Phase 1 - Search And Company Loading

- Add SEC ticker list fetch/cache.
- Build search API route.
- Build search UI.
- Map ticker to CIK.
- Load basic company profile.
- Add company header.
- Show multiple selectable suggestions.

Done when:

- User can search a U.S. company, choose a suggestion, and start the evaluation flow.

## Phase 2 - Price Data

- Add free price source adapter.
- Normalize daily historical price data.
- Show latest price with source/date.
- Add simple price chart.
- Support manual current price override.

Done when:

- User sees current-ish price and history, or can enter price manually.

## Phase 3 - SEC Facts And Big Five

- Add SEC company facts fetch.
- Normalize annual financials.
- Implement concept mapping and confidence flags.
- Calculate Big Five.
- Build Numbers tab.
- Add annual values table and CAGR columns.

Done when:

- User can inspect ROIC, sales, EPS, equity, and cash flow trends with source/confidence.

## Phase 4 - Valuation Calculator

- Build valuation inputs.
- Calculate future EPS, future price, sticker price, MOS price.
- Add sensitivity table.
- Add scenario presets.
- Add warnings for missing/weak data.
- Implement `Pass`, `Almost`, and `Nope` price verdicts.

Done when:

- Searching a business produces current price vs sticker price vs MOS and a clear Pass/Almost/Nope verdict.

## Phase 5 - Guided Evaluation Workflow

- Build stepper:
  - Result.
  - Business.
  - Big Five.
  - Moat.
  - Management.
  - Valuation.
  - Reports and notes.
- Build Meaning/Moat/Management/MOS checklist.
- Add moat type selectors.
- Add management review checklist.
- Link checklist items to lessons drawer.
- Include Strong/Middle/Dull business grading.
- Allow user to override the app's initial grade.

Done when:

- App combines numbers and manual judgment into Strong/Middle/Dull, while valuation produces Pass/Almost/Nope.

## Phase 6 - Reports And Descriptions

- Add SEC submissions fetch.
- List 10-K, 10-Q, DEF 14A/proxy links.
- Extract business description where feasible.
- Add report notes and read markers.

Done when:

- User can inspect the CEO/company reports from inside the research workflow.

## Phase 7 - Saves

- Store saved businesses locally.
- Build Saves list.
- Add filters:
  - Strong.
  - Middle.
  - Dull.
  - Pass.
  - Almost.
  - Nope.
  - Near MOS.
- Add manual refresh.
- Add import/export JSON.

Done when:

- User can save businesses, see Strong/Middle/Dull and Pass/Almost/Nope in the list, and reopen the evaluation.

## Phase 8 - Lessons

- Add Docs content.
- Add Docs surface.
- Add right drawer contextual docs.
- Add "apply this" checklist for each lesson.

Done when:

- Users can learn the Rule #1 method from Docs or contextually while researching, without leaving the app flow.

## Phase 9 - Polish

- Improve loading states.
- Improve empty/error states.
- Add keyboard shortcuts for search and tabs.
- Add accessibility labels.
- Add responsive mobile layout.
- Add source attribution and disclaimer.
- Add tests for calculations.

Done when:

- The app is usable by friends without explanation and calculations are covered by tests.

## Testing Plan

Important: the user explicitly said never verify through browser verification. Do not use browser/IAB verification for this project.

Use:

- Type checks.
- Lint.
- Unit tests for financial formulas.
- Component-level tests where practical.
- Manual terminal/dev-server checks only if needed.

Calculation tests:

- CAGR handles normal, negative, zero, and missing values.
- EPS fallback works from net income/shares.
- FCF fallback handles capex sign conventions.
- Sticker price uses percent/decimal correctly.
- Future PE is calculated correctly from growth.
- MOS status changes correctly around the threshold.
