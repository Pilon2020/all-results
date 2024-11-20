import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Link, Routes } from 'react-router-dom';
import './App.css';

function App() {
  const [raceResults, setRaceResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchRaceResults = async (search = '') => {
      if (!search) {
        setRaceResults([]);
        return;
      }

      try {
        const response = await fetch(`http://localhost:5000/api/raceResults?name=${search}`);
        if (response.ok) {
          const data = await response.json();
          setRaceResults(data);
        } else {
          console.error('Error fetching race results:', response.statusText);
        }
      } catch (error) {
        console.error('Error fetching race results:', error);
      }
    };

    if (searchQuery) {
      fetchRaceResults(searchQuery);
    }
  }, [searchQuery]);

  const handleSearchChange = (event) => {
    const query = event.target.value;
    setSearchQuery(query);
  };

  const topResults = raceResults.slice(0, 3);

  return (
    <Router>
      <div className="App">
        <div className="Header">
          <h1>Race Results</h1>
        </div>
        <div className="search-container">
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search by name"
            className={`search-bar ${raceResults.length > 0 ? 'results-visible' : ''}`}
          />
        </div>

        {/* Display the top 3 results */}
        {searchQuery && (
          <div className={`results-container ${raceResults.length > 0 ? 'results-visible' : ''}`}>
            {Array.isArray(raceResults) && raceResults.length > 0 ? (
              <ul className="results-list">
                {topResults.map((result, index) => (
                  <li key={index} className="result-item">
                    <strong>{result.Name}</strong> ({result.Gender}) - {result.Race} on {result.Date}
                    <br />
                    <em>Total Time: {result.Total}</em>
                  </li>
                ))}
                {/* If there are more than 3 results, show the "More Athletes" link */}
                {raceResults.length > 3 && (
                  <li className="more-athletes">
                    <Link to="">More Athletes</Link>
                  </li>
                )}
              </ul>
            ) : (
              <p className="no-results">No matching race results found</p>
            )}
          </div>
        )}

        {/* Route to the page for more athletes */}
        <Routes>
          <Route path="" />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
