import type { NextConfig } from 'next'

// The portal serves only the authenticated editor surface — no public marketing
// pages, no i18n routing, no 3D/animation packages — so this stays minimal.
//
// B.06 adds exactly two things, both required by featured-image upload:
//  - `images.remotePatterns`: allow `next/image` to render featured-image
//    previews served from Sanity's CDN (`https://cdn.sanity.io/...`). Only that
//    host is allowed; any other responds 400.
//  - `experimental.serverActions.bodySizeLimit`: raise the Server Action request
//    body cap above the 4 MB app-level image cap so the app's own friendly
//    validation rejects an oversize image first. (The Vercel Function 4.5 MB
//    request-body ceiling remains the hard, unraisable physical limit — see the
//    2026-06-27 Decisions entry; the 4 MB app cap stays safely under it.)
//
// Both keys/shapes confirmed against this Next version's in-repo docs
// (`node_modules/next/dist/docs/.../05-config/01-next-config-js/images.md` and
// `.../serverActions.md`, Next 16.2.3).
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'cdn.sanity.io' }],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
  },
}

export default nextConfig
