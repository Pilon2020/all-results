import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';

function MoreResults() {
  const [raceInfo, setRaceInfo] = useState([]);
  const [raceResults, setRaceResults] = useState([]);
  const [results, setResults] = useState([]);
  const location = useLocation();
  const searchQuery = new URLSearchParams(location.search).get('query'); // Get query from URL

  // Fetch race info and race results based on the search query
  useEffect(() => {
    const fetchRaceInfo = async () => {
      if (!searchQuery.trim()) {
        setRaceInfo([]);
        return;
      }

      try {
        const trimmedQuery = searchQuery.trim().toLowerCase();
        const response = await fetch(`http://localhost:5000/api/raceInfo?name=${trimmedQuery}`);
        if (response.ok) {
          const data = await response.json();
          setRaceInfo(data);
        } else {
          console.error('Error fetching race info:', response.statusText);
        }
      } catch (error) {
        console.error('Error fetching race info:', error);
      }
    };

    const fetchRaceResults = async () => {
      if (!searchQuery.trim()) {
        setRaceResults([]);
        return;
      }

      try {
        const response = await fetch(`http://localhost:5000/api/raceResults?name=${searchQuery.trim()}`);
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

    fetchRaceInfo();
    fetchRaceResults();
  }, [searchQuery]);

  // Combine race info and race results, and filter out duplicates based on name and date
  useEffect(() => {
    const combinedResults = [
      ...raceInfo.map(info => ({
        type: 'race',
        _id: info._id,
        name: info.Name,
        date: info.Date,
        location: `${info.City}, ${info.State}`,
      })),
      ...raceResults.map(result => ({
        type: 'athlete',
        _id: result.athlete_id,
        name: result.Name,
        gender: result.Gender,
        race: result.Race,
        date: result.Date,
        total: result.Total,
      })),
    ];

    // Filter unique results based on type
    const uniqueResults = combinedResults.filter((result, index, self) => {
      if (result.type === 'race') {
        // For 'race' type, uniqueness is determined by both name and date
        return index === self.findIndex(r => r.type === 'race' && r.name.toLowerCase() === result.name.toLowerCase() && r.date === result.date);
      } else {
        // For 'athlete' type, uniqueness is determined by name only
        return index === self.findIndex(r => r.type === 'athlete' && r.name.toLowerCase() === result.name.toLowerCase());
      }
    });

    // Sort results
    const sortedResults = uniqueResults.sort((a, b) => {
      if (a.type === 'athlete' && b.type === 'athlete') {
        return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
      } else if (a.type === 'race' && b.type === 'race') {
        return a.name.toLowerCase().localeCompare(b.name.toLowerCase()) || new Date(a.date) - new Date(b.date);
      } else {
        // Sort athletes before races
        return a.type === 'athlete' ? -1 : 1;
      }
    });


    setResults(sortedResults); // Set the combined, sorted results in state
  }, [raceInfo, raceResults]);

  return (
    <div className={'MoreResults, content'}>
      <div className='body'>
      <h1>Results</h1>
      {searchQuery && (
        <div className="full-results-container">
          {results.length > 0 ? (
            <ul className="full-results-list">
              {results.map((result, index) => (
                <li key={result._id} className="full-result-item">
                  <a href={`/${result.type}/${result._id}`} className="result-link">
                    <strong>{result.name}</strong>
                    {result.type === 'race' ? (
                      <>
                        <span className="result-date"> - {result.date}</span>
                        <br />
                        <em>{result.location}</em>
                      </>
                    ) : (
                      <>
                      </>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="no-results">No matching results found</p>
          )}
        </div>
      )}
    </div>
    </div>
  );
}

export default MoreResults;
