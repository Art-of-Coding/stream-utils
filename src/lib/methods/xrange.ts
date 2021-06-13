import { Redis } from 'ioredis'
import { array2object } from '../util'

export default async function* xrange(connection: Redis, key: string, { count = 5, start = '-', end = '+', signal }: {
  count?: number,
  start?: string,
  end?: string,
  signal?: AbortSignal,
}): AsyncIterableIterator<[Record<string, string>, string]> {
  let run = true

  if (signal) {
    signal.addEventListener('abort', () => {
      run = false
    }, { once: true })
  }

  while (run) {
    const entries = await connection.xrange(key, start, end, 'COUNT', count)

    for (const entry of entries) {
      const obj = array2object(entry[1])
      start = entry[0]
      yield [obj, entry[0]]
    }

    if (entries.length < count) {
      // Apparently we're done
      break
    }
  }
}
