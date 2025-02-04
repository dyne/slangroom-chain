// SPDX-FileCopyrightText: 2021-2025 Dyne.org foundation
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import YAML from 'yaml';

import { SlangroomManager } from './slangroom.js';
import type {
  Chain,
  OnBeforeOrAfterData,
  Results,
  Step,
  YamlOnBeforeOrAfter,
  YamlPrecondition,
  YamlSteps,
} from './types';
import {
  execJsFun,
  execShellCommand,
  getDataAndKeys,
  readFromFile,
} from './utils.js';

const manageBeforeOrAfter = async (
  stepOnBeforeOrAfter: YamlOnBeforeOrAfter,
  data: OnBeforeOrAfterData,
): Promise<void> => {
  if (stepOnBeforeOrAfter.jsFunction)
    await execJsFun(stepOnBeforeOrAfter.jsFunction, data);
  if (stepOnBeforeOrAfter.run) await execShellCommand(stepOnBeforeOrAfter.run);
};

export class YamlChain implements Chain {
  steps: YamlSteps;
  constructor(steps: string) {
    this.steps = YAML.parse(steps);
  }

  async manageTransform(
    transformFn: string | undefined,
    transformData: string,
    transformType: 'data' | 'keys',
    verboseFn: (m: string) => void,
  ): Promise<string> {
    if (!transformFn) return transformData;
    const data = await execJsFun(transformFn, {
      [transformType]: transformData,
    });
    verboseFn(`TRANSFORMED ${transformType}: ${data}`);
    return data;
  }

  async manageBefore(
    stepOnBefore: YamlOnBeforeOrAfter | undefined,
    zencode: string,
    data: string | undefined,
    keys: string | undefined,
    conf: string | undefined,
  ): Promise<void> {
    if (!stepOnBefore) return;
    await manageBeforeOrAfter(stepOnBefore, { zencode, data, keys, conf });
  }

  async manageAfter(
    stepOnAfter: YamlOnBeforeOrAfter | undefined,
    result: string,
    zencode: string,
    data: string | undefined,
    keys: string | undefined,
    conf: string | undefined,
  ): Promise<void> {
    if (!stepOnAfter) return;
    await manageBeforeOrAfter(stepOnAfter, {
      result,
      zencode,
      data,
      keys,
      conf,
    });
  }

  async managePrecondition(
    stepId: string,
    results: Results,
    stepPrecondition: YamlPrecondition | undefined,
    verboseFn: (m: string) => void,
  ): Promise<boolean> {
    if (!stepPrecondition) return true;
    let res = true;
    try {
      verboseFn(`Executing precondition for step ${stepId}`);
      if ('jsFunction' in stepPrecondition) {
        verboseFn('Executing js function precondition');
        const jsRes = await execJsFun(stepPrecondition.jsFunction, {});
        res = Boolean(jsRes);
      } else {
        verboseFn('Executing zencode contract precondition');
        const zencode =
          'zencodeFromFile' in stepPrecondition
            ? await readFromFile(stepPrecondition.zencodeFromFile)
            : stepPrecondition.zencode;
        const { data, keys } = await getDataAndKeys(
          stepPrecondition as Step,
          results,
        );
        await SlangroomManager.executeInstance(zencode, data, keys, undefined);
      }
    } catch (e) {
      verboseFn(`PRECONDITION not met with error\n${e}`);
      res = false;
    }
    verboseFn(`Precondition ${stepId} result: ${res}`);
    return res;
  }
}
