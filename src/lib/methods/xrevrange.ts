import { Redis } from 'ioredis'
import { array2object } from '../util'

export default async function* xrevrange(connection: Redis, key: string, { count = 5, start = '+', end = '-', signal }: {
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
    const entries = await connection.xrevrange(key, end, start, 'COUNT', count)

    for (const entry of entries) {
      const obj = array2object(entry[1])
      end = entry[0]
      yield [obj, entry[0]]
    }

    if (entries.length < count) {
      // Apparently we're done
      break
    }
  }
}
