// Reseed.js
// A module to handle "reseed" propagation when an entire round is completed.

function parseSeedNumber(seedStr) {
  // If your bracket can have multiple seeds like "7/10", pick the lower seed or do your own logic:
  const parts = seedStr.split('/');
  return parseInt(parts[0], 10);
}

export function doReseed(allMatches, roundNumber) {
  // 1) Find all matches in this round that use "reseed"
  const reSeedMatches = allMatches.filter(
    (m) => m.round === roundNumber && m.propagationType === 'reseed'
  );

  // 2) Gather winners (non-empty)
  const winners = reSeedMatches.map((m) => m.winner).filter(Boolean);

  // If not all winners are chosen yet, or there are no winners, skip
  if (winners.length === 0) return;

  // 3) Sort winners by numeric seed, so the best seed is first, etc.
  winners.sort((a, b) => parseSeedNumber(a) - parseSeedNumber(b));

  // 4) Identify next round’s matches that also use "reseed"
  const nextRound = roundNumber + 1;
  const nextRoundMatches = allMatches.filter(
    (m) => m.round === nextRound && m.propagationType === 'reseed'
  );

  // 5) Example logic for 2 or 4 winners:
  if (winners.length === 2 && nextRoundMatches.length === 1) {
    // If there are 2 winners and 1 next-round match => place them directly
    nextRoundMatches[0].possible_seeds1 = [winners[0]];
    nextRoundMatches[0].possible_seeds2 = [winners[1]];
  } else if (winners.length === 4 && nextRoundMatches.length === 2) {
    // If there are 4 winners and 2 next-round matches => pair them
    //  Match 1: winners[0] vs winners[3]
    //  Match 2: winners[1] vs winners[2]
    nextRoundMatches[0].possible_seeds1 = [winners[0]];
    nextRoundMatches[0].possible_seeds2 = [winners[3]];
    nextRoundMatches[1].possible_seeds1 = [winners[1]];
    nextRoundMatches[1].possible_seeds2 = [winners[2]];
  }

  // 6) Clear any existing .winner in the next round so the user can re-pick
  nextRoundMatches.forEach((nm) => {
    nm.winner = null;
  });
}
