# Redis Stream Utilities

I find that in my work with Redis streams I often have to write the same
functionality, just a little different for the given use case. `stream-utils` is
an attempt to consolidate these utility functions so I (and others) can use them
more easily.

Documentation is - except for the examples below - currently absent. The source
code itself should give you a pretty good idea of what options are supported.

This module is a work-in-progress. Bug reports and pull requests are more than
welcome!

## Install

```
npm i @art-of-coding/stream-utils
```

## Usage

### Connection Pool

A basic and naive Redis connection pool.

```typescript
import IORedis from "ioredis";
import { ConnectionPool } from "@art-of-coding/stream-utils";

const connection = new IORedis();
const pool = new ConnectionPool({ connection });

// somewhere else...

const [connection, release] = pool.get();
// do something with the connection...
// and release it back into the pool
release();
```

### Streams Reader

This little piece of code may become the successor to
[redis-streams-manager](https://github.com/MichielvdVelde/redis-streams-manager)
and my favorite way to work with streams.

The core of the reader is `xread` as an async iterator. The reader manages
multiple streams automatically, starting and stopping consumption as required.
You can use the same reader to consume multiple streams simultaneously.

The reader makes use of the blocking version of `xread`, so it requires a
dedicated Redis connection.

```typescript
import IORedis from "ioredis";
import { StreamsReader } from "@art-of-coding/stream-utils";

const blockingConnection = new IORedis();
const reader = new StreamsReader(blockingConnection, {
  count: 5, // defaults to max 5 entries per stream per xread command
  blockingTimeout: 5000, // defaults to 5000 ms
});

const ac = new AbortController();

for await (
  const [entry, id] of reader.read("stream-key", { id: "$", signal: ac.signal })
) {
  // do something with the entry...
}
```

### xrange

The [`xrange`](https://redis.io/commands/xrange) command as an async iterator.

```typescript
import IORedis from "ioredis";
import { xrange } from "@art-of-coding/stream-utils";

const connection = new IORedis();

for await (const [entry, id] of xrange(connection, "key")) {
  // do something with the entry...
}
```

### xrevrange

The [`xrevrange`](https://redis.io/commands/xrevrange) command as an async
iterator.

```typescript
import IORedis from "ioredis";
import { xrevrange } from "@art-of-coding/stream-utils";

const connection = new IORedis();

for await (const [entry, id] of xrevrange(connection, "key")) {
  // do something with the entry...
}
```

### xread

The [`xread`](https://redis.io/commands/xread) command as an async iterator.

```typescript
import IORedis from "ioredis";
import { xread } from "@art-of-coding/stream-utils";

const connection = new IORedis();
const ac = new AbortController();

for await (
  const [entry, id] of xread(connection, "key", { signal: ac.signel })
) {
  // do something with the entry...

  // call the abort method to break out of the loop
  ac.abort();
}
```

## License

Copyright 2021 [Michiel van der Velde](https://michielvdvelde.nl).

This software is licensed under [the MIT License](LICENSE).
