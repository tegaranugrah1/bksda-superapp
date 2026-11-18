import { calcLeaveDurationDays } from '../FormulirCutiModal';

describe('calcLeaveDurationDays', () => {
  it('counts working days excluding weekends and calendar days inclusively', () => {
    // Fri 2026-11-20 to Mon 2026-11-23: Fri + Mon = 2 working days, 4 calendar days
    expect(calcLeaveDurationDays('2026-11-20', '2026-11-23', true)).toBe(2);
    expect(calcLeaveDurationDays('2026-11-20', '2026-11-23', false)).toBe(4);
    expect(calcLeaveDurationDays('2026-11-18', '2026-11-18', true)).toBe(1);
    expect(calcLeaveDurationDays('2026-11-21', '2026-11-22', true)).toBe(0);
    expect(calcLeaveDurationDays('2026-11-23', '2026-11-20', true)).toBe(0);
  });
});
