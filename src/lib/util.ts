export async function wait(ms: number): Promise<void> {
  return new Promise<void>(resolve => setTimeout(resolve, ms))
}

// extracted/copied from bullmq
// https://github.com/taskforcesh/bullmq/blob/master/src/utils.ts
export function array2object(arr: any[]) {
  const obj: Record<string, string> = {}

  for (let i = 0; i < arr.length; i += 2) {
    obj[arr[i]] = arr[i + 1]
  }

  return obj
}

// extracted/copied from xxscreeps
// https://github.com/laverdet/xxscreeps/blob/main/src/utility/async.ts#L105
export class Deferred<Type = void> {
  promise: Promise<Type>;
  resolve!: (payload: Type) => void;
  reject!: (error: Error) => void;
  constructor() {
    this.promise = new Promise<Type>((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }
}
