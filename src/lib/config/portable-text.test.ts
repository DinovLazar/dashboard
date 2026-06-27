import { describe, expect, it } from 'vitest'

import {
  isEditableBody,
  portableTextToText,
  textToPortableText,
} from './portable-text'

/**
 * B.05 — plain text <-> minimal Portable Text, and the data-loss guard. Proves
 * paragraphs round-trip, and that anything richer than simple normal paragraphs
 * is reported NOT editable (so the editor never silently strips a client's rich
 * body).
 */

describe('textToPortableText', () => {
  it('makes one normal block per paragraph (split on blank lines)', () => {
    const blocks = textToPortableText('First para.\n\nSecond para.')
    expect(blocks).toHaveLength(2)
    expect(blocks[0]).toMatchObject({
      _type: 'block',
      style: 'normal',
      markDefs: [],
      children: [{ _type: 'span', text: 'First para.', marks: [] }],
    })
    expect(blocks[1]).toMatchObject({
      children: [{ text: 'Second para.' }],
    })
  })

  it('drops empty/whitespace paragraphs and trims', () => {
    expect(textToPortableText('  One  \n\n\n\n   \n\n Two ')).toMatchObject([
      { children: [{ text: 'One' }] },
      { children: [{ text: 'Two' }] },
    ])
  })

  it('returns [] for empty or whitespace-only text', () => {
    expect(textToPortableText('')).toEqual([])
    expect(textToPortableText('   \n  \n ')).toEqual([])
  })

  it('uses deterministic keys (stable across calls)', () => {
    expect(textToPortableText('A\n\nB')).toEqual(textToPortableText('A\n\nB'))
  })
})

describe('portableTextToText', () => {
  it('passes a plain string through', () => {
    expect(portableTextToText('already text')).toBe('already text')
  })

  it('joins span text per block, blocks separated by a blank line', () => {
    const blocks = textToPortableText('Hello\n\nWorld')
    expect(portableTextToText(blocks)).toBe('Hello\n\nWorld')
  })

  it('round-trips multi-paragraph text', () => {
    const text = 'Para one.\n\nPara two has\na soft detail.\n\nPara three.'
    expect(portableTextToText(textToPortableText(text))).toBe(
      'Para one.\n\nPara two has\na soft detail.\n\nPara three.',
    )
  })

  it('returns "" for non-string, non-array values', () => {
    expect(portableTextToText(null)).toBe('')
    expect(portableTextToText({ _type: 'image' })).toBe('')
  })
})

describe('isEditableBody', () => {
  it('treats empty, null, and plain strings as editable', () => {
    expect(isEditableBody(null)).toBe(true)
    expect(isEditableBody(undefined)).toBe(true)
    expect(isEditableBody('plain body')).toBe(true)
    expect(isEditableBody([])).toBe(true)
  })

  it('treats simple normal paragraphs as editable', () => {
    expect(isEditableBody(textToPortableText('A\n\nB'))).toBe(true)
  })

  it('rejects a block with an inline mark (e.g. bold)', () => {
    const body = [
      {
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [{ _type: 'span', text: 'bold', marks: ['strong'] }],
      },
    ]
    expect(isEditableBody(body)).toBe(false)
  })

  it('rejects a block with annotations (markDefs, e.g. a link)', () => {
    const body = [
      {
        _type: 'block',
        style: 'normal',
        markDefs: [{ _key: 'a', _type: 'link', href: 'https://x.test' }],
        children: [{ _type: 'span', text: 'linked', marks: ['a'] }],
      },
    ]
    expect(isEditableBody(body)).toBe(false)
  })

  it('rejects a heading style and list items (rich structure)', () => {
    expect(
      isEditableBody([{ _type: 'block', style: 'h2', children: [] }]),
    ).toBe(false)
    expect(
      isEditableBody([
        { _type: 'block', style: 'normal', listItem: 'bullet', level: 1, children: [] },
      ]),
    ).toBe(false)
  })

  it('rejects non-block content (e.g. an image or embed)', () => {
    expect(isEditableBody([{ _type: 'image', asset: {} }])).toBe(false)
    expect(
      isEditableBody([
        { _type: 'block', style: 'normal', children: [{ _type: 'image' }] },
      ]),
    ).toBe(false)
  })

  it('rejects a non-array, non-string object', () => {
    expect(isEditableBody({ _type: 'block' })).toBe(false)
    expect(isEditableBody(42)).toBe(false)
  })
})
