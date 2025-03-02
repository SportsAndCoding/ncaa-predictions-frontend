import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import './Bracket.css';

// Helper to parse Postgres array string
const parseArray = (str) => {
  if (!str || str === "{}") return [];
  return str.slice(1, -1).split(',').map(s => s.trim());
};

// Helper to parse a seed string like "7" or "10" from "7/10" etc.
// You may need to handle multiple seeds more carefully.
const parseSeedNumber = (seedStr) => {
  // If you have multiple seeds (like "7/10"), pick the lower or do your own logic.
  const parts = seedStr.split('/');
  return parseInt(parts[0], 10);
};

const Bracket = ({ conference }) => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  // Store user picks: { [game_id]: chosenTeamIndex }
  const [picks, setPicks] = useState({});

  useEffect(() => {
    // Reset picks whenever conference changes
    setPicks({});
  }, [conference]);

  useEffect(() => {
    const fetchBracket = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('bracket_json')
        .select('bracket_data')
        .eq('conference', conference)
        .single();

      if (error) {
        console.error('Error fetching bracket:', error);
        setMatches([]);
      } else if (data && Array.isArray(data.bracket_data)) {
        const transformed = data.bracket_data.map((match) => ({
          game_id: parseInt(match.game_id, 10),
          round: parseInt(match.round, 10),
          round_name: match.round_name,
          possible_seeds1: parseArray(match.possible_seeds1),
          possible_seeds2: parseArray(match.possible_seeds2),
          game_date: match.game_date,
          winnerTo: match.matchId && match.matchId !== "null" ? parseInt(match.matchId, 10) : null,
          slotIndex: match.slotIndex && match.slotIndex !== "null" ? parseInt(match.slotIndex, 10) : null,
          isChampion: match.isChampion === "TRUE",
          propagationType: match.propagationType, // 'fixed' or 'reseed'
          winner: null // Initially no winner
        }));
        setMatches(transformed);
      } else {
        setMatches([]);
      }
      setLoading(false);
    };
    fetchBracket();
  }, [conference]);

  // Group matches by round
  const groupedRounds = matches.reduce((acc, match) => {
    const key = match.round;
    if (!acc[key]) acc[key] = [];
    acc[key].push(match);
    return acc;
  }, {});

  // Convert to array and sort by round number
  const roundsArray = Object.entries(groupedRounds)
    .map(([roundNum, matchesInRound]) => ({
      roundNum: parseInt(roundNum, 10),
      roundName: matchesInRound[0].round_name,
      matches: matchesInRound
    }))
    .sort((a, b) => a.roundNum - b.roundNum);

  const handlePick = (gameId, teamIndex) => {
    const updated = matches.map(m => ({ ...m }));
    const match = updated.find(m => m.game_id === gameId);
    if (!match) return;

    // Determine chosen team's label
    const chosenTeam = teamIndex === 0
      ? match.possible_seeds1.join('/')
      : match.possible_seeds2.join('/');
    match.winner = chosenTeam;
    setPicks(prev => ({ ...prev, [gameId]: teamIndex }));

    // If "fixed" propagation, we can directly fill in the next match's slot.
    // If "reseed", we won't do immediate propagation per match. We'll do it after the entire round is decided.
    if (match.propagationType === 'fixed') {
      propagateFixed(updated, match);
    }

    setMatches(updated);

    // After updating one match's pick, check if the entire round is complete
    // and if the round uses "reseed", do the re-seeding once all winners are decided.
    if (match.propagationType === 'reseed') {
      const roundMatches = updated.filter(m => m.round === match.round);
      const allHaveWinners = roundMatches.every(m => m.winner);
      if (allHaveWinners) {
        // Perform re-seed for this entire round.
        doReseed(updated, match.round);
      }
    }
  };

  // "Fixed" propagation: set the target match's slotIndex to the chosen winner
  const propagateFixed = (allMatches, sourceMatch) => {
    if (!sourceMatch.winnerTo) return;
    const target = allMatches.find(m => m.game_id === sourceMatch.winnerTo);
    if (!target) return;

    // Overwrite the appropriate slot
    if (sourceMatch.slotIndex === 1) {
      target.possible_seeds1 = [sourceMatch.winner];
    } else if (sourceMatch.slotIndex === 2) {
      target.possible_seeds2 = [sourceMatch.winner];
    }
    // Clear any old winner in target so user can pick fresh
    target.winner = null;
  };

  // "Re-seed" logic: gather all winners from the completed round,
  // sort them, and place them in the next round's matches in the correct order.
  function doReseed(allMatches, roundNumber) {
    // Gather winners from this round
    const roundMatches = allMatches.filter(m => m.round === roundNumber);
    const winners = roundMatches.map(m => m.winner).filter(Boolean);

    // Sort winners by numeric seed (lowest seed # first).
    // Because "winner" might look like "1/8", pick the first seed or parse more robustly.
    winners.sort((a, b) => parseSeedNumber(a) - parseSeedNumber(b));

    // Identify next round
    const nextRound = roundNumber + 1;
    const nextRoundMatches = allMatches.filter(m => m.round === nextRound);

    // If you have 4 winners, you might place them in nextRoundMatches as:
    //   match0: seeds1 = [winners[0]]  seeds2 = [winners[3]]
    //   match1: seeds1 = [winners[1]]  seeds2 = [winners[2]]
    // Or any other logic. For demonstration, we pair them in ascending order.
    //
    // This code snippet assumes 4 winners => 2 matches in next round
    // If you have more or fewer, adjust the logic accordingly.
    if (winners.length === 4 && nextRoundMatches.length === 2) {
      // Clear existing seeds in next round
      nextRoundMatches.forEach(nm => {
        nm.possible_seeds1 = [];
        nm.possible_seeds2 = [];
        nm.winner = null;
      });

      // Place seeds in a typical "lowest vs highest" pattern
      // Match #1 => winners[0] vs winners[3]
      // Match #2 => winners[1] vs winners[2]
      nextRoundMatches[0].possible_seeds1 = [winners[0]];
      nextRoundMatches[0].possible_seeds2 = [winners[3]];
      nextRoundMatches[1].possible_seeds1 = [winners[1]];
      nextRoundMatches[1].possible_seeds2 = [winners[2]];
    }
    // If you have 2 winners => 1 match, etc., adapt the logic to your bracket size.

    // Clear any winners in next round matches so user can pick anew
    nextRoundMatches.forEach(nm => {
      nm.winner = null;
    });
  }

  if (loading) return <div>Loading bracket...</div>;
  if (matches.length === 0) return <div>No bracket found for conference: {conference}</div>;

  return (
    <div>
      <div className="bracket-container">
        {roundsArray.map((roundObj, idx) => (
          <div key={idx} className="round-column">
            <div className="round-header">
              <h2>{roundObj.roundName} (Round {roundObj.roundNum})</h2>
            </div>
            {roundObj.matches.map((match) => (
              <div key={match.game_id} className="match-card">
                <div className="match-header">
                  <p>Game ID: {match.game_id}</p>
                  <p>Date: {match.game_date}</p>
                </div>
                <div className="team-lines">
                  <div
                    className={`team-line ${picks[match.game_id] === 0 ? 'selected' : ''}`}
                    onClick={() => handlePick(match.game_id, 0)}
                  >
                    <span className="team-name">
                      {match.possible_seeds1.length > 0 ? match.possible_seeds1.join('/') : 'TBD'}
                    </span>
                    {match.winner && picks[match.game_id] === 0 && (
                      <span className="winner-indicator">✓</span>
                    )}
                  </div>
                  <div
                    className={`team-line ${picks[match.game_id] === 1 ? 'selected' : ''}`}
                    onClick={() => handlePick(match.game_id, 1)}
                  >
                    <span className="team-name">
                      {match.possible_seeds2.length > 0 ? match.possible_seeds2.join('/') : 'TBD'}
                    </span>
                    {match.winner && picks[match.game_id] === 1 && (
                      <span className="winner-indicator">✓</span>
                    )}
                  </div>
                </div>
                {match.winner && (
                  <div className="match-winner">
                    Selected: <strong>{match.winner}</strong>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        <button onClick={() => console.log('Current picks:', picks)} style={{ marginRight: '10px' }}>
          Log Picks
        </button>
      </div>
    </div>
  );
};

export default Bracket;
