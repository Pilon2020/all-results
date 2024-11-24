import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

function Home() {
  const [raceInfo, setRaceInfo] = useState([]);
  const [raceResults, setRaceResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1); // State for highlighted index
  const navigate = useNavigate(); // Using useNavigate for navigation

  // Fetch race information
  useEffect(() => {
    const fetchRaceInfo = async () => {
      if (!searchQuery.trim()) {
        setRaceInfo([]);
        setRaceResults([]);
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

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };

  // Combine race info and race results, and filter out duplicates based on name
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

  // Filter out duplicates based on the name
  const uniqueResultsByName = combinedResults.filter((result, index, self) =>
    index === self.findIndex((r) => (
      r.name.toLowerCase() === result.name.toLowerCase()
    ))
  );

  const sortedResults = uniqueResultsByName.sort((a, b) => {
    const aName = a.name.toLowerCase();
    const bName = b.name.toLowerCase();
    return aName.localeCompare(bName);
  });

  const topResults = sortedResults.slice(0, 5);

  // Handle key navigation and selection
  const handleKeyDown = (event) => {
    const totalResults = topResults.length + (uniqueResultsByName.length > 5 ? 1 : 0); // Include "More Results"
    
    if (event.key === 'ArrowDown') {
      setHighlightedIndex((prevIndex) => Math.min(prevIndex + 1, totalResults - 1));
    } else if (event.key === 'ArrowUp') {
      setHighlightedIndex((prevIndex) => Math.max(prevIndex - 1, 0));
    } else if (event.key === 'Enter') {
      if (highlightedIndex === -1 || highlightedIndex === topResults.length) {
        // Go to More Results page
        navigate(`/more-results?query=${searchQuery}`);
      } else {
        const selectedResult = topResults[highlightedIndex];
        navigate(`/${selectedResult.type}/${selectedResult._id}`);
      }
    }
  };

  // Go to more results page with the search query
  const goToMoreResults = () => {
    navigate(`/more-results?query=${searchQuery}`);
  };

  return (
    <div className="Home" onKeyDown={handleKeyDown} tabIndex="0"> {/* Add tabIndex to enable key events */}
      <div className="Header">
        <h1>All Results</h1>
      </div>
      <div className="search-container">
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Search by Race Name"
          className={`search-bar ${searchQuery.trim() ? 'has-input' : ''} ${raceInfo.length > 0 || raceResults.length > 0 ? 'results-visible' : ''}`}
        />
      </div>
      {searchQuery && (
        <div className={`results-container ${topResults.length > 0 ? 'results-visible' : ''}`}>
          {topResults.length > 0 ? (
            <ul className="results-list">
              {topResults.map((result, index) => (
                <li
                  key={result._id}
                  className={`result-item ${highlightedIndex === index ? 'highlighted' : ''}`}
                  onClick={() => {
                    const selectedResult = result;
                    navigate(`/${selectedResult.type}/${selectedResult._id}`);
                  }}
                >
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
              {uniqueResultsByName.length > 5 && (
                <li
                  className={`result-item ${highlightedIndex === topResults.length ? 'highlighted' : ''}`}
                  onClick={goToMoreResults}
                >
                  <Link to={`/more-results?query=${searchQuery}`} className="result-link More-resutls">
                    <strong>More Results</strong>
                  </Link>
                </li>
              )}
            </ul>
          ) : (
            <p className="no-results">No matching results found</p>
          )}
        </div>
      )}
    </div>
  );
}

export default Home;
