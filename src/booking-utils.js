// Pure helpers for the vehicle fields of a booking (no Firebase, so they are unit-testable).
export const VEHICLE_TYPES = ['Van', 'Truck'];
export const TRUCK_TYPES = ['40footer', '20footer', '10ton', '5ton', '3ton', '1ton'];
export const DELIVERY_TYPES = ['Delivery stock', 'Container pull', 'Unloading'];
export const PALLET_OPTIONS = [{ value: 'yes', label: 'Palletized' }, { value: 'no', label: 'Not palletized' }];

/** 'Van' or 'Truck'. Bookings made before vehicle type existed have a truck type, so they count as Truck. */
export const vehicleOf = (b) => b.vehicleType || (b.truckType ? 'Truck' : '');

/** Short text for chips and lists: "Van", or the truck type ("10ton"). */
export const vehicleText = (b) => (vehicleOf(b) === 'Van' ? 'Van' : (b.truckType || ''));

/** "Palletized (12 pallets)" / "Not palletized" / '' when not recorded (older bookings). */
export const palletText = (b) => (b.palletized === true
  ? (b.palletCount ? `Palletized (${b.palletCount} ${b.palletCount === 1 ? 'pallet' : 'pallets'})` : 'Palletized')
  : b.palletized === false ? 'Not palletized' : '');

export const MAX_PALLETS = 9999;

/** Fields to send to Firestore for the vehicle part; unused ones are returned as undefined. */
export function vehicleFields(f) {
  const van = f.vehicleType === 'Van';
  return {
    deliveryType: f.deliveryType,
    vehicleType: f.vehicleType,
    truckType: van ? undefined : f.truckType,
    palletized: f.palletized === 'yes' ? true : false,
    palletCount: f.palletized === 'yes' ? Number(f.palletCount) : undefined,
    plateNumber: (f.plateNumber || '').trim().replace(/\s+/g, ' ') || undefined
  };
}

/** Returns an error message, or '' when the vehicle fields are valid. */
export function vehicleProblem(f) {
  if (!DELIVERY_TYPES.includes(f.deliveryType)) return 'Choose the type of delivery.';
  if (!VEHICLE_TYPES.includes(f.vehicleType)) return 'Choose the type of vehicle (Van or Truck).';
  if (f.vehicleType === 'Truck' && !TRUCK_TYPES.includes(f.truckType)) return 'Choose the type of truck.';
  if (!(f.truckCount >= 1 && f.truckCount <= 6)) return 'Choose the number of vehicles (1-6).';
  if (f.palletized !== 'yes' && f.palletized !== 'no') return 'Choose whether the cargo is palletized.';
  if (f.palletized === 'yes') {
    const n = Number(f.palletCount);
    if (!(f.palletCount !== '' && f.palletCount != null && Number.isInteger(n) && n >= 1 && n <= MAX_PALLETS)) return `Enter how many pallets (1-${MAX_PALLETS}).`;
  }
  if ((f.plateNumber || '').length > 100) return 'Vehicle plate number is too long (max 100 characters).';
  return '';
}
