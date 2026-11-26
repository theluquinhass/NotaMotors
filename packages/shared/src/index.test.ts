import { describe, expect, it } from 'vitest';
import { PRODUCT_NAME, TRIAL_DAYS } from './index.js';

describe('shared constants', () => {
  it('exposes the product name and trial length', () => {
    expect(PRODUCT_NAME).toBe('NotaMotors');
    expect(TRIAL_DAYS).toBe(14);
  });
});
