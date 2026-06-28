import { afterEach, expect } from "vitest"
import { cleanup } from "@testing-library/react"
import { toHaveNoViolations } from "jest-axe"

/**
 * Setup for the jsdom **a11y** test project (B.08). Loaded only for `*.test.tsx`
 * (see `vitest.config.ts`), so everything here can assume a DOM.
 */

// Teach Vitest's `expect` jest-axe's matcher (types: test/setup/vitest-axe.d.ts).
expect.extend(toHaveNoViolations)

// Unmount React Testing Library output between tests so axe never inspects a
// stale tree and the document starts clean each time.
afterEach(() => {
  cleanup()
})

// jsdom doesn't implement the browser APIs base-ui's dialog/focus machinery
// reaches for on mount. Inert stand-ins keep components rendering under test;
// they don't affect what axe evaluates (structure, roles, names, contrast props).
if (typeof window.matchMedia !== "function") {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList
}

class NoopObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): [] {
    return []
  }
}
globalThis.ResizeObserver ??= NoopObserver as unknown as typeof ResizeObserver
globalThis.IntersectionObserver ??=
  NoopObserver as unknown as typeof IntersectionObserver

if (typeof Element.prototype.scrollIntoView !== "function") {
  Element.prototype.scrollIntoView = function scrollIntoView() {}
}

// axe probes a <canvas> 2D context for the colour-contrast rule; jsdom has no
// canvas backend, so this only prints "Not implemented" noise (contrast is
// verified separately against the real tokens). A null-returning stub makes axe
// skip the probe quietly without changing any result.
HTMLCanvasElement.prototype.getContext =
  (() => null) as typeof HTMLCanvasElement.prototype.getContext
