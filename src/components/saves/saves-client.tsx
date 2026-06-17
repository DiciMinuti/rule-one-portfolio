"use client";

import { Download, ExternalLink, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { BusinessGradePill, PriceVerdictPill } from "@/components/ui/status-pill";
import {
  businessGradeLabels,
  formatCurrency,
  formatDate,
  formatPercent,
  priceVerdictLabels,
} from "@/lib/format";
import {
  deleteSavedBusiness,
  downloadWorkspaceJson,
  exportWorkspace,
  getSavedBusinesses,
} from "@/lib/storage";
import type { BusinessGrade, PriceVerdict, SavedBusinessItem } from "@/lib/types";

type SaveFilter = "all" | BusinessGrade | PriceVerdict | "nearMos";
type SaveSort = "gap" | "grade" | "reviewed" | "symbol";

const filters: { id: SaveFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "strong", label: "Strong" },
  { id: "middle", label: "Middle" },
  { id: "dull", label: "Dull" },
  { id: "pass", label: "Pass" },
  { id: "almost", label: "Almost" },
  { id: "nope", label: "Nope" },
  { id: "nearMos", label: "Near MOS" },
];

function gradeRank(grade: BusinessGrade) {
  return grade === "strong" ? 0 : grade === "middle" ? 1 : 2;
}

export function SavesClient() {
  const [saves, setSaves] = useState<SavedBusinessItem[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<SaveFilter>("all");
  const [sort, setSort] = useState<SaveSort>("gap");
  const [message, setMessage] = useState("");

  async function refresh() {
    const loaded = await getSavedBusinesses();
    setSaves(loaded);
  }

  useEffect(() => {
    let ignore = false;
    getSavedBusinesses()
      .then((loaded) => {
        if (!ignore) {
          setSaves(loaded);
        }
      })
      .catch(() => {
        if (!ignore) {
          setSaves([]);
        }
      });
    return () => {
      ignore = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return saves
      .filter((save) => {
        if (!normalizedQuery) {
          return true;
        }

        return (
          save.symbol.toLowerCase().includes(normalizedQuery) ||
          save.companyName.toLowerCase().includes(normalizedQuery) ||
          save.notes.thesis.toLowerCase().includes(normalizedQuery)
        );
      })
      .filter((save) => {
        if (filter === "all") {
          return true;
        }

        if (filter === "nearMos") {
          return (save.gapToMos ?? -1) > -0.15 && (save.gapToMos ?? -1) < 0.15;
        }

        return save.latestResult.businessGrade === filter || save.latestResult.priceVerdict === filter;
      })
      .toSorted((a, b) => {
        if (sort === "gap") {
          return (b.gapToMos ?? -Infinity) - (a.gapToMos ?? -Infinity);
        }

        if (sort === "grade") {
          return gradeRank(a.latestResult.businessGrade) - gradeRank(b.latestResult.businessGrade);
        }

        if (sort === "symbol") {
          return a.symbol.localeCompare(b.symbol);
        }

        return b.updatedAt.localeCompare(a.updatedAt);
      });
  }, [filter, query, saves, sort]);

  async function handleDelete(id: string) {
    await deleteSavedBusiness(id);
    await refresh();
    setMessage("Saved business removed.");
  }

  async function handleExport() {
    const data = await exportWorkspace();
    downloadWorkspaceJson(data);
    setMessage("Workspace exported.");
  }

  return (
    <div className="stack">
      <section className="panel">
        <div className="split">
          <div>
            <h1 className="title">Saves</h1>
            <p className="muted" style={{ margin: "4px 0 0" }}>
              Browser-stored businesses with Rule #1 grade, valuation, and thesis.
            </p>
          </div>
          <button className="button" type="button" onClick={handleExport}>
            <Download size={16} />
            Export JSON
          </button>
        </div>
      </section>

      <section className="panel stack">
        <div className="saves-controls">
          <div className="search-input-wrap compact">
            <Search size={16} />
            <input
              className="search-input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter saved businesses"
              aria-label="Filter saved businesses"
            />
          </div>
          <select className="compact-select" value={sort} onChange={(event) => setSort(event.target.value as SaveSort)}>
            <option value="gap">Sort by gap to MOS</option>
            <option value="grade">Sort by business grade</option>
            <option value="reviewed">Sort by last reviewed</option>
            <option value="symbol">Sort by ticker/name</option>
          </select>
        </div>
        <div className="row wrap">
          {filters.map((item) => (
            <button
              className={`segmented-button ${filter === item.id ? "active" : ""}`}
              type="button"
              key={item.id}
              onClick={() => setFilter(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        {message ? <span className="pill info">{message}</span> : null}
      </section>

      <section className="panel">
        {filtered.length ? (
          <div className="table-wrap">
            <table className="table saves-table">
              <thead>
                <tr>
                  <th>Ticker</th>
                  <th>Grade</th>
                  <th>Verdict</th>
                  <th>Current</th>
                  <th>MOS</th>
                  <th>Sticker</th>
                  <th>Gap</th>
                  <th>Last reviewed</th>
                  <th>Thesis</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((save) => (
                  <tr key={save.id}>
                    <td>
                      <strong>{save.symbol}</strong>
                      <div className="subtle">{save.companyName}</div>
                    </td>
                    <td>
                      <BusinessGradePill grade={save.latestResult.businessGrade} />
                      <div className="subtle">{businessGradeLabels[save.latestResult.businessGrade]}</div>
                    </td>
                    <td>
                      <PriceVerdictPill verdict={save.latestResult.priceVerdict} />
                      <div className="subtle">{priceVerdictLabels[save.latestResult.priceVerdict]}</div>
                    </td>
                    <td>{formatCurrency(save.currentPrice)}</td>
                    <td>{formatCurrency(save.mosPrice)}</td>
                    <td>{formatCurrency(save.stickerPrice)}</td>
                    <td>{formatPercent(save.gapToMos)}</td>
                    <td>{formatDate(save.updatedAt)}</td>
                    <td>{save.notes.thesis || <span className="subtle">No thesis yet.</span>}</td>
                    <td>
                      <div className="row">
                        <a className="icon-button" href={`/?symbol=${encodeURIComponent(save.symbol)}`} aria-label={`Open ${save.symbol}`}>
                          <ExternalLink size={16} />
                        </a>
                        <button className="icon-button" type="button" aria-label={`Remove ${save.symbol}`} onClick={() => handleDelete(save.id)}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-list">
            <h2 className="section-title">No saved businesses yet.</h2>
            <p className="muted">Search a business, review the result, and save it locally.</p>
          </div>
        )}
      </section>
    </div>
  );
}
