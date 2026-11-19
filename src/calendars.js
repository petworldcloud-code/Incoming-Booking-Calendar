import { collection, doc, onSnapshot, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase.js';
import { calendarBase, cleanCalendarCode } from './calendar-utils.js';

// calendars/{cal} = { name, order, active, createdAt, updatedAt }. Admin writes; signed-in users read.
// The data modules (bookings, slots, ...) read the "current calendar" from here, so switching
// calendars is one setCalendar() call plus re-subscribing. null = the old single-calendar paths.
let current = null;
export const getCalendar = () => current;
export function setCalendar(cal) { current = cal || null; }

/** collection()/doc() under the current calendar, e.g. calCollection('bookings'). */
export const calCollection = (...segs) => collection(db, ...calendarBase(current), ...segs);
export const calDoc = (...segs) => doc(db, ...calendarBase(current), ...segs);

const col = () => collection(db, 'calendars');

export function watchCalendars(cb, onError) {
  return onSnapshot(col(), (s) => cb(s.docs.map((d) => ({ id: d.id, ...d.data() }))), onError);
}

/** The name shown for a calendar ("TG YFM"); blank = the code in capitals. */
function cleanCalendarName(raw, id) {
  const n = String(raw || '').trim().replace(/\s+/g, ' ');
  if (n.length > 40) throw new Error('Calendar name is too long (max 40).');
  return n || id.toUpperCase();
}

export function createCalendar(code, order = 0, name = '') {
  const id = cleanCalendarCode(code);
  return setDoc(doc(col(), id), {
    name: cleanCalendarName(name, id), order, active: true, createdAt: serverTimestamp(), updatedAt: serverTimestamp()
  });
}

/** Change the name shown for a calendar (the code stays). */
export function renameCalendar(id, name) {
  return updateDoc(doc(col(), id), { name: cleanCalendarName(name, id), updatedAt: serverTimestamp() });
}

/** Archive hides a calendar from staff; its data is kept. */
export function setCalendarActive(id, active) {
  return updateDoc(doc(col(), id), { active: !!active, updatedAt: serverTimestamp() });
}
