// SPDX-FileCopyrightText: 2021-2025 Dyne.org foundation
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import YAML from 'yaml';

import { SlangroomManager } from './slangroom.js';
import type {
  Chain,
  OnBeforeOrAfterOrErrorData,
  Results,
  Step,
  YamlOnBeforeOrAfterOrError,
  YamlPrecondition,
  YamlSteps,
} from './types';
import {
  execJsFun,
  execShellCommand,
  getDataAndKeys,
  readFromFile,
} from './utils.js';

const manageBeforeOrAfterOrError = async (
  stepOnBeforeOrAfterOrError: YamlOnBeforeOrAfterOrError,
  data: OnBeforeOrAfterOrErrorData,
  verboseFn: (m: string) => void,
  onName: string,
): Promise<void> => {
  let zencode;
  if (
    'jsFunction' in stepOnBeforeOrAfterOrError &&
    stepOnBeforeOrAfterOrError.jsFunction
  ) {
    verboseFn(
      `Executing jsFunction ${onName}: ${stepOnBeforeOrAfterOrError.jsFunction}`,
    );
    await execJsFun(stepOnBeforeOrAfterOrError.jsFunction, data);
  }
  if ('run' in stepOnBeforeOrAfterOrError && stepOnBeforeOrAfterOrError.run) {
    verboseFn(`Executing run ${onName}: ${stepOnBeforeOrAfterOrError.run}`);
    await execShellCommand(stepOnBeforeOrAfterOrError.run);
  }
  if (
    'zencode' in stepOnBeforeOrAfterOrError &&
    stepOnBeforeOrAfterOrError.zencode
  )
    zencode = stepOnBeforeOrAfterOrError.zencode;
  else if (
    'zencodeFromFile' in stepOnBeforeOrAfterOrError &&
    stepOnBeforeOrAfterOrError.zencodeFromFile
  )
    zencode = await readFromFile(stepOnBeforeOrAfterOrError.zencodeFromFile);
  if (zencode) {
    verboseFn(`Executing zencode ${onName}: ${zencode}`);
    const jsonRes = JSON.parse(data.results);
    const { data: zencodeData, keys: zencodeKeys } = await getDataAndKeys(
      stepOnBeforeOrAfterOrError as Step,
      jsonRes,
    );
    verboseFn(`Executing zencode ${onName} with data: ${zencodeData}`);
    await SlangroomManager.executeInstance(
      zencode,
      zencodeData,
      JSON.stringify({
        ...JSON.parse(zencodeKeys),
        slangroomChainError: data.error,
      }),
      undefined,
    );
  }
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
    stepOnBefore: YamlOnBeforeOrAfterOrError | undefined,
    zencode: string,
    data: string | undefined,
    keys: string | undefined,
    conf: string | undefined,
    results: Results,
    verboseFn: (m: string) => void,
    stepId: string,
  ): Promise<void> {
    if (!stepOnBefore) return;
    verboseFn(`Executing onAfter for step ${stepId}`);
    await manageBeforeOrAfterOrError(
      stepOnBefore,
      {
        zencode,
        data,
        keys,
        conf,
        results: JSON.stringify(results),
      },
      verboseFn,
      'onBefore',
    );
  }

  async manageAfter(
    stepOnAfter: YamlOnBeforeOrAfterOrError | undefined,
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
    await manageBeforeOrAfterOrError(
      stepOnAfter,
      {
        result,
        zencode,
        data,
        keys,
        conf,
        results: JSON.stringify(results),
      },
      verboseFn,
      'onAfter',
    );
  }

  async manageError(
    stepOnError: YamlOnBeforeOrAfterOrError | undefined,
    error: string,
    results: Results,
    verboseFn: (m: string) => void,
    stepId: string,
  ): Promise<void> {
    if (!stepOnError) return;
    verboseFn(`Executing onError for step ${stepId}`);
    await manageBeforeOrAfterOrError(
      stepOnError,
      {
        error,
        results: JSON.stringify(results),
      },
      verboseFn,
      'onResult',
    );
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
