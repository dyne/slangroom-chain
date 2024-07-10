export type OnBeforeOrAfter = {
  readonly run?: string;
  readonly jsFunction?: string;
};

type BasicStep = {
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
  readonly onAfter?: OnBeforeOrAfter;
  readonly onBefore?: OnBeforeOrAfter;
};

export type Step =
  | (BasicStep & {
      readonly zencode: string;
    })
  | (BasicStep & {
      readonly zencodeFromFile: string;
    });

export type Steps = {
  readonly steps: readonly Step[];
  readonly conf?: string;
  readonly verbose?: boolean;
};

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
