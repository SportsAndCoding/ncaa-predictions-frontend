import React, { useState, useEffect } from 'react';
import { fetchGroupStandings } from './api/api';

function GroupStandings() {
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);
  const groupId = 5; // Example group ID

  useEffect(() => {
    const loadStandings = async () => {
      const data = await fetchGroupStandings(groupId);
      if (data) setStandings(data);
      setLoading(false);
    };

    loadStandings();
  }, []);

  return (
    <div>
      <h1>🏆 Group Standings</h1>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <table border="1">
          <thead>
            <tr>
              <th>Username</th>
              <th>Points Scored</th>
              <th>Points Possible</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((entry, index) => (
              <tr key={index}>
                <td>{entry.username}</td>
                <td>{entry.total_points}</td>
                <td>{entry.total_points_possible}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default GroupStandings;
