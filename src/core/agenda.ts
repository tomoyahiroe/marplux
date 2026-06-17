// Core transform for the `agenda` command.
//
// Takes an author's plain Marp Markdown and (eventually) returns a deck with
// "agenda recap" slides inserted before each heading section. This module is
// pure (no file I/O) so it is fully unit-testable; file access lives in the
// CLI layer.
//
// Built incrementally, one function at a time, under strict TDD.

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