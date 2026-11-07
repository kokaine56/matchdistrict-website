import test from 'node:test';
import assert from 'node:assert/strict';

test('Platform Fee Percentage: Validation logic', () => {
  const validateFee = (val) => {
    const fee = parseFloat(val);
    if (isNaN(fee) || fee < 0 || fee > 100) {
      return { valid: false, error: 'Invalid fee percentage. Must be a number between 0 and 100.' };
    }
    return { valid: true, fee };
  };

  // Valid inputs
  assert.equal(validateFee('10').valid, true);
  assert.equal(validateFee(10).fee, 10);
  assert.equal(validateFee('5').fee, 5);
  assert.equal(validateFee('8').fee, 8);
  assert.equal(validateFee('15').fee, 15);
  assert.equal(validateFee('7.5').fee, 7.5);
  assert.equal(validateFee('0').fee, 0);
  assert.equal(validateFee('100').fee, 100);

  // Invalid inputs
  assert.equal(validateFee('-1').valid, false);
  assert.equal(validateFee('101').valid, false);
  assert.equal(validateFee('invalid').valid, false);
  assert.equal(validateFee('').valid, false);
});

test('Platform Fee Percentage: Authoritative fallback to 10% when setting not in DB', async () => {
  const mockDb = {
    query: async (sql) => {
      if (sql.includes('platform_fee_percentage')) {
        return { rows: [] }; // No setting row in DB
      }
      return { rows: [] };
    }
  };

  async function getPlatformFeePercentage(clientOrPool) {
    try {
      const res = await clientOrPool.query(`SELECT value FROM site_settings WHERE key = 'platform_fee_percentage' LIMIT 1`);
      if (res.rows.length > 0) {
        const val = parseFloat(res.rows[0].value);
        if (!isNaN(val) && val >= 0 && val <= 100) return val;
      }
    } catch {
      // fallback
    }
    return 10;
  }

  const fee = await getPlatformFeePercentage(mockDb);
  assert.equal(fee, 10);
});

test('Platform Fee Percentage: Fetches configured percentage from DB', async () => {
  const mockDb = {
    query: async (sql) => {
      if (sql.includes('platform_fee_percentage')) {
        return { rows: [{ value: '15' }] };
      }
      return { rows: [] };
    }
  };

  async function getPlatformFeePercentage(clientOrPool) {
    try {
      const res = await clientOrPool.query(`SELECT value FROM site_settings WHERE key = 'platform_fee_percentage' LIMIT 1`);
      if (res.rows.length > 0) {
        const val = parseFloat(res.rows[0].value);
        if (!isNaN(val) && val >= 0 && val <= 100) return val;
      }
    } catch {
      // fallback
    }
    return 10;
  }

  const fee = await getPlatformFeePercentage(mockDb);
  assert.equal(fee, 15);
});

test('Platform Fee Percentage: Historical tournaments preserve original commission while new tournaments use updated rate', () => {
  const configuredFeePercentage = 15;
  const currentCommissionRate = configuredFeePercentage / 100;

  // Historical tournaments created when default was 10% (either platform_fee_percentage was 10 or null)
  const historicalTournaments = [
    { id: 'TRN-HIST-1', entry: '100', slotsFilled: 50, platform_fee_percentage: 10 },
    { id: 'TRN-HIST-2', entry: '200', slotsFilled: 20, platform_fee_percentage: null } // null should default to historical 10%
  ];

  // New tournament created after platform fee updated to 15%
  const newTournaments = [
    { id: 'TRN-NEW-1', entry: '100', slotsFilled: 50, platform_fee_percentage: 15 }
  ];

  // Calculate commission respecting historical rates
  const calculateCommission = (tournaments, fallbackRate = 0.10) => {
    let total = 0;
    tournaments.forEach(t => {
      const entryNum = parseInt(String(t.entry).replace(/[^0-9]/g, '')) || 0;
      const slots = parseInt(t.slotsFilled) || 0;
      const rate = (t.platform_fee_percentage !== null && t.platform_fee_percentage !== undefined)
        ? (parseFloat(t.platform_fee_percentage) / 100)
        : fallbackRate;
      total += (entryNum * slots) * rate;
    });
    return total;
  };

  // Historical calculations
  // TRN-HIST-1: 100 * 50 = 5000 * 0.10 = 500
  // TRN-HIST-2: 200 * 20 = 4000 * 0.10 = 400
  // Total historical = 900
  const historicalCommission = calculateCommission(historicalTournaments, 0.10);
  assert.equal(historicalCommission, 900);

  // New calculation:
  // TRN-NEW-1: 100 * 50 = 5000 * 0.15 = 750
  const newCommission = calculateCommission(newTournaments, currentCommissionRate);
  assert.equal(newCommission, 750);

  // Combined all-time calculation
  const allTournaments = [...historicalTournaments, ...newTournaments];
  const allTimeCommission = calculateCommission(allTournaments, 0.10);
  // Total = 900 + 750 = 1650 (NOT 14000 * 0.15 = 2100)
  assert.equal(allTimeCommission, 1650);
});
