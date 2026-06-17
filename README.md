# marplux

A tiny, zero-dependency CLI that augments [Marp](https://marp.app/) decks.
The first command, `agenda`, inserts an **agenda recap slide before each
heading section** — highlighting where you are, dimming what's next, and
checking off what's done.

```sh
npx marplux agenda slide.md -o dist/slide.md
```

No install required. Zero runtime dependencies.

## What it does

Write a normal Marp deck. Every `##` heading becomes an agenda item, and
`marplux agenda` inserts a recap slide just before it:

```markdown
## Purpose         →    <!-- _class: agenda -->
                        # Agenda
                        <ol class="agenda">
                          <li class="is-done">Intro</li>
                          <li class="is-active">Purpose</li>
                          <li class="is-upcoming">Wrap-up</li>
                        </ol>
                        ---
                        ## Purpose
```

The transform is **idempotent**: it strips the slides it generated before
regenerating, so you can run it as many times as you like.

`marplux` only emits markup and the CSS classes `is-done` / `is-active` /
`is-upcoming` — styling is up to your Marp theme.

## Usage

```sh
marplux agenda <input.md> [options]
```

| Option | Description |
| --- | --- |
| `-o, --output <file>` | Write to `<file>` (and create parent dirs) instead of stdout. |
| `--check` | Exit non-zero if `<file>` is not already up to date. Writes nothing. Great for CI. |
| `--heading-level <n>` | Heading level that defines an agenda item (default: `2`). |
| `--title <text>` | Title shown on each recap slide (default: `Agenda`). |
| `--class <name>` | CSS class for the recap slide and its list (default: `agenda`). |
| `-h, --help` | Show help. |
| `-v, --version` | Show the version. |

Read from stdin with `-`:

```sh
cat slide.md | marplux agenda - > dist/slide.md
```

### Markers

Write these HTML comments inside a slide to control behavior:

- `<!-- agenda-skip -->` — exclude that section from the agenda.
- `<!-- agenda-overview -->` — a placeholder slide expanded into the full
  agenda list (no item emphasised).

### Keeping output in sync (CI)

Commit the generated deck and verify it in CI:

```sh
marplux agenda slide.md -o dist/slide.md --check
```

## Programmatic API

```ts
import { buildDeck } from "marplux";

const out = buildDeck(markdown, { headingLevel: 2, title: "Agenda" });
```

## Development

Requires [pnpm](https://pnpm.io/). Node is pinned via [Volta](https://volta.sh/).

```sh
pnpm install
pnpm test          # vitest
pnpm typecheck
pnpm build         # tsup -> dist/
```

Tests are written strictly TDD-first. Releases are managed with
[Changesets](https://github.com/changesets/changesets): add one with
`pnpm changeset`, and merging the generated "Version Packages" PR publishes
to npm.

## License

[MIT](./LICENSE)