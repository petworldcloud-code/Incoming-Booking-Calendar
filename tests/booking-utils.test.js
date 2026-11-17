import { describe, it, expect } from 'vitest';
import { vehicleOf, vehicleText, palletText, vehicleFields, vehicleProblem } from '../src/booking-utils.js';

describe('booking-utils', () => {
  it('treats an older booking with only a truck type as a Truck', () => {
    expect(vehicleOf({ truckType: '10ton' })).toBe('Truck');
    expect(vehicleOf({ vehicleType: 'Van' })).toBe('Van');
    expect(vehicleOf({})).toBe('');
  });

  it('gives short vehicle text', () => {
    expect(vehicleText({ vehicleType: 'Van' })).toBe('Van');
    expect(vehicleText({ vehicleType: 'Truck', truckType: '5ton' })).toBe('5ton');
    expect(vehicleText({ truckType: '1ton' })).toBe('1ton');
  });

  it('describes palletizing, blank for older bookings', () => {
    expect(palletText({ palletized: true })).toBe('Palletized');
    expect(palletText({ palletized: true, palletCount: 12 })).toBe('Palletized (12 pallets)');
    expect(palletText({ palletized: true, palletCount: 1 })).toBe('Palletized (1 pallet)');
    expect(palletText({ palletized: false })).toBe('Not palletized');
    expect(palletText({})).toBe('');
  });

  it('drops the truck type for a van and tidies the plate number', () => {
    expect(vehicleFields({ vehicleType: 'Van', truckType: '10ton', palletized: 'no', plateNumber: '  WXY   1234 ' }))
      .toEqual({ vehicleType: 'Van', truckType: undefined, palletized: false, plateNumber: 'WXY 1234' });
    expect(vehicleFields({ vehicleType: 'Truck', truckType: '10ton', palletized: 'yes', palletCount: '12', plateNumber: '' }))
      .toEqual({ vehicleType: 'Truck', truckType: '10ton', palletized: true, palletCount: 12, plateNumber: undefined });
    // not palletized: any pallet number is forgotten
    expect(vehicleFields({ vehicleType: 'Van', palletized: 'no', palletCount: '7' }).palletCount).toBeUndefined();
  });

  it('validates the fields', () => {
    const ok = { deliveryType: 'Unloading', vehicleType: 'Truck', truckType: '5ton', truckCount: 2, palletized: 'yes', palletCount: '12', plateNumber: '' };
    expect(vehicleProblem(ok)).toBe('');
    expect(vehicleProblem({ ...ok, deliveryType: '' })).toMatch(/delivery/);
    expect(vehicleProblem({ ...ok, deliveryType: 'Pickup' })).toMatch(/delivery/);
    expect(vehicleProblem({ ...ok, vehicleType: '' })).toMatch(/vehicle/);
    expect(vehicleProblem({ ...ok, truckType: '' })).toMatch(/type of truck/);
    expect(vehicleProblem({ ...ok, vehicleType: 'Van', truckType: '' })).toBe('');
    expect(vehicleProblem({ ...ok, truckCount: 0 })).toMatch(/1-6/);
    expect(vehicleProblem({ ...ok, palletized: '' })).toMatch(/palletized/);
    expect(vehicleProblem({ ...ok, palletCount: '' })).toMatch(/how many pallets/);
    expect(vehicleProblem({ ...ok, palletCount: '0' })).toMatch(/how many pallets/);
    expect(vehicleProblem({ ...ok, palletCount: '2.5' })).toMatch(/how many pallets/);
    expect(vehicleProblem({ ...ok, palletCount: '10000' })).toMatch(/how many pallets/);
    expect(vehicleProblem({ ...ok, palletized: 'no', palletCount: '' })).toBe('');
    expect(vehicleProblem({ ...ok, plateNumber: 'x'.repeat(101) })).toMatch(/too long/);
  });
});
