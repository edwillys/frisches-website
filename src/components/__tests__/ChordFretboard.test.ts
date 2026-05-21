import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import ChordFretboard from '../ChordFretboard.vue'
import type { LyricsChordDiagram } from '@/types/lyrics'

const b7Diagram: LyricsChordDiagram = {
  frets: ['x', 2, 1, 2, 0, 2],
}

const highPositionDiagram: LyricsChordDiagram = {
  frets: [1, 1, 1, 3, 3, 1],
  baseFret: 5,
}

const fingerDiagram: LyricsChordDiagram = {
  frets: [2, 2, 2, 4, 4, 2],
  fingers: [1, 1, 1, 3, 4, 1],
  baseFret: 1,
}

describe('ChordFretboard', () => {
  // ----- Req 7: 5 frets -----

  it('renders 5 × stringCount cells in the cells layer', () => {
    const wrapper = mount(ChordFretboard, {
      props: { name: 'B7', diagram: b7Diagram },
    })

    // 6 strings × 5 frets = 30 cells
    expect(wrapper.findAll('.chord-fretboard__cell')).toHaveLength(30)
  })

  it('renders the correct number of markers', () => {
    const wrapper = mount(ChordFretboard, {
      props: { name: 'B7', diagram: b7Diagram },
    })

    // B7: frets ['x', 2, 1, 2, 0, 2] → 4 fretted strings (indices 1,2,3,5)
    expect(wrapper.findAll('.chord-fretboard__marker')).toHaveLength(4)
  })

  // ----- Req 7: Markers positioned via gridColumn / gridRow -----

  it('applies gridColumn and gridRow style to each marker', () => {
    const wrapper = mount(ChordFretboard, {
      props: { name: 'B7', diagram: b7Diagram },
    })

    const markers = wrapper.findAll('.chord-fretboard__marker')
    for (const marker of markers) {
      const style = marker.attributes('style') ?? ''
      expect(style).toMatch(/grid-column:\s*\d/)
      expect(style).toMatch(/grid-row:\s*\d/)
    }
  })

  // ----- Req 7: Finger numbers inside markers -----

  it('renders finger numbers inside markers when fingers are provided', () => {
    const wrapper = mount(ChordFretboard, {
      props: { name: 'Test', diagram: fingerDiagram },
    })

    const fingerLabels = wrapper.findAll('.chord-fretboard__finger')
    // All 6 strings are fretted and have finger assignments
    expect(fingerLabels.length).toBeGreaterThan(0)
    const texts = fingerLabels.map((f) => f.text())
    expect(texts).toContain('1')
    expect(texts).toContain('3')
    expect(texts).toContain('4')
  })

  // ----- Req 7: X and O indicators at the bottom -----

  it('renders nut indicators below the fretboard with correct symbols', () => {
    const wrapper = mount(ChordFretboard, {
      props: { name: 'B7', diagram: b7Diagram },
    })

    const nuts = wrapper.findAll('.chord-fretboard__nut')
    expect(nuts).toHaveLength(6)

    // First string is muted (fret 'x')
    expect(nuts[0]!.classes()).toContain('chord-fretboard__nut--muted')
    expect(nuts[0]!.text()).toBe('×')

    // Fifth string is open (fret 0) – filled circle
    expect(nuts[4]!.classes()).toContain('chord-fretboard__nut--open')
    expect(nuts[4]!.text()).toBe('●')

    // Second string is fretted (fret 2) – empty circle
    expect(nuts[1]!.classes()).toContain('chord-fretboard__nut--fretted')
    expect(nuts[1]!.text()).toBe('○')
  })

  it('places the nuts container after the board (below the fretboard)', () => {
    const wrapper = mount(ChordFretboard, {
      props: { name: 'B7', diagram: b7Diagram },
    })

    const frame = wrapper.find('.chord-fretboard__frame')
    const children = Array.from(frame.element.children).map((el) => el.className)
    const boardIdx = children.findIndex((c) => c.includes('chord-fretboard__board'))
    const nutsIdx = children.findIndex((c) => c.includes('chord-fretboard__nuts'))
    expect(nutsIdx).toBeGreaterThan(boardIdx)
  })

  // ----- Req 7: Fret number at top left for non-open positions -----

  it('shows the baseFret position label for non-open-position chords', () => {
    const wrapper = mount(ChordFretboard, {
      props: { name: 'High', diagram: highPositionDiagram },
    })

    expect(wrapper.find('.chord-fretboard__position-label').exists()).toBe(true)
    expect(wrapper.find('.chord-fretboard__position-label').text()).toBe('5fr')
  })

  it('does not show a position label for open-position chords', () => {
    const wrapper = mount(ChordFretboard, {
      props: { name: 'B7', diagram: b7Diagram },
    })

    expect(wrapper.find('.chord-fretboard__position-label').exists()).toBe(false)
  })

  // ----- General: shows chord name -----

  it('renders the chord name', () => {
    const wrapper = mount(ChordFretboard, {
      props: { name: 'Am7', diagram: null },
    })

    expect(wrapper.find('.chord-fretboard__name').text()).toBe('Am7')
  })

  // ----- Compact vs large variants -----

  it('applies compact class when compact prop is true', () => {
    const wrapper = mount(ChordFretboard, {
      props: { name: 'B7', diagram: b7Diagram, compact: true },
    })

    expect(wrapper.find('.chord-fretboard').classes()).toContain('chord-fretboard--compact')
  })

  it('applies large class when large prop is true', () => {
    const wrapper = mount(ChordFretboard, {
      props: { name: 'B7', diagram: b7Diagram, large: true },
    })

    expect(wrapper.find('.chord-fretboard').classes()).toContain('chord-fretboard--large')
  })
})
