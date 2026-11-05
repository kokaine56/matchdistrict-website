import test from 'node:test';
import assert from 'node:assert/strict';

test('Tournament Plaza - Unified Listing of Paid and Free Tournaments', () => {
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
      is_free: false,
      entry_fee_amount: 0,
      prize_pool_amount: 50000,
      prize: '₹50,000',
      entry: '₹0',
      status: 'open'
    }
  ];

  // Listing and filtering function mirroring unified Tournament Plaza
  function getPlazaTournaments(tournamentsList, filters = {}) {
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

    return {
      tournaments: filtered,
      count: filtered.length,
      emptyMessage: filtered.length === 0 ? 'No tournaments available right now.' : null
    };
  }

  // Test 1: All tournaments displayed together in one unified listing
  const resultAll = getPlazaTournaments(mockTournaments);
  assert.equal(resultAll.tournaments.length, 4);
  assert.equal(resultAll.count, 4);
  assert.equal(resultAll.emptyMessage, null);

  // Both paid and free tournaments exist in the same unified listing
  const hasPaid = resultAll.tournaments.some(t => !t.is_free);
  const hasFree = resultAll.tournaments.some(t => Boolean(t.is_free));
  assert.ok(hasPaid, 'Unified listing must include paid tournaments');
  assert.ok(hasFree, 'Unified listing must include free tournaments');

  // Verify tournament card properties are preserved
  const trn1 = resultAll.tournaments.find(t => t.id === 'TRN-1');
  assert.equal(trn1.is_free, false);
  assert.equal(trn1.entry, '₹100');
  assert.equal(trn1.prize, '₹10,000');

  const trn2 = resultAll.tournaments.find(t => t.id === 'TRN-2');
  assert.equal(trn2.is_free, true);
  assert.equal(trn2.entry, 'Free');

  // Test 2: Search filter applies across all tournaments in the unified list
  const resultSearch = getPlazaTournaments(mockTournaments, { searchQuery: 'BGMI' });
  assert.equal(resultSearch.count, 2);
  assert.deepEqual(resultSearch.tournaments.map(t => t.id), ['TRN-1', 'TRN-4']);

  // Test 3: Optional Entry filter Free returns free tournaments in unified list
  const resultFree = getPlazaTournaments(mockTournaments, { entryTypeFilter: 'Free' });
  assert.equal(resultFree.count, 2);
  assert.deepEqual(resultFree.tournaments.map(t => t.id), ['TRN-2', 'TRN-3']);

  // Test 4: Optional Entry filter Paid returns paid tournaments in unified list
  const resultPaid = getPlazaTournaments(mockTournaments, { entryTypeFilter: 'Paid' });
  assert.equal(resultPaid.count, 2);
  assert.deepEqual(resultPaid.tournaments.map(t => t.id), ['TRN-1', 'TRN-4']);

  // Test 5: Single clean empty state when no tournaments exist
  const resultEmpty = getPlazaTournaments([]);
  assert.equal(resultEmpty.count, 0);
  assert.equal(resultEmpty.emptyMessage, 'No tournaments available right now.');
});
