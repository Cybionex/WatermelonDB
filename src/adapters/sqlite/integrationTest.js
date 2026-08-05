import { Platform } from 'react-native'
import SQLiteAdapter from './index'
import { testSchema, mockTaskRaw } from '../__tests__/helpers'
import commonTests from '../__tests__/commonTests'
import { invariant } from '../../utils/common'
import DatabaseAdapterCompat from '../compat'

const SQLiteAdapterTest = (spec) => {
  const configurations = [
    Platform.OS !== 'windows'
      ? {
          name: 'SQLiteAdapter (async mode)',
          options: {},
          expectedDispatcherType: 'asynchronous',
        }
      : null,
    { name: 'SQLiteAdapter (JSI mode)', options: { jsi: true }, expectedDispatcherType: 'jsi' },
  ].filter(Boolean)

  configurations.forEach(({ name: configurationName, options, expectedDispatcherType }) => {
    spec.describe(configurationName, () => {
      spec.it('configures adapter correctly', () => {
        const adapter = new SQLiteAdapter({ schema: testSchema, ...options })
        expect(adapter._dispatcherType).toBe(expectedDispatcherType)
      })

      const testCases = commonTests()
      const onlyTestCases = testCases.filter(([, , isOnly]) => isOnly)
      const testCasesToRun = onlyTestCases.length ? onlyTestCases : testCases

      testCasesToRun.forEach((testCase) => {
        const [name, test] = testCase
        spec.it(name, async () => {
          const dbName = `file:testdb${Math.random()}?mode=memory&cache=shared`
          const adapter = new SQLiteAdapter({ schema: testSchema, dbName, ...options })
          invariant(
            adapter._dispatcherType === expectedDispatcherType,
            `Expected adapter to be ${expectedDispatcherType}`,
          )
          await test(
            new DatabaseAdapterCompat(adapter),
            SQLiteAdapter,
            { dbName, ...options },
            Platform.OS,
          )
        })
      })

      if (onlyTestCases.length) {
        spec.it('BROKEN SETUP', async () => {
          throw new Error('Do not commit tests with it.only')
        })
      }

      // Encryption tests are JSI-only (SQLCipher requires JSI dispatcher). JSI alone isn't
      // enough though — SQLCipher is compiled in or out via SQLITE_HAS_CODEC, so the same JS
      // bundle runs against both an encrypted and a plain native build.
      if (expectedDispatcherType === 'jsi') {
        spec.describe('Encryption (SQLCipher)', () => {
          // WMDB_ENCRYPTED is consumed by the native build and never reaches this bundle, so ask
          // the binary what it supports rather than trusting build configuration. If the two ever
          // disagree, the binary is what actually ships.
          //
          // Probe by behaviour rather than by error message: iOS forwards the native message
          // ("Encryption is not supported in this build") verbatim, but on Android a failed open
          // leaves the JSI object unpopulated, so makeDispatcher reports a generic "database
          // failed to open" instead and the original cause is lost.
          const newAdapter = (extra) =>
            new SQLiteAdapter({
              schema: testSchema,
              dbName: `file:testdb${Math.random()}?mode=memory&cache=shared`,
              jsi: true,
              ...extra,
            })

          const supportsEncryption = async () => {
            try {
              await newAdapter({ passphrase: 'probe-passphrase' })._initPromise
              return true
            } catch (error) {
              // Opening with a passphrase failed. Confirm that is specific to encryption — if a
              // plain adapter also fails, something else is broken and should surface, not be
              // silently reported as "encryption unsupported".
              await newAdapter({})._initPromise
              return false
            }
          }

          spec.it('refuses a passphrase when the build has no SQLCipher', async () => {
            if (await supportsEncryption()) {
              return
            }
            // Without SQLCipher a passphrase must be a hard error. Silently returning a plaintext
            // database the caller believes is encrypted is the failure mode this guards against.
            let didThrow = false
            try {
              await newAdapter({ passphrase: 'test-secret-passphrase' })._initPromise
            } catch (error) {
              didThrow = true
            }
            expect(didThrow).toBe(true)
          })

          spec.it('encrypted DB round-trip', async () => {
            if (!(await supportsEncryption())) {
              return
            }
            const dbName = `file:testdb${Math.random()}?mode=memory&cache=shared`
            const passphrase = 'test-secret-passphrase'
            const adapter = new DatabaseAdapterCompat(
              new SQLiteAdapter({ schema: testSchema, dbName, passphrase, jsi: true }),
            )

            const record = mockTaskRaw({ id: 'enc1', text1: 'encrypted-data', order: 1 })
            await adapter.batch([['create', 'tasks', record]])

            // Clone with same passphrase and verify data survives
            const cloned = await adapter.testClone()
            const found = await cloned.find('tasks', 'enc1')
            expect(found).toEqual(record)
          })

          // NOTE: For in-memory databases, each new adapter with a different dbName gets an
          // independent database, so "wrong passphrase" cannot be meaningfully tested.
          // This scenario is best tested with file-based databases on device.

          spec.it('changePassword works', async () => {
            if (!(await supportsEncryption())) {
              return
            }
            const dbName = `file:testdb${Math.random()}?mode=memory&cache=shared`
            const passphrase = 'original-password'
            const rawAdapter = new SQLiteAdapter({
              schema: testSchema,
              dbName,
              passphrase,
              jsi: true,
            })
            const adapter = new DatabaseAdapterCompat(rawAdapter)

            const record = mockTaskRaw({ id: 'cp1', text1: 'before-rekey', order: 1 })
            await adapter.batch([['create', 'tasks', record]])

            // Change the password on the raw adapter
            rawAdapter.changePassword('new-password')

            // Clone with the new passphrase and verify data is still readable
            const cloned = await adapter.testClone()
            const found = await cloned.find('tasks', 'cp1')
            expect(found).toEqual(record)
          })

          spec.it('changePassword with empty string throws', async () => {
            if (!(await supportsEncryption())) {
              return
            }
            const dbName = `file:testdb${Math.random()}?mode=memory&cache=shared`
            const passphrase = 'test-secret'
            const rawAdapter = new SQLiteAdapter({
              schema: testSchema,
              dbName,
              passphrase,
              jsi: true,
            })
            await rawAdapter._initPromise

            let didThrow = false
            try {
              rawAdapter.changePassword('')
            } catch (e) {
              didThrow = true
              expect(e.message).toMatch(/non-empty/)
            }
            expect(didThrow).toBe(true)
          })
        })
      }
    })
  })
}

export default SQLiteAdapterTest
