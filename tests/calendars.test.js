import { describe, it, expect } from 'vitest';
import {
  cleanCalendarCode, calendarBase, canUseCalendar, visibleCalendars, pickCalendar,
  nextCompanyColor, cleanCompany, companyId, COMPANY_COLORS,
  calendarName, canManageCalendar, adminCalendars, userCalendars, roleChange, isFullAdmin
} from '../src/calendar-utils.js';

const admin = { role: 'admin', status: 'active' };
const tgStaff = { role: 'staff', status: 'active', calendar: 'tg' };
const cadmin = { role: 'cadmin', status: 'active', calendars: ['tgyfm', 'tgmms'] };
const cals = [
  { id: 'tg', order: 2 }, { id: 'dim', order: 1 }, { id: 'nf', order: 3 }, { id: 'old', order: 4, active: false }
];

describe('calendar codes and paths', () => {
  it('cleans codes', () => {
    expect(cleanCalendarCode(' TG ')).toBe('tg');
    expect(() => cleanCalendarCode('1a')).toThrow();
    expect(() => cleanCalendarCode('a')).toThrow();
    expect(() => cleanCalendarCode('a b')).toThrow();
  });
  it('builds paths; no calendar = old root paths', () => {
    expect(calendarBase('tg')).toEqual(['calendars', 'tg']);
    expect(calendarBase(null)).toEqual([]);
  });
});

describe('access', () => {
  it('admin can use any calendar, staff only their own', () => {
    expect(canUseCalendar(admin, 'nf')).toBe(true);
    expect(canUseCalendar(tgStaff, 'tg')).toBe(true);
    expect(canUseCalendar(tgStaff, 'dim')).toBe(false);
  });
  it('suspended, missing or calendar-less accounts get nothing', () => {
    expect(canUseCalendar({ ...tgStaff, status: 'suspended' }, 'tg')).toBe(false);
    expect(canUseCalendar({ role: 'staff', status: 'active' }, 'tg')).toBe(false);
    expect(canUseCalendar(null, 'tg')).toBe(false);
  });
  it('lists visible calendars in order, hiding archived ones', () => {
    expect(visibleCalendars(admin, cals).map((c) => c.id)).toEqual(['dim', 'tg', 'nf']);
    expect(visibleCalendars(tgStaff, cals).map((c) => c.id)).toEqual(['tg']);
  });
  it('picks a calendar from the link only if allowed', () => {
    expect(pickCalendar(admin, cals, '#nf')).toBe('nf');
    expect(pickCalendar(admin, cals, '')).toBe('dim');
    expect(pickCalendar(tgStaff, cals, '#dim')).toBe('tg');
    expect(pickCalendar({ role: 'staff', status: 'active' }, cals, '')).toBe(null);
  });
});

describe('companies', () => {
  it('gives each company a different colour first', () => {
    const a = nextCompanyColor([]);
    const b = nextCompanyColor([{ color: a }]);
    expect(b).not.toBe(a);
    expect(nextCompanyColor(COMPANY_COLORS.map((color) => ({ color })))).toBeTruthy();
  });
  it('validates and tidies a company', () => {
    expect(cleanCompany({ name: '  Tefal   Malaysia ' }, [])).toMatchObject({ name: 'Tefal Malaysia' });
    expect(() => cleanCompany({ name: '' }, [])).toThrow();
    expect(() => cleanCompany({ name: 'x', color: 'red' }, [])).toThrow();
    expect(() => cleanCompany({ name: 'tefal' }, [{ id: 'tefal', name: 'Tefal' }])).toThrow();
    expect(cleanCompany({ name: 'Tefal' }, [{ id: 'tefal', name: 'Tefal' }], 'tefal').name).toBe('Tefal');
  });
  it('makes unique ids', () => {
    expect(companyId('Tefal Malaysia', [])).toBe('tefal-malaysia');
    expect(companyId('Tefal', [{ id: 'tefal' }])).toBe('tefal-2');
    expect(companyId('!!!', [])).toBe('company');
  });
});

