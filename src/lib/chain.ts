// SPDX-FileCopyrightText: 2021-2025 Dyne.org foundation
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { JsonChain } from './jsonChain.js';
import { SlangroomManager } from './slangroom.js';
import type { Chain, JsonSteps, Results } from './types';
import { getDataAndKeys, readFromFile } from './utils.js';
import { YamlChain } from './yamlChain.js';

const verbose = (verbose: boolean | undefined): ((m: string) => void) => {
  if (verbose) return (message: string) => console.log(message);
  return () => {};
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
    if (
      !(await parsedSteps.managePrecondition(
        step.id,
        results,
        step.precondition,
        verboseFn,
      ))
    ) {
      continue;
    }
    let { data, keys } = await getDataAndKeys(step, results);
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
        ? await readFromFile(step.zencodeFromFile)
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
    const { result, logs } = await SlangroomManager.executeInstance(
      zencode,
      data,
      keys,
      conf,
    );
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
