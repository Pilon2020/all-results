import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import debounce from 'lodash.debounce';

function SearchComponent({ searchQuery, setSearchQuery }) {
  const [raceResults, setRaceResults] = useState([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const fetchSearchResults = useCallback(
    debounce(async (query) => {
      if (!query.trim()) {
        setRaceResults([]);
        return;
      }
      setIsLoading(true);
      try {
        const response = await fetch(`http://localhost:5050/api/search?q=${query.trim()}`);
        const data = await response.json();

        // Add type based on source
        const resultsWithType = data.map(result => {
          if ('Year' in result) {
            return { ...result, type: 'race' };         
           } else {
            return { ...result, type: 'athlete' };
          }
        });

        setRaceResults(resultsWithType);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsLoading(false);
      }
    }, 300),
    []
  );

  useEffect(() => {
    fetchSearchResults(searchQuery);
  }, [searchQuery, fetchSearchResults]);

  const handleNavigate = (result) => {
    if (result.type === 'race') {
      navigate(`/race/${result._id}`);
    } else if (result.type === 'athlete') {
      navigate(`/athlete/${result.id}`);
    } else {
      const safeQuery = searchQuery.trim().toLowerCase().replace(/\s+/g, '_');
      navigate(`/search/${safeQuery}`);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      setHighlightedIndex((prev) => Math.min(prev + 1, Math.min(4, raceResults.length - 1)));
    } else if (e.key === 'ArrowUp') {
      setHighlightedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && highlightedIndex < raceResults.length) {
        handleNavigate(raceResults[highlightedIndex]);
      } else {
        const safeQuery = searchQuery.trim().toLowerCase().replace(/\s+/g, '_');
        navigate(`/search/${safeQuery}`);
      }
    }
  };

  const topResults = raceResults.slice(0, 5);
  const hasMoreResults = raceResults.length > 5;

  return (
    <div className="search-bar">
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => {
          setSearchQuery(e.target.value);
          setHighlightedIndex(-1);
        }}
        onKeyDown={handleKeyDown}
        placeholder="Search races or participants..."
        className="search-input"
      />
      {isLoading && <div className="search-loading">Searching...</div>}

      <div className="search-results">
        {topResults.map((result, index) => (
          <div
            key={result._id || `${result.Name}-${index}`}
            className={`search-result ${index === highlightedIndex ? 'highlighted' : ''}`}
            onMouseEnter={() => setHighlightedIndex(index)}
            onClick={() => handleNavigate(result)}
            style={{
              backgroundColor: index === highlightedIndex ? '#f0f0f0' : 'transparent',
              cursor: 'pointer',
              padding: '0.5rem',
              borderBottom: '1px solid #ddd',
            }}
          >
            {result.type === 'race' ? (
              <>
                <strong>{result.Name} - {result.Year}</strong><br />
                <span>{result.Location}</span>
              </>
            ) : (
              <>
                <strong>{result.Name} - {result.Team}</strong>
              </>
            )}
          </div>
        ))}

        {hasMoreResults && (
          <div
            className="search-more"
            onClick={() => navigate(`/search/${searchQuery}`)}
            style={{
              textAlign: 'center',
              padding: '0.5rem',
              fontWeight: 'bold',
              color: '#007BFF',
              cursor: 'pointer',
            }}
          >
            More Results
          </div>
        )}
      </div>
    </div>
  );
}

export default SearchComponent;
