import { describe, it, expect } from "vitest";
import { splitFrontmatter, splitSlides, collectSections, buildDeck } from "./agenda.js";

describe("splitFrontmatter", () => {
  it("separates a leading --- block as frontmatter", () => {
    const input = "---\nmarp: true\ntheme: hogehoge\n---\n\n# Title\n";
    const { frontmatter, body } = splitFrontmatter(input);
    expect(frontmatter).toBe("marp: true\ntheme: hogehoge");
    expect(body).toBe("\n# Title\n");
  });

  it("returns null frontmatter and the input untouched when absent", () => {
    const input = "# Title\n\nbody\n";
    const { frontmatter, body } = splitFrontmatter(input);
    expect(frontmatter).toBeNull();
    expect(body).toBe(input);
  });

  it("treats an opening --- with no closing fence as no frontmatter", () => {
    const input = "---\nmarp: true\n# no close";
    const { frontmatter, body } = splitFrontmatter(input);
    expect(frontmatter).toBeNull();
    expect(body).toBe(input);
  });

  it("yields an empty-string frontmatter for an empty block", () => {
    const { frontmatter, body } = splitFrontmatter("---\n---\n# T");
    expect(frontmatter).toBe("");
    expect(body).toBe("# T");
  });

  it("tolerates trailing/leading whitespace on the fence lines", () => {
    const { frontmatter, body } = splitFrontmatter("  ---  \na: 1\n---\nB");
    expect(frontmatter).toBe("a: 1");
    expect(body).toBe("B");
  });

  it("closes on the first --- and keeps any later --- in the body", () => {
    const { frontmatter, body } = splitFrontmatter("---\na: 1\n---\n# T\n---\n## U");
    expect(frontmatter).toBe("a: 1");
    expect(body).toBe("# T\n---\n## U");
  });

  it("does not treat a --- on a non-first line as frontmatter", () => {
    const input = "\n---\na: 1\n---\n";
    const { frontmatter, body } = splitFrontmatter(input);
    expect(frontmatter).toBeNull();
    expect(body).toBe(input);
  });
});

