// SPDX-FileCopyrightText: 2021-2025 Dyne.org foundation
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import fs from 'fs';

import { Slangroom } from '@slangroom/core';
import { db } from '@slangroom/db';
import { fs as slangroomfs } from '@slangroom/fs';
import { git } from '@slangroom/git';
import { helpers } from '@slangroom/helpers';
import { http } from '@slangroom/http';
import { JSONSchema } from '@slangroom/json-schema';
import { oauth } from '@slangroom/oauth';
import { pocketbase } from '@slangroom/pocketbase';
import { qrcode } from '@slangroom/qrcode';
import { redis } from '@slangroom/redis';
import { shell } from '@slangroom/shell';
import { timestamp } from '@slangroom/timestamp';
import { wallet } from '@slangroom/wallet';
import { zencode } from '@slangroom/zencode';

import { JsonChain } from './jsonChain.js';
import type { Chain, JsonSteps, Results, Step } from './types';
import { YamlChain } from './yamlChain.js';

const slang = new Slangroom(
  db,
  slangroomfs,
  git,
  helpers,
  http,
  JSONSchema,
  oauth,
  pocketbase,
  qrcode,
  redis,
  shell,
  timestamp,
  wallet,
  zencode,
);

const readFromFile = (path: string): string => {
  return fs.readFileSync(path).toString('utf-8');
};

const verbose = (verbose: boolean | undefined): ((m: string) => void) => {
  if (verbose) return (message: string) => console.log(message);
  return () => {};
};

const getDataOrKeys = (
  step: Step,
  results: Results,
  dataOrKeys: 'data' | 'keys',
): string => {
  const fromFile: keyof Step = `${dataOrKeys}FromFile`;
  const fromStep: keyof Step = `${dataOrKeys}FromStep`;
  if (!step[fromFile] && !step[fromStep] && !step[dataOrKeys]) return '{}';
  let data;
  if (step[fromFile] && typeof step[fromFile] === 'string')
    data = readFromFile(step[fromFile] as string);
  else if (step[fromStep] && typeof step[fromStep] === 'string')
    data = results[step[fromStep] as string];
  else if (typeof step[dataOrKeys] === 'string') data = step[dataOrKeys];
  else if (typeof step[dataOrKeys] === 'object')
    data = JSON.stringify(step[dataOrKeys]);
  if (!data)
    throw new Error(`No valid ${dataOrKeys} provided for step ${step.id}`);
  return data;
};

const getDataAndKeys = (
  step: Step,
  results: Results,
): { data: string; keys: string } => {
  return {
    data: getDataOrKeys(step, results, 'data'),
    keys: getDataOrKeys(step, results, 'keys'),
  };
};

export const execute = async (
  steps: string | JsonSteps,
  inputData?: string,
): Promise<string> => {
  const results: Results = {};
  let final = '';
  let firstIteration = true;
  let parsedSteps: Chain;
  if (typeof steps === 'string') parsedSteps = new YamlChain(steps);
  else parsedSteps = new JsonChain(steps);
  const verboseFn = verbose(parsedSteps.steps.verbose);
  for (const step of parsedSteps.steps.steps) {
    let { data, keys } = getDataAndKeys(step, results);
    // TODO: remove firstIteration boolean variable and
    // each time the data is input take as data the result of
    // previous step for easier chaining
    if (firstIteration) {
      if (data === '{}' && inputData) data = inputData;
      firstIteration = false;
    }
    const conf = step.conf ? step.conf : parsedSteps.steps.conf;
    const zencode =
      'zencodeFromFile' in step
        ? readFromFile(step.zencodeFromFile)
        : step.zencode;
    verboseFn(
      `Executing contract ${step.id}\nZENCODE: ${zencode}\nDATA: ${data}\nKEYS: ${keys}\nCONF: ${conf}`,
    );
    data = await parsedSteps.manageTransform(
      step.dataTransform,
      data,
      'data',
      verboseFn,
    );
    keys = await parsedSteps.manageTransform(
      step.keysTransform,
      keys,
      'keys',
      verboseFn,
    );
    await parsedSteps.manageBefore(step.onBefore, zencode, data, keys, conf);
    const { result, logs } = await slang.execute(zencode, {
      data: JSON.parse(data),
      keys: JSON.parse(keys),
      conf,
    });
    let stringResult;
    try {
      stringResult = JSON.stringify(result);
    } /* c8 ignore next 4 */ catch (e) {
      // this should be unreachable
      throw new Error(`failed to stringify result: ${result}\ngot error: ${e}`);
    }
    await parsedSteps.manageAfter(
      step.onAfter,
      stringResult,
      zencode,
      data,
      keys,
      conf,
    );
    results[step.id] = stringResult;
    verboseFn(logs);
    final = stringResult;
  }

  return final;
};
