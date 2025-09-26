// SPDX-FileCopyrightText: 2021-2025 Dyne.org foundation
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { SlangroomManager } from './slangroom.js';
import type {
  Chain,
  JsonOnAfter,
  JsonOnBefore,
  JsonOnError,
  JsonPrecondition,
  JsonSteps,
  JsonTransformFn,
  Results,
  Step,
} from './types';
import { execShellCommand, getDataAndKeys, readFromFile } from './utils.js';

const manageBeforeOrAfterOrError = async (
  step: JsonOnAfter | JsonOnBefore | JsonOnError,
  error: string | undefined,
  results: Results,
  verboseFn: (m: string) => void,
  onName: string,
): Promise<void> => {
  if ('run' in step && step.run) {
    verboseFn(`Executing run ${onName}: ${step.run}`);
    await execShellCommand(step.run);
  }
  let zencode;
  if ('zencode' in step && step.zencode) zencode = step.zencode;
  else if ('zencodeFromFile' in step && step.zencodeFromFile)
    zencode = await readFromFile(step.zencodeFromFile);
  if (zencode) {
    verboseFn(`Executing zencode ${onName}: ${zencode}`);
    const dataKeys = await getDataAndKeys(step as Step, results);
    verboseFn(`Executing zencode ${onName} with data: ${dataKeys.data}`);
    if (error) {
      const jsonKeys = JSON.parse(dataKeys.keys);
      jsonKeys.slangroomChainError = error;
      dataKeys.keys = JSON.stringify(jsonKeys);
    }
    await SlangroomManager.executeInstance(
      zencode,
      dataKeys.data,
      dataKeys.keys,
      undefined,
    );
  }
};
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
    results: Results,
    verboseFn: (m: string) => void,
    stepId: string,
  ): Promise<void> {
    if (!stepOnBefore) return;
    verboseFn(`Executing onBefore for step ${stepId}`);
    if (typeof stepOnBefore === 'function') {
      verboseFn('Executing onBefore as js function');
      await stepOnBefore(zencode, data, keys, conf);
    } else if (typeof stepOnBefore === 'object') {
      if ('jsFunction' in stepOnBefore && stepOnBefore.jsFunction) {
        verboseFn('Executing onBefore.jsFunction as js function');
        await stepOnBefore.jsFunction(zencode, data, keys, conf);
      }
      await manageBeforeOrAfterOrError(
        stepOnBefore,
        undefined,
        results,
        verboseFn,
        'onBefore',
      );
    }
  }

  async manageAfter(
    stepOnAfter: JsonOnAfter | undefined,
    result: string,
    zencode: string,
    data: string | undefined,
    keys: string | undefined,
    conf: string | undefined,
    results: Results,
    verboseFn: (m: string) => void,
    stepId: string,
  ): Promise<void> {
    if (!stepOnAfter) return;
    verboseFn(`Executing onAfter for step ${stepId}`);
    if (typeof stepOnAfter === 'function') {
      verboseFn('Executing onAfter as js function');
      await stepOnAfter(result, zencode, data, keys, conf);
    } else if (typeof stepOnAfter === 'object') {
      if ('jsFunction' in stepOnAfter && stepOnAfter.jsFunction) {
        verboseFn('Executing onAfter.jsFunction as js function');
        await stepOnAfter.jsFunction(result, zencode, data, keys, conf);
      }
      await manageBeforeOrAfterOrError(
        stepOnAfter,
        undefined,
        results,
        verboseFn,
        'onAfter',
      );
    }
  }

  async manageError(
    stepOnError: JsonOnError | undefined,
    error: string,
    results: Results,
    verboseFn: (m: string) => void,
    stepId: string,
  ): Promise<void> {
    if (!stepOnError) return;
    verboseFn(`Executing onError for step ${stepId}`);
    if (typeof stepOnError === 'function') {
      verboseFn('Executing onError as js function');
      await stepOnError(error);
    } else if (typeof stepOnError === 'object') {
      if ('jsFunction' in stepOnError && stepOnError.jsFunction) {
        verboseFn('Executing onError.jsFunction as js function');
        await stepOnError.jsFunction(error);
      }
      await manageBeforeOrAfterOrError(
        stepOnError,
        error,
        results,
        verboseFn,
        'onError',
      );
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
