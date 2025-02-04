// SPDX-FileCopyrightText: 2021-2025 Dyne.org foundation
//
// SPDX-License-Identifier: AGPL-3.0-or-later

// generic
type ZencodeInputs = {
  readonly data?: string;
  readonly dataFromFile?: string;
  readonly dataFromStep?: string;
  readonly keys?: string;
  readonly keysFromFile?: string;
  readonly keysFromStep?: string;
};

type Zencode = {
  readonly zencode: string;
};

type ZencodeFromFile = {
  readonly zencodeFromFile: string;
};

// types for json format
type JsonOnBeforeFn =
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

export type JsonOnBefore =
  | JsonOnBeforeFn
  | {
      jsFunction?: JsonOnBeforeFn;
      run?: string;
    };

type JsonOnAfterFn =
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

export type JsonOnAfter =
  | JsonOnAfterFn
  | {
      jsFunction?: JsonOnAfterFn;
      run?: string;
    };

type JsonDataTransform =
  | ((data: string) => string)
  | ((data: string) => Promise<string>);

type JsonKeysTransform =
  | ((keys: string) => string)
  | ((keys: string) => Promise<string>);

export type JsonTransformFn = JsonDataTransform | JsonKeysTransform;

export type JsonPrecondition =
  | {
      readonly jsFunction: (() => unknown) | (() => Promise<unknown>);
    }
  | (ZencodeInputs & Zencode)
  | (ZencodeInputs & ZencodeFromFile);

type JsonBasicStep = ZencodeInputs & {
  readonly id: string;
  readonly dataTransform?: JsonDataTransform;
  readonly keysTransform?: JsonKeysTransform;
  readonly conf?: string;
  readonly onAfter?: JsonOnAfter;
  readonly onBefore?: JsonOnBefore;
  readonly precondition?: JsonPrecondition;
};

export type JsonStep =
  | (JsonBasicStep & Zencode)
  | (JsonBasicStep & ZencodeFromFile);

export type JsonSteps = {
  readonly steps: readonly JsonStep[];
  readonly conf?: string;
  readonly verbose?: boolean;
};

// types for yaml format
export type YamlOnBeforeOrAfter = {
  readonly run?: string;
  readonly jsFunction?: string;
};

export type YamlPrecondition =
  | {
      readonly jsFunction: string;
    }
  | (ZencodeInputs & Zencode)
  | (ZencodeInputs & ZencodeFromFile);

type YamlBasicStep = ZencodeInputs & {
  readonly id: string;
  readonly dataTransform?: string;
  readonly keysTransform?: string;
  readonly conf?: string;
  readonly onAfter?: YamlOnBeforeOrAfter;
  readonly onBefore?: YamlOnBeforeOrAfter;
  readonly precondition?: YamlPrecondition;
};

type YamlStep = (YamlBasicStep & Zencode) | (YamlBasicStep & ZencodeFromFile);

export type YamlSteps = {
  readonly steps: readonly YamlStep[];
  readonly conf?: string;
  readonly verbose?: boolean;
};

// types for both
export type Step = YamlStep | JsonStep;
export type Steps = YamlSteps | JsonSteps;

export type Results = {
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

export type OnBeforeOrAfterData = OnBeforeData | OnAfterData;

// generic chain signature
export interface Chain {
  steps: JsonSteps | YamlSteps;
  manageTransform(
    transformFn: string | JsonTransformFn | undefined,
    transformData: string,
    transformType: 'data' | 'keys',
    verboseFn: (m: string) => void,
  ): Promise<string>;
  manageBefore(
    stepOnBefore: YamlOnBeforeOrAfter | JsonOnBefore | undefined,
    zencode: string,
    data: string | undefined,
    keys: string | undefined,
    conf: string | undefined,
  ): Promise<void>;
  manageAfter(
    stepOnAfter: YamlOnBeforeOrAfter | JsonOnAfter | undefined,
    result: string,
    zencode: string,
    data: string | undefined,
    keys: string | undefined,
    conf: string | undefined,
  ): Promise<void>;
  manageAfter(
    stepOnAfter: YamlOnBeforeOrAfter | JsonOnAfter | undefined,
    result: string,
    zencode: string,
    data: string | undefined,
    keys: string | undefined,
    conf: string | undefined,
  ): Promise<void>;
  managePrecondition(
    stepId: string,
    results: Results,
    stepPrecondition: JsonPrecondition | YamlPrecondition | undefined,
    verboseFn: (m: string) => void,
  ): Promise<boolean>;
}
