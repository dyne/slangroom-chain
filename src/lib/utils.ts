// SPDX-FileCopyrightText: 2021-2025 Dyne.org foundation
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import fs from 'fs/promises';

import { execaCommand } from 'execa';

import type { Results, Step } from './types';

// fs
export const readFromFile = async (path: string): Promise<string> => {
  const data = await fs.readFile(path, 'utf-8');
  return data;
};

// data and keys extraction
const getDataOrKeys = async (
  step: Step,
  results: Results,
  dataOrKeys: 'data' | 'keys',
): Promise<string> => {
  const fromFile: keyof Step = `${dataOrKeys}FromFile`;
  const fromStep: keyof Step = `${dataOrKeys}FromStep`;
  if (!step[fromFile] && !step[fromStep] && !step[dataOrKeys]) return '{}';
  let data;
  if (step[fromFile] && typeof step[fromFile] === 'string')
    data = await readFromFile(step[fromFile] as string);
  else if (step[fromStep] && typeof step[fromStep] === 'string')
    data = results[step[fromStep] as string];
  else if (typeof step[dataOrKeys] === 'string') data = step[dataOrKeys];
  else if (typeof step[dataOrKeys] === 'object')
    data = JSON.stringify(step[dataOrKeys]);
  if (!data)
    throw new Error(`No valid ${dataOrKeys} provided for step ${step.id}`);
  return data;
};

export const getDataAndKeys = async (
  step: Step,
  results: Results,
): Promise<{ data: string; keys: string }> => {
  return {
    data: await getDataOrKeys(step, results, 'data'),
    keys: await getDataOrKeys(step, results, 'keys'),
  };
};

// shell command
export const execShellCommand = async (command: string): Promise<string> => {
  return JSON.stringify(await execaCommand(command));
};

// js function
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
