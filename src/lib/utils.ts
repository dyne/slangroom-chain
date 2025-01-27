// SPDX-FileCopyrightText: 2021-2025 Dyne.org foundation
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import fs from 'fs/promises';

import { execaCommand } from 'execa';

export const readFromFile = async (path: string): Promise<string> => {
  const data = await fs.readFile(path, 'utf-8');
  return data;
};

export const execShellCommand = async (command: string): Promise<void> => {
  await execaCommand(command);
};

export const execJsFun = async (
  stringFn: string,
  args: Record<string, string>,
): Promise<string> => {
  /* c8 ignore next */
  const AsyncFunction = async function () {}.constructor;
  const fn = AsyncFunction(...Object.keys(args), stringFn);
  try {
    return await fn(...Object.values(args));
  } catch (e) {
    throw new Error(`Error executing JS function:\n${stringFn}\n${e}`);
  }
};
