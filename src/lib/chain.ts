import { zencode_exec } from 'zenroom';

type Step = {
  readonly id: string;
  readonly zencode: string;
  readonly data?: string;
  readonly dataFromStep?: string;
  readonly dataTransform?:
    | ((data: string) => string)
    | ((data: string) => Promise<string>);
  readonly keys?: string;
  readonly keysFromStep?: string;
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
        conf: string | undefined
      ) => void)
    | ((
        result: string,
        zencode: string,
        data: string | undefined,
        keys: string | undefined,
        conf: string | undefined
      ) => Promise<void>);
  readonly onBefore?:
    | ((
        zencode: string,
        data: string | undefined,
        keys: string | undefined,
        conf: string | undefined
      ) => void)
    | ((
        zencode: string,
        data: string | undefined,
        keys: string | undefined,
        conf: string | undefined
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

export const execute = async (steps: Steps): Promise<string> => {
  const results: Results = {};
  let final = '';

  for (const step of steps.steps) {
    let data = step.dataFromStep ? results[step.dataFromStep] : step.data;
    let keys = step.keysFromStep ? results[step.keysFromStep] : step.keys;
    const conf = step.conf ? step.conf : steps.conf;
    if (steps.verbose) {
      console.log(`Executing contract ${step.id} `);
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
    if (step.onBefore) await step.onBefore(step.zencode, data, keys, conf);
    const { result, logs } = await zencode_exec(step.zencode, {
      data,
      keys,
      conf,
    });
    if (step.onAfter)
      await step.onAfter(result, step.zencode, data, keys, conf);
    results[step.id] = result;
    if (steps.verbose) {
      console.log(logs);
    }
    final = result;
  }

  return final;
};
