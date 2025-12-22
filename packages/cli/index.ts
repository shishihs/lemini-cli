#!/usr/bin/env node

/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { main } from './src/gemini.js';
import { FatalError, writeToStderr } from '@google/gemini-cli-core';
import { runExitCleanup } from './src/utils/cleanup.js';

// --- Global Entry Point ---

// Suppress the punycode deprecation warning caused by dependencies
// TODO: Remove this once dependencies are updated
const originalEmit = process.emit;
process.emit = function (name: any, data: any, ...args: any[]) {
  if (
    name === 'warning' &&
    typeof data === 'object' &&
    data?.name === 'DeprecationWarning' &&
    data?.message?.includes('The `punycode` module is deprecated')
  ) {
    return false;
  }
  return originalEmit.apply(process, [name, data, ...args]);
} as any;

main().catch(async (error) => {
  await runExitCleanup();

  if (error instanceof FatalError) {
    let errorMessage = error.message;
    if (!process.env['NO_COLOR']) {
      errorMessage = `\x1b[31m${errorMessage}\x1b[0m`;
    }
    writeToStderr(errorMessage + '\n');
    process.exit(error.exitCode);
  }
  writeToStderr('An unexpected critical error occurred:');
  if (error instanceof Error) {
    writeToStderr(error.stack + '\n');
  } else {
    writeToStderr(String(error) + '\n');
  }
  process.exit(1);
});
