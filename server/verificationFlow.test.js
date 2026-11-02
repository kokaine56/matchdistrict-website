import test from 'node:test';
import assert from 'node:assert/strict';
import { generateVerificationCode, assignVerificationCode, isValidVerificationCode } from './verificationCodeService.js';

test('Verification Code Generator - Character set & Length verification', () => {
  const disallowed = ['0', 'O', '1', 'I', 'L'];
  const generated = new Set();

  for (let i = 0; i < 500; i++) {
    const code = generateVerificationCode();
    assert.equal(code.length, 8, 'Code must be exactly 8 characters long');
    assert.match(code, /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8}$/, 'Code must only contain allowed CSPRNG characters');

    for (const badChar of disallowed) {
      assert.ok(!code.includes(badChar), `Code ${code} must not contain ambiguous character: ${badChar}`);
    }
    generated.add(code);
  }

  assert.equal(generated.size, 500, '500 generated codes should all be unique');
});

test('Verification Code Validator - isValidVerificationCode', () => {
  assert.equal(isValidVerificationCode('ABCD2345'), true);
  assert.equal(isValidVerificationCode('abcd2345'), false); // lowercase disallowed
  assert.equal(isValidVerificationCode('ABCD0123'), false); // 0 and 1 disallowed
  assert.equal(isValidVerificationCode('ABCDIJKL'), false); // I and L disallowed
  assert.equal(isValidVerificationCode('ABCDEFGH9'), false); // 9 chars
  assert.equal(isValidVerificationCode('ABCDEF2'), false); // 7 chars
  assert.equal(isValidVerificationCode(''), false);
  assert.equal(isValidVerificationCode(null), false);
});

test('assignVerificationCode assigns unique code across registrations with retry on collision', async () => {
  const existingCodes = new Set(['DUPLICATE1', 'DUPLICATE2']);
  let queryCount = 0;

  const mockClient = {
    query: async (sql, params) => {
      queryCount++;
      if (sql.includes('SELECT discord_verification_code, discord_verification_status FROM tournament_registrations')) {
        return { rows: [{ discord_verification_code: null, discord_verification_status: 'pending' }] };
      }
      if (sql.includes('SELECT 1 FROM tournament_registrations')) {
        const code = params[0];
        if (existingCodes.has(code)) {
          return { rows: [{ '?column?': 1 }] }; // Collision
        }
        return { rows: [] }; // Available
      }
      if (sql.includes('UPDATE tournament_registrations')) {
        return { rows: [{ id: params[1], discord_verification_code: params[0] }] };
      }
      return { rows: [] };
    }
  };

  const assigned = await assignVerificationCode(mockClient, 'reg-test-123');
  assert.ok(assigned);
  assert.equal(assigned.length, 8);
  assert.ok(isValidVerificationCode(assigned));
});
