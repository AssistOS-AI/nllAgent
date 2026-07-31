#!/usr/bin/env node

import { runNativeTool } from '../src/tooling/native-tools.mjs';

process.exitCode = await runNativeTool(process.argv.slice(2), {
  cwd: process.cwd(),
  stdout: process.stdout,
  stderr: process.stderr
});
