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
    | ((data: string) => string)
    | ((data: string) => Promise<string>);
  readonly conf?: string;
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
    const { result, logs } = await zencode_exec(step.zencode, {
      data,
      keys,
      conf,
    });
    results[step.id] = result;
    if (steps.verbose) {
      console.log(logs);
    }
    final = result;
  }

  return final;
};
