import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

/**
 * Vitest config for the portal's tests.
 *
 * Two projects share one set of resolve aliases:
 *  - **unit** (`*.test.ts`, Node env) — the B.03–B.07 logic/crypto/isolation
 *    tests. The crypto module uses `node:crypto`, so these stay in Node.
 *  - **a11y** (`*.test.tsx`, jsdom env) — the B.08 offline accessibility tests:
 *    render the presentational components with `@testing-library/react` and
 *    assert zero `axe` violations. These need a DOM, so they run in jsdom with
 *    `test/setup/a11y-setup.ts` (registers the axe matcher + RTL cleanup +
 *    inert stand-ins for the browser APIs base-ui's dialog touches).
 *
 * `server-only` / `client-only` are aliased to a no-op stub: our server modules
 * `import 'server-only'`, whose real package throws outside the Next.js bundler.
 * In tests we are on the server, so the guard is a no-op — see
 * `test/setup/server-guard-stub.ts`. The genuine guard still protects the real
 * browser bundle, which never uses this config.
 *
 * `@` is aliased to `src/` to mirror the `@/*` → `./src/*` tsconfig path the app
 * code uses, so modules that import each other via `@/lib/...` (and the B.08
 * components that import `@/components/...`) resolve under Vitest exactly as they
 * do in the Next build.
 */
const serverGuardStub = fileURLToPath(
  new URL('./test/setup/server-guard-stub.ts', import.meta.url),
)
const srcDir = fileURLToPath(new URL('./src', import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      'server-only': serverGuardStub,
      'client-only': serverGuardStub,
      '@': srcDir,
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          include: ['src/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'a11y',
          environment: 'jsdom',
          include: ['src/**/*.test.tsx'],
          setupFiles: ['./test/setup/a11y-setup.ts'],
        },
      },
    ],
  },
})
