// SPDX-FileCopyrightText: 2021-2025 Dyne.org foundation
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import YAML from 'yaml';

import type {
  Chain,
  OnBeforeOrAfterData,
  YamlOnBeforeOrAfter,
  YamlSteps,
} from './types';
import { execJsFun, execShellCommand } from './utils.js';

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
}
