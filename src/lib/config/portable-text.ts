/**
 * Plain text <-> minimal Portable Text (B.05).
 *
 * The essentials editor edits the body as plain paragraphs. Sanity stores the
 * body as Portable Text (an array of blocks). These helpers convert between the
 * two — and, critically, decide whether a given stored body is **safe to round
 * trip** through the plain-text editor at all.
 *
 * Data-loss guard (the reason this is its own tested module): a client's real
 * body may contain rich content the plain-text editor cannot represent — bold,
 * links, headings, lists, images, embeds. Editing such a body as plain text and
 * saving it back would silently strip that content. So {@link isEditableBody}
 * returns `false` for anything richer than simple normal paragraphs, and the
 * editor renders those bodies read-only with a "edit this in Sanity" note rather
 * than risk clobbering them. (The test client uses plain bodies, so the happy
 * path applies; full-fidelity body editing is out of scope here.)
 *
 * Pure logic, no secret — not `server-only`.
 */

/** A Portable Text span (a run of text) as we read/write it. */
interface PTSpan {
  _type?: string
  _key?: string
  text?: unknown
  marks?: unknown
}

/** A Portable Text block (a paragraph) as we read/write it. */
interface PTBlock {
  _type?: string
  _key?: string
  style?: unknown
  listItem?: unknown
  level?: unknown
  markDefs?: unknown
  children?: unknown
}

/** Paragraph break: one blank line (two newlines, tolerant of surrounding space). */
const PARAGRAPH_SPLIT = /\n\s*\n/

/**
 * Convert the editor's plain text into minimal Portable Text: one `normal` block
 * per paragraph (paragraphs separated by a blank line), each a single span. Keys
 * are derived from the paragraph index so they are deterministic (stable across
 * re-saves, and reproducible in tests). Empty/whitespace-only input yields `[]`.
 */
export function textToPortableText(text: string): PTBlock[] {
  if (typeof text !== 'string') return []
  return text
    .split(PARAGRAPH_SPLIT)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
    .map((paragraph, i) => ({
      _type: 'block',
      _key: `b${i}`,
      style: 'normal',
      markDefs: [],
      children: [{ _type: 'span', _key: `b${i}s0`, text: paragraph, marks: [] }],
    }))
}

/**
 * Convert a stored body back into plain text for the editor. A plain string
 * passes through; a Portable Text array joins each block's span text, blocks
 * separated by a blank line. Best-effort and non-throwing: unknown shapes yield
 * an empty string. (For bodies where {@link isEditableBody} is `false` this is
 * still used to populate the read-only view.)
 */
export function portableTextToText(value: unknown): string {
  if (typeof value === 'string') return value
  if (!Array.isArray(value)) return ''

  const paragraphs: string[] = []
  for (const block of value as PTBlock[]) {
    if (!block || typeof block !== 'object') continue
    const children = Array.isArray(block.children) ? block.children : []
    const text = (children as PTSpan[])
      .map((child) => (typeof child?.text === 'string' ? child.text : ''))
      .join('')
    paragraphs.push(text)
  }
  return paragraphs.join('\n\n')
}

/** True when `marks` is absent or an empty array (no inline formatting). */
function hasNoMarks(marks: unknown): boolean {
  return marks === undefined || (Array.isArray(marks) && marks.length === 0)
}

/**
 * Decide whether a stored body can be safely edited as plain text without losing
 * content. Editable only when it is a plain string, empty, or an array of
 * **simple normal paragraphs**: every block is a `block` with `normal` (or
 * unset) style, no list/heading/level, no annotations (`markDefs`), and only
 * unformatted spans as children. Anything richer → `false` (edit it in Sanity).
 */
export function isEditableBody(value: unknown): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return true
  if (!Array.isArray(value)) return false

  return (value as PTBlock[]).every((block) => {
    if (!block || typeof block !== 'object') return false
    if (block._type !== 'block') return false
    if (block.style !== undefined && block.style !== 'normal') return false
    if (block.listItem !== undefined || block.level !== undefined) return false
    if (Array.isArray(block.markDefs) && block.markDefs.length > 0) return false
    if (block.markDefs !== undefined && !Array.isArray(block.markDefs)) return false

    const children = block.children
    if (!Array.isArray(children)) return false
    return (children as PTSpan[]).every(
      (child) =>
        child &&
        typeof child === 'object' &&
        child._type === 'span' &&
        hasNoMarks(child.marks),
    )
  })
}
