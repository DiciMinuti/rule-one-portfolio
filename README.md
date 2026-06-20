# Rule One Portfolio

A free, unauthenticated Rule #1-style business evaluation app planned for Next.js and Vercel.

The product is intentionally simple:

1. **Search** - find a U.S. business and evaluate it step by step.
2. **Saves** - keep saved businesses with their grades and valuation result.
3. **Docs** - read the investing method and app explanations in one place.

Navigation is intentionally KISS:

- `/` for Search.
- `/saves` for Saves.
- `/docs` for Docs.
- Desktop uses a simple top nav.
- Mobile uses a simple bottom nav.

The app is built around free public data, browser-local storage, and transparent assumptions.

Planning docs live in `docs/`.

Qualitative moat and management briefs are generated offline with OpenAI and committed as JSON. See `docs/05-qualitative-generation.md`.
