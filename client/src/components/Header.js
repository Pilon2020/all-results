import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './header.css';

function Header() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const inputRef = useRef(null);

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await fetch('http://localhost:5000/api/auth/user', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
          } else {
            localStorage.removeItem('token');
          }
        } catch (error) {
          console.error('Error fetching user:', error);
        }
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const fetchSearchResults = async () => {
      const trimmedQuery = searchQuery.trim();
      if (!trimmedQuery) {
        setSearchResults([]);
        return;
      }
      try {
        const response = await fetch(`http://localhost:5000/api/search?q=${trimmedQuery}`);
        const data = await response.json();

        const typedResults = data.map(result => {
          if ('Year' in result) {
            return { ...result, type: 'race' };
          } else {
            return { ...result, type: 'athlete' };
          }
        });

        setSearchResults(typedResults);
      } catch (err) {
        console.error('Search error:', err);
      }
    };

    fetchSearchResults();
  }, [searchQuery]);

  const topResults = searchResults.slice(0, 5);

  const handleKeyDown = (e) => {
    const total = topResults.length + (searchResults.length > 5 ? 1 : 0);
    if (e.key === 'ArrowDown') {
      setHighlightedIndex((prev) => Math.min(prev + 1, total - 1));
    } else if (e.key === 'ArrowUp') {
      setHighlightedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      if (highlightedIndex === -1 || highlightedIndex === topResults.length) {
        navigate(`/search/${searchQuery}`);
      } else {
        const result = topResults[highlightedIndex];
        navigate(`/${result.type}/${result.id}`);
      }
      setSearchQuery('');
      inputRef.current?.blur();
    }
  };

  const goToMoreResults = () => {
    navigate(`/search/${searchQuery}`);
  };

  return (
    <header className="Header">
      <div className="header-content">
        <a href="/" className="headerlink"><h1>ALL RESULTS</h1></a>
        <div className="search-container-h">
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search by race name or athlete"
            className={`search-bar-h ${searchQuery.trim() ? 'has-input' : ''}`}
          />
          {user ? (
            <div className="user-info">
              <span>Welcome, {user.name}!</span>
              <button onClick={() => { localStorage.removeItem('token'); setUser(null); }}>Log Out</button>
            </div>
          ) : (
            <Link to="/signin" className="SignIn">Sign In</Link>
          )}
        </div>
      </div>

      {searchQuery && (
        <div className={`results-container-h ${topResults.length > 0 ? 'results-visible' : ''}`}>
          {topResults.length > 0 ? (
            <ul className="results-list-h">
              {topResults.map((result, index) => (
                <li
                  key={result.id}
                  className={`result-item ${highlightedIndex === index ? 'highlighted' : ''}`}
                  onClick={() => navigate(`/${result.type}/${result.id}`)}
                >
                  <a href={`/${result.type}/${result.id}`} className="result-link" style={{ color: 'white' }}>
                    <strong>{result.Name}</strong>
                    {result.type === 'race' && (
                      <>
                        <span className="result-date"> - {result.Year}</span>
                        <br />
                        <em>{result.Location}</em>
                      </>
                    )}
                    {result.type === 'athlete' && result.Team && (
                      <span> - {result.Team}</span>
                    )}
                  </a>
                </li>
              ))}
              {searchResults.length > 5 && (
                <li
                  className={`result-item ${highlightedIndex === topResults.length ? 'highlighted' : ''}`}
                  onClick={goToMoreResults}
                >
                  <a href={`/search/${searchQuery}`} className="result-link more-results">
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
