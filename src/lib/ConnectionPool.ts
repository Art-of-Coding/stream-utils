import IORedis, { Redis, RedisOptions } from 'ioredis'

export default class ConnectionPool {
  #connection: Redis
  #connections = new Map<Redis, boolean>()
  #maxSize: number

  public constructor({ connection, size = 3, maxSize = 10 }: {
    connection: Redis | RedisOptions,
    size?: number,
    maxSize?: number,
  }) {
    this.#connection = typeof (connection as Redis).set === 'function'
      ? connection as Redis
      : new IORedis(connection as RedisOptions)

    this.#maxSize = maxSize

    while (size) {
      const conn = this.#connection.duplicate()
      conn.once('close', () => this.#release(conn))
      this.#connections.set(conn, false)
      size--
    }
  }

  public size(): number {
    return this.#connections.size
  }

  public get(): [Redis, () => void] {
    for (const [connection, busy] of this.#connections) {
      if (!busy) {
        this.#connections.set(connection, true)
        return [connection, () => this.#release(connection)]
      }
    }

    const connection = this.#connection.duplicate()
    connection.once('close', () => this.#release(connection))
    this.#connections.set(connection, true)

    return [connection, () => this.#release(connection)]
  }

  public releaseAll(): void {
    for (const connection of this.#connections.keys()) {
      this.#release(connection)
    }
  }

  #release(connection: Redis) {
    if (this.#connections.size > this.#maxSize) {
      if (connection.status === 'ready') {
        connection.disconnect()
      }

      this.#connections.delete(connection)
    } else {
      if (connection.status === 'ready') {
        this.#connections.set(connection, false)
      } else {
        this.#connections.delete(connection)
      }
    }
  }
}
