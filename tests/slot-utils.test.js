import { describe, it, expect } from 'vitest';
import { makeSlot, cleanSlots, generateSlots, slotLabel, slotStart, SLOT_RE, MAX_SLOTS, cleanCapacity, slotLimit, slotUsed, parseLimit } from '../src/slot-utils.js';

describe('slot-utils', () => {
  it('builds a slot from two times', () => {
    expect(makeSlot('08:00', '10:00')).toBe('08:00-10:00');
    expect(SLOT_RE.test(makeSlot('00:00', '23:59'))).toBe(true);
  });

  it('rejects a missing, reversed or empty range', () => {
    expect(() => makeSlot('', '10:00')).toThrow();
    expect(() => makeSlot('10:00', '08:00')).toThrow(/after the start/);
    expect(() => makeSlot('09:00', '09:00')).toThrow();
  });

  it('cleans a list: drops junk and duplicates, sorts by start time', () => {
    expect(cleanSlots(['10:00-12:00', '08:00-10:00', '08:00-10:00', 'bad', '12:00-11:00', 5, null]))
      .toEqual(['08:00-10:00', '10:00-12:00']);
    expect(cleanSlots(undefined)).toEqual([]);
  });

  it('splits a period into equal slots', () => {
    expect(generateSlots('08:00', '12:00', 60)).toEqual(['08:00-09:00', '09:00-10:00', '10:00-11:00', '11:00-12:00']);
    expect(generateSlots('08:00', '12:00', 120)).toEqual(['08:00-10:00', '10:00-12:00']);
  });

  it('shortens the last slot when the period does not divide evenly', () => {
    expect(generateSlots('08:00', '11:00', 120)).toEqual(['08:00-10:00', '10:00-11:00']);
  });

  it('refuses too-short slots and too many slots', () => {
    expect(() => generateSlots('08:00', '12:00', 5)).toThrow(/15 minutes/);
    expect(() => generateSlots('00:00', '23:00', 15)).toThrow(new RegExp(`limit is ${MAX_SLOTS}`));
  });

  it('formats for display', () => {
    expect(slotLabel('08:00-10:00')).toBe('08:00 – 10:00');
    expect(slotStart('08:00-10:00')).toBe('08:00');
    expect(slotLabel(undefined)).toBe('');
    expect(slotStart('')).toBe('');
  });
});

describe('vehicles per slot', () => {
  const cap = cleanCapacity({ maxPerSlot: 4, limits: { '08:00-09:00': 2, '09:00-10:00': 0, '11:00-12:00': 3 } }, ['08:00-09:00', '09:00-10:00', '10:00-11:00']);
  it('keeps valid limits for offered slots only', () => {
    expect(cap).toEqual({ maxPerSlot: 4, limits: { '08:00-09:00': 2 } });
    expect(cleanCapacity({}, ['08:00-09:00'])).toEqual({ maxPerSlot: null, limits: {} });
    expect(cleanCapacity({ maxPerSlot: 1.5 }, []).maxPerSlot).toBeNull();
  });
  it('uses the single-slot number first, then the all-slots number', () => {
    expect(slotLimit('08:00-09:00', cap)).toBe(2);
    expect(slotLimit('10:00-11:00', cap)).toBe(4);
    expect(slotLimit('', cap)).toBeNull();
    expect(slotLimit('08:00-09:00', { maxPerSlot: null, limits: {} })).toBeNull();
  });
  it('adds up vehicles in one slot on one date, leaving out the booking being edited', () => {
    const b = [
      { id: 'a', bookingDate: '2026-11-26', timeSlot: '08:00-09:00', truckCount: 3 },
      { id: 'b', bookingDate: '2026-11-26', timeSlot: '08:00-09:00', truckCount: 2 },
      { id: 'c', bookingDate: '2026-11-26', timeSlot: '09:00-10:00', truckCount: 6 },
      { id: 'd', bookingDate: '2026-11-27', timeSlot: '08:00-09:00', truckCount: 6 },
      { id: 'e', bookingDate: '2026-11-26', timeSlot: '08:00-09:00' }
    ];
    expect(slotUsed(b, '2026-11-26', '08:00-09:00')).toBe(6);
    expect(slotUsed(b, '2026-11-26', '08:00-09:00', 'a')).toBe(3);
  });
  it('parses what an admin types', () => {
    expect(parseLimit('')).toBeNull();
    expect(parseLimit(' 4 ')).toBe(4);
    expect(() => parseLimit('0')).toThrow();
    expect(() => parseLimit('2.5')).toThrow();
    expect(() => parseLimit('100')).toThrow();
  });
});
