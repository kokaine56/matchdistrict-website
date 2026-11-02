import test from 'node:test';
import assert from 'node:assert/strict';

test('Free Tournament Flow - Display normalization', () => {
  // Simulate withTournamentDisplay logic
  function testWithTournamentDisplay(r) {
    const basePrize = parseInt(r.prize_pool_amount) || 0;
    const totalPrize = basePrize;
    return {
      ...r,
      is_free: Boolean(r.is_free),
      prize: (() => {
        if (r.is_free) return '';
        if (totalPrize > 0) return `\u20B9${totalPrize.toLocaleString('en-IN')}`;
        if (r.prize && r.prize !== 'TBD' && r.prize !== 'TBA') return r.prize;
        return 'TBD';
      })(),
      entry: r.is_free ? 'Free' : (r.entry_fee_amount ? `₹${parseInt(r.entry_fee_amount)}` : (r.entry || 'Free')),
    };
  }

  const freeTourney = testWithTournamentDisplay({
    id: 'TRN-FREE-1',
    is_free: true,
    prize_pool_amount: 0,
    entry_fee_amount: 0,
    prize: 'TBD',
    entry: 'Free',
  });

  assert.equal(freeTourney.is_free, true);
  assert.equal(freeTourney.prize, '', 'Free tournament prize must be empty string, never TBD or ₹0');
  assert.equal(freeTourney.entry, 'Free', 'Free tournament entry must be Free');

  const paidTourney = testWithTournamentDisplay({
    id: 'TRN-PAID-1',
    is_free: false,
    prize_pool_amount: 5000,
    entry_fee_amount: 50,
    prize: '₹5,000',
    entry: '₹50',
  });

  assert.equal(paidTourney.is_free, false);
  assert.equal(paidTourney.prize, '₹5,000');
  assert.equal(paidTourney.entry, '₹50');
});

test('Free Tournament Flow - Registration status determination', () => {
  function determineRegStatus(tournament) {
    const entryFeeAmount = parseInt(tournament.entry_fee_amount) || 0;
    const isPaid = !tournament.is_free && entryFeeAmount > 0;
    const status = isPaid ? 'pending_payment' : 'approved';
    return { isPaid, status };
  }

  // Free tournament with 0 fee
  const freeResult = determineRegStatus({ is_free: true, entry_fee_amount: 0 });
  assert.equal(freeResult.isPaid, false);
  assert.equal(freeResult.status, 'approved', 'Free tournaments must immediately be approved, bypassing payment');

  // Free tournament with residual fee from switching (server overrides)
  const freeResidual = determineRegStatus({ is_free: true, entry_fee_amount: 100 });
  assert.equal(freeResidual.isPaid, false);
  assert.equal(freeResidual.status, 'approved', 'is_free must override any client-submitted entry fee');

  // Paid tournament
  const paidResult = determineRegStatus({ is_free: false, entry_fee_amount: 100 });
  assert.equal(paidResult.isPaid, true);
  assert.equal(paidResult.status, 'pending_payment', 'Paid tournaments require payment');
});

test('Free Tournament Flow - Payment endpoints rejection', () => {
  function checkPaymentVerificationAllowed(reg) {
    if (reg.is_free || parseInt(reg.entry_fee_amount || 0) === 0) {
      return { allowed: false, error: 'FREE_TOURNAMENT' };
    }
    return { allowed: true };
  }

  const freeCheck = checkPaymentVerificationAllowed({ is_free: true, entry_fee_amount: 0 });
  assert.equal(freeCheck.allowed, false);
  assert.equal(freeCheck.error, 'FREE_TOURNAMENT');

  const paidCheck = checkPaymentVerificationAllowed({ is_free: false, entry_fee_amount: 100 });
  assert.equal(paidCheck.allowed, true);
});

