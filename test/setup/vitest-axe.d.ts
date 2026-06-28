/**
 * Vitest matcher augmentation for jest-axe's `toHaveNoViolations` (B.08).
 *
 * `@types/jest-axe` augments Jest's `expect`; this teaches Vitest's `expect` the
 * same matcher. The matcher is registered at runtime in
 * `test/setup/a11y-setup.ts` via `expect.extend(toHaveNoViolations)`.
 */
import "vitest"

interface AxeMatchers<R = unknown> {
  /** Asserts that an axe-core run produced zero accessibility violations. */
  toHaveNoViolations(): R
}

declare module "vitest" {
  // Empty bodies are intentional: these are module-augmentation merges that add
  // `toHaveNoViolations` onto Vitest's matcher interfaces. The type param must
  // match Vitest's own `Assertion<T = any>` declaration for the merge to apply.
  /* eslint-disable @typescript-eslint/no-empty-object-type, @typescript-eslint/no-explicit-any */
  interface Assertion<T = any> extends AxeMatchers<T> {}
  interface AsymmetricMatchersContaining extends AxeMatchers {}
  /* eslint-enable @typescript-eslint/no-empty-object-type, @typescript-eslint/no-explicit-any */
}
