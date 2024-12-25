import React, {useState } from 'react';

function RaceResults({ athlete, groupedResults, yearlyPRs, allTimeRecords, showAllYears, setShowAllYears }) {
  // Call hooks at the top level
  const [resultsAvailable, setResultsAvailable] = useState(
    groupedResults && Object.keys(groupedResults).length > 0
  );

  if (!resultsAvailable) {
    return <p>No race results available.</p>;
  }

  const years = Object.keys(groupedResults).map(Number).sort((a, b) => b - a);
  const recentYears = showAllYears ? years : years.slice(0, 3);

  Object.keys(groupedResults).forEach((year) => {
    if (!yearlyPRs[year]) yearlyPRs[year] = {};

    Object.keys(groupedResults[year]).forEach((distance) => {
      const bestTime = groupedResults[year][distance].reduce(
        (best, current) => (!best || current.Total < best.Total ? current : best),
        null
      );

      yearlyPRs[year][distance] = bestTime;

      if (!allTimeRecords[distance] || bestTime.Total < allTimeRecords[distance].Total) {
        allTimeRecords[distance] = { ...bestTime, year };
      }
    });
  });

  return (
    <div>
     {recentYears.map((year, index) => (
  <div
    key={year}
    style={{
      marginBottom: '30px',
      padding: '20px',
      border: index === 0 ? '3px solid #ccc' : '3px solid #ccc', // Different border for the first year
      borderTop: 'none',
      borderRadius: index === 0 ? '0px 0px 10px 10px' : '10px', // Rounded corners for the topmost year
      }}
  >
    <h2>{year}</h2>
    {Object.keys(groupedResults[year])
      .sort()
      .map((distance) => (
        <div key={distance} style={{ marginTop: '10px' }}>
          <h3 style={{ color: '#555' }}>{distance}</h3>
          <ul className="race-list">
            {groupedResults[year][distance].map((result, index) => (
              <a href={`/analysis/${result.Race_id}/${athlete._id}`} key={index}>
                <li className="race-item" style={{ marginBottom: '10px', listStyle: 'none' }}>
                  <div className="race-header">
                    <h2 className="race-title" style={{ margin: '5px 0' }}>
                      {result.Race}
                    </h2>
                    <div className="race-details" style={{ fontSize: '14px', color: '#666' }}>
                      <span className="race-date">{result.Date}</span>
                      <span className="race-location" style={{ marginLeft: '10px' }}>{result.Location}</span>
                    </div>
                  </div>
                </li>
              </a>
            ))}
          </ul>
        </div>
      ))}
  </div>
))}


      {!showAllYears && years.length > 3 && (
        <ul className="race-list" onClick={() => setShowAllYears(!showAllYears)}>
          <div className="race-item">
            <div className="race-header">
              <h2 className="race-title" style={{ margin: '5px 0' }}>
                More Results
              </h2>
            </div>
          </div>
        </ul>
      )}
    </div>
  );
}

export default RaceResults;
