import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';

function MoreResults() {
  const [raceInfo, setRaceInfo] = useState([]);
  const [raceResults, setRaceResults] = useState([]);
  const [results, setResults] = useState([]);
  const location = useLocation();
  const searchQuery = new URLSearchParams(location.search).get('query'); // Get query from URL
  console.log(searchQuery)
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
          console.log('Race Info:', data); // Log the fetched race info
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
          console.log('Race Results:', data); // Log the fetched race results
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


  // Combine race info and race results, and filter out duplicates based on name
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
        _id: result._id,
        name: result.Name,
        gender: result.Gender,
        race: result.Race,
        date: result.Date,
        total: result.Total,
      })),
    ];

    console.log('Combined Results:', combinedResults); // Log combined results

    // Filter out duplicates based on the name
    const uniqueResultsByName = combinedResults.filter((result, index, self) =>
      index === self.findIndex((r) => (
        r.name.toLowerCase() === result.name.toLowerCase()
      ))
    );

    console.log('Unique Results By Name:', uniqueResultsByName); // Log unique results

    const sortedResults = uniqueResultsByName.sort((a, b) => {
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();
      return aName.localeCompare(bName);
    });

    setResults(sortedResults); // Set the combined, sorted results in state
}, [raceInfo, raceResults]);


  return (
    <div className="MoreResults">
      <h1>More Results</h1>
      {searchQuery && (
        <div className="full-results-container">
          {results.length > 0 ? (
            <ul className="full-results-list">
                {results.map((result, index) => (
                <li key={result._id} className="full-result-item">
                    <Link to={`/${result.type}/${result._id}`} className="result-link">
                    <strong>{result.name}</strong>
                    {result.type === 'race' ? (
                        <>
                        <span className="result-date"> - {result.date}</span>
                        <br />
                        <em>{result.location}</em>
                        </>
                    ) : (<></>)}
                    </Link>
                </li>
                ))}
            </ul>
            ) : (
            <p className="no-results">No matching results found</p>
            )}
        </div>
      )}
    </div>
  );
}

export default MoreResults;
