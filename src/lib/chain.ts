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

const readFromFile = (path: string): string => {
  return fs.readFileSync(path).toString('utf-8');
};

type Step = {
  readonly id: string;
  readonly zencode?: string;
  readonly zencodeFromFile?: string;
  readonly data?: string;
  readonly dataFromStep?: string;
  readonly dataFromFile?: string;
  readonly dataTransform?:
    | ((data: string) => string)
    | ((data: string) => Promise<string>);
  readonly keys?: string;
  readonly keysFromStep?: string;
  readonly keysFromFile?: string;
  readonly keysTransform?:
    | ((keys: string) => string)
    | ((keys: string) => Promise<string>);
  readonly conf?: string;
  readonly onAfter?:
    | ((
        result: string,
        zencode: string,
        data: string | undefined,
        keys: string | undefined,
        conf: string | undefined,
      ) => void)
    | ((
        result: string,
        zencode: string,
        data: string | undefined,
        keys: string | undefined,
        conf: string | undefined,
      ) => Promise<void>);
  readonly onBefore?:
    | ((
        zencode: string,
        data: string | undefined,
        keys: string | undefined,
        conf: string | undefined,
      ) => void)
    | ((
        zencode: string,
        data: string | undefined,
        keys: string | undefined,
        conf: string | undefined,
      ) => Promise<void>);
};

type Steps = {
  readonly steps: readonly Step[];
  readonly conf?: string;
  readonly verbose?: boolean;
};

type Results = {
  [x: string]: string;
};

const verbose = (verbose: boolean | undefined) => {
  if (verbose) return (message: string) => console.log(message);
  return () => {};
};

export const execute = async (
  steps: Steps | string,
  inputData?: string,
): Promise<string> => {
  const results: Results = {};
  let final = '';
  let firstIteration = true;
  let jsonSteps;
  if (typeof steps === 'string') jsonSteps = YAML.parse(steps) as Steps;
  else jsonSteps = steps;
  const verboseMessage = verbose(jsonSteps.verbose);
  for await (const step of jsonSteps.steps) {
    let data = step.dataFromFile
      ? readFromFile(step.dataFromFile)
      : step.dataFromStep
        ? results[step.dataFromStep]
        : step.data;
    if (firstIteration) {
      if (typeof data == 'undefined') data = inputData;
      firstIteration = false;
    }
    let keys = step.keysFromFile
      ? readFromFile(step.keysFromFile)
      : step.keysFromStep
        ? results[step.keysFromStep]
        : step.keys;
    const conf = step.conf ? step.conf : jsonSteps.conf;
    const zencode = step.zencodeFromFile
      ? readFromFile(step.zencodeFromFile)
      : step.zencode || '';
    verboseMessage(
      `Executing contract ${step.id}\nZENCODE: ${zencode}\nDATA: ${data}\nKEYS: ${keys}\nCONF: ${conf}`,
    );
    if (data && step.dataTransform) {
      data = await step.dataTransform(data);
      verboseMessage(`TRANSFORMED DATA: ${data}`);
    }
    if (keys && step.keysTransform) {
      keys = await step.keysTransform(keys);
      verboseMessage(`TRANSFORMED KEYS: ${keys}`);
    }
    if (step.onBefore) await step.onBefore(zencode, data, keys, conf);
    const { result, logs } = await slang.execute(zencode, {
      data: data ? JSON.parse(data) : {},
      keys: keys ? JSON.parse(keys) : {},
      conf,
    });
    if (step.onAfter)
      await step.onAfter(JSON.stringify(result), zencode, data, keys, conf);
    results[step.id] = JSON.stringify(result);
    verboseMessage(logs);
    final = JSON.stringify(result);
  }

  return final;
};
