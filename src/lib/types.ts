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
      jsFunction?: JsonOnBeforeFn,
      run?: string,
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
      jsFunction?: JsonOnAfterFn,
      run?: string,
    };

export type JsonOnBeforeOrAfter =
  | JsonOnBefore
  | JsonOnAfter

type JsonDataTransform =
  | ((data: string) => string)
  | ((data: string) => Promise<string>);

type JsonKeysTransform =
  | ((keys: string) => string)
  | ((keys: string) => Promise<string>);

export type JsonTransformFn = JsonDataTransform | JsonKeysTransform;

type JsonBasicStep = {
  readonly id: string;
  readonly data?: string;
  readonly dataFromStep?: string;
  readonly dataFromFile?: string;
  readonly dataTransform?: JsonDataTransform;
  readonly keys?: string;
  readonly keysFromStep?: string;
  readonly keysFromFile?: string;
  readonly keysTransform?: JsonKeysTransform;
  readonly conf?: string;
  readonly onAfter?: JsonOnAfter;
  readonly onBefore?: JsonOnBefore;
};

export type JsonStep =
  | (JsonBasicStep & {
      readonly zencode: string;
    })
  | (JsonBasicStep & {
      readonly zencodeFromFile: string;
  });

export type JsonSteps = {
  readonly steps: readonly JsonStep[];
  readonly conf?: string;
  readonly verbose?: boolean;
};

// types for yaml format
export type YamlOnBeforeOrAfter = {
  readonly run?: string;
  readonly jsFunction?: string;
}

type YamlBasicStep = {
  readonly id: string;
  readonly data?: string;
  readonly dataFromStep?: string;
  readonly dataFromFile?: string;
  readonly dataTransform?: string;
  readonly keys?: string;
  readonly keysFromStep?: string;
  readonly keysFromFile?: string;
  readonly keysTransform?: string;
  readonly conf?: string;
  readonly onAfter?: YamlOnBeforeOrAfter;
  readonly onBefore?: YamlOnBeforeOrAfter;
};

type YamlStep =
  | (YamlBasicStep & {
      readonly zencode: string;
    })
  | (YamlBasicStep & {
      readonly zencodeFromFile: string;
  });

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