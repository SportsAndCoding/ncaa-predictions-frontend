import React, { useState } from 'react';
import Bracket from './Bracket';
import Final4 from './Final4';

function App() {
  const [conference, setConference] = useState('CAA');
  // For testing, we define a dummy currentUser object.
  const [currentUser] = useState({
    id: 123,
    username: 'testuser',
    email: 'test@example.com'
  });

  // List of conferences. (Adjust as needed.)
  const conferenceOptions = [
    "ACC", "AE", "American", "ASUN", "Atlantic_10", "B12", "Big_10", "Big_East",
    "Big_Sky", "Big_South", "Big_West", "CAA", "Con_USA", "Final_4",
    "Horizon", "Ivy", "MAAC", "MAC", "MEAC", "MVC", "MW", "NCAA_Region_1", "NCAA_Region_2",
    "NCAA_Region_3", "NCAA_Region_4", "NEC", "OVC", "Patriot", "SEC", "Southern",
    "southland", "Summit", "Sun_Belt", "SWAC", "WAC", "WCC",
  ];

  const handleConferenceChange = (e) => {
    setConference(e.target.value);
  };

  return (
    <div style={{ padding: '1em' }}>
      <h1>NCAA Predictions Frontend</h1>
      <div style={{ marginBottom: '20px' }}>
        <label htmlFor="conference-select" style={{ marginRight: '10px' }}>
          Select a Conference:
        </label>
        <select
          id="conference-select"
          value={conference}
          onChange={handleConferenceChange}
        >
          {conferenceOptions.map((conf, index) => (
            <option key={index} value={conf}>
              {conf}
            </option>
          ))}
        </select>
      </div>
      <div>
        {/* Render Final4 if conference is Final_4, otherwise render Bracket */}
        {conference === "Final_4" ? (
          <Final4 currentUser={currentUser} />
        ) : (
          <Bracket conference={conference} currentUser={currentUser} />
        )}
      </div>
    </div>
  );
}

export default App;
