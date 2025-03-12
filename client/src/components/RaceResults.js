import React, { useState } from 'react';

function RaceResults({ athlete, groupedResults, yearlyPRs, allTimeRecords, showAllYears, setShowAllYears }) {
  // Call hooks at the top level
  const [resultsAvailable, setResultsAvailable] = useState(
    groupedResults && Object.keys(groupedResults).length > 0
  );

  if (!resultsAvailable) {
    return (
      <div className="empty-state">
        <p className="no-records">No race results available.</p>
      </div>
    );
  }

  const years = Object.keys(groupedResults).map(Number).sort((a, b) => b - a);
  const recentYears = showAllYears ? years : years.slice(0, 3);

  // Process PRs and records
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
      {recentYears.map((year) => (
        <div key={year} className="year-section">
          <div className="year-header">{year}</div>
          {Object.keys(groupedResults[year])
            .sort()
            .map((distance) => (
              <div key={distance} className="record-section">
                <h3>{distance}</h3>
                <ul className="race-list">
                  {groupedResults[year][distance].map((result, index) => {
                    
                    // Check if this is a season best (SR)
                    const isSeasonBest = yearlyPRs[year][distance] &&
                                result.Total === yearlyPRs[year][distance].Total;
                    
                    // Check if this is an all-time PR
                    const isAllTimePR = allTimeRecords[distance] &&
                                      result.Total === allTimeRecords[distance].Total &&
                                      year == allTimeRecords[distance].year;
                   
                    return (
                      <a href={`/analysis/${result.Race_id}/${athlete._id}`} key={index} style={{textDecoration: "none"}}>
                      <li key={index} className="race-item">
                        <div>
                          <div className="race-title">{result.Race}</div>
                          <div className="race-details">
                            <span>{result.Date}</span>
                            {result.Location && (
                              <span> • {result.Location}</span>
                            )}
                          </div>
                        </div>
                        <div className={`race-time ${isAllTimePR ? 'is-pr' : ''} ${isSeasonBest ? 'is-sr' : ''}`}>
                          {isAllTimePR && <span className="pr-badge">PR</span>}
                          {isSeasonBest && !isAllTimePR && <span className="sr-badge">SR</span>}
                          {result.Total}
                        </div>
                      </li>
                      </a>
                    );
                  })}
                </ul>
              </div>
            ))}
        </div>
      ))}
     
      {!showAllYears && years.length > 3 && (
        <div className="year-toggle">
          <button onClick={() => setShowAllYears(true)}>
            Show All Years
          </button>
        </div>
      )}
     
      {showAllYears && years.length > 3 && (
        <div className="year-toggle">
          <button onClick={() => setShowAllYears(false)}>
            Show Recent Years Only
          </button>
        </div>
      )}
    </div>
  );
}

export default RaceResults;