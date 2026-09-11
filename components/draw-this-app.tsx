"use client";

import React from "react";
import Image from "next/image";
import {
  Bookmark,
  BookmarkCheck,
  Clock3,
  Focus,
  Minimize2,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
  X,
  ZoomIn,
  ZoomOut
} from "lucide-react";
import { FormEvent, PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { createRandomChallenge, getDailyChallenge } from "@/lib/challenges";
import {
  categories,
  difficulties,
  getSaferPromptSuggestions,
  guidedPromptSuggestions,
  inferCategoryFromSubject,
  resolveSearchCategory
} from "@/lib/reference-query";
import {
  addRecentReference,
  getPreferences,
  getRecentReferences,
  getSavedReferences,
  removeSavedReference,
  savePreferences,
  saveReference
} from "@/lib/storage";
import type { Category, Difficulty, DrawingChallenge, ReferenceImage, SearchResponse, SketchStyle } from "@/lib/types";

type View = "discover" | "saved" | "recent";

const sketchStyles: SketchStyle[] = ["Pencil", "Ink", "Charcoal", "Construction"];
const featuredPrompts = guidedPromptSuggestions.slice(0, 4);

const sketchFilterClass: Record<SketchStyle, string> = {
  Pencil: "sketch-filter-pencil",
  Ink: "sketch-filter-ink",
  Charcoal: "sketch-filter-charcoal",
  Construction: "sketch-filter-construction"
};

const sketchStyleHints: Record<SketchStyle, string> = {
  Pencil: "Soft graphite preview for light contour and value studies.",
  Ink: "High contrast monochrome for bold shape and edge studies.",
  Charcoal: "Darker muted preview for mass, shadow, and mood.",
  Construction: "Paler study-line preview for blocking in proportions."
};

function tooltipId(label: string) {
  return `tooltip-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;
}

export function DrawThisApp() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category>("Objects");
  const [difficulty, setDifficulty] = useState<Difficulty>("Beginner");
  const [sketchStyle, setSketchStyle] = useState<SketchStyle>("Pencil");
  const [view, setView] = useState<View>("discover");
  const [results, setResults] = useState<ReferenceImage[]>([]);
  const [current, setCurrent] = useState<ReferenceImage | null>(null);
  const [saved, setSaved] = useState<ReferenceImage[]>([]);
  const [recent, setRecent] = useState<ReferenceImage[]>([]);
  const [challenge, setChallenge] = useState<DrawingChallenge | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("Choose a subject and pull a reference into view.");
  const [emptySuggestions, setEmptySuggestions] = useState<Array<{ subject: string; category: Category; difficulty: Difficulty }>>([]);
  const [focusMode, setFocusMode] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState<{ pointerId: number; x: number; y: number; offsetX: number; offsetY: number } | null>(null);
  const trackedDownloads = useRef(new Set<string>());

  const avoidedIds = useMemo(() => [...results, ...recent].slice(0, 30).map((item) => item.providerId), [recent, results]);
  const currentSaved = current ? saved.some((item) => item.id === current.id) : false;
  const libraryItems = view === "saved" ? saved : recent;
  const dailyChallenge = useMemo(() => getDailyChallenge(), []);
  const inferredCategory = useMemo(() => inferCategoryFromSubject(query), [query]);
  const searchCategory = useMemo(() => resolveSearchCategory(query, category), [category, query]);
  const categoryNote =
    searchCategory && searchCategory !== category ? `Matched to ${searchCategory}; using that for better results.` : `Searching ${searchCategory ?? category}.`;
  const hasPromptState = Boolean(query.trim() || current || results.length || challenge);
  const primaryActionLabel = current ? "Another Reference" : query.trim() ? "Generate Reference" : "Try Daily Drawing";
  const actionHelp = useMemo(() => {
    if (current) {
      return `Find another ${searchCategory ?? category} reference using the current filters.`;
    }

    if (!query.trim()) {
      return `Start today's ${dailyChallenge.category} challenge: ${dailyChallenge.subject}.`;
    }

    if (searchCategory && searchCategory !== category) {
      return `This search will use ${searchCategory}, because it matches the subject better than ${category}.`;
    }

    return `Search ${searchCategory ?? category} references at ${difficulty.toLowerCase()} difficulty.`;
  }, [category, current, dailyChallenge.category, dailyChallenge.subject, difficulty, query, searchCategory]);

  useEffect(() => {
    const preferences = getPreferences();
    setDifficulty(preferences.difficulty);
    setQuery(preferences.lastQuery);
    setCategory(preferences.lastCategory ?? "Objects");
    setSketchStyle(preferences.sketchStyle);
    setSaved(getSavedReferences());
    setRecent(getRecentReferences());
  }, []);

  useEffect(() => {
    savePreferences({
      difficulty,
      sketchStyle,
      lastQuery: query,
      lastCategory: category
    });
  }, [category, difficulty, query, sketchStyle]);

  useEffect(() => {
    if (!current || trackedDownloads.current.has(current.id)) {
      return;
    }

    trackedDownloads.current.add(current.id);
    setRecent(addRecentReference(current));

    void fetch("/api/references/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ downloadLocation: current.downloadLocation })
    });
  }, [current]);

  async function search(nextQuery = query, nextCategory = category, nextDifficulty = difficulty, shuffle = false) {
    const resolvedCategory = resolveSearchCategory(nextQuery, nextCategory);
    const page = shuffle ? Math.max(1, Math.ceil(Math.random() * 4)) : 1;
    const params = new URLSearchParams({
      q: nextQuery,
      category: resolvedCategory ?? nextCategory,
      difficulty: nextDifficulty,
      page: String(page)
    });
    const matchedNote = resolvedCategory && resolvedCategory !== nextCategory ? ` Matched category: ${resolvedCategory}.` : "";

    if (shuffle) {
      avoidedIds.forEach((id) => params.append("exclude", id));
    }

    setIsLoading(true);
    setView("discover");
    setEmptySuggestions([]);
    setMessage(shuffle ? "Finding another angle..." : "Looking for drawing references...");

    try {
      const response = await fetch(`/api/references/search?${params.toString()}`);
      const body = (await response.json()) as SearchResponse & { error?: string };

      if (!response.ok) {
        throw new Error(body.error ?? "Reference search failed.");
      }

      setResults(body.results);
      if (body.results[0]) {
        setCurrent(body.results[0]);
        setMessage(body.warning ?? `Showing references for "${nextQuery || resolvedCategory || nextCategory}".${matchedNote}`);
      } else {
        setCurrent(null);
        setEmptySuggestions(getSaferPromptSuggestions(nextQuery, resolvedCategory ?? nextCategory));
        setMessage(body.warning ?? `No references found. Try a simpler subject or another category.${matchedNote}`);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Something went wrong while searching.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void search();
  }

  function toggleSave(reference: ReferenceImage) {
    const next = currentSaved ? removeSavedReference(reference) : saveReference(reference);
    setSaved(next);
  }

  function chooseReference(reference: ReferenceImage) {
    setCurrent(reference);
    setView("discover");
    setMessage(`Ready: ${reference.alt}`);
  }

  function surpriseMe() {
    const nextChallenge = createRandomChallenge();
    setChallenge(nextChallenge);
    setQuery(nextChallenge.subject);
    setCategory(nextChallenge.category);
    setDifficulty(nextChallenge.difficulty);
    setEmptySuggestions([]);
    void search(nextChallenge.subject, nextChallenge.category, nextChallenge.difficulty);
  }

  function applySubject(subject: string, nextCategory: Category, nextDifficulty = difficulty, shouldSearch = false) {
    setQuery(subject);
    setCategory(nextCategory);
    setDifficulty(nextDifficulty);
    setEmptySuggestions([]);

    if (shouldSearch) {
      void search(subject, nextCategory, nextDifficulty);
    }
  }

  function clearPrompt() {
    setQuery("");
    setChallenge(null);
    setCurrent(null);
    setResults([]);
    setEmptySuggestions([]);
    setMessage("Choose a subject and pull a reference into view.");
    resetImage();
  }

  function handlePrimaryAction() {
    if (!current && !query.trim()) {
      applySubject(dailyChallenge.subject, dailyChallenge.category, dailyChallenge.difficulty, true);
      return;
    }

    void search(query, category, difficulty, Boolean(current));
  }

  function resetImage() {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (zoom <= 1) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    setDragStart({
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      offsetX: offset.x,
      offsetY: offset.y
    });
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!dragStart || dragStart.pointerId !== event.pointerId) {
      return;
    }

    setOffset({
      x: dragStart.offsetX + event.clientX - dragStart.x,
      y: dragStart.offsetY + event.clientY - dragStart.y
    });
  }

  function onPointerUp() {
    setDragStart(null);
  }

  return (
    <main className={focusMode ? "fixed inset-0 z-50 bg-ink p-2 text-paper sm:p-3" : "min-h-screen px-3 py-2 text-ink sm:px-5 sm:py-3"}>
      <form
        onSubmit={handleSubmit}
        className={`sketch-board mx-auto flex min-h-[calc(100vh-1rem)] w-full max-w-7xl flex-col px-4 py-4 sm:min-h-[calc(100vh-1.5rem)] sm:px-8 ${
          focusMode ? "h-full border-paper/80 bg-[#1f1d19] text-paper" : ""
        }`}
      >
        <BoardHeader focusMode={focusMode} view={view} setView={setView} />

        {!focusMode && (
          <TopFilters
            query={query}
            category={category}
            difficulty={difficulty}
            sketchStyle={sketchStyle}
            setQuery={setQuery}
            setCategory={setCategory}
            setDifficulty={setDifficulty}
            setSketchStyle={setSketchStyle}
            inferredCategory={inferredCategory}
            categoryNote={categoryNote}
            sketchStyleHint={sketchStyleHints[sketchStyle]}
          />
        )}

        <section className="mt-4 min-h-0 flex-1">
          {view === "discover" ? (
            <ReferenceComparison
              current={current}
              sketchStyle={sketchStyle}
              focusMode={focusMode}
              isLoading={isLoading}
              message={message}
              zoom={zoom}
              offset={offset}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
            />
          ) : (
            <LibraryView
              title={view === "saved" ? "Saved references" : "Recent references"}
              items={libraryItems}
              onChoose={chooseReference}
              onRemove={view === "saved" ? (reference) => setSaved(removeSavedReference(reference)) : undefined}
            />
          )}
        </section>

        {!focusMode && (
          <PromptSuggestions
            query={query}
            applySubject={applySubject}
            clearPrompt={clearPrompt}
            challenge={challenge}
            dailyChallenge={dailyChallenge}
            emptySuggestions={emptySuggestions}
            hasPromptState={hasPromptState}
          />
        )}

        <BoardActions
          current={current}
          currentSaved={currentSaved}
          focusMode={focusMode}
          isLoading={isLoading}
          zoom={zoom}
          message={message}
          primaryActionLabel={primaryActionLabel}
          actionHelp={actionHelp}
          onPrimary={handlePrimaryAction}
          onSurprise={surpriseMe}
          onSave={() => current && toggleSave(current)}
          onZoomIn={() => setZoom((value) => Math.min(3, Number((value + 0.25).toFixed(2))))}
          onZoomOut={() => setZoom((value) => Math.max(1, Number((value - 0.25).toFixed(2))))}
          onReset={resetImage}
          onToggleFocus={() => setFocusMode((value) => !value)}
        />
      </form>
    </main>
  );
}

