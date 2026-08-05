import fs from 'fs'
import { testSchema } from '../__tests__/helpers'
import commonTests from '../__tests__/commonTests'

import SqliteAdapter from './index'
import DatabaseAdapterCompat from '../compat'

function removeIfExists(file, dbName) {
  if (file && fs.existsSync(dbName)) {
    fs.unlinkSync(dbName)
  }
}

// NOTE: pid + counter rather than Math.random(). These are only required to be unique, and Jest
// runs test files across worker processes, so the pid is what keeps file-backed databases from
// colliding between workers — a counter alone would not. It also avoids CodeQL's
// js/insecure-randomness, which flags Math.random() reaching the adapter constructor because that
// constructor accepts a `passphrase`, even though this value is only a filename.
let dbNameCounter = 0
const uniqueDbSuffix = () => `${process.pid}-${(dbNameCounter += 1)}`

describe.each([
  // ['SQLiteAdapterNode', 'Asynchronous', 'File'],
  ['SQLiteAdapterNode', 'Asynchronous', 'Memory'],
])('%s (%s/%s)', (adapterSubclass, fileString) => {
  commonTests().forEach((testCase) => {
    const [name, test] = testCase

    if (name.match(/from file system/) && process.platform === 'win32') {
      // eslint-disable-next-line no-console
      console.error(`FIXME: Broken test on Windows! ${name}`)
      return
    }

    // eslint-disable-next-line jest/valid-title
    it(name, async () => {
      const file = fileString.toLowerCase() === 'file'

      // NOTE: one test uses .tmp/xx path, but we have to create it first
      if (!fs.existsSync('.tmp')) {
        fs.mkdirSync('.tmp')
      }

      const dbName = `${process.cwd()}/test${uniqueDbSuffix()}.db${
        file ? '' : '?mode=memory&cache=shared'
      }`
      const extraAdapterOptions = {
        dbName,
        adapterSubclass,
      }
      const adapter = new SqliteAdapter({
        dbName,
        schema: testSchema,
      })

      try {
        await adapter.initializingPromise
        await test(new DatabaseAdapterCompat(adapter), SqliteAdapter, extraAdapterOptions, 'node')
      } finally {
        removeIfExists(file, dbName)
      }
    })
  })
})