describe('calendar administrators', () => {
  it('open only their own calendars', () => {
    expect(canUseCalendar(cadmin, 'tgyfm')).toBe(true);
    expect(canUseCalendar(cadmin, 'tgmms')).toBe(true);
    expect(canUseCalendar(cadmin, 'dim')).toBe(false);
    expect(canUseCalendar({ ...cadmin, status: 'suspended' }, 'tgyfm')).toBe(false);
    expect(canUseCalendar({ role: 'cadmin', status: 'active' }, 'tgyfm')).toBe(false); // no calendars on the profile
  });
  it('manage only their own calendars; a full admin manages all; staff none', () => {
    expect(canManageCalendar(cadmin, 'tgmms')).toBe(true);
    expect(canManageCalendar(cadmin, 'dim')).toBe(false);
    expect(canManageCalendar(admin, 'dim')).toBe(true);
    expect(canManageCalendar(tgStaff, 'tg')).toBe(false);
    expect(canManageCalendar({ ...cadmin, status: 'suspended' }, 'tgyfm')).toBe(false);
    expect(canManageCalendar(null, 'tg')).toBe(false);
  });
  it('see their calendars in the switcher, in order, without archived ones', () => {
    const list = [{ id: 'tgmms', order: 6 }, { id: 'dim', order: 1 }, { id: 'tgyfm', order: 5 }, { id: 'old', order: 7, active: false }];
    expect(visibleCalendars(cadmin, list).map((c) => c.id)).toEqual(['tgyfm', 'tgmms']);
    expect(pickCalendar(cadmin, list, '#dim')).toBe('tgyfm'); // a link to another calendar is ignored
  });
  it('lists the calendars of a calendar admin only', () => {
    expect(adminCalendars(cadmin)).toEqual(['tgyfm', 'tgmms']);
    expect(adminCalendars(admin)).toEqual([]);
    expect(adminCalendars({ role: 'cadmin', calendars: 'tg' })).toEqual([]);
    expect(isFullAdmin(admin)).toBe(true);
    expect(isFullAdmin(cadmin)).toBe(false);
  });
});

describe('role changes in the users table', () => {
  it('admin needs nothing more', () => {
    expect(roleChange(tgStaff, 'admin')).toEqual({ role: 'admin' });
  });
  it('staff to calendar admin keeps their calendar as the first one', () => {
    expect(roleChange(tgStaff, 'cadmin')).toEqual({ role: 'cadmin', calendars: ['tg'] });
  });
  it('calendar admin to staff keeps all their calendars', () => {
    expect(roleChange(cadmin, 'staff')).toEqual({ role: 'staff', calendar: 'tgyfm', calendars: ['tgyfm', 'tgmms'] });
    expect(roleChange({ ...cadmin, calendars: ['tg'] }, 'staff')).toEqual({ role: 'staff', calendar: 'tg', calendars: [] });
  });
  it('asks for a choice when there is no calendar to carry over', () => {
    expect(roleChange(admin, 'staff')).toBe(null);
    expect(roleChange(admin, 'cadmin')).toBe(null);
  });
});

describe('calendar names', () => {
  it('shows the saved name, else the code in capitals', () => {
    const list = [{ id: 'tgyfm', name: 'TG YFM' }, { id: 'nf', name: '  ' }, { id: 'pme' }];
    expect(calendarName('tgyfm', list)).toBe('TG YFM');
    expect(calendarName('nf', list)).toBe('NF');
    expect(calendarName('pme', list)).toBe('PME');
    expect(calendarName('zz', list)).toBe('ZZ');
    expect(calendarName('tg', undefined)).toBe('TG');
  });
});

describe('staff with several calendars', () => {
  const both = { role: 'staff', status: 'active', calendar: 'tgyfm', calendars: ['tgyfm', 'tgmms'] };
  it('open each of their calendars, no others, and cannot manage any', () => {
    expect(canUseCalendar(both, 'tgyfm')).toBe(true);
    expect(canUseCalendar(both, 'tgmms')).toBe(true);
    expect(canUseCalendar(both, 'dim')).toBe(false);
    expect(canManageCalendar(both, 'tgmms')).toBe(false);
  });
  it('lists their calendars once, in the saved order', () => {
    expect(userCalendars(both)).toEqual(['tgyfm', 'tgmms']);
    expect(userCalendars({ role: 'staff', calendar: 'tg' })).toEqual(['tg']);
    expect(userCalendars({ role: 'staff' })).toEqual([]);
    expect(userCalendars(admin)).toEqual([]);
    expect(visibleCalendars(both, [{ id: 'tgmms', order: 6 }, { id: 'tgyfm', order: 5 }, { id: 'dim', order: 1 }]).map((c) => c.id)).toEqual(['tgyfm', 'tgmms']);
  });
});
