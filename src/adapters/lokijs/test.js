import { testSchema } from '../__tests__/helpers'
import commonTests from '../__tests__/commonTests'

import LokiJSAdapter from './index'
import DatabaseAdapterCompat from '../compat'

// require('fake-indexeddb/auto')

// NOTE: see the matching comment in ../sqlite/test.js — a counter is unique by construction, and
// these names share commonTests.js with the SQLite adapter, whose constructor CodeQL treats as a
// security context.
let dbNameCounter = 0

describe('LokiJSAdapter (Synchronous / Memory persistence)', () => {
  commonTests().forEach((testCase) => {
    const [name, test] = testCase

    // eslint-disable-next-line jest/valid-title
    it(name, async () => {
      const dbName = `test${process.pid || 'rn'}-${(dbNameCounter += 1)}`
      const adapter = new LokiJSAdapter({
        dbName,
        schema: testSchema,
        useWebWorker: false,
        useIncrementalIndexedDB: false,
      })
      await test(new DatabaseAdapterCompat(adapter), LokiJSAdapter, {
        useWebWorker: false,
        useIncrementalIndexedDB: false,
        dbName,
      })
    })
  })
})

// TODO: Run tests with:
// - mocked/polyfilled web worker
// - legacy indexeddb adapter (fake-indexeddb polyfill)
// - modern indexeddb adapter
