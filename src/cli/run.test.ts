import { describe, it, expect } from "vitest";
import { run, type CliIO } from "./run.js";

/** Build a fake IO with an in-memory filesystem and captured streams. */
function makeIO(files: Record<string, string> = {}, stdin = ""): CliIO & {
  out: string;
  err: string;
  written: Record<string, string>;
} {
  const state = {
    out: "",
    err: "",
    written: {} as Record<string, string>,
  };
  const io: CliIO = {
    version: "1.2.3",
    stdout: (s) => {
      state.out += s;
    },
    stderr: (s) => {
      state.err += s;
    },
    readFile: async (p) => {
      const f = { ...files, ...state.written }[p];
      if (f === undefined) throw new Error(`ENOENT: ${p}`);
      return f;
    },
    writeFile: async (p, data) => {
      state.written[p] = data;
    },
    readStdin: async () => stdin,
  };
  return Object.defineProperties(io, {
    out: { get: () => state.out },
    err: { get: () => state.err },
    written: { get: () => state.written },
  }) as CliIO & { out: string; err: string; written: Record<string, string> };
}

const DECK = "---\nmarp: true\n---\n\n# T\n\n---\n\n## Purpose\n\nA\n";

describe("run: agenda", () => {
  it("reads a file and writes the built deck to stdout by default", async () => {
    const io = makeIO({ "slide.md": DECK });
    const code = await run(["agenda", "slide.md"], io);
    expect(code).toBe(0);
    expect(io.out).toMatch(/<!-- agenda-auto -->/);
    expect(Object.keys(io.written)).toHaveLength(0);
  });

  it("writes to a file with -o and reports to stderr", async () => {
    const io = makeIO({ "slide.md": DECK });
    const code = await run(["agenda", "slide.md", "-o", "dist/slide.md"], io);
    expect(code).toBe(0);
    expect(io.written["dist/slide.md"]).toMatch(/<!-- agenda-auto -->/);
    expect(io.err).toMatch(/dist\/slide\.md/);
    expect(io.out).toBe("");
  });

  it("reads stdin when input is '-'", async () => {
    const io = makeIO({}, DECK);
    const code = await run(["agenda", "-"], io);
    expect(code).toBe(0);
    expect(io.out).toMatch(/<!-- agenda-auto -->/);
  });

  it("honors --heading-level, --title and --class", async () => {
    const io = makeIO({ "s.md": "# T\n\n---\n\n### Deep\n\nx\n" });
    const code = await run(
      ["agenda", "s.md", "--heading-level", "3", "--title", "目次", "--class", "toc"],
      io,
    );
    expect(code).toBe(0);
    expect(io.out).toMatch(/# 目次/);
    expect(io.out).toMatch(/<!-- _class: toc -->/);
    expect(io.out).toMatch(/<li class="is-active">Deep<\/li>/);
  });

  it("--check exits 0 when the target is already up to date", async () => {
    const built = (await import("../core/agenda.js")).buildDeck(DECK);
    const io = makeIO({ "slide.md": DECK, "dist/slide.md": built });
    const code = await run(["agenda", "slide.md", "-o", "dist/slide.md", "--check"], io);
    expect(code).toBe(0);
    expect(Object.keys(io.written)).toHaveLength(0);
  });

  it("--check exits 1 and writes nothing when the target is stale", async () => {
    const io = makeIO({ "slide.md": DECK, "dist/slide.md": "STALE" });
    const code = await run(["agenda", "slide.md", "-o", "dist/slide.md", "--check"], io);
    expect(code).toBe(1);
    expect(Object.keys(io.written)).toHaveLength(0);
    expect(io.err).toMatch(/check/i);
  });

  it("errors when the input file is missing", async () => {
    const io = makeIO();
    const code = await run(["agenda", "nope.md"], io);
    expect(code).toBe(1);
    expect(io.err).toMatch(/nope\.md/);
  });

  it("errors when no input is given", async () => {
    const io = makeIO();
    const code = await run(["agenda"], io);
    expect(code).toBe(1);
    expect(io.err).toMatch(/input/i);
  });
});

describe("run: meta", () => {
  it("--version prints the version", async () => {
    const io = makeIO();
    const code = await run(["--version"], io);
    expect(code).toBe(0);
    expect(io.out).toMatch(/1\.2\.3/);
  });

  it("--help prints usage including the agenda command", async () => {
    const io = makeIO();
    const code = await run(["--help"], io);
    expect(code).toBe(0);
    expect(io.out).toMatch(/agenda/);
    expect(io.out).toMatch(/Usage/i);
  });

  it("with no arguments prints help and exits non-zero", async () => {
    const io = makeIO();
    const code = await run([], io);
    expect(code).toBe(1);
    expect(io.err).toMatch(/Usage/i);
  });

  it("errors on an unknown command", async () => {
    const io = makeIO();
    const code = await run(["frobnicate"], io);
    expect(code).toBe(1);
    expect(io.err).toMatch(/frobnicate/);
  });
});