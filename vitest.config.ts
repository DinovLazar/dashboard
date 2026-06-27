import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

/**
 * Vitest config for the portal's unit tests (B.03+).
 *
 * Tests run in a Node environment (the crypto module uses `node:crypto`).
 *
 * `server-only` / `client-only` are aliased to a no-op stub: our server modules
 * `import 'server-only'`, whose real package throws outside the Next.js bundler.
 * In tests we are on the server, so the guard is a no-op — see
 * `test/setup/server-guard-stub.ts`. The genuine guard still protects the real
 * browser bundle, which never uses this config.
 */
const serverGuardStub = fileURLToPath(
  new URL('./test/setup/server-guard-stub.ts', import.meta.url),
)

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: {
      'server-only': serverGuardStub,
      'client-only': serverGuardStub,
    },
  },
})
