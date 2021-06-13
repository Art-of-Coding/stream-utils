import { EventEmitter } from 'stream'
import { Redis } from 'ioredis'
import { array2object, Deferred, wait } from './util'

export interface StreamsReaderOptions {
  count?: number,
  blockingTimeout?: number,
}

export default class StreamsReader {
  #connection: Redis
  #opts: Required<StreamsReaderOptions>
  #streams = new Map<string, string>()
  #streamListenerCount = new Map<string, number>()
  #streamEmitter = new EventEmitter()
  #reading = false

  public constructor(blockingConnection: Redis, opts: StreamsReaderOptions = {}) {
    this.#connection = blockingConnection
    this.#opts = {
      count: 5,
      blockingTimeout: 5000,
      ...opts,
    }
  }

  public async* read<T extends Record<string, string> = Record<string, string>>(key: string, { id = '$', signal }: {
    id?: string,
    signal?: AbortSignal,
  } = {}): AsyncIterableIterator<[T, string]> {
    let run = true
    let deferred = new Deferred<[T, string]>()

    if (signal) {
      signal.addEventListener('abort', () => {
        run = false

        if (deferred) {
          deferred.reject(new Error('aborted'))
        }
      }, { once: true })
    }

    if (!this.#streams.has(key)) {
      this.#streams.set(key, id)
    }

    if (!this.#reading) {
      this.#read().catch(err => console.error(err))
    }

    this.#streamListenerCount.set(key, (this.#streamListenerCount.get(key) ?? 0) + 1)

    const listener = (id: string, props: T) => {
      deferred.resolve([props, id])
      deferred = new Deferred()
    }

    this.#streamEmitter.on(key, listener)

    const cleanup = () => {
      this.#streamEmitter.removeListener(key, listener)
      this.#streamListenerCount.set(key, this.#streamListenerCount.get(key)! - 1)

      // Remove stream if this was the last listener
      if (this.#streamListenerCount.get(key) === 0) {
        this.#streams.delete(key)
        this.#streamEmitter.removeAllListeners(key)
        this.#streamListenerCount.delete(key)
      }
    }

    while (run) {
      try {
        yield await deferred.promise
      } catch (e) {
        if (e.message !== 'aborted') {
          cleanup()
          throw e
        }
      }
    }

    cleanup()
  }

  async #read(): Promise<void> {
    if (this.#reading) return
    this.#reading = true

    while (this.#streams.size > 0) {
      const keys = [...this.#streams.keys()]
      const ids = [...this.#streams.values()]

      try {
        const results = await this.#connection.xread(
          'COUNT', this.#opts.count,
          'BLOCK', this.#opts.blockingTimeout,
          'STREAMS', ...keys, ...ids,
        )

        for (const stream of results) {
          const key = stream[0]
          const entries = stream[1]

          let lastId = this.#streams.get(key)

          if (!lastId) {
            // the stream has been removed
            // don't emit the remaining entries
            continue
          }

          for (const entry of entries) {
            const id = entry[0]
            const props = array2object(entry[1])
            this.#streamEmitter.emit(key, id, props)
            lastId = id
            await wait(50)
          }

          this.#streams.set(key, lastId)
        }
      } catch (e) {
        if (e.message !== 'Connection is closed.') {
          this.#reading = false
          throw e
        }

        await wait(this.#opts.blockingTimeout)
      }
    }

    this.#reading = false
  }
}
