import test from 'node:test';
import assert from 'node:assert/strict';

test('Tournament Plaza - Separation of Paid and Free Tournaments', () => {
  const mockTournaments = [
    {
      id: 'TRN-1',
      title: 'BGMI Pro League',
      game: 'BGMI',
      is_free: false,
      entry_fee_amount: 100,
      prize_pool_amount: 10000,
      prize: '₹10,000',
      entry: '₹100',
      status: 'upcoming'
    },
    {
      id: 'TRN-2',
      title: 'Valorant Community Scrims',
      game: 'Valorant',
      is_free: true,
      entry_fee_amount: 0,
      prize_pool_amount: 0,
      prize: '',
      entry: 'Free',
      status: 'upcoming'
    },
    {
      id: 'TRN-3',
      title: 'Free Fire Weekend Clash',
      game: 'Free Fire',
      // Edge case: is_free is true, but has residual entry_fee_amount
      is_free: true,
      entry_fee_amount: 50,
      prize_pool_amount: 500,
      prize: '',
      entry: 'Free',
      status: 'open'
    },
    {
      id: 'TRN-4',
      title: 'Invitational Masters',
      game: 'BGMI',
      // Edge case: is_free is false, but entry_fee_amount is 0 (sponsor paid)
      is_free: false,
      entry_fee_amount: 0,
      prize_pool_amount: 50000,
      prize: '₹50,000',
      entry: '₹0',
      status: 'open'
    }
  ];

  // Filtering function mirroring Tournaments.jsx
  function filterAndSeparate(tournamentsList, filters = {}) {
    const { searchQuery = '', gameFilter = 'All Games', entryTypeFilter = 'All' } = filters;

    const filtered = tournamentsList.filter(t => {
      const searchLower = searchQuery.toLowerCase();
      const matchSearch = !searchQuery ||
        t.title.toLowerCase().includes(searchLower) ||
        t.game.toLowerCase().includes(searchLower);

      const matchGame = gameFilter === 'All Games' || t.game.toLowerCase() === gameFilter.toLowerCase();

      let matchEntry = true;
      if (entryTypeFilter === 'Free') matchEntry = Boolean(t.is_free);
      else if (entryTypeFilter === 'Paid') matchEntry = !t.is_free;

      return matchSearch && matchGame && matchEntry;
    });

    const paidTournaments = filtered.filter(t => !t.is_free);
    const freeTournaments = filtered.filter(t => Boolean(t.is_free));

    return {
      filtered,
      paidTournaments,
      freeTournaments,
      paidEmptyMessage: paidTournaments.length === 0 ? "No paid tournaments available right now." : null,
      freeEmptyMessage: freeTournaments.length === 0 ? "No free tournaments available right now." : null
    };
  }

  // Test 1: Complete separation with no active filters
  const resultAll = filterAndSeparate(mockTournaments);
  assert.equal(resultAll.paidTournaments.length, 2);
  assert.equal(resultAll.freeTournaments.length, 2);

  // Check TRN-3 (is_free: true even with residual fee) is in Free Tournaments only
  assert.ok(resultAll.freeTournaments.some(t => t.id === 'TRN-3'));
  assert.ok(!resultAll.paidTournaments.some(t => t.id === 'TRN-3'), 'Free tournament with residual fee must never be in Paid');

  // Check TRN-4 (is_free: false with 0 fee) is in Paid Tournaments only
  assert.ok(resultAll.paidTournaments.some(t => t.id === 'TRN-4'), 'Paid tournament with 0 fee must be in Paid section based on is_free');
  assert.ok(!resultAll.freeTournaments.some(t => t.id === 'TRN-4'));

  // Ensure no tournament is ever in both sections
  const paidIds = new Set(resultAll.paidTournaments.map(t => t.id));
  const freeIds = new Set(resultAll.freeTournaments.map(t => t.id));
  for (const id of paidIds) {
    assert.equal(freeIds.has(id), false, `Tournament ${id} must not appear in both sections`);
  }

  // Test 2: Search filter applies across both sections
  const resultSearch = filterAndSeparate(mockTournaments, { searchQuery: 'BGMI' });
  assert.equal(resultSearch.paidTournaments.length, 2); // TRN-1, TRN-4
  assert.equal(resultSearch.freeTournaments.length, 0);
  assert.equal(resultSearch.freeEmptyMessage, "No free tournaments available right now.", 'Empty free section must display required message');

  // Test 3: Filter by Free entry
  const resultFreeFilter = filterAndSeparate(mockTournaments, { entryTypeFilter: 'Free' });
  assert.equal(resultFreeFilter.freeTournaments.length, 2);
  assert.equal(resultFreeFilter.paidTournaments.length, 0);
  assert.equal(resultFreeFilter.paidEmptyMessage, "No paid tournaments available right now.", 'Empty paid section must display required message');

  // Test 4: Filter by Paid entry
  const resultPaidFilter = filterAndSeparate(mockTournaments, { entryTypeFilter: 'Paid' });
  assert.equal(resultPaidFilter.paidTournaments.length, 2);
  assert.equal(resultPaidFilter.freeTournaments.length, 0);
  assert.equal(resultPaidFilter.freeEmptyMessage, "No free tournaments available right now.");

  // Test 5: Empty state when no tournaments exist at all
  const resultEmpty = filterAndSeparate([]);
  assert.equal(resultEmpty.paidTournaments.length, 0);
  assert.equal(resultEmpty.freeTournaments.length, 0);
  assert.equal(resultEmpty.paidEmptyMessage, "No paid tournaments available right now.");
  assert.equal(resultEmpty.freeEmptyMessage, "No free tournaments available right now.");
});

