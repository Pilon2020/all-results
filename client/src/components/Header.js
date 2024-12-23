import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './header.css';

function Header() {
  const [raceInfo, setRaceInfo] = useState([]);
  const [raceResults, setRaceResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const navigate = useNavigate();
  const inputRef = useRef(null); // Create a reference for the input element

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
        const trimmedQuery = searchQuery.trim().toLowerCase();
        const response = await fetch(`http://localhost:5000/api/athleteInfo?name=${trimmedQuery}`);
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

  const uniqueResults = combinedResults.filter((result, index, self) => {
    if (result.type === 'race') {
      return index === self.findIndex(r => r.type === 'race' && r.name.toLowerCase() === result.name.toLowerCase() && r.date === result.date);
    } else {
      return index === self.findIndex(r => r.type === 'athlete' && r.name.toLowerCase() === result.name.toLowerCase());
    }
  });

  const sortedResults = uniqueResults.sort((a, b) => {
    if (a.type === 'athlete' && b.type === 'athlete') {
      return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    } else if (a.type === 'race' && b.type === 'race') {
      return a.name.toLowerCase().localeCompare(b.name.toLowerCase()) || new Date(a.date) - new Date(b.date);
    } else {
      return a.type === 'athlete' ? -1 : 1;
    }
  });

  const topResults = sortedResults.slice(0, 5);

  const handleKeyDown = (event) => {
    const totalResults = topResults.length + (uniqueResults.length > 5 ? 1 : 0);
    if (event.key === 'ArrowDown') {
      setHighlightedIndex((prevIndex) => Math.min(prevIndex + 1, totalResults - 1));
    } else if (event.key === 'ArrowUp') {
      setHighlightedIndex((prevIndex) => Math.max(prevIndex - 1, 0));
    } else if (event.key === 'Enter') {
      if (highlightedIndex === -1 || highlightedIndex === topResults.length) {
        navigate(`/more-results?query=${searchQuery}`);
      } else {
        const selectedResult = topResults[highlightedIndex];
        navigate(`/${selectedResult.type}/${selectedResult._id}`);
      }
      setSearchQuery(''); // Clear the search query
      inputRef.current?.blur(); // Remove focus from the search bar
    }
  };

  const goToMoreResults = () => {
    navigate(`/more-results?query=${searchQuery}`);
  };

  return (
    <header className="header" onKeyDown={handleKeyDown} tabIndex="0">
      <div className="header-content">
        <a href="/" className="headerlink"><h1>ALL RESULTS</h1></a>
        <div className="search-container-h">
          <input
            ref={inputRef} // Attach the reference to the input element
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search by race name or athlete"
            className={`search-bar-h ${searchQuery.trim() ? 'has-input' : ''} ${
              raceInfo.length > 0 || raceResults.length > 0 ? 'results-visible' : ''
            }`}
          />
        </div>
      </div>

      {searchQuery && (
        <div className={`results-container-h ${topResults.length > 0 ? 'results-visible' : ''}`}>
          {topResults.length > 0 ? (
            <ul className="results-list-h">
              {topResults.map((result, index) => (
                <li
                  key={result._id}
                  className={`result-item ${highlightedIndex === index ? 'highlighted' : ''}`}
                  onClick={() => navigate(`/${result.type}/${result._id}`)}
                  >
                  <a href={`/${result.type}/${result._id}`} className="result-link" style={{color:'white'}}>
                    <strong>{result.name}</strong>
                    {result.type === 'race' ? (
                      <>
                        <span className="result-date"> - {result.date}</span>
                        <br />
                        <em>{result.location}</em>
                      </>
                    ) : null}
                  </a>
                </li>
              ))}
              {uniqueResults.length > 5 && (
                <li
                  className={`result-item ${highlightedIndex === topResults.length ? 'highlighted' : ''}`}
                  onClick={goToMoreResults}>
                  <a href={`/more-results?query=${searchQuery}`} className="result-link more-results">
                    <strong>More Results</strong>
                  </a>
                </li>
              )}
            </ul>
          ) : (
            <p className="no-results">No matching results found</p>
          )}
        </div>
      )}
    </header>
  );
}

export default Header;