#!/usr/bin/env node
// Executable entry for the `marplux` bin. Wires real I/O into run() and maps
// the returned exit code to the process. All logic lives in ./cli/run.ts.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { createRequire } from "node:module";
import { run, type CliIO } from "./cli/run.js";

const require = createRequire(import.meta.url);
const { version } = require("../package.json") as { version: string };

const io: CliIO = {
  version,
  stdout: (s) => process.stdout.write(s),
  stderr: (s) => process.stderr.write(s),
  readFile: (path) => readFile(path, "utf8"),
  writeFile: async (path, data) => {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, data, "utf8");
  },
  readStdin: async () => {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
    return Buffer.concat(chunks).toString("utf8");
  },
};

run(process.argv.slice(2), io).then(
  (code) => {
    process.exitCode = code;
  },
  (err) => {
    process.stderr.write(`unexpected error: ${(err as Error).stack ?? err}\n`);
    process.exitCode = 1;
  },
);