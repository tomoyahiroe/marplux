// Testable CLI core: pure argument handling with all I/O injected via `CliIO`,
// so behaviour can be unit-tested without touching the real filesystem,
// process streams, or exit codes. The thin executable entry (src/cli.ts) wires
// the real implementations and maps the returned number to process.exitCode.

import { parseArgs } from "node:util";
import { buildDeck, type AgendaOptions } from "../core/agenda.js";

/** Side-effecting dependencies, injected so they can be faked in tests. */
export interface CliIO {
  /** Package version, shown by --version. */
  version: string;
  stdout: (s: string) => void;
  stderr: (s: string) => void;
  readFile: (path: string) => string | Promise<string>;
  writeFile: (path: string, data: string) => void | Promise<void>;
  readStdin: () => Promise<string>;
}

const USAGE = `marplux — augment Marp decks

Usage:
  marplux agenda <input.md> [options]
  marplux [--help | --version]

Arguments:
  <input.md>            Source Markdown, or '-' to read from stdin.

Options:
  -o, --output <file>  Write to <file> instead of stdout.
      --check          Exit non-zero if <file> is not already up to date
                       (does not write). Useful in CI.
      --heading-level <n>  Heading level that defines an agenda item (default: 2).
      --title <text>   Title shown on each recap slide (default: Agenda).
      --class <name>   CSS class for the recap slide and list (default: agenda).
  -h, --help           Show this help.
  -v, --version        Show the version.

Markers (write inside a slide):
  <!-- agenda-skip -->      Exclude that section from the agenda.
  <!-- agenda-overview -->  Expand into a full, un-emphasised agenda list.
`;

/**
 * Run the CLI. Returns the intended process exit code (0 = success).
 * Never throws for user-facing errors; it reports them via io.stderr.
 */
export async function run(argv: string[], io: CliIO): Promise<number> {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        output: { type: "string", short: "o" },
        check: { type: "boolean" },
        "heading-level": { type: "string" },
        title: { type: "string" },
        class: { type: "string" },
        help: { type: "boolean", short: "h" },
        version: { type: "boolean", short: "v" },
      },
    });
  } catch (err) {
    io.stderr(`${(err as Error).message}\n`);
    return 1;
  }

  const { values, positionals } = parsed;

  if (values.version) {
    io.stdout(`${io.version}\n`);
    return 0;
  }
  if (values.help) {
    io.stdout(USAGE);
    return 0;
  }

  const command = positionals[0];
  if (command === undefined) {
    io.stderr(USAGE);
    return 1;
  }
  if (command !== "agenda") {
    io.stderr(`Unknown command: ${command}\n\n${USAGE}`);
    return 1;
  }

  return runAgenda(values, positionals.slice(1), io);
}

type Values = {
  output?: string | undefined;
  check?: boolean | undefined;
  "heading-level"?: string | undefined;
  title?: string | undefined;
  class?: string | undefined;
};

async function runAgenda(values: Values, rest: string[], io: CliIO): Promise<number> {
  const input = rest[0];
  if (input === undefined) {
    io.stderr("error: missing input file (use '-' to read from stdin)\n");
    return 1;
  }

  const options: AgendaOptions = {};
  if (values["heading-level"] !== undefined) {
    const level = Number(values["heading-level"]);
    if (!Number.isInteger(level) || level < 1 || level > 6) {
      io.stderr(`error: --heading-level must be an integer 1-6, got ${values["heading-level"]}\n`);
      return 1;
    }
    options.headingLevel = level;
  }
  if (values.title !== undefined) options.title = values.title;
  if (values.class !== undefined) options.className = values.class;

  let source: string;
  try {
    source = input === "-" ? await io.readStdin() : await io.readFile(input);
  } catch (err) {
    io.stderr(`error: cannot read ${input}: ${(err as Error).message}\n`);
    return 1;
  }

  let output: string;
  try {
    output = buildDeck(source, options);
  } catch (err) {
    io.stderr(`error: ${(err as Error).message}\n`);
    return 1;
  }

  const target = values.output;

  if (values.check) {
    if (target === undefined) {
      io.stderr("error: --check requires -o/--output to compare against\n");
      return 1;
    }
    let current: string | null = null;
    try {
      current = await io.readFile(target);
    } catch {
      current = null;
    }
    if (current === output) return 0;
    io.stderr(`check failed: ${target} is not up to date (run without --check to write)\n`);
    return 1;
  }

  if (target === undefined) {
    io.stdout(output);
    return 0;
  }

  try {
    await io.writeFile(target, output);
  } catch (err) {
    io.stderr(`error: cannot write ${target}: ${(err as Error).message}\n`);
    return 1;
  }
  io.stderr(`built: ${input} -> ${target}\n`);
  return 0;
}