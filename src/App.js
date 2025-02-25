import React, { useState } from 'react';
import GroupStandings from './GroupStandings';  // ✅ Ensure this file exists
import WhoPickedWhom from './WhoPickedWhom';    // ✅ Ensure this file exists

function App() {
  const [page, setPage] = useState('standings');

  return (
    <div>
      <h1>🏀 NCAA Predictions</h1>
      <nav>
        <button onClick={() => setPage('standings')}>Group Standings</button>
        <button onClick={() => setPage('who_picked_whom')}>Who Picked Whom</button>
      </nav>

      {page === 'standings' ? <GroupStandings /> : <WhoPickedWhom />}
    </div>
  );
}

export default App;
