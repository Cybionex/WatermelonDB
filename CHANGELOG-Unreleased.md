### Highlights

### BREAKING CHANGES

- Minimum supported Node version is now 22 (`engines` moved from `>=18` to `>=22`). Node 18 and 20 are both past end-of-life, and yarn enforces `engines` as a hard error, so installing on an older Node will now fail rather than warn. The CI matrix is correspondingly `['22.x', '24.x']` — previously it listed 18, 20, 22 and 23, three of which were EOL, and never tested the current LTS

### Deprecations

### New features

- [SQLCipher] Add `changePassword(newPassphrase)` API to change encryption key on an open database at runtime (JSI-only)
- [SQLCipher] Add `sqlite3_rekey` support in native C++ layer with post-rekey verification

### Fixes

- [LokiJS] Multitab sync issue fix
- [Android] Added linker flag for building with 16kB page alignment
- [TS] make catchError visible to typescript
- [SQLCipher] Fix use-after-free when encrypted database fails to open (error message was read after `sqlite3_close`)
- [SQLCipher] Fix `throw new` to `throw` in native C++ so exceptions are catchable by `catch(const std::exception&)` handlers
- [SQLCipher] Fix sqlite handle leak on `sqlite3_open` failure (missing `sqlite3_close` before throw)
- [SQLCipher] Zero encryption password from memory after use in Database, DatabaseBridge, and SqliteDb layers
- [SQLCipher] Zero password on error path in `changePassword` bridge method
- [SQLCipher] Throw error when `passphrase` is used without `jsi: true` to prevent silent fallback to unencrypted DB
- [SQLCipher] Make passphrase+jsi invariant run in production builds (not dev-only)
- [SQLCipher] Forward `passphrase` in `testClone` to support encrypted database cloning
- [Android] Align gradle property name `isEncryptedDB` with docs and iOS podspec (was `encryptedDB`)
- [Native] Restore `#include` in shared C++ headers for MSVC/GCC portability (revert `#import`)
- [Native] Restore standard `public:`/`private:` indentation in shared header class declarations
- [Native] Clean up debug log markers (`#####`) in encryption path
- [SQLCipher] Add missing `changePassword` to the Node dispatcher, so calling it without JSI throws the documented "only supported with JSI" error instead of `this._dispatcher.changePassword is not a function`

### Performance

### Changes

- Updated better-sqlite3 to 11.9.1
- Updated `@babel/runtime` to `^7.26.10` (was pinned to exactly `7.26.0`), fixing GHSA-968p-4wvh-cqc8. This was the only known advisory affecting a dependency that ships to consumers. Widening the exact pin to a caret range also lets apps dedupe it against their own `@babel/runtime`

### Internal

- Updated internal dependencies
- Refreshed `yarn.lock` and `Gemfile.lock` within existing version ranges, clearing 99 known advisories in dev/build-only tooling (no dependency ranges changed apart from `@babel/runtime`)
- Scoped the blocking OSV CI gate to the production dependency tree, since `yarn.lock` cannot express dev vs prod and consumers resolve our `dependencies` ranges themselves; dev/build tooling is now scanned informationally
- Ignore `flow-estree`, `flow-parser`, `metro-file-map` and `metro-resolver` in `.flowconfig`, whose newer `.js.flow` files the pinned flow-bin cannot parse
- Fix the 24 Flow errors blocking `yarn ci:check`: drop the stray `// @flow` pragma from `encryption.test.js` (the only test file of 82 that had one, so the only one checked against undeclared jest globals), and rework the conditional spreads in `testClone` to avoid `[exponential-spread]`
- Updated documentation scripts
- [SQLCipher] Add Node Jest tests for encryption validation and passphrase plumbing
- [SQLCipher] Add RN integration tests for encrypted DB round-trip, `changePassword`, and error cases
