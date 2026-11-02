import crypto from 'crypto';

/**
 * Verification Code Service
 * 
 * Generates 8-character verification codes for tournament registrations:
 * - Exactly 8 characters
 * - Uppercase letters & digits only
 * - Cryptographically secure pseudo-random generation (CSPRNG)
 * - Excludes confusing / ambiguous characters: no 0 (zero), O (capital o), 1 (one), I (capital i), L (capital l)
 * - Guaranteed unique across all registrations
 */
export const CODE_CHARSET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

export function isValidVerificationCode(code) {
  if (!code || typeof code !== 'string') return false;
  return /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8}$/.test(code);
}

export function generateVerificationCode() {
  const bytes = crypto.randomBytes(8);
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += CODE_CHARSET[bytes[i] % CODE_CHARSET.length];
  }
  return code;
}

/**
 * Assigns a unique verification code to a registration if one does not already exist.
 *
 * @param {import('pg').PoolClient|import('pg').Pool} clientOrPool
 * @param {string} registrationId
 * @returns {Promise<string>} The assigned 8-character verification code
 */
export async function assignVerificationCode(clientOrPool, registrationId) {
  if (!registrationId) {
    throw new Error('registrationId is required to assign verification code.');
  }

  const existingRes = await clientOrPool.query(
    'SELECT discord_verification_code, discord_verification_status FROM tournament_registrations WHERE id = $1',
    [registrationId]
  );
  if (existingRes.rows.length === 0) {
    throw new Error(`Registration ${registrationId} not found.`);
  }
  if (existingRes.rows[0].discord_verification_code) {
    return existingRes.rows[0].discord_verification_code;
  }

  let assignedCode = null;
  const maxAttempts = 10;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidate = generateVerificationCode();
    const checkRes = await clientOrPool.query(
      'SELECT 1 FROM tournament_registrations WHERE discord_verification_code = $1 LIMIT 1',
      [candidate]
    );
    if (checkRes.rows.length === 0) {
      assignedCode = candidate;
      break;
    }
  }

  if (!assignedCode) {
    throw new Error('Failed to generate a unique verification code after multiple attempts.');
  }

  await clientOrPool.query(
    `UPDATE tournament_registrations
     SET discord_verification_code = $1,
         discord_verification_status = COALESCE(discord_verification_status, 'pending'),
         discord_code_used = false,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $2`,
    [assignedCode, registrationId]
  );

  return assignedCode;
}

