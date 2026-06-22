"use client";

import {
  AlertTriangle,
  BookOpen,
  Building2,
  Calculator,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ListChecks,
  Search,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import {
  docsChapterSearchText,
  docsChapters,
  type DocsChapter,
  type DocsExample,
  type DocsFormula,
  type DocsSection,
} from "@/lib/docs-content";

export function DocsClient() {
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState(docsChapters[0].id);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return docsChapters;
    }

    return docsChapters.filter((chapter) => docsChapterSearchText(chapter).includes(normalized));
  }, [query]);

  const active =
    filtered.length > 0
      ? filtered.find((chapter) => chapter.id === activeId) ?? filtered[0]
      : docsChapters.find((chapter) => chapter.id === activeId) ?? docsChapters[0];
  const activeIndex = docsChapters.findIndex((chapter) => chapter.id === active.id);
  const previous = activeIndex > 0 ? docsChapters[activeIndex - 1] : undefined;
  const next = activeIndex < docsChapters.length - 1 ? docsChapters[activeIndex + 1] : undefined;

  function selectChapter(chapterId: string) {
    setActiveId(chapterId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="docs-reader">
      <aside className="docs-sidebar" aria-label="Docs chapters">
        <div>
          <h1 className="docs-title">Docs</h1>
          <p className="docs-sidebar-copy">
            A concise Rule #1 investing guide for using the app with clear assumptions and owner
            judgment.
          </p>
        </div>

        <div className="search-input-wrap compact docs-search">
          <Search size={16} />
          <input
            className="search-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search chapters"
            aria-label="Search docs chapters"
          />
        </div>

        <div className="docs-chapter-list">
          {filtered.length > 0 ? (
            filtered.map((chapter) => (
              <button
                className={`docs-chapter-button ${active.id === chapter.id ? "active" : ""}`}
                type="button"
                key={chapter.id}
                onClick={() => selectChapter(chapter.id)}
              >
                <span className="docs-chapter-index">
                  {String(docsChapters.findIndex((item) => item.id === chapter.id) + 1).padStart(2, "0")}
                </span>
                <span className="docs-chapter-label">
                  <strong>{chapter.title}</strong>
                  <span>{chapter.summary}</span>
                </span>
              </button>
            ))
          ) : (
            <div className="docs-empty-state">No chapters match that search.</div>
          )}
        </div>
      </aside>

      <article className="docs-article" aria-labelledby="docs-active-title">
        <header className="docs-article-header">
          <div className="docs-chapter-meta">
            <span>
              Chapter {activeIndex + 1} of {docsChapters.length}
            </span>
            <span>
              <Clock3 size={14} />
              {active.readingTime} min read
            </span>
          </div>
          <h2 id="docs-active-title">{active.title}</h2>
          <p>{active.summary}</p>
        </header>

        <section className="docs-takeaways" aria-label="Key takeaways">
          <div className="docs-block-heading">
            <CheckCircle2 size={17} />
            <h3>What to remember</h3>
          </div>
          <ul>
            {active.keyTakeaways.map((takeaway) => (
              <li key={takeaway}>{takeaway}</li>
            ))}
          </ul>
        </section>

        <div className="docs-section-stack">
          {active.sections.map((section) => (
            <DocsArticleSection key={section.id} section={section} />
          ))}
        </div>

        <footer className="docs-footer">
          <div className="docs-page-controls" aria-label="Docs chapter navigation">
            <ChapterNavButton chapter={previous} direction="previous" onSelect={selectChapter} />
            <ChapterNavButton chapter={next} direction="next" onSelect={selectChapter} />
          </div>
        </footer>
      </article>

      <aside className="docs-outline" aria-label="In this chapter">
        <div className="docs-outline-inner">
          <div className="docs-block-heading">
            <BookOpen size={16} />
            <h2>In this chapter</h2>
          </div>
          <nav>
            {active.sections.map((section) => (
              <a href={`#${section.id}`} key={section.id}>
                {section.title}
              </a>
            ))}
          </nav>
        </div>
      </aside>
    </div>
  );
}

function DocsArticleSection({ section }: { section: DocsSection }) {
  return (
    <section className="docs-section" id={section.id}>
      <h3>{section.title}</h3>
      {section.body.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}

      {section.formula ? <FormulaBlock formula={section.formula} /> : null}
      {section.examples?.map((example) => <ExampleBlock example={example} key={example.title} />)}
      {section.appNotes ? (
        <DocsCallout icon={<ListChecks size={17} />} tone="app" title="How the app uses this">
          <ul>
            {section.appNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </DocsCallout>
      ) : null}
      {section.mistake ? (
        <DocsCallout icon={<AlertTriangle size={17} />} tone="mistake" title="Beginner mistake">
          <p>{section.mistake}</p>
        </DocsCallout>
      ) : null}
      {section.checklist ? (
        <DocsCallout icon={<CheckCircle2 size={17} />} tone="checklist" title="Checklist">
          <ul>
            {section.checklist.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </DocsCallout>
      ) : null}
    </section>
  );
}

function FormulaBlock({ formula }: { formula: DocsFormula }) {
  return (
    <div className="docs-formula">
      <div className="docs-block-heading">
        <Calculator size={17} />
        <h4>{formula.title ?? "Formula"}</h4>
      </div>
      <div className="docs-formula-lines">
        {formula.lines.map((line) => (
          <code key={line}>{line}</code>
        ))}
      </div>
      {formula.note ? <p>{formula.note}</p> : null}
    </div>
  );
}

function ExampleBlock({ example }: { example: DocsExample }) {
  return (
    <div className="docs-example">
      <div className="docs-block-heading">
        <Building2 size={17} />
        <h4>{example.title}</h4>
      </div>
      {example.body.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
    </div>
  );
}

function DocsCallout({
  children,
  icon,
  title,
  tone,
}: {
  children: ReactNode;
  icon: ReactNode;
  title: string;
  tone: "app" | "mistake" | "checklist";
}) {
  return (
    <div className={`docs-callout ${tone}`}>
      <div className="docs-block-heading">
        {icon}
        <h4>{title}</h4>
      </div>
      {children}
    </div>
  );
}

function ChapterNavButton({
  chapter,
  direction,
  onSelect,
}: {
  chapter?: DocsChapter;
  direction: "previous" | "next";
  onSelect: (chapterId: string) => void;
}) {
  if (!chapter) {
    return <span aria-hidden="true" />;
  }

  return (
    <button className="docs-nav-button" type="button" onClick={() => onSelect(chapter.id)}>
      {direction === "previous" ? <ChevronLeft size={17} /> : null}
      <span>
        <small>{direction === "previous" ? "Previous" : "Next"}</small>
        <strong>{chapter.title}</strong>
      </span>
      {direction === "next" ? <ChevronRight size={17} /> : null}
    </button>
  );
}
