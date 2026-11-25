import { onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { calDoc } from './calendars.js';
import { cleanSlots, cleanCapacity, MAX_SLOTS } from './slot-utils.js';

// settings/slots = { slots: ["08:00-10:00", ...], maxPerSlot?, limits?, updatedAt, updatedBy }. Admin writes, every active user reads.
// maxPerSlot = most vehicles any one slot takes; limits = a different number for single slots.
const ref = () => calDoc('settings', 'slots');

/** Live list of the time slots admins allow (empty = no time slots, bookings just have a date). */
export function watchSlots(cb, onError) {
  return onSnapshot(ref(), (s) => {
    const list = s.exists() ? cleanSlots(s.data().slots) : [];
    cb(list, cleanCapacity(s.exists() ? s.data() : {}, list));
  }, onError);
}

export function saveSlots(uid, slots, capacity = {}) {
  const list = cleanSlots(slots);
  if (list.length > MAX_SLOTS) throw new Error(`At most ${MAX_SLOTS} time slots.`);
  const cap = cleanCapacity(capacity, list);
  return setDoc(ref(), {
    slots: list,
    ...(cap.maxPerSlot ? { maxPerSlot: cap.maxPerSlot } : {}),
    ...(Object.keys(cap.limits).length ? { limits: cap.limits } : {}),
    updatedAt: serverTimestamp(), updatedBy: uid
  });
}
