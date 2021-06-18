import IORedis, { Redis, RedisOptions } from 'ioredis'
import { isRedis } from './util'

export default class ConnectionPool {
  #connection: Redis
  #connections = new Map<Redis, boolean>()
  #maxSize: number

  public constructor({ connection, size = 3, maxSize = 10 }: {
    connection: Redis | RedisOptions,
    size?: number,
    maxSize?: number,
  }) {
    this.#connection = isRedis(connection)
      ? connection
      : new IORedis(connection)

    this.#maxSize = maxSize

    for (let i = 0; i < size; i++) {
      this.#create(false)
    }
  }

  public size(): number {
    return this.#connections.size
  }

  public get(): [Redis, () => void] {
    for (const [connection, busy] of this.#connections) {
      if (busy) continue

      this.#connections.set(connection, true)
      return [connection, () => this.#release(connection)]
    }

    const connection = this.#create(true)
    return [connection, () => this.#release(connection)]
  }

  #create(busy: boolean): Redis {
    const connection = this.#connection.duplicate()
    connection.once('close', () => this.#release(connection))
    this.#connections.set(connection, busy)
    return connection
  }

  #release(connection: Redis) {
    if (this.#connections.size > this.#maxSize) {
      if (connection.status === 'ready') {
        connection.disconnect()
      }

      this.#connections.delete(connection)
      return
    }

    if (connection.status === 'ready') {
      this.#connections.set(connection, false)
    } else {
      this.#connections.delete(connection)
    }
  }
}
