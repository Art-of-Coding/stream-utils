import { Redis } from 'ioredis'
import { array2object } from '../util'

export default async function* xread(blockingConnection: Redis, key: string, { id = '$', count = 5, block = 5000, signal }: {
  id?: string,
  count?: number,
  block?: number,
  signal?: AbortSignal,
} = {}): AsyncIterableIterator<[Record<string, string>, string]> {
  let run = true
  let lastId: string = id

  if (signal) {
    signal.addEventListener('abort', () => {
      run = false
    }, { once: true })
  }

  while (run) {
    const result = await blockingConnection.xread('COUNT', count, 'BLOCK', block, 'STREAMS', key, lastId)
    const stream = result[0]
    const entries = stream[1]

    // Check here too in case run was set to false while blocking
    // No need to yield the possibly remaining entries
    if (!run) {
      break
    }

    for (const entry of entries) {
      const obj = array2object(entry[1])
      lastId = entry[0]
      yield [obj, entry[0]]
    }
  }

  blockingConnection.disconnect()
}
