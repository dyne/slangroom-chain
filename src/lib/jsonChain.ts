// SPDX-FileCopyrightText: 2021-2025 Dyne.org foundation
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { execaCommand } from 'execa';

import type {
  Chain,
  JsonOnAfter,
  JsonOnBefore,
  JsonSteps,
  JsonTransformFn,
} from './types';

const execShellCommand = async (command: string): Promise<void> => {
  await execaCommand(command);
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
}
