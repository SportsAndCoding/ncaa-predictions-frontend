import React, { useEffect, useState } from 'react';
import { fetchBracketData, fetchUserPicks, submitPicks, fetchRegionalChampions } from './api';

function Final4({ currentUser }) {
  const [bracketData, setBracketData] = useState([]);
  const [userPredictions, setUserPredictions] = useState({});
  const [tieBreaker, setTieBreaker] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [regionalChampions, setRegionalChampions] = useState({});

  useEffect(() => {
    if (currentUser?.id) {
      fetchBracket();
      fetchPredictions();
      fetchChampions();
    }
  }, [currentUser]);

  const fetchBracket = async () => {
    try {
      const data = await fetchBracketData("Final_4");

      console.log("Final_4 Bracket Data:", data);

      if (data.length > 0) {
        setBracketData(data);
      } else {
        setBracketData([]);
      }
    } catch (error) {
      console.error("Error fetching Final4 bracket:", error);
    }
  };

  const fetchPredictions = async () => {
    try {
      const predictions = await fetchUserPicks(currentUser.id, "Final_4");
      if (predictions) {
        const formattedPredictions = {};
        predictions.forEach((p) => {
          formattedPredictions[p.game_id] = p.predicted_winner;
        });
        setUserPredictions(formattedPredictions);
        setTieBreaker(predictions.find(p => p.tie_breaker_points !== null)?.tie_breaker_points || '');
      }
    } catch (error) {
      console.error("Error fetching user predictions:", error);
    }
  };

  const fetchChampions = async () => {
    try {
      const champions = await fetchRegionalChampions(currentUser.id);
      console.log("Fetched Regional Champions:", champions);
      setRegionalChampions(champions);
    } catch (error) {
      console.error("Error fetching regional champions:", error);
    }
  };

  const handlePick = (gameId, winner) => {
    setUserPredictions((prev) => ({
      ...prev,
      [gameId]: winner,
    }));
  };

  const handleSubmit = async () => {
    if (!tieBreaker || isNaN(tieBreaker) || parseInt(tieBreaker, 10) <= 0) {
      setError("Tie-breaker must be a number greater than 0.");
      return;
    }

    setError('');
    const predictionsArray = Object.keys(userPredictions).map((gameId) => ({
      game_id: parseInt(gameId),
      predicted_winner: userPredictions[gameId],
      tie_breaker_points: parseInt(tieBreaker, 10),
      user_id: currentUser.id,
      conference: "Final_4",
    }));

    try {
      await submitPicks(currentUser.id, "Final_4", userPredictions);
      setMessage("Picks saved successfully!");
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error("Error submitting predictions:", error);
      setMessage("Failed to save picks. Try again.");
    }
  };

  return (
    <div style={{ padding: '1em' }}>
      <h2>Final 4 (Round 5)</h2>
      {bracketData.length === 0 ? (
        <p>No Final 4 bracket found.</p>
      ) : (
        <div>
          {bracketData.map((game) => (
            <div key={game.game_id} style={{ marginBottom: '10px' }}>
              <h4>Game ID: {game.game_id}</h4>
              <p>Date: {game.game_date || "TBD"}</p>
              <p>Seeds: {Array.isArray(game.possible_seeds1) ? game.possible_seeds1.join(" vs ") : game.possible_seeds1 || "TBD"}</p>
              <div>
                {/* 🔹 FIX: Ensure `possible_seeds1` and `possible_seeds2` are arrays before mapping */}
                {(Array.isArray(game.possible_seeds1) ? game.possible_seeds1 : []).map((team, index) => (
                  <button
                    key={index}
                    onClick={() => handlePick(game.game_id, team)}
                    style={{
                      padding: '5px',
                      marginRight: '5px',
                      backgroundColor: userPredictions[game.game_id] === team ? 'lightgreen' : 'white',
                    }}
                  >
                    {team}
                  </button>
                ))}
              </div>
              <p>Selected: {userPredictions[game.game_id] || "None"}</p>
            </div>
          ))}
          <div>
            <h4>Total Points in Championship:</h4>
            <input
              type="number"
              value={tieBreaker}
              onChange={(e) => setTieBreaker(e.target.value)}
              style={{ marginRight: '10px' }}
            />
            {error && <p style={{ color: 'red' }}>{error}</p>}
          </div>
          <button onClick={handleSubmit} style={{ marginTop: '10px' }}>Submit Picks</button>
          {message && <p style={{ color: 'green' }}>{message}</p>}
        </div>
      )}
    </div>
  );
}

export default Final4;
