import type { NextConfig } from 'next'

// Lean B.01 config. The portal serves only the authenticated editor surface —
// no public marketing pages, no i18n routing, no 3D/animation packages — so this
// stays minimal on purpose. The Sanity image CDN (`cdn.sanity.io`) remote pattern
// and any other integration config arrive in the phase that needs them (B.06).
const nextConfig: NextConfig = {}

export default nextConfig
