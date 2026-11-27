import { describe, expect, it } from 'vitest';
import { computeAccess, type SubscriptionSnapshot } from './compute-access.js';

const NOW = new Date('2026-12-01T12:00:00Z');
const at = (iso: string) => new Date(iso);

function sub(overrides: Partial<SubscriptionSnapshot> = {}): SubscriptionSnapshot {
  return {
    status: 'trialing',
    trialEndsAt: at('2026-12-10T12:00:00Z'),
    currentPeriodEnd: null,
    manualGrant: false,
    ...overrides,
  };
}

describe('computeAccess', () => {
  it('trial still running: allowed, with days left rounded up', () => {
    const a = computeAccess(sub({ trialEndsAt: at('2026-12-10T11:00:00Z') }), NOW);
    expect(a).toMatchObject({ status: 'trial', allowed: true, reason: null, trialDaysLeft: 9 });
  });

  it('trial with less than a day left still shows 1 day', () => {
    const a = computeAccess(sub({ trialEndsAt: at('2026-12-01T12:00:01Z') }), NOW);
    expect(a).toMatchObject({ status: 'trial', trialDaysLeft: 1 });
  });

  it('trial ending exactly now is already expired', () => {
    const a = computeAccess(sub({ trialEndsAt: NOW }), NOW);
    expect(a).toMatchObject({ status: 'blocked', allowed: false, reason: 'trial_expired' });
    expect(a.trialDaysLeft).toBe(0);
  });

  it('trial expired: blocked', () => {
    const a = computeAccess(sub({ trialEndsAt: at('2026-11-20T00:00:00Z') }), NOW);
    expect(a).toMatchObject({ status: 'blocked', reason: 'trial_expired', trialDaysLeft: 0 });
  });

  it('active subscription within the paid period: allowed', () => {
    const a = computeAccess(
      sub({
        status: 'active',
        trialEndsAt: at('2026-11-01T00:00:00Z'),
        currentPeriodEnd: at('2026-12-31T00:00:00Z'),
      }),
      NOW,
    );
    expect(a).toMatchObject({ status: 'active', allowed: true });
  });

  it('active subscription past its period end: blocked', () => {
    const a = computeAccess(
      sub({ status: 'active', currentPeriodEnd: at('2026-11-30T00:00:00Z') }),
      NOW,
    );
    expect(a).toMatchObject({ status: 'blocked', reason: 'period_ended' });
  });

  it('active subscription without a period end: blocked (fails closed)', () => {
    const a = computeAccess(sub({ status: 'active', currentPeriodEnd: null }), NOW);
    expect(a).toMatchObject({ status: 'blocked', reason: 'period_ended' });
  });

  it('manual grant (pilot store) overrides an expired trial', () => {
    const a = computeAccess(
      sub({ manualGrant: true, trialEndsAt: at('2026-01-01T00:00:00Z') }),
      NOW,
    );
    expect(a).toMatchObject({ status: 'manual', allowed: true });
  });

  it('past due and canceled are blocked', () => {
    expect(computeAccess(sub({ status: 'past_due' }), NOW)).toMatchObject({
      allowed: false,
      reason: 'past_due',
    });
    expect(computeAccess(sub({ status: 'canceled' }), NOW)).toMatchObject({
      allowed: false,
      reason: 'canceled',
    });
  });
});
