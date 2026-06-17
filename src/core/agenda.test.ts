import { describe, it, expect } from "vitest";
import { splitFrontmatter, splitSlides } from "./agenda.js";

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
