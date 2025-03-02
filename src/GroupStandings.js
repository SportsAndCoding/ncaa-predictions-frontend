import React, { useEffect, useState } from "react";
import axios from "axios";

const GroupStandings = () => {
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStandings = async () => {
      try {
        const response = await axios.get(
          "https://ncaa-predictions-api.onrender.com/api/group-standings/5"
        );
        setStandings(response.data);
      } catch (err) {
        setError("Failed to load group standings.");
      } finally {
        setLoading(false);
      }
    };

    fetchStandings();
  }, []);

  if (loading) return <p>Loading standings...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div>
      <h2>🏆 Group Standings</h2>
      <table>
        <thead>
          <tr>
            <th>Username</th>
            <th>Points Scored</th>
            <th>Points Possible</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((user) => (
            <tr key={user.user_id}>
              <td>{user.username}</td>
              <td>{user.total_points}</td>
              <td>{user.total_points_possible}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default GroupStandings;
