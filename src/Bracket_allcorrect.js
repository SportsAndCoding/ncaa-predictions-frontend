// src/Bracket.js
import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import './Bracket.css';

// Helper: parse a Postgres array string (e.g. "{1,8}") into an array of strings.
const parseArray = (str) => {
  if (!str || str === "{}") return [];
  return str.slice(1, -1).split(',').map(s => s.trim());
};

// Helper: given a seed string (possibly composite, like "7/10"), return a number from its first component.
const parseSeedNumber = (seedStr) => {
  const parts = seedStr.split('/');
  return parseInt(parts[0], 10);
};

const Bracket = ({ conference }) => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  // Local state to track user picks: an object with keys as game_id and value as chosen team index.
  const [picks, setPicks] = useState({});

  // Clear picks when conference changes.
  useEffect(() => {
    setPicks({});
  }, [conference]);

  // Fetch the bracket JSON data from Supabase.
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
        const transformed = data.bracket_data.map(match => ({
          game_id: parseInt(match.game_id, 10),
          round: parseInt(match.round, 10),
          round_name: match.round_name,
          possible_seeds1: parseArray(match.possible_seeds1),
          possible_seeds2: parseArray(match.possible_seeds2),
          game_date: match.game_date,
          // winnerTo & slotIndex are used only for fixed propagation
          winnerTo: (match.matchId && match.matchId !== "null") ? parseInt(match.matchId, 10) : null,
          slotIndex: (match.slotIndex && match.slotIndex !== "null") ? parseInt(match.slotIndex, 10) : null,
          isChampion: match.isChampion === "TRUE",
          propagationType: match.propagationType, // Either 'fixed' or 'reseed' (or null for championship)
          winner: null
        }));
        setMatches(transformed);
      } else {
        setMatches([]);
      }
      setLoading(false);
    };

    fetchBracket();
  }, [conference]);

  // Group matches by round number.
  const groupedRounds = matches.reduce((acc, match) => {
    const key = match.round;
    if (!acc[key]) acc[key] = [];
    acc[key].push(match);
    return acc;
  }, {});

  // Convert rounds to an array and sort by round number.
  const roundsArray = Object.entries(groupedRounds)
    .map(([roundNum, matchesInRound]) => ({
      roundNum: parseInt(roundNum, 10),
      roundName: matchesInRound[0].round_name,
      matches: matchesInRound
    }))
    .sort((a, b) => a.roundNum - b.roundNum);

  // ----- Propagation functions (advance winners)  -----

  // Fixed propagation: immediately update the next match based on winnerTo and slotIndex.
  const propagateFixed = (allMatches, sourceMatch) => {
    if (!sourceMatch.winnerTo) return;
    const target = allMatches.find(m => m.game_id === sourceMatch.winnerTo);
    if (!target) return;
    if (sourceMatch.slotIndex === 1) {
      target.possible_seeds1 = [sourceMatch.winner];
    } else if (sourceMatch.slotIndex === 2) {
      target.possible_seeds2 = [sourceMatch.winner];
    }
    target.winner = null; // Clear target's previous selection.
  };

  // Standard reseeding (for NEC and other non-special cases):
  // After a round is complete, sort the winners (lowest seed number first) and pair them: lowest vs highest, second lowest vs second highest.
  const doReseedStandard = (allMatches, roundNumber) => {
    const roundMatches = allMatches.filter(m => m.round === roundNumber);
    let winners = roundMatches.map(m => m.winner).filter(Boolean);
    winners.sort((a, b) => parseSeedNumber(a) - parseSeedNumber(b));
    const nextRound = roundNumber + 1;
    const nextRoundMatches = allMatches.filter(m => m.round === nextRound);
    if (winners.length === 4 && nextRoundMatches.length === 2) {
      nextRoundMatches.forEach(nm => {
        nm.possible_seeds1 = [];
        nm.possible_seeds2 = [];
        nm.winner = null;
      });
      nextRoundMatches[0].possible_seeds1 = [winners[0]];
      nextRoundMatches[0].possible_seeds2 = [winners[3]];
      nextRoundMatches[1].possible_seeds1 = [winners[1]];
      nextRoundMatches[1].possible_seeds2 = [winners[2]];
    }
    nextRoundMatches.forEach(nm => nm.winner = null);
  };

  // Horizon-specific reseeding (as before).
  const doReseedHorizon = (allMatches, roundNumber) => {
    const roundMatches = allMatches.filter(m => m.round === roundNumber);
    let winners = roundMatches.map(m => m.winner).filter(Boolean);
    if (winners.length !== 3) {
      console.log("Horizon: Round 1 not complete; skipping reseed for round 2");
      return;
    }
    winners.sort((a, b) => parseSeedNumber(a) - parseSeedNumber(b));
    const nextRound = roundNumber + 1;
    const nextRoundMatches = allMatches.filter(m => m.round === nextRound);
    const game4 = nextRoundMatches.find(m => m.game_id === 4);
    const game5 = nextRoundMatches.find(m => m.game_id === 5);
    const game6 = nextRoundMatches.find(m => m.game_id === 6);
    if (game4 && game5 && game6) {
      // For Horizon, we update slotIndex 2 only.
      game4.possible_seeds2 = [winners[2]]; // worst remaining seed
      game5.possible_seeds2 = [winners[1]]; // middle remaining seed
      game6.possible_seeds2 = [winners[0]]; // best remaining seed
      [game4, game5, game6].forEach(m => m.winner = null);
    } else {
      console.error("Horizon reseed error: expected round 2 matches not found");
    }
  };

  // America East (AE) reseeding module.
  // AE has one round of reseeding:
  // • Round 1: 4 winners. When all are selected, sort them (min vs max) and update Round 2 matches.
  // • Round 2: When complete (2 winners), advance them to the championship match (Round 3) with fixed propagation.
  const doReseedAE = (allMatches, roundNumber) => {
    if (roundNumber === 1) {
      // Reseed from Round 1 to Round 2.
      const round1Matches = allMatches.filter(m => m.round === 1);
      let winners = round1Matches.map(m => m.winner).filter(Boolean);
      if (winners.length !== 4) {
        console.log("AE: Round 1 is not complete; skipping reseed for round 2");
        return;
      }
      winners.sort((a, b) => parseSeedNumber(a) - parseSeedNumber(b));
      const nextRound = 2;
      const round2Matches = allMatches.filter(m => m.round === nextRound);
      if (round2Matches.length !== 2) {
        console.error("AE: Expected 2 matches in round 2, found", round2Matches.length);
        return;
      }
      // Pair winners using min vs max logic:
      round2Matches[0].possible_seeds1 = [winners[0]]; // lowest seed
      round2Matches[0].possible_seeds2 = [winners[3]]; // highest seed
      round2Matches[1].possible_seeds1 = [winners[1]]; // second lowest
      round2Matches[1].possible_seeds2 = [winners[2]]; // second highest
      round2Matches.forEach(m => m.winner = null);
    } else if (roundNumber === 2) {
      // After Round 2, propagate winners to the championship round (Round 3).
      const round2Matches = allMatches.filter(m => m.round === 2);
      let winners = round2Matches.map(m => m.winner).filter(Boolean);
      if (winners.length !== 2) {
        console.log("AE: Round 2 is not complete; skipping propagation to championship");
        return;
      }
      const championshipMatch = allMatches.find(m => m.round === 3 && m.isChampion);
      if (!championshipMatch) {
        console.error("AE: Championship match not found");
        return;
      }
      // Fixed propagation: assign the two winners directly.
      championshipMatch.possible_seeds1 = [winners[0]];
      championshipMatch.possible_seeds2 = [winners[1]];
      championshipMatch.winner = null;
    }
  };

  // Handle when the user clicks on a team.
  const handlePick = (game_id, teamIndex) => {
    const updated = matches.map(m => ({ ...m }));
    const match = updated.find(m => m.game_id === game_id);
    if (!match) return;

    const chosenTeam = teamIndex === 0 ? match.possible_seeds1.join('/') : match.possible_seeds2.join('/');
    match.winner = chosenTeam;
    setPicks(prev => ({ ...prev, [game_id]: teamIndex }));

    if (match.propagationType === 'fixed') {
      propagateFixed(updated, match);
    }
    if (match.propagationType === 'reseed') {
      // Use different reseeding logic based on the conference.
      if (conference === "Horizon" && match.round === 1) {
        const roundMatches = updated.filter(m => m.round === match.round);
        if (roundMatches.every(m => m.winner)) {
          doReseedHorizon(updated, match.round);
        }
      } else if (conference === "AE") {
        if (match.round === 1) {
          const round1Matches = updated.filter(m => m.round === 1);
          if (round1Matches.every(m => m.winner)) {
            doReseedAE(updated, 1);
          }
        } else if (match.round === 2) {
          const round2Matches = updated.filter(m => m.round === 2);
          if (round2Matches.every(m => m.winner)) {
            doReseedAE(updated, 2);
          }
        }
      } else if (conference === "NEC") {
        const roundMatches = updated.filter(m => m.round === match.round);
        if (roundMatches.every(m => m.winner)) {
          doReseedStandard(updated, match.round);
        }
      } else {
        const roundMatches = updated.filter(m => m.round === match.round);
        if (roundMatches.every(m => m.winner)) {
          doReseedStandard(updated, match.round);
        }
      }
    }
    setMatches(updated);
  };

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
            {roundObj.matches.map(match => (
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
    </div>
  );
};

export default Bracket;
