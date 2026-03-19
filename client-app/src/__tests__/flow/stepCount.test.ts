import { describe, expect, it } from 'vitest';

const STEPS = [
  '/apply/step-1',
  '/apply/step-2',
  '/apply/step-3',
  '/apply/step-4',
  '/apply/step-5',
  '/apply/step-6',
];

describe('Application step flow', () => {
  it('should have exactly 6 steps (update if spec changes)', () => {
    expect(STEPS.length).toBe(6);
  });
});
