const DISCORD_VERIFICATION_CODE_PATTERN = /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8}$/;

export function hasValidDiscordVerificationCode(registration) {
  if (!registration) return false;

  const registrationStatus = String(registration.status || registration.regStatus || '').toLowerCase();
  const verificationStatus = String(
    registration.discord_verification_status || registration.discordVerificationStatus || ''
  ).toLowerCase();
  const code = String(
    registration.discord_verification_code || registration.discordVerificationCode || ''
  ).trim().toUpperCase();

  if (['rejected', 'payment_rejected'].includes(registrationStatus) || verificationStatus === 'invalid') return false;
  return DISCORD_VERIFICATION_CODE_PATTERN.test(code);
}
