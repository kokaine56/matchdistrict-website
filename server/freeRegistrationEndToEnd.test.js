import test from 'node:test';
import assert from 'node:assert/strict';
import { isValidVerificationCode, assignVerificationCode } from './verificationCodeService.js';
import { REG_BRIDGE_ELIGIBLE_STATUSES } from './registrationTeamBridge.js';

test('End-to-End Free Tournament Registration Flow', async () => {
  // Mock DB state
  const mockDb = {
    tournaments: [
      {
        id: 'TRN-FREE-101',
        title: 'Free BGMI Invitational',
        is_free: true,
        entry_fee_amount: 0,
        slotsTotal: 100,
        slotsFilled: 10,
        registrationCloseDate: null,
        teams_per_group: 16,
        status: 'upcoming'
      },
      {
        id: 'TRN-PAID-202',
        title: 'Pro Championship',
        is_free: false,
        entry_fee_amount: 50,
        slotsTotal: 100,
        slotsFilled: 20,
        registrationCloseDate: null,
        teams_per_group: 16,
        status: 'upcoming'
      }
    ],
    registrations: [],
    teams: [],
    payments: []
  };

  // Mock DB Client for transaction simulation
  function createMockClient() {
    return {
      async query(sql, params = []) {
        // Tournament select for update
        if (sql.includes('SELECT title, "slotsTotal"')) {
          const t = mockDb.tournaments.find(x => x.id === params[0]);
          return { rows: t ? [t] : [] };
        }
        // Duplicate team name check
        if (sql.includes('LOWER(team_name) = LOWER($2)')) {
          const match = mockDb.registrations.find(
            r => r.tournament_id === params[0] && r.team_name.toLowerCase() === params[1].toLowerCase()
          );
          return { rows: match ? [match] : [] };
        }
        // Registration insert
        if (sql.includes('INSERT INTO tournament_registrations')) {
          const newRow = {
            id: params[0],
            tournament_id: params[1],
            user_id: params[2],
            team_name: params[3],
            captain: params[4],
            captain_uid: params[5],
            members: params[6],
            status: params[7],
            slot_number: params[8],
            email: params[9],
            phone: params[10],
            amount_due: params[13],
            discord_verification_code: null,
            discord_verification_status: null
          };
          mockDb.registrations.push(newRow);
          return { rows: [newRow] };
        }
        // Verification code queries
        if (sql.includes('SELECT discord_verification_code')) {
          const r = mockDb.registrations.find(x => x.id === params[0]);
          return { rows: r ? [r] : [] };
        }
        if (sql.includes('SELECT 1 FROM tournament_registrations WHERE discord_verification_code')) {
          const match = mockDb.registrations.find(x => x.discord_verification_code === params[0]);
          return { rows: match ? [match] : [] };
        }
        if (sql.includes('UPDATE tournament_registrations') && sql.includes('discord_verification_code')) {
          const r = mockDb.registrations.find(x => x.id === params[1]);
          if (r) {
            r.discord_verification_code = params[0];
            r.discord_verification_status = 'pending';
          }
          return { rows: [r] };
        }
        // Slot reconciliation count
        if (sql.includes('SELECT COALESCE(slots_filled')) {
          return { rows: [{ active_count: 10 }] };
        }
        if (sql.includes('BEGIN') || sql.includes('COMMIT') || sql.includes('ROLLBACK')) {
          return { rows: [] };
        }
        return { rows: [] };
      },
      release() {}
    };
  }

  // Implementation of backend registration logic (as in POST /api/tournaments/:id/register)
  async function registerTeamBackend(tournamentId, authUser, formData) {
    const t = mockDb.tournaments.find(x => x.id === tournamentId);
    if (!t) return { status: 404, body: { success: false, error: 'NOT_FOUND' } };

    // Duplicate check
    const existing = mockDb.registrations.find(
      r => r.tournament_id === tournamentId && r.user_id === authUser.id
    );
    if (existing) {
      const currentStatus = (existing.status || '').toLowerCase();
      const reRegisterable = ['cancelled', 'expired', 'rejected', 'payment_rejected'];
      if (!reRegisterable.includes(currentStatus)) {
        const isConfirmedOrApproved = ['approved', 'confirmed', 'verified_by_host'].includes(currentStatus);
        const hasPayment = Boolean(existing.payment_id);
        if (isConfirmedOrApproved || hasPayment) {
          return {
            status: 200,
            body: {
              success: true,
              already_registered: true,
              status: existing.status,
              registration: existing
            }
          };
        }
      }
    }

    const client = createMockClient();
    const entryFeeAmount = parseInt(t.entry_fee_amount) || 0;
    const isPaid = !t.is_free && entryFeeAmount > 0;
    const amountToPay = isPaid ? entryFeeAmount : 0;
    const status = isPaid ? 'pending_payment' : 'approved';

    // Duplicate team name check
    const nameCheck = await client.query('LOWER(team_name) = LOWER($2)', [tournamentId, formData.team_name]);
    if (nameCheck.rows.length > 0) {
      return { status: 400, body: { success: false, error: 'TEAM_NAME_TAKEN' } };
    }

    const regId = 'REG-' + Date.now().toString().slice(-6);
    const insertRes = await client.query('INSERT INTO tournament_registrations', [
      regId, tournamentId, authUser.id, formData.team_name, formData.captain, formData.captain_uid,
      JSON.stringify(formData.members || []), status, null, formData.email, formData.phone,
      null, 1, isPaid ? amountToPay : null
    ]);

    let assignedCode = null;
    if (!isPaid) {
      assignedCode = await assignVerificationCode(client, regId);
      insertRes.rows[0].discord_verification_code = assignedCode;
      insertRes.rows[0].discord_verification_status = 'pending';

      // Bridge registration to team for Discord bot sync
      mockDb.teams.push({
        id: 'tt_' + regId,
        tournament_id: tournamentId,
        team_name: formData.team_name,
        leader_user_id: authUser.id,
        registration_id: regId,
        status: 'awaiting_members'
      });
    }

    return {
      status: 200,
      body: {
        success: true,
        registration: insertRes.rows[0],
        requiresPayment: isPaid,
        amount_to_pay: isPaid ? amountToPay : null
      }
    };
  }

  // 1. Submit valid squad details to Free Tournament
  const authUser1 = { id: 'usr_player1', name: 'Player One' };
  const squadPayload = {
    team_name: 'Alpha Titans',
    captain: 'TitanCaptain',
    captain_uid: '12345678',
    email: 'alpha@example.com',
    phone: '9876543210',
    members: [{ ign: 'TitanCaptain', uid: '12345678' }, { ign: 'TitanP2', uid: '12345679' }]
  };

  const freeRegRes = await registerTeamBackend('TRN-FREE-101', authUser1, squadPayload);

  // Assertions:
  assert.equal(freeRegRes.status, 200, 'Free registration should return 200 HTTP status');
  assert.equal(freeRegRes.body.success, true);
  assert.equal(freeRegRes.body.requiresPayment, false, 'Free tournament must not require payment');
  assert.equal(freeRegRes.body.amount_to_pay, null, 'Free tournament amount_to_pay must be null');

  const savedReg = freeRegRes.body.registration;
  assert.equal(savedReg.status, 'approved', 'Free tournament registration status must be "approved"');
  assert.equal(savedReg.amount_due, null, 'Free tournament registration amount_due must be null');

  // Verify verification code
  assert.ok(savedReg.discord_verification_code, 'Discord verification code must be assigned immediately');
  assert.equal(isValidVerificationCode(savedReg.discord_verification_code), true, 'Assigned code must be a valid 8-char code');
  assert.equal(savedReg.discord_verification_status, 'pending');

  // Verify Bot synchronization (team created and eligible)
  assert.equal(mockDb.teams.length, 1, 'Tournament team must be bridged for Discord bot');
  assert.equal(mockDb.teams[0].team_name, 'Alpha Titans');
  assert.equal(REG_BRIDGE_ELIGIBLE_STATUSES.includes(savedReg.status), true, 'Status must be in REG_BRIDGE_ELIGIBLE_STATUSES');

  // Confirm NO payment records created
  assert.equal(mockDb.payments.length, 0, 'No record must be generated in payment_submissions for free tournaments');

  // 2. Duplicate registration protection for Free tournament
  const dupAttempt = await registerTeamBackend('TRN-FREE-101', authUser1, squadPayload);
  assert.equal(dupAttempt.status, 200);
  assert.equal(dupAttempt.body.already_registered, true, 'Duplicate registration attempt must return already_registered: true');
  assert.equal(dupAttempt.body.status, 'approved');

  // 3. Duplicate team name protection
  const authUser2 = { id: 'usr_player2', name: 'Player Two' };
  const dupNamePayload = { ...squadPayload, captain: 'AnotherCaptain', captain_uid: '99999999' };
  const dupNameRes = await registerTeamBackend('TRN-FREE-101', authUser2, dupNamePayload);
  assert.equal(dupNameRes.status, 400);
  assert.equal(dupNameRes.body.error, 'TEAM_NAME_TAKEN', 'Team name reuse must be rejected');

  // 4. Test Paid Tournament registration preserves payment requirement
  const paidRegRes = await registerTeamBackend('TRN-PAID-202', authUser2, {
    ...squadPayload,
    team_name: 'Bravo Warriors'
  });
  assert.equal(paidRegRes.status, 200);
  assert.equal(paidRegRes.body.requiresPayment, true, 'Paid tournament must require payment');
  assert.equal(paidRegRes.body.amount_to_pay, 50, 'Paid tournament must specify amount to pay');
  assert.equal(paidRegRes.body.registration.status, 'pending_payment', 'Paid tournament initial status must be pending_payment');
  assert.equal(paidRegRes.body.registration.discord_verification_code, null, 'Paid tournament must not generate verification code before payment approval');
});

