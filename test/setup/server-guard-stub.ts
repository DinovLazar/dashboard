/**
 * No-op stand-in for the `server-only` (and `client-only`) marker packages.
 *
 * Our server modules start with `import 'server-only'` so that importing them
 * from a client bundle becomes a Next.js build error. The real `server-only`
 * package throws unless it is resolved under the `react-server` export
 * condition, which the Next.js bundler sets but plain Node (Vitest, the tsx
 * scripts) does not. When we run those modules OUTSIDE the bundler we are
 * already on the server, so the guard is meaningless there — we alias it to
 * this empty module instead.
 *
 * Wired up in `vitest.config.ts` (resolve.alias) and `scripts/tsconfig.json`
 * (compilerOptions.paths). This stub never reaches the real Next.js build, so
 * the genuine guard stays in force for the browser bundle.
 */
export {}
