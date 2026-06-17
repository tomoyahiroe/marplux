// Core transform for the `agenda` command.
//
// Takes an author's plain Marp Markdown and (eventually) returns a deck with
// "agenda recap" slides inserted before each heading section. This module is
// pure (no file I/O) so it is fully unit-testable; file access lives in the
// CLI layer.
//
// Built incrementally, one function at a time, under strict TDD.

/** Marker comments used to identify generated / opt-out slides. */
export interface AgendaMarkers {
  /** Marks an auto-generated per-section recap slide (removed on rebuild). */
  auto: string;
  /** Author opt-out: a slide carrying this is excluded from the agenda. */
  skip: string;
  /** Placeholder slide expanded into a full, un-emphasised agenda list. */
  overview: string;
}

export interface AgendaOptions {
  /** Heading level that defines an agenda item (e.g. 2 for `##`). Default: 2. */
  headingLevel?: number;
  /** Title rendered at the top of each recap slide. Default: "Agenda". */
  title?: string;
  /** CSS class applied to the recap slide and its `<ol>`. Default: "agenda". */
  className?: string;
  /** Override the marker comments. */
  markers?: Partial<AgendaMarkers>;
}

interface ResolvedOptions {
  headingLevel: number;
  title: string;
  className: string;
  markers: AgendaMarkers;
}

const DEFAULT_MARKERS: AgendaMarkers = {
  auto: "<!-- agenda-auto -->",
  skip: "<!-- agenda-skip -->",
  overview: "<!-- agenda-overview -->",
};

function resolveOptions(options: AgendaOptions = {}): ResolvedOptions {
  const headingLevel = options.headingLevel ?? 2;
  if (!Number.isInteger(headingLevel) || headingLevel < 1 || headingLevel > 6) {
    throw new Error(`headingLevel must be an integer between 1 and 6, got ${headingLevel}`);
  }
  return {
    headingLevel,
    title: options.title ?? "Agenda",
    className: options.className ?? "agenda",
    markers: { ...DEFAULT_MARKERS, ...options.markers },
  };
}

/** Build a regex matching a heading line at the given level (first match). */
function headingPattern(level: number): RegExp {
  return new RegExp(`^#{${level}}[ \\t]+(.+?)[ \\t]*$`, "m");
}

/** Matches a standalone slide separator line (`---`, optional trailing space). */
const SLIDE_SEPARATOR = /^---[ \t]*$/;

export interface Frontmatter {
  frontmatter: string | null;
  body: string;
}

/**
 * Split a leading `---` block as YAML frontmatter.
 *
 * If the first line is `---`, the next `---` line closes the block; everything
 * between is the frontmatter and everything after is the body. When there is no
 * frontmatter, returns `{ frontmatter: null, body: <input unchanged> }`.
 */
export function splitFrontmatter(input: string): Frontmatter {
  const lines = input.split("\n");
  if (lines[0]?.trim() !== "---") {
    return { frontmatter: null, body: input };
  }
  for (let i = 1; i < lines.length; i++) {
    if (lines[i]?.trim() === "---") {
      const frontmatter = lines.slice(1, i).join("\n");
      const body = lines.slice(i + 1).join("\n");
      return { frontmatter, body };
    }
  }
  // Opening `---` with no closing fence: treat as no frontmatter.
  return { frontmatter: null, body: input };
}

/**
 * Split the body into slides on standalone `---` lines. Surrounding blank
 * lines of each slide are trimmed.
 */
export function splitSlides(body: string): string[] {
  const lines = body.split("\n");
  const slides: string[] = [];
  let current: string[] = [];
  for (const line of lines) {
    if (SLIDE_SEPARATOR.test(line)) {
      slides.push(current.join("\n").trim());
      current = [];
    } else {
      current.push(line);
    }
  }
  slides.push(current.join("\n").trim());
  return slides;
}

export interface Section {
  title: string;
  /** Index of the slide (within the passed array) that owns this heading. */
  index: number;
}

/**
 * Collect heading sections from the slide array, in order. Slides carrying the
 * skip marker, or already auto-generated recap slides, are excluded. Only the
 * first heading at the configured level is taken from each slide.
 */
export function collectSections(slides: string[], options: AgendaOptions = {}): Section[] {
  const { headingLevel, markers } = resolveOptions(options);
  const heading = headingPattern(headingLevel);
  const sections: Section[] = [];
  slides.forEach((slide, index) => {
    if (slide.includes(markers.auto)) return;
    if (slide.includes(markers.skip)) return;
    const m = slide.match(heading);
    if (m?.[1]) sections.push({ title: m[1].trim(), index });
  });
  return sections;
}