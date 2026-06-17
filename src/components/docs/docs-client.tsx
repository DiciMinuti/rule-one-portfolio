"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { docsTopics } from "@/lib/docs-content";

export function DocsClient() {
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState(docsTopics[0].id);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return docsTopics;
    }

    return docsTopics.filter(
      (topic) =>
        topic.title.toLowerCase().includes(normalized) ||
        topic.summary.toLowerCase().includes(normalized) ||
        topic.howAppMeasures.toLowerCase().includes(normalized),
    );
  }, [query]);
  const active = docsTopics.find((topic) => topic.id === activeId) ?? filtered[0] ?? docsTopics[0];

  return (
    <div className="docs-layout">
      <section className="panel docs-list">
        <h1 className="title">Docs</h1>
        <p className="muted" style={{ margin: "4px 0 12px" }}>
          Rule #1 concepts, formulas, grades, verdicts, and data limits.
        </p>
        <div className="search-input-wrap compact">
          <Search size={16} />
          <input
            className="search-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search docs"
            aria-label="Search docs"
          />
        </div>
        <div className="docs-topic-list">
          {filtered.map((topic) => (
            <button
              className={`docs-topic-button ${active.id === topic.id ? "active" : ""}`}
              type="button"
              key={topic.id}
              onClick={() => setActiveId(topic.id)}
            >
              {topic.title}
            </button>
          ))}
        </div>
      </section>
      <section className="panel docs-detail">
        <div className="stack">
          <div>
            <h2 className="title">{active.title}</h2>
            <p className="muted" style={{ margin: "6px 0 0" }}>
              {active.summary}
            </p>
          </div>
          <DocBlock label="Why it matters" text={active.whyItMatters} />
          <DocBlock label="How the app measures it" text={active.howAppMeasures} />
          <DocBlock label="What you still judge manually" text={active.manualJudgment} />
          <div className="warning-box">
            Educational research tool. Not financial advice. Not affiliated with Phil Town, Rule #1
            Investing, the SEC, Stooq, or any data provider.
          </div>
        </div>
      </section>
    </div>
  );
}

function DocBlock({ label, text }: { label: string; text: string }) {
  return (
    <div className="doc-block">
      <div className="label">{label}</div>
      <p>{text}</p>
    </div>
  );
}
