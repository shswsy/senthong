import { describe, expect, it } from 'vitest'
import { NEXT, checkPicks, cleanNote, clock, dayStart, defaultPicks, presetGroups, validQty } from './menu'

const noodle = { name: 'ก๋วยเตี๋ยว', price: 60, options: presetGroups(['noodle', 'size', 'egg']) }

describe('checkPicks', () => {
  it('prices base + paid choices and builds a readable label', () => {
    const r = checkPicks(noodle, { noodle: ['big'], size: ['special'], egg: ['fried', 'omelet'] })
    expect(r).toEqual({ ok: true, unit: 90, text: 'เส้นใหญ่ · พิเศษ · ไข่ดาว · ไข่เจียว' })
  })

  it('rejects a missing required group', () => {
    const r = checkPicks(noodle, { size: ['normal'] })
    expect(r.ok).toBe(false)
  })

  it('rejects two choices in a single-choice group', () => {
    expect(checkPicks(noodle, { noodle: ['big', 'small'], size: ['normal'] }).ok).toBe(false)
  })

  it('rejects unknown groups and choices (price tampering)', () => {
    expect(checkPicks(noodle, { noodle: ['big'], size: ['normal'], free: ['x'] }).ok).toBe(false)
    expect(checkPicks(noodle, { noodle: ['gold'], size: ['normal'] }).ok).toBe(false)
  })

  it('counts a duplicated add-on once', () => {
    const r = checkPicks(noodle, { noodle: ['big'], size: ['normal'], egg: ['fried', 'fried'] })
    expect(r.ok && r.unit).toBe(70)
  })

  it('rejects non-array picks', () => {
    expect(checkPicks(noodle, { noodle: 'big' as unknown as string[], size: ['normal'] }).ok).toBe(false)
  })

  it('default picks are always valid', () => {
    expect(checkPicks(noodle, defaultPicks(noodle))).toMatchObject({ ok: true, unit: 60 })
  })
})

describe('helpers', () => {
  it('qty bounds', () => {
    expect([0, 1, 20, 21, 1.5, '2'].map(validQty)).toEqual([false, true, true, false, false, false])
  })

  it('note is trimmed, collapsed and capped', () => {
    expect(cleanNote('  ไม่ใส่   ผัก \n')).toBe('ไม่ใส่ ผัก')
    expect(cleanNote('ก'.repeat(200))).toHaveLength(80)
    expect(cleanNote(42)).toBe('')
  })

  it('Bangkok day start and clock', () => {
    const ms = Date.UTC(2026, 10, 17, 18, 30) // 01:30 on the 18th in Bangkok
    expect(new Date(dayStart(ms)).toISOString()).toBe('2026-11-17T17:00:00.000Z')
    expect(clock(ms)).toBe('01:30')
  })

  it('cancelled orders are final', () => {
    expect(NEXT.cancelled).toEqual([])
  })
})
