// extracted/copied from bullmq
// https://github.com/taskforcesh/bullmq/blob/master/src/utils.ts
export function array2object(arr: any[]) {
  const obj: Record<string, string> = {}

  for (let i = 0; i < arr.length; i += 2) {
    obj[arr[i]] = arr[i + 1]
  }

  return obj
}
