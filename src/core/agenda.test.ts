import { describe, it, expect } from "vitest";
import { splitFrontmatter } from "./agenda.js";

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
});