describe("splitSlides", () => {
  it("splits the body on standalone --- lines", () => {
    const body = "# A\n\n---\n\n## B\n\n---\n\nC";
    const slides = splitSlides(body);
    expect(slides).toHaveLength(3);
    expect(slides[0]).toMatch(/# A/);
    expect(slides[1]).toMatch(/## B/);
    expect(slides[2]).toMatch(/C/);
  });

  it("trims surrounding blank lines of each slide", () => {
    expect(splitSlides("\n\n# A\n\n")[0]).toBe("# A");
  });

  it("returns a single slide when there is no separator", () => {
    expect(splitSlides("# only")).toHaveLength(1);
  });

  it("keeps empty slides between consecutive separators", () => {
    expect(splitSlides("# A\n---\n---\n# B")).toEqual(["# A", "", "# B"]);
  });

  it("produces a trailing empty slide for a trailing separator", () => {
    expect(splitSlides("# A\n---\n")).toEqual(["# A", ""]);
  });

  it("accepts a separator with trailing spaces/tabs", () => {
    expect(splitSlides("# A\n--- \t\n# B")).toEqual(["# A", "# B"]);
  });

  it("does not treat four or more dashes as a separator", () => {
    expect(splitSlides("# A\n----\n# B")).toEqual(["# A\n----\n# B"]);
  });

  it("does not treat an indented --- as a separator", () => {
    expect(splitSlides("# A\n  ---\n# B")).toEqual(["# A\n  ---\n# B"]);
  });

  it("returns a single empty slide for empty input", () => {
    expect(splitSlides("")).toEqual([""]);
  });
});

describe("collectSections", () => {
  it("collects level-2 headings in order with their slide index", () => {
    const slides = ["# Title", "## Purpose", "WIP", "## Wrap-up"];
    const sections = collectSections(slides);
    expect(sections.map((s) => s.title)).toEqual(["Purpose", "Wrap-up"]);
    expect(sections.map((s) => s.index)).toEqual([1, 3]);
  });

  it("excludes slides carrying the agenda-skip marker", () => {
    const slides = ["## Purpose", "## Todo\n<!-- agenda-skip -->"];
    expect(collectSections(slides).map((s) => s.title)).toEqual(["Purpose"]);
  });

  it("excludes already auto-generated recap slides", () => {
    const slides = ["<!-- agenda-auto -->\n## Agenda", "## Purpose"];
    expect(collectSections(slides).map((s) => s.title)).toEqual(["Purpose"]);
  });

  it("detects a heading even with leading comments or blank lines", () => {
    const slides = ["<!-- foo -->\n\n## Goal"];
    expect(collectSections(slides).map((s) => s.title)).toEqual(["Goal"]);
  });

  it("takes only the first heading of a slide", () => {
    const slides = ["## First\n\nbody\n\n## Second"];
    expect(collectSections(slides).map((s) => s.title)).toEqual(["First"]);
  });

  it("ignores other heading levels by default (## only)", () => {
    const slides = ["# H1", "### H3", "## H2"];
    expect(collectSections(slides).map((s) => s.title)).toEqual(["H2"]);
  });

  it("honors a custom headingLevel", () => {
    const slides = ["## H2", "### H3a", "### H3b"];
    const titles = collectSections(slides, { headingLevel: 3 }).map((s) => s.title);
    expect(titles).toEqual(["H3a", "H3b"]);
  });

  it("honors custom skip markers", () => {
    const slides = ["## Keep", "## Drop\n<!-- no-agenda -->"];
    const titles = collectSections(slides, { markers: { skip: "<!-- no-agenda -->" } }).map(
      (s) => s.title,
    );
    expect(titles).toEqual(["Keep"]);
  });

  it("rejects an out-of-range headingLevel", () => {
    expect(() => collectSections(["## X"], { headingLevel: 0 })).toThrow(/headingLevel/);
    expect(() => collectSections(["## X"], { headingLevel: 7 })).toThrow(/headingLevel/);
  });
});

const SAMPLE = `---
marp: true
theme: hogehoge
---

# Title

---

## Purpose

body A

---

## Wrap-up

body B

---

## Todo for Me

<!-- agenda-skip -->

note
`;

describe("buildDeck", () => {
  it("inserts a recap slide before each heading (skip excluded)", () => {
    const out = buildDeck(SAMPLE);
    const autoCount = (out.match(/<!-- agenda-auto -->/g) ?? []).length;
    expect(autoCount).toBe(2);
  });

  it("marks the current item is-active and others non-active", () => {
    const out = buildDeck(SAMPLE);
    const firstRecap = out.split("<!-- agenda-auto -->")[1] ?? "";
    expect(firstRecap).toMatch(/<li class="is-active">Purpose<\/li>/);
    expect(firstRecap).toMatch(/<li class="is-upcoming">Wrap-up<\/li>/);
  });

  it("marks passed items is-done", () => {
    const out = buildDeck(SAMPLE);
    const secondRecap = out.split("<!-- agenda-auto -->")[2] ?? "";
    expect(secondRecap).toMatch(/<li class="is-done">Purpose<\/li>/);
    expect(secondRecap).toMatch(/<li class="is-active">Wrap-up<\/li>/);
  });

  it("keeps skip sections out of the agenda list", () => {
    const out = buildDeck(SAMPLE);
    expect(out).not.toMatch(/<li[^>]*>Todo for Me<\/li>/);
  });

  it("renders each recap as a standalone slide with the agenda class", () => {
    const out = buildDeck(SAMPLE);
    expect(out).toMatch(/<!-- _class: agenda -->/);
  });

  it("preserves the frontmatter", () => {
    const out = buildDeck(SAMPLE);
    expect(out).toMatch(/^---\nmarp: true\ntheme: hogehoge\n---/);
  });

  it("expands an overview slide into the full list without emphasis", () => {
    const input = `---
marp: true
---

# T

---

<!-- agenda-overview -->

---

## Purpose

A

---

## Wrap-up

B
`;
    const out = buildDeck(input);
    const overview = (out.split("<!-- agenda-overview -->")[1] ?? "").split("---")[0] ?? "";
    expect(overview).toMatch(/<li>Purpose<\/li>/);
    expect(overview).toMatch(/<li>Wrap-up<\/li>/);
    expect(overview).not.toMatch(/is-active/);
  });

  it("is idempotent: building twice yields the same output", () => {
    const once = buildDeck(SAMPLE);
    const twice = buildDeck(once);
    expect(twice).toBe(once);
  });

  it("is idempotent for overview slides too (no duplicate expansion)", () => {
    const input = "---\nmarp: true\n---\n\n# T\n\n---\n\n<!-- agenda-overview -->\n\n---\n\n## Purpose\n\nA\n";
    const twice = buildDeck(buildDeck(input));
    expect((twice.match(/<!-- agenda-overview -->/g) ?? []).length).toBe(1);
    expect((twice.match(/<li>Purpose<\/li>/g) ?? []).length).toBe(1);
  });

  it("honors a custom title and className", () => {
    const out = buildDeck(SAMPLE, { title: "目次", className: "toc" });
    expect(out).toMatch(/# 目次/);
    expect(out).toMatch(/<!-- _class: toc -->/);
    expect(out).toMatch(/<ol class="toc">/);
  });
});
