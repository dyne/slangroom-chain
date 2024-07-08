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
import YAML from 'yaml';

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

type OnBeforeOrAfter = {
  readonly run?: string;
  readonly jsFunction?: string;
};

type Step = {
  readonly id: string;
  readonly zencode?: string;
  readonly zencodeFromFile?: string;
  readonly data?: string;
  readonly dataFromStep?: string;
  readonly dataFromFile?: string;
  readonly dataTransform?: string;
  readonly keys?: string;
  readonly keysFromStep?: string;
  readonly keysFromFile?: string;
  readonly keysTransform?: string;
  readonly conf?: string;
  readonly onAfter?: OnBeforeOrAfter;
  readonly onBefore?: OnBeforeOrAfter;
};

type Steps = {
  readonly steps: readonly Step[];
  readonly conf?: string;
  readonly verbose?: boolean;
};

type Results = {
  [x: string]: string;
};

type OnBeforeData = {
  readonly zencode: string;
  readonly data?: string;
  readonly keys?: string;
  readonly conf?: string;
};

type OnAfterData = {
  readonly result: string;
  readonly zencode: string;
  readonly data?: string;
  readonly keys?: string;
  readonly conf?: string;
};

const AsyncFunction = async function () {}.constructor;

const readFromFile = (path: string): string => {
  return fs.readFileSync(path).toString('utf-8');
};

const verbose = (verbose: boolean | undefined): ((m: string) => void) => {
  if (verbose) return (message: string) => console.log(message);
  return () => {};
};

const fnParse = async (
  stringFn: string,
  args: Record<string, string>,
): Promise<string> => {
  const fn = AsyncFunction(...Object.keys(args), stringFn);
  return await fn(...Object.values(args));
};

const getDataOrKeys = (
  step: Step,
  results: Results,
  dataOrKeys: 'data' | 'keys',
): string => {
  const fromFile: keyof Step = `${dataOrKeys}FromFile`;
  const fromStep: keyof Step = `${dataOrKeys}FromStep`;
  let data = '{}';
  if (typeof step[fromFile] === 'string')
    data = readFromFile(step[fromFile] as string);
  else if (typeof step[fromStep] === 'string')
    data = results[step[fromStep] as string];
  else if (typeof step[dataOrKeys] === 'string')
    data = step[dataOrKeys] as string;
  if (!data) throw new Error(`No ${dataOrKeys} provided for step ${step.id}`);
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
  const data = await fnParse(transformFn, transformData);
  verboseFn(`TRANSFORMED DATA: ${data}`);
  return data;
};

const manageBeforeOrAfter = async (
  stepOnBeforeOrAfter: OnBeforeOrAfter | undefined,
  data: OnBeforeData | OnAfterData,
): Promise<void> => {
  if (stepOnBeforeOrAfter && stepOnBeforeOrAfter.jsFunction)
    await fnParse(stepOnBeforeOrAfter.jsFunction, data);
  //if (stepOnBeforeOrAfter && stepOnBeforeOrAfter.run)
  //  await runShellCommand(stepOnBeforeOrAfter.run, data);
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
    const zencode = step.zencodeFromFile
      ? readFromFile(step.zencodeFromFile)
      : step.zencode || '';
    verboseFn(
      `Executing contract ${step.id}\nZENCODE: ${zencode}\nDATA: ${data}\nKEYS: ${keys}\nCONF: ${conf}`,
    );
    data = await manageTransform(step.dataTransform, { data }, verboseFn);
    keys = await manageTransform(step.keysTransform, { keys }, verboseFn);
    manageBeforeOrAfter(step.onBefore, { zencode, data, keys, conf });
    const { result, logs } = await slang.execute(zencode, {
      data: data ? JSON.parse(data) : {},
      keys: keys ? JSON.parse(keys) : {},
      conf,
    });
    let stringResult;
    try {
      stringResult = JSON.stringify(result);
    } catch (e) {
      throw new Error(`failed to stringify result: ${result}\ngot error: ${e}`);
    }
    manageBeforeOrAfter(step.onAfter, {
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
