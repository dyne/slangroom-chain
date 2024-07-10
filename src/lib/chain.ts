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
import { execaCommand } from 'execa';
import YAML from 'yaml';

import type {
  OnBeforeOrAfter,
  OnBeforeOrAfterData,
  Results,
  Step,
  Steps,
} from './types';

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

const AsyncFunction = async function () {}.constructor;

const readFromFile = (path: string): string => {
  return fs.readFileSync(path).toString('utf-8');
};

const verbose = (verbose: boolean | undefined): ((m: string) => void) => {
  if (verbose) return (message: string) => console.log(message);
  return () => {};
};

const execJsFun = async (
  stringFn: string,
  args: Record<string, string>,
): Promise<string> => {
  const fn = AsyncFunction(...Object.keys(args), stringFn);
  try {
    return await fn(...Object.values(args));
  } catch (e) {
    throw new Error(`Error executing JS function:\n${stringFn}\n${e}`);
  }
};

const execShellCommand = async (command: string): Promise<void> => {
  await execaCommand(command);
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

const manageTransform = async (
  transformFn: string | undefined,
  transformData: { data: string } | { keys: string },
  verboseFn: (m: string) => void,
): Promise<string> => {
  if (!transformFn) {
    if ('data' in transformData) return transformData.data;
    else return transformData.keys;
  }
  const data = await execJsFun(transformFn, transformData);
  verboseFn(`TRANSFORMED DATA: ${data}`);
  return data;
};

const manageBeforeOrAfter = async (
  stepOnBeforeOrAfter: OnBeforeOrAfter | undefined,
  data: OnBeforeOrAfterData,
): Promise<void> => {
  if (stepOnBeforeOrAfter) {
    if (stepOnBeforeOrAfter.jsFunction)
      await execJsFun(stepOnBeforeOrAfter.jsFunction, data);
    if (stepOnBeforeOrAfter.run)
      await execShellCommand(stepOnBeforeOrAfter.run);
  }
  return;
};

export const execute = async (
  steps: string,
  inputData?: string,
): Promise<string> => {
  const results: Results = {};
  let final = '';
  let firstIteration = true;
  const jsonSteps = YAML.parse(steps) as Steps;
  const verboseFn = verbose(jsonSteps.verbose);
  for await (const step of jsonSteps.steps) {
    let data = getDataOrKeys(step, results, 'data');
    if (firstIteration) {
      if (data === '{}' && inputData) data = inputData;
      firstIteration = false;
    }
    let keys = getDataOrKeys(step, results, 'keys');
    const conf = step.conf ? step.conf : jsonSteps.conf;
    const zencode =
      'zencodeFromFile' in step
        ? readFromFile(step.zencodeFromFile)
        : step.zencode || '';
    verboseFn(
      `Executing contract ${step.id}\nZENCODE: ${zencode}\nDATA: ${data}\nKEYS: ${keys}\nCONF: ${conf}`,
    );
    data = await manageTransform(step.dataTransform, { data }, verboseFn);
    keys = await manageTransform(step.keysTransform, { keys }, verboseFn);
    await manageBeforeOrAfter(step.onBefore, { zencode, data, keys, conf });
    const { result, logs } = await slang.execute(zencode, {
      data: data ? JSON.parse(data) : {},
      keys: keys ? JSON.parse(keys) : {},
      conf,
    });
    let stringResult;
    try {
      stringResult = JSON.stringify(result);
    } /* c8 ignore next 4 */ catch (e) {
      // this should be unreachable
      throw new Error(`failed to stringify result: ${result}\ngot error: ${e}`);
    }
    await manageBeforeOrAfter(step.onAfter, {
      result: stringResult,
      zencode,
      data,
      keys,
      conf,
    });
    results[step.id] = stringResult;
    verboseFn(logs);
    final = stringResult;
  }

  return final;
};
