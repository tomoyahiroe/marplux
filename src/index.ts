// Public programmatic API for marplux.
export {
  buildDeck,
  splitFrontmatter,
  splitSlides,
  collectSections,
} from "./core/agenda.js";
export type {
  AgendaOptions,
  AgendaMarkers,
  Frontmatter,
  Section,
} from "./core/agenda.js";