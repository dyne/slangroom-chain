import fs from 'fs';

import { Slangroom } from '@slangroom/core';
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

const slang = new Slangroom(
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

export const execute = async (
  steps: Steps,
  inputData?: string,
): Promise<string> => {
  const results: Results = {};
  let final = '';
  let firstIteration = true;
  for await (const step of steps.steps) {
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
    const conf = step.conf ? step.conf : steps.conf;
    const zencode = step.zencodeFromFile
      ? readFromFile(step.zencodeFromFile)
      : step.zencode || '';
    if (steps.verbose) {
      console.log(`Executing contract ${step.id} `);
      console.log(`ZENCODE: ${zencode}`);
      console.log(`DATA: ${data}`);
      console.log(`KEYS: ${keys}`);
      console.log(`CONF: ${conf}`);
    }
    if (data && step.dataTransform) {
      data = await step.dataTransform(data);
      if (steps.verbose) {
        console.log(`TRANSFORMED DATA: ${data}`);
      }
    }
    if (keys && step.keysTransform) {
      keys = await step.keysTransform(keys);
      if (steps.verbose) {
        console.log(`TRANSFORMED KEYS: ${keys}`);
      }
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
    if (steps.verbose) {
      console.log(logs);
    }
    final = JSON.stringify(result);
  }

  return final;
};

