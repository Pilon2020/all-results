import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';

// Helper function to capitalize each word (for display).
function capitalizeWords(str) {
  return str
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function SearchResults() {
  const { id } = useParams();
  // Convert URL-safe query (lowercase with underscores) back to a normal string with spaces.
  const rawQuery = id ? id.replace(/_/g, ' ') : '';
  const query = rawQuery.trim();
  // Create a display version with capitalized words.
  const displayQuery = capitalizeWords(query);
  // Use the lowercase query for the API call.
  const searchTerm = query.toLowerCase();

  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!searchTerm) return;

    const fetchResults = async () => {
      setIsLoading(true);
      try {
        // The API endpoint should search both races and athletes.
        // For athletes, ensure that your backend concatenates the first and last names (with a space) for matching.
        const response = await fetch(`http://localhost:5000/api/search?q=${encodeURIComponent(searchTerm)}`);
        const data = await response.json();

        // Apply the same type logic as in your SearchComponent.
        const resultsWithType = data.map(result => {
          if ('Year' in result) {
            return { ...result, type: 'race' };
          } else {
            return { ...result, type: 'athlete' };
          }
        });

        setResults(resultsWithType);
      } catch (err) {
        console.error('Error fetching search results:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [searchTerm, id]);

  return (
    <div className="MoreResults content">
      <div className="body">
        <h1>Results for "{displayQuery}"</h1>
        {isLoading ? (
          <p>Loading...</p>
        ) : results.length > 0 ? (
          <ul className="full-results-list">
            {results.map(result => (
              <li key={result._id || result.id} className="full-result-item">
                <Link
                  to={`/${result.type === 'race' ? 'race' : 'athlete'}/${result.type === 'race' ? result._id : result.id}`}
                  className="result-link"
                >
                  <strong>{result.Name}</strong>
                  {result.type === 'race' ? (
                    <>
                      <span className="result-date"> - {result.Year}</span>
                      <br />
                      <em>{result.Location}</em>
                    </>
                  ) : (
                    <>
                      {result.Team && <span> - {result.Team}</span>}
                    </>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="no-results">No matching results found</p>
        )}
      </div>
    </div>
  );
}

export default SearchResults;
