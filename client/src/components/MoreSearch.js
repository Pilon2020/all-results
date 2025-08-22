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
        const response = await fetch(`http://localhost:5050/api/search?q=${encodeURIComponent(searchTerm)}`);
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

  // Separate the results into races and athletes.
  const races = results.filter(result => result.type === 'race');
  const athletes = results.filter(result => result.type === 'athlete');

  return (
    <div className="MoreResults content">
      <div className="body">
        <h1>Results for "{displayQuery}"</h1>
        {isLoading ? (
          <p>Loading...</p>
        ) : results.length > 0 ? (
          <>
            {races.length > 0 && (
              <section className="races-section">
                <h2>Races</h2>
                <ul className="races-list" style={{ listStyleType: 'none', paddingLeft: 0 }}>
                  {races.map(race => (
                    <li key={race._id || race.id} className="full-result-item">
                      <Link
                        to={`/race/${race._id || race.id}`}
                        className="result-link"
                      >
                        <strong>{race.Name}</strong>
                        <span className="result-date"> - {race.Year}</span>
                        <br />
                        <em>{race.Location}</em>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {athletes.length > 0 && (
              <section className="athletes-section">
                <h2>Participants</h2>
                <ul className="athletes-list" style={{ listStyleType: 'none', paddingLeft: 0 }}>
                  {athletes.map(athlete => (
                    <li key={athlete._id || athlete.id} className="full-result-item">
                      <Link
                        to={`/athlete/${athlete._id || athlete.id}`}
                        className="result-link"
                      >
                        <strong>{athlete.Name}</strong>
                        {athlete.Team && <span> - {athlete.Team}</span>}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        ) : (
          <p className="no-results">No matching results found</p>
        )}
      </div>
    </div>
  );
}

export default SearchResults;