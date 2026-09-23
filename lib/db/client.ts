import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

function createMockChain(defaultResult: any = []): any {
  const chain: any = () => createMockChain(defaultResult)
  chain.then = (resolve?: (val: any) => any, reject?: (reason: any) => any) =>
    Promise.resolve(defaultResult).then(resolve, reject)
  chain.catch = (reject?: (reason: any) => any) =>
    Promise.resolve(defaultResult).catch(reject)
  chain.finally = (callback?: () => void) =>
    Promise.resolve(defaultResult).finally(callback)

  return new Proxy(chain, {
    get(target, prop) {
      if (prop in target) {
        return target[prop]
      }
      return (..._args: any[]) => createMockChain(defaultResult)
    },
    apply(_target, _thisArg, _argArray) {
      return createMockChain(defaultResult)
    },
  })
}

const mockDb: any = new Proxy({}, {
  get(_target, prop) {
    if (prop === 'transaction') {
      return async (cb: (tx: any) => any) => cb(mockDb)
    }
    if (prop === 'query') {
      return new Proxy({}, {
        get() {
          return {
            findMany: async () => [],
            findFirst: async () => null,
            findUnique: async () => null,
          }
        },
      })
    }
    return () => createMockChain([])
  },
})

let _db: any = null

function getDb() {
  if (!_db) {
    const url = process.env.POSTGRES_URL || process.env.DATABASE_URL
    if (!url) {
      console.warn('[AI Studio] POSTGRES_URL not provided — using in-memory database mock')
      _db = mockDb
    } else {
      try {
        const client = postgres(url)
        _db = drizzle(client, { schema })
      } catch (err) {
        console.warn('[AI Studio] Database connection error — using in-memory mock', err)
        _db = mockDb
      }
    }
  }
  return _db
}

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(target, prop) {
    const activeDb = getDb()
    return Reflect.get(activeDb, prop)
  },
})
