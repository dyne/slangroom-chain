// SPDX-FileCopyrightText: 2021-2025 Dyne.org foundation
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { SlangroomManager } from './slangroom.js';
import type {
  Chain,
  JsonOnAfter,
  JsonOnBefore,
  JsonPrecondition,
  JsonSteps,
  JsonTransformFn,
  Results,
  Step,
} from './types';
import { execShellCommand, getDataAndKeys, readFromFile } from './utils.js';

export class JsonChain implements Chain {
  steps: JsonSteps;
  constructor(steps: JsonSteps) {
    this.steps = steps;
  }

  async manageTransform(
    transformFn: JsonTransformFn | undefined,
    transformData: string,
    transformType: 'data' | 'keys',
    verboseFn: (m: string) => void,
  ): Promise<string> {
    if (!transformFn) return transformData;
    const data = await transformFn(transformData);
    verboseFn(`TRANSFORMED ${transformType}: ${data}`);
    return data;
  }

  async manageBefore(
    stepOnBefore: JsonOnBefore | undefined,
    zencode: string,
    data: string | undefined,
    keys: string | undefined,
    conf: string | undefined,
  ): Promise<void> {
    if (!stepOnBefore) return;
    if (typeof stepOnBefore === 'function') {
      await stepOnBefore(zencode, data, keys, conf);
    } else if (typeof stepOnBefore === 'object') {
      if (stepOnBefore.jsFunction) {
        await stepOnBefore.jsFunction(zencode, data, keys, conf);
      } else if (stepOnBefore.run) {
        await execShellCommand(stepOnBefore.run);
      }
    }
  }

  async manageAfter(
    stepOnAfter: JsonOnAfter | undefined,
    result: string,
    zencode: string,
    data: string | undefined,
    keys: string | undefined,
    conf: string | undefined,
  ): Promise<void> {
    if (!stepOnAfter) return;
    if (typeof stepOnAfter === 'function') {
      await stepOnAfter(result, zencode, data, keys, conf);
    } else if (typeof stepOnAfter === 'object') {
      if (stepOnAfter.jsFunction) {
        await stepOnAfter.jsFunction(result, zencode, data, keys, conf);
      } else if (stepOnAfter.run) {
        await execShellCommand(stepOnAfter.run);
      }
    }
  }

  async managePrecondition(
    stepId: string,
    results: Results,
    stepPrecondition: JsonPrecondition | undefined,
    verboseFn: (m: string) => void,
  ): Promise<boolean> {
    if (!stepPrecondition) return true;
    let res = true;
    try {
      verboseFn(`Executing precondition for step ${stepId}`);
      if ('jsFunction' in stepPrecondition) {
        verboseFn('Executing js function precondition');
        const jsRes = await stepPrecondition.jsFunction();
        res = Boolean(jsRes);
      } else {
        verboseFn('Executing zencode precondition');
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