function BoardHeader({ focusMode, view, setView }: { focusMode: boolean; view: View; setView: (view: View) => void }) {
  return (
    <header className="relative flex min-h-10 items-start justify-center">
      <h1 className={`font-display text-3xl leading-none sm:text-4xl ${focusMode ? "text-paper" : "text-ink"}`}>Draw This</h1>
      {!focusMode && (
        <nav className="absolute right-0 top-0 hidden rounded-full border border-ink/15 bg-paper/70 p-1 font-mono text-[11px] uppercase sm:flex">
          {(["discover", "saved", "recent"] as View[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setView(item)}
              title={`Show ${item} references`}
              className={`min-h-9 rounded-full px-3 transition ${view === item ? "bg-ink text-paper" : "text-graphite hover:bg-wash"}`}
            >
              {item}
            </button>
          ))}
        </nav>
      )}
    </header>
  );
}

function TopFilters({
  query,
  category,
  difficulty,
  sketchStyle,
  setQuery,
  setCategory,
  setDifficulty,
  setSketchStyle,
  inferredCategory,
  categoryNote,
  sketchStyleHint
}: {
  query: string;
  category: Category;
  difficulty: Difficulty;
  sketchStyle: SketchStyle;
  setQuery: (query: string) => void;
  setCategory: (category: Category) => void;
  setDifficulty: (difficulty: Difficulty) => void;
  setSketchStyle: (style: SketchStyle) => void;
  inferredCategory?: Category;
  categoryNote: string;
  sketchStyleHint: string;
}) {
  return (
    <section className="mx-auto mt-2 grid w-full max-w-4xl gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Filters">
      <label className="group relative">
        <span className="mb-1 block font-mono text-[11px] uppercase text-graphite">Subject</span>
        <input
          aria-label="Subject"
          aria-describedby="tooltip-subject-control"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Old Cape Town shop"
          title="Describe what you want to draw"
          className="sketch-line min-h-12 w-full rounded-xl bg-paper px-3 text-sm outline-none transition focus:border-clay"
        />
        <Tooltip id="tooltip-subject-control">Describe what you want to draw</Tooltip>
      </label>

      <FilterSelect label="Category" tooltip="Guides the search when the subject is broad" value={category} onChange={(value) => setCategory(value as Category)}>
        {categories.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </FilterSelect>

      <FilterSelect label="Difficulty" tooltip="Adds soft query hints for simpler or more complex references" value={difficulty} onChange={(value) => setDifficulty(value as Difficulty)}>
        {difficulties.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </FilterSelect>

      <FilterSelect label="Sketch Style" tooltip="Changes only the local preview filter on the right panel" value={sketchStyle} onChange={(value) => setSketchStyle(value as SketchStyle)}>
        {sketchStyles.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </FilterSelect>

      <div className="font-mono text-[10px] uppercase text-graphite sm:col-span-2 lg:col-span-4">
        <span className={inferredCategory && inferredCategory !== category ? "text-clay" : ""}>{categoryNote}</span>
        <span className="ml-2 normal-case text-graphite/80">{sketchStyleHint}</span>
      </div>
    </section>
  );
}

function FilterSelect({
  label,
  tooltip,
  value,
  children,
  onChange
}: {
  label: string;
  tooltip: string;
  value: string;
  children: React.ReactNode;
  onChange: (value: string) => void;
}) {
  const id = tooltipId(`${label} control`);

  return (
    <label className="group relative">
      <span className="mb-1 block font-mono text-[11px] uppercase text-graphite">{label}</span>
      <select
        aria-label={label}
        aria-describedby={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        title={tooltip}
        className="sketch-line min-h-12 w-full rounded-xl bg-paper px-3 text-sm outline-none transition focus:border-clay"
      >
        {children}
      </select>
      <Tooltip id={id}>{tooltip}</Tooltip>
    </label>
  );
}

function ReferenceComparison({
  current,
  sketchStyle,
  focusMode,
  isLoading,
  message,
  zoom,
  offset,
  onPointerDown,
  onPointerMove,
  onPointerUp
}: {
  current: ReferenceImage | null;
  sketchStyle: SketchStyle;
  focusMode: boolean;
  isLoading: boolean;
  message: string;
  zoom: number;
  offset: { x: number; y: number };
  onPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerUp: () => void;
}) {
  return (
    <div className="grid h-full min-h-[330px] gap-4 lg:grid-cols-2">
      <ImagePanel
        title="Original reference"
        current={current}
        message={message}
        isLoading={isLoading}
        focusMode={focusMode}
        zoom={zoom}
        offset={offset}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      />
      <ImagePanel
        title="Sketch concept preview"
        current={current}
        message={message}
        isLoading={isLoading}
        focusMode={focusMode}
        zoom={zoom}
        offset={offset}
        filterClass={sketchFilterClass[sketchStyle]}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        note="Preview filter, not AI generated"
      />
    </div>
  );
}

function ImagePanel({
  title,
  current,
  message,
  isLoading,
  focusMode,
  zoom,
  offset,
  filterClass,
  note,
  onPointerDown,
  onPointerMove,
  onPointerUp
}: {
  title: string;
  current: ReferenceImage | null;
  message: string;
  isLoading: boolean;
  focusMode: boolean;
  zoom: number;
  offset: { x: number; y: number };
  filterClass?: string;
  note?: string;
  onPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerUp: () => void;
}) {
  return (
    <article
      className={`flex min-h-[300px] flex-col ${focusMode ? "text-paper" : "text-ink"}`}
    >
      <div
      className={`sketch-panel relative min-h-[270px] flex-1 overflow-hidden ${focusMode ? "border-paper/70 bg-paper text-ink" : "text-ink"}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {current ? (
        <div
          className="absolute inset-5 touch-none transition-transform duration-150"
          style={{
            transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${zoom})`
          }}
        >
          <Image
            src={current.urls.regular}
            alt={filterClass ? `Sketch concept of ${current.alt}` : current.alt}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            className={`object-contain ${filterClass ?? ""}`}
            style={{ backgroundColor: filterClass ? "transparent" : current.color ?? "#f7f1e6" }}
          />
        </div>
      ) : (
        <div className="grid h-full place-items-center px-6 text-center">
          <div>
            <p className="max-w-sm text-sm leading-6 text-graphite">{message}</p>
          </div>
        </div>
      )}
      {isLoading && <div className="absolute inset-0 grid place-items-center bg-paper/75 font-mono text-xs uppercase text-ink">Loading reference</div>}
      </div>
      <figcaption className={`mt-2 text-center font-display text-2xl ${focusMode ? "text-paper" : "text-ink"}`}>{title}</figcaption>
      {note && <p className={`text-center font-mono text-[10px] uppercase ${focusMode ? "text-paper/60" : "text-graphite"}`}>{note}</p>}
    </article>
  );
}

function PromptSuggestions({
  query,
  applySubject,
  clearPrompt,
  challenge,
  dailyChallenge,
  emptySuggestions,
  hasPromptState
}: {
  query: string;
  applySubject: (subject: string, category: Category, difficulty?: Difficulty, shouldSearch?: boolean) => void;
  clearPrompt: () => void;
  challenge: DrawingChallenge | null;
  dailyChallenge: DrawingChallenge;
  emptySuggestions: Array<{ subject: string; category: Category; difficulty: Difficulty }>;
  hasPromptState: boolean;
}) {
  return (
    <section className="mt-3 space-y-2" aria-label="Practice prompts">
      <div className="mx-auto grid max-w-4xl gap-2 rounded-2xl border border-clay/25 bg-[#ead8ca]/35 px-3 py-2 font-mono text-[11px] uppercase text-graphite sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          <p className="text-[10px] text-graphite/75">Drawing of the day</p>
          <p className="normal-case text-ink">{dailyChallenge.subject}</p>
          <p className="text-[10px] text-graphite">
            {dailyChallenge.category} / {dailyChallenge.difficulty} / {dailyChallenge.durationMinutes} min
          </p>
        </div>
        <button
          type="button"
          onClick={() => applySubject(dailyChallenge.subject, dailyChallenge.category, dailyChallenge.difficulty, true)}
          className="min-h-9 rounded-full border border-clay/40 bg-paper/70 px-3 normal-case text-ink transition hover:border-clay hover:text-clay"
          title="Use today's deterministic drawing challenge"
        >
          Try daily drawing
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 font-mono text-[11px] uppercase text-graphite" aria-label="Quick prompt suggestions">
        <span className="mr-1 text-[10px] text-graphite/75">Quick prompts</span>
      {featuredPrompts.map((prompt) => {
        const id = tooltipId(`Use prompt ${prompt.subject}`);

        return (
          <span key={prompt.subject} className="group relative inline-flex">
            <button
              type="button"
              aria-describedby={id}
              title={`Use "${prompt.subject}" as the subject`}
              onClick={() => applySubject(prompt.subject, prompt.category)}
              className={`min-h-9 rounded-full border px-3 transition ${
                query === prompt.subject ? "border-ink bg-ink text-paper" : "border-ink/15 bg-paper/60 hover:border-clay hover:text-clay"
              }`}
            >
              {prompt.subject}
            </button>
            <Tooltip id={id}>Use this as the subject prompt</Tooltip>
          </span>
        );
      })}
      {hasPromptState && (
        <button
          type="button"
          onClick={clearPrompt}
          className="inline-flex min-h-9 items-center gap-2 rounded-full border border-ink/40 bg-paper px-3 text-ink transition hover:border-clay hover:text-clay"
          title="Clear the current prompt and reference"
        >
          <Trash2 size={13} />
          Clear prompt
        </button>
      )}
      {challenge && (
        <span
          className="inline-flex min-h-9 items-center gap-2 rounded-full border border-clay/30 bg-[#ead8ca]/45 px-3 normal-case text-ink"
          title="Random drawing challenge duration and difficulty"
        >
          <Clock3 size={14} />
          {challenge.description}
        </span>
      )}
      </div>

      {emptySuggestions.length > 0 && (
        <div
          className="flex flex-wrap items-center justify-center gap-2 font-mono text-[11px] uppercase text-graphite"
          aria-label="Safer prompt suggestions"
        >
          <span className="mr-1 text-[10px] text-clay">Try these instead</span>
          {emptySuggestions.map((suggestion) => (
            <button
              key={suggestion.subject}
              type="button"
              onClick={() => applySubject(suggestion.subject, suggestion.category, suggestion.difficulty, true)}
              className="min-h-9 rounded-full border border-clay/30 bg-[#ead8ca]/45 px-3 transition hover:border-clay hover:text-clay"
              title={`Search a safer ${suggestion.category} prompt`}
            >
              {suggestion.subject}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function BoardActions({
  current,
  currentSaved,
  focusMode,
  isLoading,
  zoom,
  message,
  primaryActionLabel,
  actionHelp,
  onPrimary,
  onSurprise,
  onSave,
  onZoomIn,
  onZoomOut,
  onReset,
  onToggleFocus
}: {
  current: ReferenceImage | null;
  currentSaved: boolean;
  focusMode: boolean;
  isLoading: boolean;
  zoom: number;
  message: string;
  primaryActionLabel: string;
  actionHelp: string;
  onPrimary: () => void;
  onSurprise: () => void;
  onSave: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onToggleFocus: () => void;
}) {
  return (
    <footer className="mt-3 grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
      <p className={`min-w-0 text-center text-xs leading-5 md:text-left ${focusMode ? "text-paper/70" : "text-graphite"}`}>
        {message}
        {current && (
          <>
            {" "}
            <a href={current.attributionUrl} target="_blank" rel="noreferrer" className="underline decoration-ink/25 underline-offset-4 hover:text-clay">
              Photo by {current.photographer.name}
            </a>
          </>
        )}
      </p>

      <button
        type="submit"
        disabled={isLoading}
        title={actionHelp}
        onClick={(event) => {
          event.preventDefault();
          onPrimary();
        }}
        className="sketch-line min-h-12 min-w-[270px] rounded-xl bg-paper px-8 font-display text-2xl text-ink transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45"
      >
        {primaryActionLabel}
      </button>

      <div className="flex flex-wrap justify-center gap-2 md:justify-end">
        {!focusMode && (
          <>
            <IconButton label="Surprise Me" tooltip="Pick a random subject, difficulty, and duration" onClick={onSurprise} disabled={isLoading}>
              <Sparkles size={17} />
            </IconButton>
            <IconButton label="Zoom in" tooltip="Make both image panels larger" onClick={onZoomIn} disabled={!current}>
              <ZoomIn size={17} />
            </IconButton>
            <IconButton label="Zoom out" tooltip="Reduce the current zoom level" onClick={onZoomOut} disabled={!current || zoom <= 1}>
              <ZoomOut size={17} />
            </IconButton>
          </>
        )}
        <IconButton label={focusMode ? "Reset view" : "Reset image"} tooltip="Reset zoom and pan" onClick={onReset} disabled={!current} showText={focusMode}>
          <RotateCcw size={17} />
        </IconButton>
        <IconButton
          label={currentSaved ? "Remove saved reference" : "Save reference"}
          tooltip={currentSaved ? "Remove this reference from saved" : "Save this reference locally"}
          onClick={onSave}
          disabled={!current}
          showText={focusMode}
        >
          {currentSaved ? <BookmarkCheck size={17} /> : <Bookmark size={17} />}
        </IconButton>
        <IconButton
          label={focusMode ? "Exit focus mode" : "Enter focus mode"}
          tooltip={focusMode ? "Return to the full interface" : "Hide filters and focus on the reference"}
          onClick={onToggleFocus}
          disabled={!current}
          showText={focusMode}
        >
          {focusMode ? <Minimize2 size={17} /> : <Focus size={17} />}
        </IconButton>
      </div>
      {!focusMode && <p className="text-center font-mono text-[10px] uppercase leading-4 text-graphite md:col-start-2">{actionHelp}</p>}
    </footer>
  );
}

function IconButton({
  label,
  tooltip,
  children,
  disabled,
  showText = false,
  onClick
}: {
  label: string;
  tooltip: string;
  children: React.ReactNode;
  disabled?: boolean;
  showText?: boolean;
  onClick: () => void;
}) {
  const id = tooltipId(label);

  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        title={`${label}: ${tooltip}`}
        aria-label={label}
        aria-describedby={id}
        disabled={disabled}
        onClick={onClick}
        className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg border border-ink/20 bg-paper/80 px-3 text-ink transition hover:border-clay hover:text-clay focus:outline-none focus:ring-2 focus:ring-clay/30 disabled:cursor-not-allowed disabled:opacity-35"
      >
        {children}
        {showText && <span className="font-mono text-[11px] uppercase">{label.replace(" focus mode", "")}</span>}
      </button>
      <Tooltip id={id}>{tooltip}</Tooltip>
    </span>
  );
}

function Tooltip({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <span
      id={id}
      role="tooltip"
      className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-max max-w-48 -translate-x-1/2 rounded-md border border-ink/15 bg-ink px-2 py-1 text-center font-mono text-[10px] normal-case leading-4 text-paper opacity-0 shadow-lg transition group-hover:opacity-100 group-focus-within:opacity-100"
    >
      {children}
    </span>
  );
}

function LibraryView({
  title,
  items,
  onChoose,
  onRemove
}: {
  title: string;
  items: ReferenceImage[];
  onChoose: (reference: ReferenceImage) => void;
  onRemove?: (reference: ReferenceImage) => void;
}) {
  return (
    <section className="sketch-panel h-full min-h-[440px] overflow-auto p-4 text-ink">
      <div className="mb-4 flex items-center justify-between gap-3 border-b border-ink/15 pb-3">
        <h2 className="font-display text-3xl">{title}</h2>
        <span className="font-mono text-[11px] uppercase text-graphite">{items.length} references</span>
      </div>
      {items.length ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <article key={`${item.provider}:${item.providerId}`} className="overflow-hidden rounded-xl border border-ink/20 bg-paper/75">
              <button type="button" onClick={() => onChoose(item)} className="relative block aspect-[4/3] w-full overflow-hidden bg-wash text-left">
                <Image src={item.urls.small} alt={item.alt} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover transition duration-300 hover:scale-105" />
              </button>
              <div className="space-y-2 p-3">
                <p className="line-clamp-2 text-sm font-medium">{item.sourceQuery || item.alt}</p>
                <p className="font-mono text-[11px] uppercase text-graphite">
                  {item.category ?? "Reference"} / {item.difficulty}
                </p>
                <div className="flex items-center justify-between gap-2">
                  <a href={item.attributionUrl} target="_blank" rel="noreferrer" className="text-xs text-clay underline underline-offset-4">
                    {item.photographer.name}
                  </a>
                  {onRemove && (
                    <button
                      type="button"
                      onClick={() => onRemove(item)}
                      aria-label="Remove saved reference"
                      title="Remove saved reference"
                      className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-md border border-ink/15 text-graphite hover:border-clay hover:text-clay"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="grid min-h-[320px] place-items-center text-center text-graphite">
          <div>
            <Save className="mx-auto mb-3 text-clay" size={28} />
            <p>No references here yet.</p>
          </div>
        </div>
      )}
    </section>
  );
}
