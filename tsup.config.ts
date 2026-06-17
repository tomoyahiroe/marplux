import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    cli: "src/cli.ts",
  },
  format: ["esm"],
  target: "node18",
  dts: true,
  clean: true,
  // The shebang at the top of src/cli.ts is preserved by tsup, so the
  // published `dist/cli.js` is directly executable as the `marplux` bin.
});