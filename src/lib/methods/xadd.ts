import { Redis } from 'ioredis'

export default async function xadd<T extends Record<string, string | number> = Record<string, string | number>>(connection: Redis, key: string, value: T, { noMkStream, maxLength, maxLengthType = '~', limit, id = '*' }: {
  noMkStream?: boolean,
  maxLength?: number,
  maxLengthType?: '~' | '=',
  limit?: number,
  id?: string,
} = {}): Promise<string> {
  const args: any[] = []

  if (noMkStream) {
    args.push('NOMKSTREAM')
  }

  if (maxLength) {
    args.push('MAXLEN', maxLengthType, maxLength)
  }

  if (limit) {
    args.push('COUNT', limit)
  }

  args.push(id)

  const props = Object.keys(value).flatMap(key => [key, value[key]])
  return connection.xadd(key, ...args, ...props)
}
