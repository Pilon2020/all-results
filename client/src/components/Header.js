import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './header.css'; // Make sure the CSS matches your styles for consistency

function Header() {
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1); // State for highlighted index
  const [searchResults, setSearchResults] = useState([]); // Placeholder for search results
  const navigate = useNavigate();

  // Fetch search results based on query
  const handleSearchChange = async (event) => {
    const query = event.target.value;
    setSearchQuery(query);

    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/search?query=${query.trim()}`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
      } else {
        console.error('Error fetching search results:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching search results:', error);
    }
  };

  // Handle key navigation and selection
  const handleKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      setHighlightedIndex((prevIndex) => Math.min(prevIndex + 1, searchResults.length - 1));
    } else if (event.key === 'ArrowUp') {
      setHighlightedIndex((prevIndex) => Math.max(prevIndex - 1, 0));
    } else if (event.key === 'Enter') {
      if (highlightedIndex === -1) {
        navigate(`/more-results?query=${searchQuery}`);
      } else {
        const selectedResult = searchResults[highlightedIndex];
        navigate(`/${selectedResult.type}/${selectedResult._id}`);
      }
    }
  };

  // Go to the "more results" page
  const goToMoreResults = () => {
    navigate(`/more-results?query=${searchQuery}`);
  };

  return (
    <header className="header" onKeyDown={handleKeyDown} tabIndex="0"> {/* Add tabIndex for key events */}
      <div className="header-content">
        <h1>All Results</h1>
        <div className="search-container">
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search by Race Name"
            className={`search-bar ${searchQuery.trim() ? 'has-input' : ''} ${searchResults.length > 0 ? 'results-visible' : ''}`}
          />
        </div>
      </div>

      {/* Search results */}
      {searchQuery && (
        <div className={`results-container ${searchResults.length > 0 ? 'results-visible' : ''}`}>
          {searchResults.length > 0 ? (
            <ul className="results-list">
              {searchResults.map((result, index) => (
                <li
                  key={result._id}
                  className={`result-item ${highlightedIndex === index ? 'highlighted' : ''}`}
                  onClick={() => navigate(`/${result.type}/${result._id}`)}
                >
                  <Link to={`/${result.type}/${result._id}`} className="result-link">
                    <strong>{result.name}</strong>
                    {result.type === 'race' && (
                      <>
                        <span className="result-date"> - {result.date}</span>
                        <br />
                        <em>{result.location}</em>
                      </>
                    )}
                  </Link>
                </li>
              ))}
              {searchResults.length > 5 && (
                <li className="more-results">
                  <Link to={`/more-results?query=${searchQuery}`} className="result-link">
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
    </header>
  );
}

export default Header;
