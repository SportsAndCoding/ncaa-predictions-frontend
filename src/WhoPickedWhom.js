import React, { useState, useEffect } from 'react';
import { fetchWhoPickedWhom } from './api/api';

function WhoPickedWhom() {
  const [picks, setPicks] = useState([]);
  const [loading, setLoading] = useState(true);
  const groupId = 5; // Example group ID

  useEffect(() => {
    const loadPicks = async () => {
      const data = await fetchWhoPickedWhom(groupId);
      if (data) setPicks(data);
      setLoading(false);
    };

    loadPicks();
  }, []);

  return (
    <div>
      <h1>📋 Who Picked Whom</h1>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <table border="1">
          <thead>
            <tr>
              <th>Username</th>
              <th>Conference</th>
              <th>Team Picked</th>
              <th>Round</th>
              <th>Points Awarded</th>
              <th>Correct?</th>
            </tr>
          </thead>
          <tbody>
            {picks.map((pick, index) => (
              <tr key={index}>
                <td>{pick.username}</td>
                <td>{pick.conference}</td>
                <td>{pick.team_picked}</td>
                <td>{pick.round_picked}</td>
                <td>{pick.points_awarded}</td>
                <td>{pick.is_correct ? '✅' : '❌'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default WhoPickedWhom;
