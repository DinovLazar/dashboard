import type { Metadata, Viewport } from 'next'
import { Archivo, Source_Serif_4 } from 'next/font/google'
import './globals.css'

// Archivo (neogrotesque sans for headings) + Source Serif 4 (humanist serif
// for body) — the same pairing as the Vertex marketing site, loaded via
// next/font so the portal reads as Vertex. Both ship full Cyrillic +
// Cyrillic-ext on Google Fonts (kept here for forward-compat with the
// Macedonian client content the editor will handle in later phases). The
// portal chrome itself is English-only for v1.
const archivo = Archivo({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-heading',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
})

const sourceSerif = Source_Serif_4({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-body',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: {
    default: 'Vertex Client Portal',
    template: '%s · Vertex Client Portal',
  },
  description:
    'Manage your blog on your Vertex-built website — write, edit, and publish posts from one branded portal.',
  robots: {
    // The portal is a private, login-only tool; keep it out of search indexes.
    index: false,
    follow: false,
  },
}

export const viewport: Viewport = {
  themeColor: '#0E0E0E',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      data-theme="dark"
      // `dark` activates the shadcn base-nova `dark:` refinement variants
      // (the `&:is(.dark *)` custom variant in globals.css); `data-theme`
      // pairs with `color-scheme: dark`. The portal has no light mode.
      className={`dark ${archivo.variable} ${sourceSerif.variable}`}
    >
      <body className="min-h-screen font-body antialiased">{children}</body>
    </html>
  )
}
