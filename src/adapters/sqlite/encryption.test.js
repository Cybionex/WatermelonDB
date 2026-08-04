import SQLiteAdapter from './index'
import { testSchema } from '../__tests__/helpers'

const makeAdapter = (options = {}) =>
  new SQLiteAdapter({
    schema: testSchema,
    ...options,
  })

const makeAdapterWithPassphrase = (passphrase = 'test-secret') =>
  new SQLiteAdapter({
    schema: testSchema,
    jsi: true,
    passphrase,
  })

describe('SQLiteAdapter encryption', () => {
  describe('passphrase option', () => {
    it('throws invariant if passphrase is set without jsi: true', () => {
      expect(() => makeAdapter({ passphrase: 'secret' })).toThrow(
        /passphrase.*requires jsi: true/i,
      )
    })

    it('accepts passphrase when jsi: true is set', () => {
      // On Node, jsi falls back to async mode, but the constructor should not throw
      const adapter = makeAdapterWithPassphrase('my-secret')
      expect(adapter).toBeTruthy()
    })

    it('stores passphrase on adapter instance', () => {
      const adapter = makeAdapterWithPassphrase('my-secret')
      expect(adapter.passphrase).toBe('my-secret')
    })

    it('sets passphrase to null when not provided', () => {
      const adapter = makeAdapter()
      expect(adapter.passphrase).toBeNull()
    })
  })

  describe('changePassword', () => {
    it('exists as a method on the adapter', () => {
      const adapter = makeAdapter()
      expect(typeof adapter.changePassword).toBe('function')
    })

    it('throws for empty string passphrase', () => {
      const adapter = makeAdapterWithPassphrase()
      expect(() => adapter.changePassword('')).toThrow(
        'changePassword requires a non-empty passphrase',
      )
    })

    it('throws for null passphrase', () => {
      const adapter = makeAdapterWithPassphrase()
      // $FlowFixMe - intentionally passing null to test validation
      expect(() => adapter.changePassword(null)).toThrow(
        'changePassword requires a non-empty passphrase',
      )
    })

    it('throws for undefined passphrase', () => {
      const adapter = makeAdapterWithPassphrase()
      // $FlowFixMe - intentionally passing undefined to test validation
      expect(() => adapter.changePassword(undefined)).toThrow(
        'changePassword requires a non-empty passphrase',
      )
    })

    it('throws when called on a non-encrypted adapter', () => {
      const adapter = makeAdapter()
      expect(() => adapter.changePassword('new-secret')).toThrow(
        'changePassword can only be called on an encrypted database',
      )
    })

    // NOTE: We cannot test a successful changePassword call on Node because the Node
    // SqliteNodeDispatcher does not implement the changePassword method (it's JSI-only).
    // That code path is only exercisable on React Native with JSI + SQLCipher.
  })
})
