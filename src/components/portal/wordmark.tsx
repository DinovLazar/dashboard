import { cn } from "@/lib/utils"

/**
 * The Vertex brand mark — the "V" chevron on a dark rounded tile. Copied from
 * the marketing site's `icon.svg` so the portal carries the real brand mark,
 * not an approximation.
 */
function VertexMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      role="img"
      aria-label="Vertex"
      className={className}
    >
      <defs>
        <linearGradient id="vtx-mark-tile" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1C1C1C" />
          <stop offset="1" stopColor="#0E0E0E" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="22" fill="url(#vtx-mark-tile)" />
      <path
        d="M20 24 L38 24 L50 54 L62 24 L80 24 L50 76 Z"
        fill="#F5F5F5"
        stroke="#F5F5F5"
        strokeWidth="6"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

/**
 * Lockup of the brand mark + the "VERTEX" wordmark, with an optional eyebrow
 * tag underneath (e.g. "Client Portal"). The wordmark treatment — Archivo,
 * bold, tight tracking, uppercase — mirrors the marketing site's navbar logo.
 */
export function Wordmark({
  className,
  tag = "Client Portal",
}: {
  className?: string
  tag?: string | null
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <VertexMark className="size-8 shrink-0" />
      <span className="flex flex-col leading-none">
        <span className="font-heading text-body-lg font-bold tracking-tight text-foreground">
          VERTEX
        </span>
        {tag ? (
          <span className="overline mt-1.5 text-muted-foreground">{tag}</span>
        ) : null}
      </span>
    </span>
  )
}
