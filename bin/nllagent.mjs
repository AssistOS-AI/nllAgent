#!/usr/bin/env node

import { runCli } from '../src/cli/main.mjs';

const exitCode = await runCli(process.argv.slice(2), {
  stdout: process.stdout,
  stderr: process.stderr,
  env: process.env,
  cwd: process.cwd()
});

process.exitCode = exitCode;
