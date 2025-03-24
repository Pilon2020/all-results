import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

function MoreResults() {
  const { id } = useParams(); // This is your search term from the URL (e.g., /search/oliver)
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchResults = async () => {
      const trimmedQuery = id?.trim().toLowerCase();
      if (!trimmedQuery) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(`http://localhost:5000/api/search?q=${trimmedQuery}`);
        const data = await response.json();

        // Add type to each result (match logic from SearchComponent)
        const typedResults = data.map(result => {
          if ('Year' in result) {
            return { ...result, type: 'race' };
          } else {
            return { ...result, type: 'athlete' };
          }
        });

        setResults(typedResults);
      } catch (err) {
        console.error('Error fetching search results:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [id]);

  return (
    <div className="MoreResults content">
      <div className="body">
        <h1>Results for "{id}"</h1>
        {isLoading ? (
          <p>Loading...</p>
        ) : results.length > 0 ? (
          <ul className="full-results-list">
            {results.map(result => (
              <li key={result.id} className="full-result-item">
                <a href={`/${result.type}/${result.id}`} className="result-link">
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
                </a>
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

export default MoreResults;
